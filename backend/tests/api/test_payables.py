"""What the shop owes, through the API: the contacts, their accounts, and the summary of both sides.

A contact's account is the customers' ledger seen from the shop's own side of the counter: a `credit` is
what the shop has undertaken to pay, a `payment` is money it has paid back, and a wrong entry is undone
by a reversal that says why. Each rule has the case that works and the case that is refused; recording
a debt and paying a contact back are two decisions, told apart by the permissions as well.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import psycopg
import pytest
from fastapi.testclient import TestClient

from qarz.domain.promise import tashkent_date

from .conftest import World, as_user, set_overrides, switch_permissions_on
from .test_customers_ledger import key, read, shop, write
from .test_usd import dollars, platform_on  # noqa: F401  (fixtures)

pytestmark = pytest.mark.db


def contacts(world: World) -> str:
    return f"{shop(world)}/contacts"


def contact(client: TestClient, world: World, name: str = "Ulgurji bozor", **extra: Any) -> str:
    body: dict[str, Any] = {"name": name, **extra}
    response = write(client, world.manager_a, "POST", contacts(world), body)
    assert response.status_code == 201, response.text
    return str(response.json()["id"])


def entry(
    client: TestClient, world: World, who: Any, kind: str, amount: Any, user: uuid.UUID | None = None, **extra: Any
) -> Any:
    body = {"kind": kind, "amount": amount, **extra}
    return write(client, user or world.manager_a, "POST", f"{contacts(world)}/{who}/entries", body)


def debt(
    client: TestClient, world: World, who: Any, amount: int, days: int = 7, user: uuid.UUID | None = None, **extra: Any
) -> Any:
    """A credit the shop has undertaken to pay `days` from the shop's own today (Tashkent's)."""
    return entry(client, world, who, "credit", amount, user=user, promised_date=_in(days), **extra)


def account(client: TestClient, world: World, who: Any, **params: Any) -> dict[str, Any]:
    response = read(client, world.manager_a, f"{contacts(world)}/{who}", **params)
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


def owed(client: TestClient, world: World, who: Any) -> list[dict[str, Any]]:
    books: list[dict[str, Any]] = account(client, world, who)["contact"]["books"]
    return books


def cancel_entry(client: TestClient, world: World, who: Any, entry_id: Any, reason: str = "Xato summa") -> Any:
    path = f"{contacts(world)}/{who}/entries/{entry_id}/cancel"
    return write(client, world.manager_a, "POST", path, {"reason": reason})


def actions(owner: psycopg.Connection, world: World, prefix: str) -> list[str]:
    return [
        str(row[0])
        for row in owner.execute(
            "SELECT action FROM activity WHERE shop_id = %s AND action LIKE %s ORDER BY at, id",
            (world.shop_a, prefix + "%"),
        ).fetchall()
    ]


def _in(days: int) -> str:
    """A promised date `days` from the shop's own today (Tashkent's)."""
    return (tashkent_date(datetime.now(UTC)) + timedelta(days=days)).isoformat()


_PROMISED = _in(30)


# --- the contacts ------------------------------------------------------------------------------------


def test_a_contact_has_a_name_and_may_have_a_phone_and_a_note(
    client: TestClient, world: World, owner: psycopg.Connection
) -> None:
    made = write(
        client,
        world.manager_a,
        "POST",
        contacts(world),
        {"name": "  Ulgurji   bozor ", "phone": "90 123 45 67", "note": "Seshanba kuni keladi"},
    )
    assert made.status_code == 201, made.text
    assert made.json() == {
        "id": made.json()["id"],
        "name": "Ulgurji bozor",
        "phone": "+998901234567",
        "note": "Seshanba kuni keladi",
        "status": "active",
        "books": [],
        "created_at": made.json()["created_at"],
    }
    same = write(client, world.manager_a, "POST", contacts(world), {"name": "ULGURJI BOZOR"})
    assert same.status_code == 409 and same.json()["error"]["code"] == "CONTACT_NAME_TAKEN"
    for body, field in (
        ({"name": "  "}, "name"),
        ({"name": "x" * 81}, "name"),
        ({"name": "Ali", "phone": "12"}, "phone"),
        ({"name": "Ali", "note": "x" * 201}, "note"),
    ):
        refused = write(client, world.manager_a, "POST", contacts(world), body)
        assert refused.status_code == 422 and field in refused.json()["error"]["fields"], refused.text
    assert write(client, world.seller_a, "POST", contacts(world), {"name": "Ali"}).status_code == 403
    assert read(client, world.seller_a, contacts(world)).status_code == 403, "a seller has no part in contacts"
    assert read(client, world.seller_a, f"{contacts(world)}/{made.json()['id']}").status_code == 403
    assert read(client, world.seller_a, f"{shop(world)}/payables/summary").status_code == 403

    renamed = write(client, world.manager_a, "PUT", f"{contacts(world)}/{made.json()['id']}", {"name": "Bozor"})
    assert renamed.status_code == 200
    assert (renamed.json()["name"], renamed.json()["phone"], renamed.json()["note"]) == ("Bozor", None, None)
    assert actions(owner, world, "contact.") == ["contact.created", "contact.updated"]


def test_the_list_is_searched_paged_and_carries_what_the_shop_owes(client: TestClient, world: World) -> None:
    made = [contact(client, world, f"Alo {number}") for number in range(4)]
    assert debt(client, world, made[1], 300_000).status_code == 201
    assert entry(client, world, made[2], "opening", 200_000, promised_date=_in(7)).status_code == 201
    assert entry(client, world, made[3], "payment", 50_000).status_code == 201  # paid ahead of anything owed

    first = read(client, world.manager_a, contacts(world), limit=3).json()
    assert [row["id"] for row in first["contacts"]] == made[:3] and first["next_cursor"]
    assert [row["books"] for row in first["contacts"]] == [
        [],
        [{"currency": "UZS", "balance": 300_000, "advance": 0, "overdue": 0, "due_today": 0}],
        [{"currency": "UZS", "balance": 200_000, "advance": 0, "overdue": 0, "due_today": 0}],
    ]
    rest = read(client, world.manager_a, contacts(world), limit=3, cursor=first["next_cursor"]).json()
    assert [row["books"] for row in rest["contacts"]] == [
        [{"currency": "UZS", "balance": -50_000, "advance": 50_000, "overdue": 0, "due_today": 0}]
    ]
    assert rest["next_cursor"] is None
    found = read(client, world.manager_a, contacts(world), q="alo 2").json()["contacts"]
    assert [row["id"] for row in found] == [made[2]]
    for params in ({"limit": 0}, {"status": "gone"}, {"cursor": "x"}, {"q": "x" * 81}):
        assert read(client, world.manager_a, contacts(world), **params).status_code == 422, params
    # An archived contact leaves the active list, and keeps what the shop owes it out of sight with it.
    assert write(client, world.manager_a, "POST", f"{contacts(world)}/{made[0]}/archive").json()["status"] == "archived"
    assert made[0] not in [row["id"] for row in read(client, world.manager_a, contacts(world)).json()["contacts"]]
    assert len(read(client, world.manager_a, contacts(world), status="archived").json()["contacts"]) == 1


def test_a_contact_with_an_open_account_cannot_be_archived_and_an_archived_one_takes_nothing(
    client: TestClient, world: World
) -> None:
    who = contact(client, world)
    owed_more = entry(client, world, who, "opening", 100_000, promised_date=_in(7)).json()["entry"]["id"]
    archive = f"{contacts(world)}/{who}/archive"
    refused = write(client, world.manager_a, "POST", archive)
    assert refused.status_code == 409 and refused.json()["error"]["code"] == "CONTACT_HAS_BALANCE"
    assert cancel_entry(client, world, who, owed_more).status_code == 201
    assert write(client, world.manager_a, "POST", archive).json()["status"] == "archived"
    assert read(client, world.manager_a, contacts(world)).json()["contacts"] == []
    assert len(read(client, world.manager_a, contacts(world), status="archived").json()["contacts"]) == 1

    paid = entry(client, world, who, "payment", 5_000)
    assert paid.status_code == 409 and paid.json()["error"]["code"] == "CONTACT_ARCHIVED"
    back = write(client, world.manager_a, "POST", f"{contacts(world)}/{who}/unarchive")
    assert back.status_code == 200 and back.json()["status"] == "active"
    assert entry(client, world, who, "payment", 5_000).status_code == 201
    # An advance is open as well: the contact owes the shop, and that is not nothing.
    assert write(client, world.manager_a, "POST", archive).status_code == 409
    assert owed(client, world, who) == [
        {"currency": "UZS", "balance": -5_000, "advance": 5_000, "overdue": 0, "due_today": 0}
    ]


# --- the account -------------------------------------------------------------------------------------


def test_credits_raise_what_is_owed_payments_lower_it_and_the_account_shows_each(
    client: TestClient, world: World, owner: psycopg.Connection
) -> None:
    who = contact(client, world)
    taken = debt(client, world, who, 100_000, note="Guruch uchun")
    assert taken.status_code == 201, taken.text
    assert taken.json()["contact"]["books"] == [
        {"currency": "UZS", "balance": 100_000, "advance": 0, "overdue": 0, "due_today": 0}
    ]
    paid = entry(client, world, who, "payment", 40_000, note="Naqd berildi")
    assert paid.json()["contact"]["books"] == [
        {"currency": "UZS", "balance": 60_000, "advance": 0, "overdue": 0, "due_today": 0}
    ]
    assert paid.json()["entry"]["seq"] == 2
    body = account(client, world, who)
    assert [(row["seq"], row["kind"], row["amount"], row["note"]) for row in body["entries"]] == [
        (2, "payment", 40_000, "Naqd berildi"),
        (1, "credit", 100_000, "Guruch uchun"),
    ]
    assert body["entries"][1]["promised_date"] == _in(7) and body["entries"][1]["reversed"] is False
    # More than is owed is an advance, not a refusal: the shop pays ahead when it pays ahead.
    assert entry(client, world, who, "payment", 90_000).status_code == 201
    assert owed(client, world, who) == [
        {"currency": "UZS", "balance": -30_000, "advance": 30_000, "overdue": 0, "due_today": 0}
    ]
    assert actions(owner, world, "payable.") == [
        "payable.credit_recorded",
        "payable.payment_recorded",
        "payable.payment_recorded",
    ]
    page = account(client, world, who, limit=2)
    assert [row["seq"] for row in page["entries"]] == [3, 2] and page["next_cursor"]
    assert [row["seq"] for row in account(client, world, who, limit=2, cursor=page["next_cursor"])["entries"]] == [1]
    # What is owed is promised for a week: nothing is overdue yet, and nothing is due today.
    assert all(book["overdue"] == 0 and book["due_today"] == 0 for book in owed(client, world, who))


def test_a_debt_promised_for_today_is_due_today(client: TestClient, world: World) -> None:
    who = contact(client, world)
    assert debt(client, world, who, 45_000, days=0).status_code == 201
    assert owed(client, world, who) == [
        {"currency": "UZS", "balance": 45_000, "advance": 0, "overdue": 0, "due_today": 45_000}
    ]
    # Only the uncovered part counts: a payment of it clears the day's due figure with the debt.
    assert entry(client, world, who, "payment", 45_000).status_code == 201
    assert owed(client, world, who) == [{"currency": "UZS", "balance": 0, "advance": 0, "overdue": 0, "due_today": 0}]


def test_an_overdue_debt_is_what_the_ledger_says_it_is(
    client: TestClient, world: World, owner: psycopg.Connection
) -> None:
    """The date is chosen when the debt is written, so an overdue one is written by the tests, as the
    ledger of a customer has one written for it (tests/api/test_reminders.py)."""
    who = contact(client, world)
    late = uuid.uuid4()
    yesterday = tashkent_date(datetime.now(UTC)) - timedelta(days=1)
    owner.execute(
        "INSERT INTO payable_entry (id, shop_id, contact_id, seq, kind, amount, promised_date, author_id) "
        "VALUES (%s, %s, %s, 1, 'credit', 70000, %s, %s)",
        (late, world.shop_a, uuid.UUID(who), yesterday, world.manager_a_membership),
    )
    assert owed(client, world, who) == [
        {"currency": "UZS", "balance": 70_000, "advance": 0, "overdue": 70_000, "due_today": 0}
    ]
    # A date before today is refused: the shop's own today is the earliest a debt may be promised for,
    # and a year and a day from it the latest.
    assert entry(client, world, who, "opening", 70_000, promised_date=_in(-1)).status_code == 422
    assert entry(client, world, who, "opening", 70_000, promised_date=_in(400)).status_code == 422


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"kind": "reversal", "amount": 1_000, "promised_date": _PROMISED}, "kind"),
        ({"kind": "payment", "amount": 0}, "amount"),
        ({"kind": "payment", "amount": -5}, "amount"),
        ({"kind": "payment", "amount": "1000"}, "amount"),
        ({"kind": "payment", "amount": 10**12 + 1}, "amount"),
        ({"kind": "payment", "amount": 1_000, "note": "x" * 201}, "note"),
        ({"kind": "payment", "amount": 1_000, "currency": "EUR"}, "currency"),
        ({"kind": "payment", "amount": 1_000, "currency": "USD"}, "currency"),  # the shop does not work in dollars
        ({"kind": "credit", "amount": 1_000}, "promised_date"),  # a debt needs the date it is promised for
        ({"kind": "credit", "amount": 1_000, "promised_date": _in(-1)}, "promised_date"),
        ({"kind": "credit", "amount": 1_000, "promised_date": _in(400)}, "promised_date"),
        ({"kind": "payment", "amount": 1_000, "promised_date": _PROMISED}, "promised_date"),  # only a debt has one
    ],
)
def test_a_wrong_entry_is_refused_and_not_stored(
    client: TestClient, world: World, body: dict[str, Any], field: str
) -> None:
    who = contact(client, world)
    refused = write(client, world.manager_a, "POST", f"{contacts(world)}/{who}/entries", body)
    assert refused.status_code == 422 and field in refused.json()["error"]["fields"], refused.text
    assert account(client, world, who)["entries"] == []
    assert entry(client, world, uuid.uuid4(), "payment", 1_000).status_code == 404
    assert read(client, world.manager_a, f"{contacts(world)}/{who}", cursor="x").status_code == 422
    assert read(client, world.manager_a, f"{contacts(world)}/{who}", limit=0).status_code == 422


def test_an_entry_is_cancelled_by_a_reversal_that_says_why_and_only_once(
    client: TestClient, world: World, owner: psycopg.Connection
) -> None:
    who, other = contact(client, world), contact(client, world, "Boshqa")
    assert debt(client, world, who, 100_000).status_code == 201
    paid = entry(client, world, who, "payment", 40_000).json()["entry"]["id"]

    no_reason = cancel_entry(client, world, who, paid, " ")
    assert no_reason.status_code == 422 and "reason" in no_reason.json()["error"]["fields"]
    elsewhere = cancel_entry(client, world, other, paid)
    assert elsewhere.status_code == 404, "another contact's entry is not there"
    done = cancel_entry(client, world, who, paid, "Ikki marta yozilgan")
    assert done.status_code == 201, done.text
    assert done.json()["entry"]["kind"] == "reversal" and done.json()["entry"]["note"] == "Ikki marta yozilgan"
    assert done.json()["entry"]["reverses_id"] == paid and done.json()["entry"]["promised_date"] is None
    assert done.json()["contact"]["books"] == [
        {"currency": "UZS", "balance": 100_000, "advance": 0, "overdue": 0, "due_today": 0}
    ]
    rows = account(client, world, who)["entries"]
    assert [(row["kind"], row["reversed"], row["reverses_id"]) for row in rows] == [
        ("reversal", False, paid),
        ("payment", True, None),
        ("credit", False, None),
    ]
    again = cancel_entry(client, world, who, paid)
    assert again.status_code == 409 and again.json()["error"]["code"] == "ALREADY_REVERSED"
    reversal = cancel_entry(client, world, who, rows[0]["id"])
    assert reversal.status_code == 409 and reversal.json()["error"]["code"] == "CANNOT_REVERSE_REVERSAL"
    assert owed(client, world, who) == [
        {"currency": "UZS", "balance": 100_000, "advance": 0, "overdue": 0, "due_today": 0}
    ]
    assert "payable.entry_cancelled" in actions(owner, world, "payable.")

    # The database itself holds the account to its rules: nothing is edited or deleted, and a reversal
    # repeats the entry it reverses.
    for statement in ("UPDATE payable_entry SET amount = 1", "DELETE FROM payable_entry"):
        with pytest.raises(psycopg.errors.InsufficientPrivilege), owner.transaction():
            owner.execute("SET LOCAL ROLE qd_app")
            owner.execute(f"SELECT set_config('qd.shop_id', '{world.shop_a}', true)")
            owner.execute(statement)


def test_recording_a_debt_and_paying_a_contact_back_are_separate_permissions(
    client: TestClient, world: World, owner: psycopg.Connection
) -> None:
    who = contact(client, world)
    old = entry(client, world, who, "opening", 100_000, promised_date=_in(7)).json()["entry"]["id"]
    paid = entry(client, world, who, "payment", 10_000).json()["entry"]["id"]
    switch_permissions_on(owner)
    payer, keeper = world.seller_a, world.manager_a
    set_overrides(owner, world.seller_a_membership, granted=["payables.pay", "payables.view"])
    set_overrides(owner, world.manager_a_membership, denied=["payables.pay"])

    def refused(response: Any, permission: str) -> bool:
        return bool(response.status_code == 403 and response.json()["error"]["fields"] == {"permission": permission})

    assert entry(client, world, who, "payment", 5_000, payer).status_code == 201
    assert refused(debt(client, world, who, 5_000, user=payer), "payables.manage")
    assert debt(client, world, who, 5_000, user=keeper).status_code == 201
    assert refused(entry(client, world, who, "payment", 5_000, keeper), "payables.pay")
    # Cancelling needs what recording needed.
    path = f"{contacts(world)}/{who}/entries"
    assert refused(write(client, payer, "POST", f"{path}/{old}/cancel", {"reason": "x"}), "payables.manage")
    assert refused(write(client, keeper, "POST", f"{path}/{paid}/cancel", {"reason": "x"}), "payables.pay")
    assert write(client, payer, "POST", f"{path}/{paid}/cancel", {"reason": "x"}).status_code == 201
    assert write(client, keeper, "POST", f"{path}/{old}/cancel", {"reason": "x"}).status_code == 201
    # Seeing the contacts at all is the third permission; holding only it reads, and writes nothing.
    set_overrides(owner, world.seller_a_membership, granted=["payables.view"])
    assert read(client, payer, contacts(world)).json()["contacts"]
    assert refused(write(client, payer, "POST", f"{contacts(world)}", {"name": "Yangi"}), "payables.manage")
    assert owed(client, world, who) == [{"currency": "UZS", "balance": 0, "advance": 0, "overdue": 0, "due_today": 0}]


def test_a_repeated_write_writes_one_entry(client: TestClient, world: World) -> None:
    made = contact(client, world)
    headers = {**as_user(world.manager_a), **key()}
    body = {"kind": "payment", "amount": 7_000}
    first = client.post(f"{contacts(world)}/{made}/entries", json=body, headers=headers)
    second = client.post(f"{contacts(world)}/{made}/entries", json=body, headers=headers)
    assert first.status_code == second.status_code == 201 and first.json() == second.json()
    assert len(account(client, world, made)["entries"]) == 1

    # The same key on a different write is refused, as everywhere: the key names one decision.
    taken = client.post(f"{contacts(world)}/{made}/entries", json={"kind": "payment", "amount": 1_000}, headers=headers)
    assert taken.status_code == 409 and taken.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_another_shop_sees_nothing_of_a_shops_contacts(client: TestClient, world: World) -> None:
    who = contact(client, world)
    theirs = f"/api/v1/shops/{world.shop_b}/contacts"
    assert read(client, world.owner_b, theirs).json()["contacts"] == []
    assert read(client, world.owner_b, f"{theirs}/{who}").status_code == 404
    refused = write(client, world.owner_b, "POST", f"{theirs}/{who}/entries", {"kind": "payment", "amount": 1_000})
    assert refused.status_code == 404
    assert read(client, world.owner_b, f"/api/v1/shops/{world.shop_b}/payables/summary").json() == {
        "receivables": [
            {
                "currency": "UZS",
                "outstanding": 0,
                "debtors": 0,
                "overdue": 0,
                "overdue_customers": 0,
                "due_today": 0,
            }
        ],
        "payables": [],
    }
    assert account(client, world, who)["entries"] == []


# --- the summary of both sides -----------------------------------------------------------------------


def test_the_summary_names_both_sides_of_the_counter(
    client: TestClient, world: World, owner: psycopg.Connection
) -> None:
    """Ali owes the shop 50 000 (the world's own ledger); the shop owes three of its contacts and has
    paid another one ahead. One contact's debt is a day late, another is due today."""
    today = debt(client, world, contact(client, world, "A kam"), 30_000, days=0)
    assert today.status_code == 201
    assert debt(client, world, contact(client, world, "B keyin"), 20_000, days=7).status_code == 201
    assert entry(client, world, contact(client, world, "C tulagan"), "payment", 50_000).status_code == 201
    late_contact = uuid.uuid4()
    late_entry = uuid.uuid4()
    yesterday = tashkent_date(datetime.now(UTC)) - timedelta(days=1)
    owner.execute(
        "INSERT INTO contact (id, shop_id, name, name_norm) VALUES (%s, %s, 'D kecha', 'd kecha')",
        (late_contact, world.shop_a),
    )
    owner.execute(
        "INSERT INTO payable_entry (id, shop_id, contact_id, seq, kind, amount, promised_date, author_id) "
        "VALUES (%s, %s, %s, 1, 'credit', 10_000, %s, %s)",
        (late_entry, world.shop_a, late_contact, yesterday, world.manager_a_membership),
    )

    body = read(client, world.manager_a, f"{shop(world)}/payables/summary").json()
    assert body == {
        "receivables": [
            {
                "currency": "UZS",
                "outstanding": 50_000,
                "debtors": 1,
                "overdue": 0,
                "overdue_customers": 0,
                "due_today": 0,
            }
        ],
        "payables": [
            {
                "currency": "UZS",
                "owed": 60_000,
                "overdue": 10_000,
                "due_today": 30_000,
                "advance": 50_000,
                "contacts": 4,
            }
        ],
    }
    # The receivables are the customers' kept figures: the same ones the debtors page is built on.
    debtors = read(client, world.manager_a, f"{shop(world)}/overview/debtors").json()
    assert [(row["display_name"], row["balance"], row["overdue"]["amount"]) for row in debtors["items"]] == [
        ("Ali", 50_000, 0)
    ]


# --- dollars -----------------------------------------------------------------------------------------


def test_dollars_are_a_book_of_their_own_for_a_contact(
    client: TestClient,
    world: World,
    dollars: None,  # noqa: F811
) -> None:
    """A shop that works in dollars owes in dollars as well: two books under one contact, never added
    together, each with its own sequence."""
    who = contact(client, world)
    taken = entry(client, world, who, "credit", 7_000, currency="USD", promised_date=_in(7))
    assert taken.status_code == 201, taken.text
    assert taken.json()["contact"]["books"] == [
        {"currency": "USD", "balance": 7_000, "advance": 0, "overdue": 0, "due_today": 0}
    ]
    # A so'm debt beside it shares the sequence: one entry has seq 1, the other 2.
    assert debt(client, world, who, 200_000).status_code == 201
    assert [book["currency"] for book in owed(client, world, who)] == ["UZS", "USD"]
    assert [row["seq"] for row in account(client, world, who)["entries"]] == [2, 1]
    paid = entry(client, world, who, "payment", 2_000, currency="USD")
    assert paid.json()["contact"]["books"] == [
        {"currency": "UZS", "balance": 200_000, "advance": 0, "overdue": 0, "due_today": 0},
        {"currency": "USD", "balance": 5_000, "advance": 0, "overdue": 0, "due_today": 0},
    ]
    summary = read(client, world.manager_a, f"{shop(world)}/payables/summary").json()
    assert summary["payables"] == [
        {"currency": "UZS", "owed": 200_000, "overdue": 0, "due_today": 0, "advance": 0, "contacts": 1},
        {"currency": "USD", "owed": 5_000, "overdue": 0, "due_today": 0, "advance": 0, "contacts": 1},
    ]
    assert [row["currency"] for row in summary["receivables"]] == ["UZS", "USD"]
