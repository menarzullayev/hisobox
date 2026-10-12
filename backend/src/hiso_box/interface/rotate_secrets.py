"""Re-encrypt the administrators' stored second-factor secrets under the current server secret
(operations runbook 4).

Run with:  python -m hiso_box.interface.rotate_secrets

Reads `HB_SECRETS_KEY` (the new secret) and `HB_SECRETS_KEY_PREVIOUS` (the one it replaces) from the
environment, like the application, and connects with `HB_ADMIN_DATABASE_URL`, the administrators' role.
Everything happens in one transaction and the command can be run again safely. It prints three counts
and, for secrets neither key could read, the user identifiers of those administrator accounts: they must
be enrolled again (runbook 7). It never prints a secret or a key. The exit status is 1 when some secret
could not be read, 2 when the configuration is unusable.
"""

import argparse
import asyncio
import sys

from hiso_box.application.secret_rotation import RotationResult, rotate_admin_secrets
from hiso_box.infrastructure.db import Database
from hiso_box.infrastructure.secret_box import SecretBox
from hiso_box.infrastructure.settings import Settings


async def run(settings: Settings | None = None) -> RotationResult:
    settings = settings or Settings()
    # Built before the database is touched: a missing or too short secret stops here.
    cipher = SecretBox(settings.secrets_key, settings.secrets_key_previous)
    if not settings.admin_database_url:
        raise ValueError("HB_ADMIN_DATABASE_URL is not set")
    # The second-factor secrets are readable only by the administrators' role.
    database = Database(settings.admin_database_url)
    try:
        return await rotate_admin_secrets(database, cipher)
    finally:
        await database.dispose()


def report(result: RotationResult) -> str:
    lines = [
        f"re-encrypted under the current key: {result.reencrypted}",
        f"already under the current key: {result.already_current}",
        f"readable under neither key: {len(result.unreadable)}",
    ]
    lines += [f"  must enrol again: administrator account {user_id}" for user_id in result.unreadable]
    return "\n".join(lines) + "\n"


def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()
    try:
        result = asyncio.run(run())
    except ValueError as error:
        # The message names the setting's problem ("too short"), never its value.
        sys.stderr.write(f"cannot rotate: {error}\n")
        raise SystemExit(2) from None
    sys.stdout.write(report(result))
    if result.unreadable:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
