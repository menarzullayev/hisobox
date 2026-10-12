#!/usr/bin/env bash
# Remove everything the rehearsal created in Docker: containers, volumes,
# the network, and the two locally built images. Also removes the generated
# secrets file, which is useless once the volumes are gone.
#
#   scripts/down.sh          keep the result logs in deploy/rehearsal/.out
#   scripts/down.sh --all    remove the result logs too
#
# Only resources of the Compose project "hb-rehearsal" are touched.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

# Compose refuses to parse the file without these; the values do not matter for "down".
: "${HB_POSTGRES_PASSWORD:=unused}" "${HB_REPL_PASSWORD:=unused}" "${HB_BACKUP_CIPHER_PASS:=unused}"
: "${HB_FILESTORE_RPC_SECRET:=unused}" "${HB_FILESTORE_ADMIN_TOKEN:=unused}"
export HB_POSTGRES_PASSWORD HB_REPL_PASSWORD HB_BACKUP_CIPHER_PASS
export HB_FILESTORE_RPC_SECRET HB_FILESTORE_ADMIN_TOKEN

log "removing containers, volumes, network and local images of project $PROJECT"
dc --profile pitr down --volumes --remove-orphans --rmi local --timeout 5

rm -f "$ENV_FILE"
if [ "${1:-}" = "--all" ]; then
    rm -rf "$OUT_DIR"
fi

left="$(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT" | wc -l)"
left_volumes="$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT" | wc -l)"
log "left behind: ${left// /} containers, ${left_volumes// /} volumes"
[ "${left// /}" = "0" ] && [ "${left_volumes// /}" = "0" ] || die "cleanup is incomplete"
