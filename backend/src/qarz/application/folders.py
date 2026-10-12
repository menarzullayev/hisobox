"""Folders: the names a shop gives groups of its customers (Phase 1 of the qarzapp port).

A folder holds nothing but its name. A customer either sits in one or does not: moving them is the
customer's own update (`customers.update`), and deleting a folder leaves its customers where they are,
unfiled, which is what `customer.folder_id ON DELETE SET NULL` says.

There is no platform switch here: the folders are a ported core feature, not an expansion module.
"""

from collections.abc import Callable
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID, uuid4

from qarz.application import idempotency
from qarz.application.customers import require_viewable, require_writable
from qarz.application.errors import AppError, NotFound, ValidationFailed
from qarz.application.operations import operation
from qarz.application.payables_ports import FolderRecord
from qarz.application.ports import Storage
from qarz.application.shops import require_member
from qarz.domain import payables as rules
from qarz.domain.access import Capability
from qarz.domain.names import normalize_name
from qarz.domain.promise import tashkent_date

LIST_FOLDERS = operation("folders.list", Capability.RECORD)
CREATE_FOLDER = operation("folders.create", Capability.MANAGE)
UPDATE_FOLDER = operation("folders.update", Capability.MANAGE)
DELETE_FOLDER = operation("folders.delete", Capability.MANAGE)


class FolderNameTaken(AppError):
    code = "FOLDER_NAME_TAKEN"


def folder_body(folder: FolderRecord) -> dict[str, Any]:
    return {
        "id": str(folder.folder_id),
        "name": folder.name,
        "customers": folder.customers,
        "created_at": folder.created_at.isoformat(),
    }


class FolderService:
    def __init__(self, storage: Storage, now: Callable[[], datetime] | None = None) -> None:
        self._storage = storage
        self._now = now or (lambda: datetime.now(UTC))

    def _today(self) -> date:
        return tashkent_date(self._now())

    async def list(self, user_id: UUID, shop_id: UUID) -> dict[str, Any]:
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, LIST_FOLDERS)
            await require_viewable(session, actor, self._today())
            return {"folders": [folder_body(folder) for folder in await session.list_folders()]}

    async def create(self, user_id: UUID, shop_id: UUID, *, name: str, request_key: str | None) -> dict[str, Any]:
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, CREATE_FOLDER)
            key = idempotency.validate_key(request_key)
            clean_name = _clean(name)
            await require_writable(session, self._today(), new_credit=False)

            async def apply() -> dict[str, Any]:
                folder = await session.insert_folder(
                    folder_id=uuid4(), name=clean_name, name_norm=normalize_name(clean_name)
                )
                if folder is None:
                    raise FolderNameTaken()
                await session.record_activity(
                    membership_id=actor.membership_id,
                    action="folder.created",
                    subject_type="folder",
                    subject_id=folder.folder_id,
                )
                return folder_body(folder)

            return await idempotency.run_once(
                session,
                key=key,
                operation=CREATE_FOLDER.name,
                user_id=user_id,
                request={"name": clean_name},
                action=apply,
            )

    async def update(
        self, user_id: UUID, shop_id: UUID, folder_id: UUID, *, name: str, request_key: str | None
    ) -> dict[str, Any]:
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, UPDATE_FOLDER)
            key = idempotency.validate_key(request_key)
            clean_name = _clean(name)
            await require_writable(session, self._today(), new_credit=False)

            async def apply() -> dict[str, Any]:
                if await session.get_folder(folder_id) is None:
                    raise NotFound()
                folder = await session.rename_folder(folder_id, name=clean_name, name_norm=normalize_name(clean_name))
                if folder is None:
                    raise FolderNameTaken()
                await session.record_activity(
                    membership_id=actor.membership_id,
                    action="folder.updated",
                    subject_type="folder",
                    subject_id=folder_id,
                )
                return folder_body(folder)

            return await idempotency.run_once(
                session,
                key=key,
                operation=UPDATE_FOLDER.name,
                user_id=user_id,
                request={"folder": str(folder_id), "name": clean_name},
                action=apply,
            )

    async def delete(self, user_id: UUID, shop_id: UUID, folder_id: UUID, *, request_key: str | None) -> dict[str, Any]:
        async with self._storage.tenant(shop_id) as session:
            actor = await require_member(session, user_id, DELETE_FOLDER)
            key = idempotency.validate_key(request_key)
            await require_writable(session, self._today(), new_credit=False)

            async def apply() -> dict[str, Any]:
                if await session.get_folder(folder_id) is None:
                    raise NotFound()
                await session.delete_folder(folder_id)
                await session.record_activity(
                    membership_id=actor.membership_id,
                    action="folder.deleted",
                    subject_type="folder",
                    subject_id=folder_id,
                )
                return {"deleted": True}

            return await idempotency.run_once(
                session,
                key=key,
                operation=DELETE_FOLDER.name,
                user_id=user_id,
                request={"folder": str(folder_id)},
                action=apply,
            )


def _clean(name: str) -> str:
    try:
        return rules.folder_name(name)
    except ValueError as error:
        raise ValidationFailed({"name": str(error)}) from error
