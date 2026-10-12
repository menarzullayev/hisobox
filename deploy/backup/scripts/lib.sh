#!/usr/bin/env bash
# Shared helpers for the backup scripts. Sourced, never run directly.
#
# Settings come from the environment. When a script is started by hand, the file named by
# HB_BACKUP_ENV (default /etc/hiso-box-backup/backup.env, the same file the systemd units read) fills in
# whatever the environment does not already set. See ../backup.env.example for every name.
set -euo pipefail

note() { printf '%s\n' "$*" >&2; }
die() {
    note "ERROR: $*"
    exit 1
}

# hb_load_env FILE -> export KEY=VALUE lines of FILE for keys that are not set yet.
# The format is that of a systemd EnvironmentFile: no quoting, no expansion.
hb_load_env() {
    local line key
    [ -r "$1" ] || return 0
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in '' | '#'*) continue ;; esac
        key="${line%%=*}"
        [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue
        if [ -z "${!key+x}" ]; then
            export "$key=${line#*=}"
        fi
    done < "$1"
}
hb_load_env "${HB_BACKUP_ENV:-/etc/hiso-box-backup/backup.env}"

: "${HB_STANZA:=qarz}"
: "${HB_DATABASE:=qarz}"
: "${HB_PGUSER:=postgres}"
: "${HB_REPO_PATH:=/var/lib/pgbackrest}"
: "${HB_STATE_DIR:=/var/lib/hiso-box-backup}"
: "${HB_TEXTFILE_DIR:=/var/lib/node_exporter/textfile_collector}"
: "${HB_CIPHER_FILE:=/etc/pgbackrest/conf.d/cipher.conf}"
: "${HB_FILES_ARCHIVE_DIR:=$HB_STATE_DIR/files-archive}"
: "${HB_MONTHLY_DIR:=$HB_STATE_DIR/monthly}"

need() {
    local tool
    for tool in "$@"; do
        command -v "$tool" > /dev/null 2>&1 || die "missing tool: $tool"
    done
}

now() { date +%s.%N; }
# iso EPOCH -> 2026-10-07T01:30:00Z
iso() { date -u -d "@${1%.*}" +%Y-%m-%dT%H:%M:%SZ; }
# elapsed START END -> END - START with two decimals
elapsed() { awk -v a="$1" -v b="$2" 'BEGIN { printf "%.2f", b - a }'; }

# pgBackRest with the stanza set. Its console log (standard output) is silenced below "warn", and
# warnings and errors go to standard error, so standard output carries only what was asked for.
pgbr() { pgbackrest --stanza="$HB_STANZA" --log-level-console=warn "$@"; }
repo_info() { pgbr info --output=json; }

# json_line KEY VALUE [KEY VALUE ...] -> one JSON object on one line.
# Values of keys ending in _seconds, _bytes or _count are written as numbers; everything else as text.
json_line() {
    jq -cn '
        [$ARGS.positional | _nwise(2)
         | {(.[0]): (if (.[0] | test("(_seconds|_bytes|_count)$")) then (.[1] | tonumber? // .[1]) else .[1] end)}]
        | add' --args "$@"
}

# write_metrics NAME < text -> $HB_TEXTFILE_DIR/NAME.prom, replaced atomically.
# A missing directory is a warning, not a failure: the backup itself is worth more than its figure,
# and the alert rules fire on a figure that is absent.
write_metrics() {
    local name="$1" tmp
    if [ ! -d "$HB_TEXTFILE_DIR" ] || [ ! -w "$HB_TEXTFILE_DIR" ]; then
        note "WARNING: $HB_TEXTFILE_DIR is not a writable directory; ${name}.prom was not written"
        cat > /dev/null
        return 0
    fi
    tmp="$(mktemp "$HB_TEXTFILE_DIR/.${name}.XXXXXX")"
    cat > "$tmp"
    chmod 644 "$tmp"
    mv -f "$tmp" "$HB_TEXTFILE_DIR/${name}.prom"
}

# The repository passphrase, for the archives that pgBackRest does not write itself (file store,
# monthly dump). Read from the environment if pgBackRest gets it that way, otherwise from the
# pgBackRest include file. Never printed; callers hand it to openssl through the environment.
hb_cipher_pass() {
    if [ -n "${PGBACKREST_REPO1_CIPHER_PASS:-}" ]; then
        printf '%s' "$PGBACKREST_REPO1_CIPHER_PASS"
        return 0
    fi
    [ -r "$HB_CIPHER_FILE" ] || die "no passphrase: $HB_CIPHER_FILE is not readable"
    sed -n 's/^[[:space:]]*repo1-cipher-pass[[:space:]]*=[[:space:]]*//p' "$HB_CIPHER_FILE" | head -n 1
}

# hb_encrypt < plain > cipher ; hb_decrypt < cipher > plain   (AES-256-CBC, key derived with PBKDF2)
hb_encrypt() {
    HB_PASS="$(hb_cipher_pass)" openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:HB_PASS
}
hb_decrypt() {
    HB_PASS="$(hb_cipher_pass)" openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:HB_PASS
}

# source_sql SQL -> one statement against the database this host serves (the replica on the standby,
# the primary in the local proof). Extra psql arguments: HB_SOURCE_PSQL_ARGS.
source_sql() {
    local -a extra=()
    if [ -n "${HB_SOURCE_PSQL_ARGS:-}" ]; then
        read -r -a extra <<< "$HB_SOURCE_PSQL_ARGS"
    fi
    psql -X -qAt -v ON_ERROR_STOP=1 "${extra[@]}" -U "$HB_PGUSER" -d "$HB_DATABASE" -c "$1"
}
