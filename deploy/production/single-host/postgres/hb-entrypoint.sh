#!/usr/bin/env bash
# Entrypoint of the single-host database image. The first argument says what this container is:
#
#   postgres        the live database, archiving its write-ahead log to the repository
#   scheduler       the backup jobs on their schedule (scripts/scheduler.sh)
#   files-loop      the copy of the stored files, every few minutes (scripts/files-loop.sh)
#   job NAME        one job, now (scripts/job.sh): full, diff, check, restore-test, expire, monthly, ...
#   restore ...     restore the repository into the EMPTY data directory (scripts/restore.sh)
#   fresh-check     may a database be started here? (scripts/fresh-check.sh; asked by single-host.sh up)
#   roles WHICH     set the passwords of the database roles from the connection settings
#   scratch         a point-in-time copy in a data directory of its own, with archiving off
#   anything else   run as given
set -euo pipefail
# shellcheck source-path=SCRIPTDIR source=../scripts/env.sh
. /opt/hiso-box-single/env.sh

PGDATA="${PGDATA:-/var/lib/postgresql/data}"

# Sized for a container limited to 1 GiB (compose.single-host.yml). Starting points, not measured.
tuning=(
    -c shared_buffers=256MB
    -c effective_cache_size=512MB
    -c work_mem=8MB
    -c maintenance_work_mem=64MB
    -c max_connections=60
    -c wal_level=replica
    -c max_wal_size=1GB
)

case "${1:-postgres}" in
postgres)
    shift || true
    # The image's first start wants a password for the superuser. The real one is set from
    # HB_MIGRATION_URL by the `owner` step, through the socket; this one is never used or kept.
    : "${POSTGRES_PASSWORD:=$(openssl rand -hex 24)}"
    export POSTGRES_PASSWORD
    # archive_timeout: a segment that holds anything is closed and sent after a minute at the latest;
    # the scheduler's heartbeat makes sure an idle database still writes something every minute.
    exec docker-entrypoint.sh postgres "${tuning[@]}" \
        -c archive_mode=on \
        -c "archive_command=pgbackrest --stanza=${HB_STANZA} archive-push %p" \
        -c archive_timeout=60 \
        "$@"
    ;;
scheduler)
    exec /opt/hiso-box-single/scheduler.sh
    ;;
files-loop)
    exec /opt/hiso-box-single/files-loop.sh
    ;;
job)
    shift
    exec /opt/hiso-box-single/job.sh "$@"
    ;;
restore)
    shift
    exec /opt/hiso-box-single/restore.sh "$@"
    ;;
fresh-check)
    exec /opt/hiso-box-single/fresh-check.sh
    ;;
roles)
    shift
    exec /opt/hiso-box-single/set-role-logins.sh "$@"
    ;;
scratch)
    # A copy to look at, never the database the application uses: its own data directory, archiving
    # off (a copy must never push WAL into the live repository), restored once and then thrown away.
    if [ ! -s "$PGDATA/PG_VERSION" ]; then
        args=(--stanza="$HB_STANZA" --pg1-path="$PGDATA" --archive-mode=off restore)
        if [ -n "${HB_PITR_TARGET:-}" ]; then
            args+=(--type=time "--target=${HB_PITR_TARGET}" --target-action=promote)
        else
            args+=(--type=default)
        fi
        echo "scratch: restoring ${HB_PITR_TARGET:+to $HB_PITR_TARGET}${HB_PITR_TARGET:-to the end of the archive}" >&2
        pgbackrest "${args[@]}"
    fi
    exec docker-entrypoint.sh postgres "${tuning[@]}" -c archive_mode=off
    ;;
*)
    exec "$@"
    ;;
esac
