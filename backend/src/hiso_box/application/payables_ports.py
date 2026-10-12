"""What the payables and the folders ask of storage (Phase 1 of the qarzapp port).

A part of `hiso_box.application.ports.TenantSession`, kept in a file of its own so that modules built at the
same time do not all write into one. Every method runs inside the shop's transaction and row-level
security, like the rest of a tenant session: a contact, an entry and a folder of another shop are not
there to be read, and writing one is refused by the policy.
"""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Protocol
from uuid import UUID


@dataclass(frozen=True)
class ContactRecord:
    """A person the shop owes: a supplier it buys from on credit, anyone it has borrowed from."""

    contact_id: UUID
    name: str
    name_norm: str
    phone: str | None
    note: str | None
    status: str
    created_at: datetime


@dataclass(frozen=True)
class PayableEntryRecord:
    """One entry of a contact's account, as the rules and the API read it.

    `promised_date` is when the shop has undertaken to have paid, carried by a debt entry itself: nothing
    here moves one yet (Phase 1). It is None on a payment and on a reversal.
    """

    entry_id: UUID
    contact_id: UUID
    seq: int
    kind: str
    amount: int
    currency: str
    note: str | None
    reverses_id: UUID | None
    promised_date: date | None
    author_id: UUID
    created_at: datetime
    is_reversed: bool = False


@dataclass(frozen=True)
class FolderRecord:
    """A name the shop gives a group of its customers, with how many sit in it."""

    folder_id: UUID
    name: str
    name_norm: str
    created_at: datetime
    customers: int = 0


class PayablesSession(Protocol):
    # --- contacts -------------------------------------------------------------------------------------

    async def insert_contact(
        self, *, contact_id: UUID, name: str, name_norm: str, phone: str | None, note: str | None
    ) -> ContactRecord | None:
        """Add a contact. None when the shop already has one of that name."""
        ...

    async def get_contact(self, contact_id: UUID, *, for_update: bool) -> ContactRecord | None:
        """With `for_update` the row stays locked until the transaction ends: one writer per account."""
        ...

    async def update_contact(
        self, contact_id: UUID, *, name: str, name_norm: str, phone: str | None, note: str | None
    ) -> ContactRecord | None:
        """Replace the contact's name, phone and note as a whole. None when the new name is taken."""
        ...

    async def set_contact_status(self, contact_id: UUID, status: str) -> ContactRecord: ...

    async def search_contacts(
        self, *, name_part: str | None, status: str, after: tuple[str, UUID] | None, limit: int
    ) -> list[ContactRecord]:
        """Contacts in name order; `after` is the paging position, as for the customers."""
        ...

    # --- the payable ledger ---------------------------------------------------------------------------

    async def last_payable_seq(self, contact_id: UUID) -> int:
        """The highest sequence number of the contact's account, 0 when it has none."""
        ...

    async def append_payable_entry(
        self,
        *,
        entry_id: UUID,
        contact_id: UUID,
        seq: int,
        kind: str,
        amount: int,
        currency: str,
        note: str | None,
        reverses_id: UUID | None,
        promised_date: date | None,
        author_id: UUID,
        created_at: datetime,
    ) -> None: ...

    async def payable_entries_of(self, contact_id: UUID) -> list[PayableEntryRecord]:
        """Every entry of the account, of every currency, in `seq` order: what the ledger is given."""
        ...

    async def all_payable_entries(self) -> list[PayableEntryRecord]:
        """Every entry of the shop, contact by contact and in each account's order: what the summary of
        what the shop owes is computed from, one account at a time."""
        ...

    async def get_payable_entry(self, entry_id: UUID) -> PayableEntryRecord | None: ...

    # --- folders --------------------------------------------------------------------------------------

    async def insert_folder(self, *, folder_id: UUID, name: str, name_norm: str) -> FolderRecord | None:
        """Add a folder. None when the shop already has one of that name."""
        ...

    async def get_folder(self, folder_id: UUID) -> FolderRecord | None: ...

    async def rename_folder(self, folder_id: UUID, *, name: str, name_norm: str) -> FolderRecord | None:
        """Rename a folder. None when the new name is taken."""
        ...

    async def delete_folder(self, folder_id: UUID) -> bool:
        """Delete a folder; the customers that sat in it stay, unfiled. False when it was not there."""
        ...

    async def list_folders(self) -> list[FolderRecord]:
        """Every folder of the shop with how many customers sit in it, by name."""
        ...
