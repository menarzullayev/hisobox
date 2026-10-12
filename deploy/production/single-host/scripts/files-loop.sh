#!/usr/bin/env bash
# The `files-backup` service: the copy of the stored files, on its own short schedule.
#
#   every HB_FILES_INTERVAL seconds (300)   files-sync.sh sync
#   once a day                              files-sync.sh expire
#
# A separate container from the database backups because it runs as the application's user (the files
# are readable by their owner only) and needs neither the database nor its volume.
set -uo pipefail

: "${HB_FILES_INTERVAL:=300}"
: "${HB_FILES_STATE_DIR:=/var/lib/hiso-box-files-backup}"
export HB_FILES_STATE_DIR

trap 'exit 0' TERM INT
expired_on=""
while :; do
    /opt/hiso-box-single/files-sync.sh sync || true
    today="$(date +%F)"
    if [ "$today" != "$expired_on" ]; then
        if /opt/hiso-box-single/files-sync.sh expire; then expired_on="$today"; fi
    fi
    sleep "$HB_FILES_INTERVAL" &
    wait $!
done
