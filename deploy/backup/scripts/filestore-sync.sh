#!/usr/bin/env bash
# The file store (ADR-020): copy the bucket to the standby, and put it into the weekly backup.
#
#   filestore-sync.sh sync      copy the bucket of the primary's object store to the standby's
#                               (every five minutes by the timer)
#   filestore-sync.sh archive   write the standby's copy as one encrypted archive beside the backup
#                               repository (weekly, after the full database backup):
#                               $HB_FILES_ARCHIVE_DIR/files-YYYYMMDD.tar.gz.enc
#
# Uses rclone against any S3-compatible store. The two remotes are defined outside the repository,
# in the file named by RCLONE_CONFIG (default /etc/hiso-box-backup/rclone.conf) or by RCLONE_CONFIG_*
# environment variables:
#   HB_FILES_SOURCE   default primary:hb-files   the bucket the application writes to
#   HB_FILES_MIRROR   default standby:hb-files   its copy on the standby
#
# A file deleted in the source is deleted in the copy too (a customer's removal must not survive on
# the standby), but a run that would delete more than HB_FILES_MAX_DELETE (100) files stops with an
# error instead: an emptied or unreachable source must not empty the copy.
#
# Standard output is exactly one JSON line. Exit codes: 0 done, 64 wrong usage, anything else: failed.
set -euo pipefail
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

mode="${1:-}"
case "$mode" in
sync | archive) ;;
*)
    note "usage: filestore-sync.sh <sync|archive>"
    exit 64
    ;;
esac
need rclone jq awk

: "${HB_FILES_SOURCE:=primary:hb-files}"
: "${HB_FILES_MIRROR:=standby:hb-files}"
: "${HB_FILES_MAX_DELETE:=100}"
: "${HB_FILES_STAGING_DIR:=$HB_STATE_DIR/files-staging}"
if [ -z "${RCLONE_CONFIG:-}" ] && [ -r /etc/hiso-box-backup/rclone.conf ]; then
    export RCLONE_CONFIG=/etc/hiso-box-backup/rclone.conf
fi

started="$(now)"
outcome=failed
objects=0
bytes=0
source_objects=0
archive_bytes=0
tmp=""

finish() {
    local code=$? ended success=0
    trap - EXIT
    [ -z "$tmp" ] || rm -f -- "$tmp"
    ended="$(now)"
    if [ "$outcome" = ok ]; then
        code=0
        success=1
    elif [ "$code" = 0 ]; then
        code=1
    fi
    write_metrics "hb_filestore_${mode}" << EOF
# HELP hb_filestore_last_run_success Whether the last run of this file store job succeeded (1) or failed (0).
# TYPE hb_filestore_last_run_success gauge
hb_filestore_last_run_success{mode="${mode}"} ${success}
# HELP hb_filestore_last_run_timestamp_seconds When the last run of this file store job ended.
# TYPE hb_filestore_last_run_timestamp_seconds gauge
hb_filestore_last_run_timestamp_seconds{mode="${mode}"} ${ended%.*}
EOF
    json_line event "filestore_${mode}" outcome "$outcome" \
        started_at "$(iso "$started")" ended_at "$(iso "$ended")" \
        duration_seconds "$(elapsed "$started" "$ended")" \
        source_objects_count "$source_objects" objects_count "$objects" size_bytes "$bytes" \
        archive_bytes "$archive_bytes"
    exit "$code"
}
trap finish EXIT

rc() { rclone --log-level NOTICE --stats 0 "$@"; }
# sizes REMOTE -> "<objects> <bytes>"
sizes() { rc size --json "$1" | jq -r '"\(.count) \(.bytes)"'; }

case "$mode" in
sync)
    read -r source_objects _ <<< "$(sizes "$HB_FILES_SOURCE")"
    rc sync "$HB_FILES_SOURCE" "$HB_FILES_MIRROR" --checksum --max-delete "$HB_FILES_MAX_DELETE" >&2
    read -r objects bytes <<< "$(sizes "$HB_FILES_MIRROR")"
    ;;
archive)
    need tar gzip openssl
    umask 077
    mkdir -p "$HB_FILES_STAGING_DIR" "$HB_FILES_ARCHIVE_DIR"
    read -r source_objects _ <<< "$(sizes "$HB_FILES_MIRROR")"
    # The staging directory is kept between runs, so only new files are downloaded.
    rc sync "$HB_FILES_MIRROR" "$HB_FILES_STAGING_DIR" --checksum >&2
    objects="$(find "$HB_FILES_STAGING_DIR" -type f | wc -l | tr -d ' ')"
    bytes="$(du -sb "$HB_FILES_STAGING_DIR" | awk '{ print $1 }')"
    [ "$objects" = "$source_objects" ] || die "the staging copy holds $objects files, the bucket $source_objects"

    day="$(TZ=Asia/Tashkent date +%Y%m%d)"
    tmp="$(mktemp "$HB_FILES_ARCHIVE_DIR/.files-$day.XXXXXX")"
    tar -C "$HB_FILES_STAGING_DIR" -cf - . | gzip -6 | hb_encrypt > "$tmp"
    # Read it back: the archive decrypts and lists as many files as went in.
    listed="$(hb_decrypt < "$tmp" | tar -tzf - | grep -vc '/$' || true)"
    [ "$listed" = "$objects" ] || die "the archive lists $listed files, $objects went in"
    archive_bytes="$(wc -c < "$tmp" | tr -d ' ')"
    mv -f "$tmp" "$HB_FILES_ARCHIVE_DIR/files-$day.tar.gz.enc"
    tmp=""
    ;;
esac
outcome=ok
