#!/bin/sh
set -eu

if [ -z "${CRON_SECRET:-}" ]; then
  echo "CRON_SECRET is required for local cron runner."
  exit 1
fi

cat <<EOF >/etc/crontabs/root
* * * * * curl -fsS -X POST -H "Authorization: Bearer ${CRON_SECRET}" http://app:3000/api/cron/sync-matches >/proc/1/fd/1 2>/proc/1/fd/2
EOF

echo "Local cron enabled: calling /api/cron/sync-matches every minute."
exec crond -f -l 8
