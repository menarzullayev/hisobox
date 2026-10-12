"""HTTP routes of "Men qarzdarman": the contacts the shop owes, their accounts, and the folders of
customers (Phase 1 of the qarzapp port). Each route is bound to a registered operation.

Nothing here is behind a platform switch: the debt core is a ported core feature, not an expansion
module. No route answers with a response model -- a write may answer with a result an earlier version
of the code stored (ADR-006), and these reads are young enough that a closed model would only refuse
what the services have already checked.
"""

from collections.abc import Awaitable, Callable
from datetime import date
from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, FastAPI, Query
from pydantic import BaseModel, ConfigDict, Field

from qarz.application.folders import (
    CREATE_FOLDER,
    DELETE_FOLDER,
    LIST_FOLDERS,
    UPDATE_FOLDER,
    FolderService,
)
from qarz.application.payables import (
    ARCHIVE_CONTACT,
    CREATE_CONTACT,
    LIST_CONTACTS,
    PAYABLES_SUMMARY,
    READ_CONTACT,
    RECORD_PAYABLE,
    REVERSE_PAYABLE,
    UNARCHIVE_CONTACT,
    UPDATE_CONTACT,
    ContactService,
)
from qarz.interface.shops_api import IdempotencyKey

CurrentUser = Callable[..., Awaitable[UUID]]


class ContactBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    name: str = Field(max_length=200)
    phone: str | None = Field(default=None, max_length=40)
    note: str | None = Field(default=None, max_length=400)


class PayableEntryBody(BaseModel):
    # Not strict: a date arrives as a string. `amount` stays strict so "45000" or 45000.0 is refused.
    model_config = ConfigDict(extra="forbid")

    # "credit" (goods taken on credit, money borrowed), "opening" (what the shop already owed) or
    # "payment" (money paid back).
    kind: str = Field(max_length=20)
    amount: Annotated[int, Field(strict=True)]
    # "UZS" (the default) or, in a shop that works in dollars, "USD": `amount` is then whole cents.
    currency: str | None = Field(default=None, max_length=3)
    note: str | None = Field(default=None, max_length=400)
    # The date the shop has undertaken to have paid by: required on a debt, absent on a payment.
    promised_date: date | None = None


class FolderBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    name: str = Field(max_length=200)


class PayableCancellationBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    reason: str = Field(max_length=400)


def add_payables_routes(
    app: FastAPI,
    contacts: ContactService,
    folders: FolderService,
    current_user: CurrentUser,
) -> None:
    user = Annotated[UUID, Depends(current_user)]
    people = "/api/v1/shops/{shop_id}/contacts"
    groups = "/api/v1/shops/{shop_id}/folders"

    # --- contacts ("Men qarzdorman") ------------------------------------------------------------------

    @app.get(people, name=LIST_CONTACTS.name)
    async def list_contacts(
        shop_id: UUID,
        user_id: user,
        q: Annotated[str | None, Query()] = None,
        status: Annotated[str, Query()] = "active",
        cursor: Annotated[str | None, Query(max_length=400)] = None,
        limit: Annotated[int, Query()] = 50,
    ) -> dict[str, Any]:
        return await contacts.list(user_id, shop_id, query=q, status=status, cursor=cursor, limit=limit)

    @app.post(people, name=CREATE_CONTACT.name, status_code=201)
    async def create_contact(
        shop_id: UUID, body: ContactBody, user_id: user, idempotency_key: IdempotencyKey = None
    ) -> dict[str, Any]:
        return await contacts.create(
            user_id, shop_id, name=body.name, phone=body.phone, note=body.note, request_key=idempotency_key
        )

    @app.get(people + "/{contact_id}", name=READ_CONTACT.name)
    async def read_contact(
        shop_id: UUID,
        contact_id: UUID,
        user_id: user,
        cursor: Annotated[str | None, Query(max_length=400)] = None,
        limit: Annotated[int, Query()] = 50,
    ) -> dict[str, Any]:
        return await contacts.detail(user_id, shop_id, contact_id, cursor=cursor, limit=limit)

    @app.put(people + "/{contact_id}", name=UPDATE_CONTACT.name)
    async def update_contact(
        shop_id: UUID,
        contact_id: UUID,
        body: ContactBody,
        user_id: user,
        idempotency_key: IdempotencyKey = None,
    ) -> dict[str, Any]:
        # Replaces the name, phone and note as a whole: the account is untouched.
        return await contacts.update(
            user_id,
            shop_id,
            contact_id,
            name=body.name,
            phone=body.phone,
            note=body.note,
            request_key=idempotency_key,
        )

    @app.post(people + "/{contact_id}/archive", name=ARCHIVE_CONTACT.name)
    async def archive_contact(
        shop_id: UUID, contact_id: UUID, user_id: user, idempotency_key: IdempotencyKey = None
    ) -> dict[str, Any]:
        return await contacts.set_archived(user_id, shop_id, contact_id, archived=True, request_key=idempotency_key)

    @app.post(people + "/{contact_id}/unarchive", name=UNARCHIVE_CONTACT.name)
    async def unarchive_contact(
        shop_id: UUID, contact_id: UUID, user_id: user, idempotency_key: IdempotencyKey = None
    ) -> dict[str, Any]:
        return await contacts.set_archived(user_id, shop_id, contact_id, archived=False, request_key=idempotency_key)

    @app.post(people + "/{contact_id}/entries", name=RECORD_PAYABLE.name, status_code=201)
    async def record_payable(
        shop_id: UUID, contact_id: UUID, body: PayableEntryBody, user_id: user, idempotency_key: IdempotencyKey = None
    ) -> dict[str, Any]:
        return await contacts.add_entry(
            user_id,
            shop_id,
            contact_id,
            kind=body.kind,
            amount=body.amount,
            currency=body.currency,
            note=body.note,
            promised_date=body.promised_date,
            request_key=idempotency_key,
        )

    @app.post(people + "/{contact_id}/entries/{entry_id}/cancel", name=REVERSE_PAYABLE.name, status_code=201)
    async def cancel_payable(
        shop_id: UUID,
        contact_id: UUID,
        entry_id: UUID,
        body: PayableCancellationBody,
        user_id: user,
        idempotency_key: IdempotencyKey = None,
    ) -> dict[str, Any]:
        return await contacts.cancel_entry(
            user_id, shop_id, contact_id, entry_id, reason=body.reason, request_key=idempotency_key
        )

    @app.get("/api/v1/shops/{shop_id}/payables/summary", name=PAYABLES_SUMMARY.name)
    async def payables_summary(shop_id: UUID, user_id: user) -> dict[str, Any]:
        return await contacts.summary(user_id, shop_id)

    # --- folders --------------------------------------------------------------------------------------

    @app.get(groups, name=LIST_FOLDERS.name)
    async def list_folders(shop_id: UUID, user_id: user) -> dict[str, Any]:
        return await folders.list(user_id, shop_id)

    @app.post(groups, name=CREATE_FOLDER.name, status_code=201)
    async def create_folder(
        shop_id: UUID, body: FolderBody, user_id: user, idempotency_key: IdempotencyKey = None
    ) -> dict[str, Any]:
        return await folders.create(user_id, shop_id, name=body.name, request_key=idempotency_key)

    @app.patch(groups + "/{folder_id}", name=UPDATE_FOLDER.name)
    async def update_folder(
        shop_id: UUID,
        folder_id: UUID,
        body: FolderBody,
        user_id: user,
        idempotency_key: IdempotencyKey = None,
    ) -> dict[str, Any]:
        return await folders.update(user_id, shop_id, folder_id, name=body.name, request_key=idempotency_key)

    @app.delete(groups + "/{folder_id}", name=DELETE_FOLDER.name)
    async def delete_folder(
        shop_id: UUID, folder_id: UUID, user_id: user, idempotency_key: IdempotencyKey = None
    ) -> dict[str, Any]:
        return await folders.delete(user_id, shop_id, folder_id, request_key=idempotency_key)
