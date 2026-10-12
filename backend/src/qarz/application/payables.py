"""What the shop owes: contacts and their accounts ("Men qarzdarman", Phase 1 of the qarzapp port).

A contact is anyone the shop owes -- a supplier it buys from on credit, a lender, staff. A contact's
account is an append-only ledger of the same shape as a customer's, seen from the shop's own side of
the counter: the shop is the one who owes. `credit` and `opening` raise what it owes, a `payment`
lowers it, and a wrong entry is cancelled by a `reversal` that says why; the entry itself stays.

Everything derived is calculated by `qarz.domain.ledger`, which knows nothing of who the counterparty
is: the balance, what is overdue, what has been paid ahead. A balance above zero is what the shop
owes; below zero is an advance, which shops do have, so a payment is not limited to the debt. So'm
and dollars are two books that share one sequence per contact.

There is no platform switch here: the debt core is a ported core feature, not an expansion module.
"""

from collections.abc import Callable
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID, uuid4

from qarz.application import idempotency
from qarz.application.authorization import require_permission
from qarz.application.currencies import dollars_on
from qarz.application.currencies import require_currency as require_money
from qarz.application.customers import (
    MAX_PAGE,
    clean_phone,
    decode_cursor,
    encode_cursor,
    require_viewable,
    require_writable,
)
from qarz.application.errors import AppError, NotFound, ValidationFailed
from qarz.application.operations import operation
from qarz.application.payables_ports import ContactRecord, PayableEntryRecord
from qarz.application.ports import ShopTotals, Storage, TenantSession
from qarz.application.shops import require_member
from qarz.domain import ledger, permissions
from qarz.domain import payables as rules
from qarz.domain.access import Capability
from qarz.domain.ledger import Entry, EntryKind, Refusal
from qarz.domain.money import Currency
from qarz.domain.names import normalize_name
from qarz.domain.promise import tashkent_date, validate_promise_date

LIST_CONTACTS = operation("contacts.list", Capability.MANAGE)
READ_CONTACT = operation("contacts.read", Capability.MANAGE)
CREATE_CONTACT = operation("contacts.create", Capability.MANAGE)
UPDATE_CONTACT = operation("contacts.update", Capability.MANAGE)
ARCHIVE_CONTACT = operation("contacts.archive", Capability.MANAGE)
UNARCHIVE_CONTACT = operation("contacts.unarchive", Capability.MANAGE)
RECORD_PAYABLE = operation("payables.record", Capability.MANAGE)
REVERSE_PAYABLE = operation("payables.reverse", Capability.MANAGE)
PAYABLES_SUMMARY = operation("payables.summary", Capability.MANAGE)

# What each kind a person records directly needs: paying a contact back is one decision, stating what
# the shop already owes another.
_ENTRY_PERMISSION = {
    rules.CREDIT: permissions.PAYABLES_MANAGE,
    rules.OPENING: permissions.PAYABLES_MANAGE,
    rules.PAYMENT: permissions.PAYABLES_PAY,
}

# The shop pays ahead when it pays ahead: a contact's book may stand below zero without a limit
# (`qarz.domain.payables`), which is the advance cap said in the largest amount one entry may carry.
_ADVANCE_CAP = rules.MAX_AMOUNT


class ContactNameTaken(AppError):
    code = "CONTACT_NAME_TAKEN"


class ContactArchived(AppError):
    code = "CONTACT_ARCHIVED"


class ContactHasBalance(AppError):
    """A contact the shop still owes, or it holds an advance of, cannot be archived."""

    code = "CONTACT_HAS_BALANCE"


class PayableEntryRefused(AppError):
    """The book's own rules do not allow this entry. The code says which."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__()


_REFUSAL_CODES = {
    Refusal.INVALID_AMOUNT: None,
    Refusal.REVERSAL_TARGET_REQUIRED: None,
    Refusal.REVERSAL_TARGET_NOT_ALLOWED: None,
    Refusal.REVERSAL_AMOUNT_MISMATCH: None,
    Refusal.NEGATIVE_BALANCE: "ADVANCE_TOO_LARGE",
    Refusal.ADVANCE_TOO_LARGE: "ADVANCE_TOO_LARGE",
}


def _refuse(refusal: Refusal) -> AppError:
    code = _REFUSAL_CODES.get(refusal)
    if code is None:
        # Anything else means the request itself was malformed.
        return ValidationFailed({"entry": refusal.value})
    return PayableEntryRefused(code)


def _entries(records: list[PayableEntryRecord]) -> list[Entry]:
    """The stored records as the ledger reads them: one account, any order, currencies kept apart."""
    return [
        Entry(
            id=record.entry_id,
            seq=record.seq,
            kind=EntryKind(record.kind),
            amount=record.amount,
            created_at=record.created_at,
            reverses_id=record.reverses_id,
            promised_date=record.promised_date,
            currency=Currency(record.currency),
        )
        for record in records
    ]


def books_of(records: list[PayableEntryRecord], today: date) -> list[dict[str, Any]]:
    """What one account owes, book by book: the balance, what of it is overdue, what is paid ahead."""
    entries = _entries(records)
    books: list[dict[str, Any]] = []
    for currency in ledger.currencies_of(entries):
        book = ledger.in_currency(entries, currency)
        status = ledger.overdue(book, today)
        books.append(
            {
                "currency": currency.value,
                "balance": ledger.balance(book),
                "advance": ledger.advance(book),
                "overdue": status.overdue_amount,
                "due_today": status.due_today_amount,
            }
        )
    return books


def contact_body(contact: ContactRecord, books: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "id": str(contact.contact_id),
        "name": contact.name,
        "phone": contact.phone,
        "note": contact.note,
        "status": contact.status,
        "books": books,
        "created_at": contact.created_at.isoformat(),
    }


def entry_body(entry: PayableEntryRecord) -> dict[str, Any]:
    return {
        "id": str(entry.entry_id),
        "seq": entry.seq,
        "kind": entry.kind,
        "amount": entry.amount,
        "currency": entry.currency,
        "note": entry.note,
        "reverses_id": None if entry.reverses_id is None else str(entry.reverses_id),
        "reversed": entry.is_reversed,
        "promised_date": None if entry.promised_date is None else entry.promised_date.isoformat(),
        "author_id": str(entry.author_id),
        "created_at": entry.created_at.isoformat(),
    }


def _clean(name: str, phone: str | None, note: str | None) -> tuple[str, str | None, str | None]:
    fields: dict[str, str] = {}
    clean_name = ""
    clean_note: str | None = None
    try:
        clean_name = rules.contact_name(name)
    except ValueError as error:
        fields["name"] = str(error)
    try:
        clean_note = rules.note(note)
    except ValueError as error:
        fields["note"] = str(error)
    try:
        phone = clean_phone(phone)
    except ValidationFailed as error:
        fields.update(error.fields)
    if fields:
        raise ValidationFailed(fields)
    return clean_name, phone, clean_note


async def append_entry_in(
    session: TenantSession,
    actor_membership_id: UUID,
    contact_id: UUID,
    *,
    kind: str,
    amount: int,
    currency: str,
    note: str | None,
    reverses_id: UUID | None,
    promised_date: date | None,
    now: datetime,
) -> UUID:
    """Add one entry to a contact's account. The caller holds the contact's row lock, which makes two
    writers to one account take turns for the sequence number."""
    entry_id = uuid4()
    await session.append_payable_entry(
        entry_id=entry_id,
        contact_id=contact_id,
        seq=await session.last_payable_seq(contact_id) + 1,
        kind=kind,
        amount=amount,
        currency=currency,
        note=note,
        reverses_id=reverses_id,
        promised_date=promised_date,
        author_id=actor_membership_id,
        created_at=now,
    )
    return entry_id


class ContactService:
    def __init__(self, storage: Storage, now: Callable[[], datetime] | None = None) -> None:
        self._storage = storage
        self._now = now or (lambda: datetime.now(UTC))

    def _today(self) -> date:
        return tashkent_date(self._now())

    async def list(
        self, user_id: UUID, shop_id: UUID, *, query: str | None, status: str, cursor: str | None, limit: int
    ) -> dict[str, Any]:
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, LIST_CONTACTS)
            await require_viewable(session, actor, self._today())
            fields: dict[str, str] = {}
            if not 1 <= limit <= MAX_PAGE:
                fields["limit"] = f"must be between 1 and {MAX_PAGE}"
            if status not in (rules.ACTIVE, rules.ARCHIVED):
                fields["status"] = "must be active or archived"
            if query is not None and len(query) > rules.MAX_NAME:
                fields["q"] = f"at most {rules.MAX_NAME} characters"
            if fields:
                raise ValidationFailed(fields)
            after: tuple[str, UUID] | None = None
            if cursor:
                name_norm, contact_id = decode_cursor(cursor, 2)
                try:
                    after = (name_norm, UUID(contact_id))
                except ValueError as error:
                    raise ValidationFailed({"cursor": "not a cursor returned by this API"}) from error
            today = self._today()
            rows = await session.search_contacts(
                name_part=normalize_name(query or "") or None, status=status, after=after, limit=limit + 1
            )
            page, more = rows[:limit], len(rows) > limit
            return {
                "contacts": [
                    contact_body(row, books_of(await session.payable_entries_of(row.contact_id), today)) for row in page
                ],
                "next_cursor": encode_cursor(page[-1].name_norm, page[-1].contact_id) if more else None,
            }

    async def detail(
        self, user_id: UUID, shop_id: UUID, contact_id: UUID, *, cursor: str | None, limit: int
    ) -> dict[str, Any]:
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, READ_CONTACT)
            await require_viewable(session, actor, self._today())
            if not 1 <= limit <= MAX_PAGE:
                raise ValidationFailed({"limit": f"must be between 1 and {MAX_PAGE}"})
            before: int | None = None
            if cursor:
                (raw,) = decode_cursor(cursor, 1)
                if not raw.isascii() or not raw.isdigit():
                    raise ValidationFailed({"cursor": "not a cursor returned by this API"})
                before = int(raw)
            contact = await session.get_contact(contact_id, for_update=False)
            if contact is None:
                raise NotFound()
            today = self._today()
            records = await session.payable_entries_of(contact_id)
            # Newest first, as the ledger's own page of an account: `before` is the last seq shown.
            rows = sorted(records, key=lambda record: record.seq, reverse=True)
            if before is not None:
                rows = [record for record in rows if record.seq < before]
            page, more = rows[:limit], len(rows) > limit
            return {
                "contact": contact_body(contact, books_of(records, today)),
                "entries": [entry_body(record) for record in page],
                "next_cursor": encode_cursor(page[-1].seq) if more else None,
            }

    async def create(
        self, user_id: UUID, shop_id: UUID, *, name: str, phone: str | None, note: str | None, request_key: str | None
    ) -> dict[str, Any]:
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, CREATE_CONTACT)
            key = idempotency.validate_key(request_key)
            clean_name, clean_tel, clean_note = _clean(name, phone, note)
            await require_writable(session, self._today(), new_credit=False)

            async def apply() -> dict[str, Any]:
                contact = await session.insert_contact(
                    contact_id=uuid4(),
                    name=clean_name,
                    name_norm=normalize_name(clean_name),
                    phone=clean_tel,
                    note=clean_note,
                )
                if contact is None:
                    raise ContactNameTaken()
                await session.record_activity(
                    membership_id=actor.membership_id,
                    action="contact.created",
                    subject_type="contact",
                    subject_id=contact.contact_id,
                )
                return contact_body(contact, [])

            return await idempotency.run_once(
                session,
                key=key,
                operation=CREATE_CONTACT.name,
                user_id=user_id,
                request={"name": clean_name, "phone": clean_tel, "note": clean_note},
                action=apply,
            )

    async def update(
        self,
        user_id: UUID,
        shop_id: UUID,
        contact_id: UUID,
        *,
        name: str,
        phone: str | None,
        note: str | None,
        request_key: str | None,
    ) -> dict[str, Any]:
        """Replace the contact's name, phone and note as a whole. The account is untouched."""
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, UPDATE_CONTACT)
            key = idempotency.validate_key(request_key)
            clean_name, clean_tel, clean_note = _clean(name, phone, note)
            await require_writable(session, self._today(), new_credit=False)

            async def apply() -> dict[str, Any]:
                if await session.get_contact(contact_id, for_update=True) is None:
                    raise NotFound()
                updated = await session.update_contact(
                    contact_id, name=clean_name, name_norm=normalize_name(clean_name), phone=clean_tel, note=clean_note
                )
                if updated is None:
                    raise ContactNameTaken()
                await session.record_activity(
                    membership_id=actor.membership_id,
                    action="contact.updated",
                    subject_type="contact",
                    subject_id=contact_id,
                )
                today = self._today()
                return contact_body(updated, books_of(await session.payable_entries_of(contact_id), today))

            return await idempotency.run_once(
                session,
                key=key,
                operation=UPDATE_CONTACT.name,
                user_id=user_id,
                request={"contact": str(contact_id), "name": clean_name, "phone": clean_tel, "note": clean_note},
                action=apply,
            )

    async def set_archived(
        self, user_id: UUID, shop_id: UUID, contact_id: UUID, *, archived: bool, request_key: str | None
    ) -> dict[str, Any]:
        op = ARCHIVE_CONTACT if archived else UNARCHIVE_CONTACT
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, op)
            key = idempotency.validate_key(request_key)
            await require_writable(session, self._today(), new_credit=False)

            async def apply() -> dict[str, Any]:
                contact = await session.get_contact(contact_id, for_update=True)
                if contact is None:
                    raise NotFound()
                today = self._today()
                books = books_of(await session.payable_entries_of(contact_id), today)
                if archived and any(book["balance"] for book in books):
                    # An account that is not settled stays in sight, whichever side of zero it is on.
                    raise ContactHasBalance()
                wanted = rules.ARCHIVED if archived else rules.ACTIVE
                if contact.status != wanted:
                    contact = await session.set_contact_status(contact_id, wanted)
                    await session.record_activity(
                        membership_id=actor.membership_id,
                        action="contact.archived" if archived else "contact.unarchived",
                        subject_type="contact",
                        subject_id=contact_id,
                    )
                return contact_body(contact, books)

            return await idempotency.run_once(
                session,
                key=key,
                operation=op.name,
                user_id=user_id,
                request={"contact": str(contact_id)},
                action=apply,
            )

    async def add_entry(
        self,
        user_id: UUID,
        shop_id: UUID,
        contact_id: UUID,
        *,
        kind: str,
        amount: int,
        currency: str | None,
        note: str | None,
        promised_date: date | None,
        request_key: str | None,
    ) -> dict[str, Any]:
        """Record what the shop owes a contact (a credit or an opening balance), or a payment back."""
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, RECORD_PAYABLE)
            key = idempotency.validate_key(request_key)
            if kind not in rules.DIRECT_KINDS:
                raise ValidationFailed({"kind": "must be credit, opening or payment"})
            require_permission(actor, _ENTRY_PERMISSION[kind])
            fields: dict[str, str] = {}
            clean_note: str | None = None
            try:
                rules.amount(amount)
            except ValueError as error:
                fields["amount"] = str(error)
            try:
                clean_note = rules.note(note)
            except ValueError as error:
                fields["note"] = str(error)
            if kind == rules.PAYMENT and promised_date is not None:
                fields["promised_date"] = "only a debt has a promised date"
            if kind != rules.PAYMENT and promised_date is None:
                fields["promised_date"] = "a debt needs the date the shop has undertaken to pay by"
            if fields:
                raise ValidationFailed(fields)
            money = await require_money(session, currency)
            await require_writable(session, self._today(), new_credit=False)

            async def apply() -> dict[str, Any]:
                contact = await session.get_contact(contact_id, for_update=True)
                if contact is None:
                    raise NotFound()
                if contact.status == rules.ARCHIVED:
                    raise ContactArchived()
                records = await session.payable_entries_of(contact_id)
                entries = _entries(records)
                now = ledger.not_before(entries, self._now())
                if promised_date is not None:
                    problem = validate_promise_date(tashkent_date(now), promised_date)
                    if problem is not None:
                        raise ValidationFailed({"promised_date": problem.value})
                refusal = ledger.validate_new_entry(
                    ledger.in_currency(entries, money), EntryKind(kind), amount, advance_cap=_ADVANCE_CAP
                )
                if refusal is not None:
                    raise _refuse(refusal)
                entry_id = await append_entry_in(
                    session,
                    actor.membership_id,
                    contact_id,
                    kind=kind,
                    amount=amount,
                    currency=money.value,
                    note=clean_note,
                    reverses_id=None,
                    promised_date=promised_date,
                    now=now,
                )
                await session.record_activity(
                    membership_id=actor.membership_id,
                    action=f"payable.{kind}_recorded",
                    subject_type="contact",
                    subject_id=contact_id,
                    detail={"amount": amount, "currency": money.value},
                )
                stored = await session.get_payable_entry(entry_id)
                assert stored is not None
                today = self._today()
                return {
                    "entry": entry_body(stored),
                    "contact": contact_body(contact, books_of(await session.payable_entries_of(contact_id), today)),
                }

            return await idempotency.run_once(
                session,
                key=key,
                operation=RECORD_PAYABLE.name,
                user_id=user_id,
                request={
                    "contact": str(contact_id),
                    "kind": kind,
                    "amount": amount,
                    "currency": money.value,
                    "note": clean_note,
                    "promised_date": None if promised_date is None else promised_date.isoformat(),
                },
                action=apply,
            )

    async def cancel_entry(
        self, user_id: UUID, shop_id: UUID, contact_id: UUID, entry_id: UUID, *, reason: str, request_key: str | None
    ) -> dict[str, Any]:
        """Cancel an entry of a contact's account, saying why. The entry itself stays."""
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, REVERSE_PAYABLE)
            key = idempotency.validate_key(request_key)
            try:
                why = rules.reason(reason)
            except ValueError as error:
                raise ValidationFailed({"reason": str(error)}) from error
            await require_writable(session, self._today(), new_credit=False)

            async def apply() -> dict[str, Any]:
                contact = await session.get_contact(contact_id, for_update=True)
                if contact is None:
                    raise NotFound()
                entry = await session.get_payable_entry(entry_id)
                if entry is None or entry.contact_id != contact_id:
                    raise NotFound()
                refusal = rules.may_cancel(entry.kind, is_reversed=entry.is_reversed)
                if refusal is not None:
                    raise PayableEntryRefused(refusal)
                require_permission(actor, _ENTRY_PERMISSION[entry.kind])
                records = await session.payable_entries_of(contact_id)
                entries = _entries(records)
                now = ledger.not_before(entries, self._now())
                refused = ledger.validate_new_entry(
                    ledger.in_currency(entries, Currency(entry.currency)),
                    EntryKind.REVERSAL,
                    entry.amount,
                    reverses_id=entry.entry_id,
                    advance_cap=_ADVANCE_CAP,
                )
                if refused is not None:
                    raise _refuse(refused)
                reversal_id = await append_entry_in(
                    session,
                    actor.membership_id,
                    contact_id,
                    kind=rules.REVERSAL,
                    amount=entry.amount,
                    currency=entry.currency,
                    note=why,
                    reverses_id=entry.entry_id,
                    promised_date=None,
                    now=now,
                )
                await session.record_activity(
                    membership_id=actor.membership_id,
                    action="payable.entry_cancelled",
                    subject_type="contact",
                    subject_id=contact_id,
                    detail={"amount": entry.amount, "currency": entry.currency, "kind": entry.kind},
                )
                reversal = await session.get_payable_entry(reversal_id)
                assert reversal is not None
                today = self._today()
                return {
                    "entry": entry_body(reversal),
                    "contact": contact_body(contact, books_of(await session.payable_entries_of(contact_id), today)),
                }

            return await idempotency.run_once(
                session,
                key=key,
                operation=REVERSE_PAYABLE.name,
                user_id=user_id,
                request={"contact": str(contact_id), "entry": str(entry_id), "reason": why},
                action=apply,
            )

    async def summary(self, user_id: UUID, shop_id: UUID) -> dict[str, Any]:
        """Both sides of the counter: what customers owe the shop, and what the shop owes its contacts.

        The receivables are figures the database keeps (`shop_totals`); the payables are every entry of
        every contact, read once and worked out here by the ledger, one account at a time -- the kept
        figure the customers have is the documented next step, not a Phase 1 difference in the rules.
        """
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, PAYABLES_SUMMARY)
            await require_viewable(session, actor, self._today())
            today = self._today()
            receivables = [_receivable_row(Currency.UZS.value, await session.shop_totals(today))]
            if await dollars_on(session):
                receivables.append(_receivable_row(Currency.USD.value, await session.shop_totals(today, Currency.USD)))
            payables: dict[str, dict[str, int]] = {}
            grouped: dict[UUID, list[PayableEntryRecord]] = {}
            for record in await session.all_payable_entries():
                grouped.setdefault(record.contact_id, []).append(record)
            for records in grouped.values():
                for book in books_of(records, today):
                    row = payables.setdefault(
                        book["currency"], {"owed": 0, "overdue": 0, "due_today": 0, "advance": 0, "contacts": 0}
                    )
                    row["owed"] += max(book["balance"], 0)
                    row["overdue"] += book["overdue"]
                    row["due_today"] += book["due_today"]
                    row["advance"] += book["advance"]
                    row["contacts"] += 1
            return {
                "receivables": receivables,
                "payables": [
                    {"currency": currency.value, **payables[currency.value]}
                    for currency in Currency
                    if currency.value in payables
                ],
            }


def _receivable_row(currency: str, totals: ShopTotals) -> dict[str, Any]:
    return {
        "currency": currency,
        "outstanding": totals.outstanding,
        "debtors": totals.debtors,
        "overdue": totals.overdue_amount,
        "overdue_customers": totals.overdue_customers,
        "due_today": totals.due_today_amount,
    }
