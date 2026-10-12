#!/usr/bin/env bash
# Give the database roles their passwords, from the connection settings themselves.
#
# The migrations create `hb_app`, `hb_admin` and `hb_worker` without a login (migration 0031); on a
# database host an operator then runs `ALTER ROLE ... LOGIN PASSWORD ...` for each by hand
# (deploy/production/README.md, "Database roles"). On the single host this one-shot does the same
# statement for each, and for the owner, with the password taken from the connection string the
# service will use. So the env file is the only place a password is written, the two cannot
# disagree, and changing a password is: change it in the env file, run `single-host.sh up`.
#
#   set-role-logins.sh owner         the owner (postgres), from HB_MIGRATION_URL: before the migrations
#   set-role-logins.sh application   hb_app, hb_admin, hb_worker: after the migrations, which create them
#
# Run by the `owner` and `roles` services of compose.single-host.yml. It reaches the database through
# its Unix socket (a volume shared with the `db` service), as the superuser, with no password. Safe to
# repeat. Prints role names only, never a password.
set -euo pipefail

case "${1:-}" in
owner) roles="postgres" ;;
application) roles="hb_app hb_admin hb_worker" ;;
*)
    echo "usage: set-role-logins.sh <owner|application>" >&2
    exit 64
    ;;
esac

# name_of URL / password_of URL: the user and the password of postgresql://user:password@host/...
name_of() { [[ "$1" =~ ^postgres(ql)?://([^:/@]+):[^@]*@ ]] && printf '%s' "${BASH_REMATCH[2]}"; }
password_of() {
    local raw
    [[ "$1" =~ ^postgres(ql)?://[^:/@]+:([^@]*)@ ]] || return 1
    raw="${BASH_REMATCH[2]}"
    # Percent-encoding, as a connection string writes characters such as "@" or "/".
    printf '%b' "${raw//%/\x}"
}

declare -A setting=([postgres]=HB_MIGRATION_URL [hb_app]=HB_DATABASE_URL [hb_admin]=HB_ADMIN_DATABASE_URL
    [hb_worker]=HB_WORKER_DATABASE_URL)
declare -A password=()
seen=""

for role in $roles; do
    name="${setting[$role]}"
    url="${!name:-}"
    if [ -z "$url" ]; then
        if [ "$role" = hb_admin ]; then
            # The administrators' side is optional (HB_ADMIN_TG_IDS empty): no connection, no login.
            echo "$name is empty: $role is left as it is"
            continue
        fi
        echo "error: $name is not set" >&2
        exit 1
    fi
    if [ "$(name_of "$url" || true)" != "$role" ]; then
        echo "error: $name must be a connection string of the role $role, with a password" >&2
        exit 1
    fi
    secret="$(password_of "$url")"
    if [ "${#secret}" -lt 16 ]; then
        echo "error: the password in $name is shorter than 16 characters" >&2
        exit 1
    fi
    # The roles exist so that one part cannot act as another; a shared password would undo that.
    case "$seen" in *"|$secret|"*)
        echo "error: $name repeats the password of another role" >&2
        exit 1
        ;;
    esac
    seen="$seen|$secret|"
    password[$role]="$secret"
done

for role in "${!password[@]}"; do
    # The role is an identifier from the fixed list above; the password is quoted by psql (:'secret').
    # It reaches psql through the environment of that one process, not through its arguments.
    HB_ROLE_SECRET="${password[$role]}" psql -X -q -v ON_ERROR_STOP=1 -U postgres -d "${HB_DATABASE:-hiso_box}" << SQL
\getenv secret HB_ROLE_SECRET
ALTER ROLE ${role} LOGIN PASSWORD :'secret';
SQL
    echo "$role: password set"
done
