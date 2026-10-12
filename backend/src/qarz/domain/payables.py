"""Pure rules of payables ("Men qarzdorman") and of the folders customers sit in.

A contact's account is an append-only ledger, like a customer's, seen from the shop's own side of the
counter: the shop is the one who owes. Everything derived from the entries -- the balance, what is
overdue, what has been paid ahead -- is calculated by `qarz.domain.ledger`, which knows nothing of who
the counterparty is. This module holds only what that engine does not: the names, the amounts and the
questions about one entry that have no ledger of their own.

- `credit`   what the shop has undertaken to pay: goods taken on credit, money borrowed. It owes more.
- `opening`  what the shop already owed when it started keeping this book. It owes more.
- `payment`  money paid back to the contact. It owes less.
- `reversal` cancels exactly one earlier entry, which stays as it was; the reason is its note.

A balance above zero is what the shop owes. A balance below zero is an advance: the shop has paid ahead
of what it owes, which shops do, so a payment is not limited to the debt. So'm and dollars are two books
that share one sequence per contact, as for a customer, and nothing here adds one to the other.

A folder is a name a shop gives a group of its customers. Nothing here says what a folder is for: the
rules are a name that can be told apart from another's, and nothing else.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from uuid import UUID

from qarz.domain.names import normalize_name

MAX_NAME = 80
MAX_NOTE = 200
MAX_REASON = 200
MAX_FOLDER_NAME = 40
MIN_AMOUNT = 1
MAX_AMOUNT = 1_000_000_000_000

CREDIT, OPENING, PAYMENT, REVERSAL = "credit", "opening", "payment", "reversal"
KINDS = (CREDIT, OPENING, PAYMENT, REVERSAL)
# What a person records directly on a contact's account; the reversal is written by cancelling one.
DIRECT_KINDS = frozenset({CREDIT, OPENING, PAYMENT})
# What a debt is: an entry that raises what the shop owes, and the only ones a promised date belongs to.
DEBT_KINDS = frozenset({CREDIT, OPENING})

ACTIVE, ARCHIVED = "active", "archived"


@dataclass(frozen=True)
class PayableEntry:
    """One entry as the rules below read it: enough to answer whether it may be cancelled."""

    id: UUID
    kind: str
    reverses_id: UUID | None = None


def contact_name(raw: str) -> str:
    """The name as stored and shown: trimmed, single spaces. Raises ValueError when unusable."""
    name = " ".join(raw.split())
    if not 1 <= len(name) <= MAX_NAME:
        raise ValueError(f"length must be between 1 and {MAX_NAME}")
    if not normalize_name(name):
        raise ValueError("must contain a letter or a digit")
    return name


def folder_name(raw: str) -> str:
    """A folder's name, the same way. Raises ValueError when unusable."""
    name = " ".join(raw.split())
    if not 1 <= len(name) <= MAX_FOLDER_NAME:
        raise ValueError(f"length must be between 1 and {MAX_FOLDER_NAME}")
    if not normalize_name(name):
        raise ValueError("must contain a letter or a digit")
    return name


def note(raw: str | None, *, limit: int = MAX_NOTE) -> str | None:
    """A note as stored: trimmed, None when empty. Raises ValueError when too long."""
    if raw is None:
        return None
    text = " ".join(raw.split())
    if len(text) > limit:
        raise ValueError(f"at most {limit} characters")
    return text or None


def reason(raw: str) -> str:
    """Why an entry is cancelled: required, so the book says why it changed."""
    text = " ".join(raw.split())
    if not 1 <= len(text) <= MAX_REASON:
        raise ValueError(f"between 1 and {MAX_REASON} characters")
    return text


def amount(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not MIN_AMOUNT <= value <= MAX_AMOUNT:
        raise ValueError(f"a whole amount between {MIN_AMOUNT} and {MAX_AMOUNT} of the currency's smallest unit")
    return value


def may_cancel(kind: str, *, is_reversed: bool) -> str | None:
    """Why an entry cannot be cancelled on its own, or None when it can.

    An entry of a payable is never written by anything else: there is no document here that could be
    cancelled with its goods, so nothing but the book's own rules stands in the way.
    """
    if kind == REVERSAL:
        return "CANNOT_REVERSE_REVERSAL"
    if is_reversed:
        return "ALREADY_REVERSED"
    return None


def reversed_ids(entries: Iterable[PayableEntry]) -> set[UUID]:
    """The identifiers of the entries a reversal cancels: what still stands is everything else."""
    return {entry.reverses_id for entry in entries if entry.reverses_id is not None}
