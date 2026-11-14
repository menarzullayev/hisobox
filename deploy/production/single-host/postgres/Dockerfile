# syntax=docker/dockerfile:1
# The database image of the single-host deployment (compose.single-host.yml): PostgreSQL 16 with
# pgBackRest, and the tools of the backup jobs. One image for four uses:
#   db                 PostgreSQL, archiving its write-ahead log to the S3 repository (Cloudflare R2)
#   backup             the scheduler: backups, expiry, the copy of the stored files, the restore test
#   restore, ...       one-shot commands started by scripts/single-host.sh
#   db-scratch         a point-in-time copy beside the live database, never over it
# Build context: deploy/  (it takes deploy/backup/scripts as they are, and production/single-host/).
#
# The official image carries the PGDG apt source, so pgBackRest comes from there (2.59 at the time of
# writing). S3 with path-style addressing and the `crypt` overlay are all that is used of rclone.
#
# rclone is the release from rclone.org, checked against the SHA256SUMS published beside it. Debian
# bookworm's package is 1.60.1, built with Go 1.19.8: Docker Scout counted 7 critical and 43 high
# advisories in that standard library alone (2026-11-14), in the program that speaks TLS to the bucket.
#
# gosu is removed. The official image carries it to step down from root; no container of this image
# starts as root (USER below, and single_host_static.py refuses a root service), so it was a second
# unused Go program with advisories of its own.
FROM postgres:16.16-bookworm

ARG RCLONE_VERSION=1.76.0
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl jq openssl pgbackrest \
    && arch="$(dpkg --print-architecture)" \
    && case "$arch" in \
        amd64) rclone_sha256=9db7ee9b725bce7cdd195b9183449a4c6fb93cad3e6578e70b87c0bc7f6062e9 ;; \
        arm64) rclone_sha256=c486d404ecbc4bb3d54052a0efaf9e652cf0d2c645e4523f7a2aefa112fe029c ;; \
        *) echo "no rclone checksum for $arch" >&2; exit 1 ;; \
    esac \
    && curl -fsSL --retry 3 -o /tmp/rclone.deb "https://downloads.rclone.org/v${RCLONE_VERSION}/rclone-v${RCLONE_VERSION}-linux-${arch}.deb" \
    && echo "${rclone_sha256}  /tmp/rclone.deb" | sha256sum -c - \
    && dpkg -i /tmp/rclone.deb && rm /tmp/rclone.deb \
    && rm -f /usr/local/bin/gosu \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -o postgres -g postgres -m 750 /var/lib/hiso-box-backup \
    && install -d -o postgres -g postgres -m 755 /var/lib/hiso-box-backup-figures \
    && install -d -o 10001 -g 10001 -m 755 /var/lib/hiso_box /var/lib/hiso_box/files /var/lib/hiso-box-files-backup \
    && rm -f /etc/pgbackrest.conf
# About the line with 10001 above: the stored files and the state of their copy belong to the
# application's user, exactly as in the backend image. Docker gives an empty volume the owner and mode
# of the directory it is mounted over, whichever container mounts it, so the two images must agree.
# The same holds for /var/lib/hiso-box-backup-figures (the figures of the backup jobs, which the worker
# reads): postgres owns it here, and the backend image names the same owner by number.

COPY production/single-host/postgres/pgbackrest.conf /etc/pgbackrest/pgbackrest.conf
# The scripts written for the two-server design, unchanged: a backup, the restore test, expiry, the
# check and the monthly dump do not care where the repository is.
COPY --chmod=755 backup/scripts/ /opt/hiso-box-backup/scripts/
COPY --chmod=755 production/single-host/scripts/ /opt/hiso-box-single/
COPY --chmod=755 production/single-host/postgres/hb-entrypoint.sh /usr/local/bin/hb-entrypoint.sh

ENV TZ=Asia/Tashkent
# Never root: the data directory, the socket directory and the state directory belong to postgres.
USER postgres
ENTRYPOINT ["hb-entrypoint.sh"]
CMD ["postgres"]
