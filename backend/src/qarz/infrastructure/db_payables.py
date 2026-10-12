"""PostgreSQL storage of the payables and the folders (Phase 1 of the qarzapp port).

`PgTenantSession` inherits `PayablesStatements`, so these statements run in the tenant transaction of the
request, under the same row-level security as everything else. SQL here is composed only from the
module-level constants below, with every value bound as a parameter (tests/test_sql_composition.py).

The payable ledger mirrors the customers' one in shape and differs in direction: `credit` is what the shop
has undertaken to pay, `payment` is what it has paid back. Nothing derived is stored here -- no balance,
no overdue amount, nothing paid ahead: `qarz.domain.ledger` computes all of it from the entries, as it
does for a customer (INV-2). The summary reads every entry of the shop and computes it the same way, one
account at a time; a kept table of open debts, as the customers' side has since migration 0026, is the
documented path once the book grows bigger than the reading of it.
"""

from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncConnection

from qarz.application.payables_ports import ContactRecord, FolderRecord, PayableEntryRecord

_CONTACT_COLUMNS = "c.id, c.name, c.name_norm, c.phone, c.note, c.status, c.created_at"
_CONTACT_BY_ID = f"SELECT {_CONTACT_COLUMNS} FROM contact c WHERE c.id = :id"
_CONTACT_LOCKED = f"{_CONTACT_BY_ID} FOR UPDATE OF c"

# A page of contacts in name order, exactly as the suppliers are read (db_stock.py).
_CONTACT_PAGE = (
    f"SELECT {_CONTACT_COLUMNS} FROM contact c WHERE c.status = :status "
    "  AND (CAST(:name AS text) IS NULL OR c.name_norm LIKE CAST(:name AS text)) "
    "  AND (CAST(:after_name AS text) IS NULL "
    "       OR (c.name_norm, c.id) > (CAST(:after_name AS text), CAST(:after_id AS uuid))) "
    "ORDER BY c.name_norm, c.id LIMIT :limit"
)

# An entry of a payable, with whether a reversal cancels it (INV-2), as `_ENTRY_COLUMNS` of db_stock.py.
_ENTRY_COLUMNS = (
    "e.id, e.contact_id, e.seq, e.kind, e.amount, e.currency, e.note, e.reverses_id, e.promised_date, "
    "e.author_id, e.created_at, "
    "EXISTS (SELECT 1 FROM payable_entry r WHERE r.reverses_id = e.id) AS is_reversed"
)
_ENTRY_FROM = "FROM payable_entry e"
_ENTRY_BY_ID = f"SELECT {_ENTRY_COLUMNS} {_ENTRY_FROM} WHERE e.id = :id"
_ENTRIES_OF = f"SELECT {_ENTRY_COLUMNS} {_ENTRY_FROM} WHERE e.contact_id = :contact ORDER BY e.seq"
# Every entry of the shop, contact by contact and in each account's order: what the summary is read from.
_ENTRIES_ALL = f"SELECT {_ENTRY_COLUMNS} {_ENTRY_FROM} ORDER BY e.contact_id, e.seq"

_FOLDER_COLUMNS = "f.id, f.name, f.name_norm, f.created_at"
# Every folder with how many customers sit in it: the count is what the shop sees on the folder's row.
_FOLDERS = (
    f"SELECT {_FOLDER_COLUMNS}, (SELECT count(*) FROM customer cu WHERE cu.folder_id = f.id) AS customers FROM folder f"
)


def _contact(row: Any) -> ContactRecord:
    return ContactRecord(
        contact_id=row.id,
        name=row.name,
        name_norm=row.name_norm,
        phone=row.phone,
        note=row.note,
        status=row.status,
        created_at=row.created_at,
    )


def _entry(row: Any) -> PayableEntryRecord:
    return PayableEntryRecord(
        entry_id=row.id,
        contact_id=row.contact_id,
        seq=int(row.seq),
        kind=row.kind,
        amount=int(row.amount),
        currency=row.currency,
        note=row.note,
        reverses_id=row.reverses_id,
        promised_date=row.promised_date,
        author_id=row.author_id,
        created_at=row.created_at,
        is_reversed=bool(row.is_reversed),
    )


def _folder(row: Any) -> FolderRecord:
    return FolderRecord(
        folder_id=row.id,
        name=row.name,
        name_norm=row.name_norm,
        created_at=row.created_at,
        customers=int(row.customers),
    )


class PayablesStatements:
    """What the contacts, the payable ledger and the folders ask of PostgreSQL (migration 0054)."""

    def __init__(self, conn: AsyncConnection, shop_id: UUID) -> None:
        self._conn = conn
        self._shop_id = shop_id

    # --- contacts -------------------------------------------------------------------------------------

    async def insert_contact(
        self, *, contact_id: UUID, name: str, name_norm: str, phone: str | None, note: str | None
    ) -> ContactRecord | None:
        row = (
            await self._conn.execute(
                text(
                    "INSERT INTO contact AS c (id, shop_id, name, name_norm, phone, note) "
                    "VALUES (:id, :shop_id, :name, :norm, :phone, :note) "
                    f"ON CONFLICT (shop_id, name_norm) DO NOTHING RETURNING {_CONTACT_COLUMNS}"
                ),
                {
                    "id": contact_id,
                    "shop_id": self._shop_id,
                    "name": name,
                    "norm": name_norm,
                    "phone": phone,
                    "note": note,
                },
            )
        ).first()
        return None if row is None else _contact(row)

    async def get_contact(self, contact_id: UUID, *, for_update: bool) -> ContactRecord | None:
        row = (
            await self._conn.execute(
                text(_CONTACT_LOCKED if for_update else _CONTACT_BY_ID),
                {"id": contact_id},
            )
        ).first()
        return None if row is None else _contact(row)

    async def update_contact(
        self, contact_id: UUID, *, name: str, name_norm: str, phone: str | None, note: str | None
    ) -> ContactRecord | None:
        try:
            # A savepoint, so that a name already taken leaves the transaction usable.
            async with self._conn.begin_nested():
                row = (
                    await self._conn.execute(
                        text(
                            "UPDATE contact AS c SET name = :name, name_norm = :norm, phone = :phone, note = :note "
                            f"WHERE c.id = :id RETURNING {_CONTACT_COLUMNS}"
                        ),
                        {"id": contact_id, "name": name, "norm": name_norm, "phone": phone, "note": note},
                    )
                ).one()
        except IntegrityError as error:
            if "contact_shop_id_name_norm_key" in str(error.orig):
                return None
            raise
        return _contact(row)

    async def set_contact_status(self, contact_id: UUID, status: str) -> ContactRecord:
        row = (
            await self._conn.execute(
                text(f"UPDATE contact AS c SET status = :status WHERE c.id = :id RETURNING {_CONTACT_COLUMNS}"),
                {"id": contact_id, "status": status},
            )
        ).one()
        return _contact(row)

    async def search_contacts(
        self, *, name_part: str | None, status: str, after: tuple[str, UUID] | None, limit: int
    ) -> list[ContactRecord]:
        rows = (
            await self._conn.execute(
                text(_CONTACT_PAGE),
                {
                    "status": status,
                    "name": None if not name_part else f"%{name_part}%",
                    "after_name": after[0] if after else None,
                    "after_id": after[1] if after else None,
                    "limit": limit,
                },
            )
        ).all()
        return [_contact(row) for row in rows]

    # --- the payable ledger ---------------------------------------------------------------------------

    async def last_payable_seq(self, contact_id: UUID) -> int:
        row = (
            await self._conn.execute(
                text("SELECT coalesce(max(e.seq), 0) AS seq FROM payable_entry e WHERE e.contact_id = :id"),
                {"id": contact_id},
            )
        ).one()
        return int(row.seq)

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
    ) -> None:
        await self._conn.execute(
            text(
                "INSERT INTO payable_entry (id, shop_id, contact_id, seq, kind, amount, currency, note, "
                "  reverses_id, promised_date, author_id, created_at) "
                "VALUES (:id, :shop_id, :contact_id, :seq, :kind, :amount, :currency, :note, :reverses_id, "
                "  :promised_date, :author_id, :created_at)"
            ),
            {
                "id": entry_id,
                "shop_id": self._shop_id,
                "contact_id": contact_id,
                "seq": seq,
                "kind": kind,
                "amount": amount,
                "currency": currency,
                "note": note,
                "reverses_id": reverses_id,
                "promised_date": promised_date,
                "author_id": author_id,
                "created_at": created_at,
            },
        )

    async def payable_entries_of(self, contact_id: UUID) -> list[PayableEntryRecord]:
        rows = (await self._conn.execute(text(_ENTRIES_OF), {"contact": contact_id})).all()
        return [_entry(row) for row in rows]

    async def all_payable_entries(self) -> list[PayableEntryRecord]:
        """Every entry of the shop, by contact and in each account's own order: what the summary is
        computed from (see the module's docstring on why nothing here adds an amount up)."""
        rows = (await self._conn.execute(text(_ENTRIES_ALL))).all()
        return [_entry(row) for row in rows]

    async def get_payable_entry(self, entry_id: UUID) -> PayableEntryRecord | None:
        row = (await self._conn.execute(text(_ENTRY_BY_ID), {"id": entry_id})).first()
        return None if row is None else _entry(row)

    # --- folders --------------------------------------------------------------------------------------

    async def insert_folder(self, *, folder_id: UUID, name: str, name_norm: str) -> FolderRecord | None:
        row = (
            await self._conn.execute(
                text(
                    "INSERT INTO folder AS f (id, shop_id, name, name_norm) VALUES (:id, :shop_id, :name, :norm) "
                    f"ON CONFLICT (shop_id, name_norm) DO NOTHING RETURNING {_FOLDER_COLUMNS}, "
                    "(SELECT 0) AS customers"
                ),
                {"id": folder_id, "shop_id": self._shop_id, "name": name, "norm": name_norm},
            )
        ).first()
        return None if row is None else _folder(row)

    async def get_folder(self, folder_id: UUID) -> FolderRecord | None:
        row = (
            await self._conn.execute(
                text(f"{_FOLDERS} WHERE f.id = :id"),
                {"id": folder_id},
            )
        ).first()
        return None if row is None else _folder(row)

    async def rename_folder(self, folder_id: UUID, *, name: str, name_norm: str) -> FolderRecord | None:
        try:
            # A savepoint, so that a name already taken leaves the transaction usable.
            async with self._conn.begin_nested():
                row = (
                    await self._conn.execute(
                        text(
                            "UPDATE folder AS f SET name = :name, name_norm = :norm WHERE f.id = :id "
                            f"RETURNING {_FOLDER_COLUMNS}, (SELECT 0) AS customers"
                        ),
                        {"id": folder_id, "name": name, "norm": name_norm},
                    )
                ).one()
        except IntegrityError as error:
            if "folder_shop_id_name_norm_key" in str(error.orig):
                return None
            raise
        return _folder(row)

    async def delete_folder(self, folder_id: UUID) -> bool:
        """Delete a folder; its customers stay where they are, unfiled (migration 0054 sets them free)."""
        row = (
            await self._conn.execute(
                text("DELETE FROM folder WHERE id = :id RETURNING id"),
                {"id": folder_id},
            )
        ).first()
        return row is not None

    async def list_folders(self) -> list[FolderRecord]:
        rows = (await self._conn.execute(text(_FOLDERS))).all()
        return [_folder(row) for row in rows]
