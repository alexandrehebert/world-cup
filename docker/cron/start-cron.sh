#!/bin/sh
set -eu

if [ -z "${CRON_SECRET:-}" ]; then
  echo "CRON_SECRET is required for local cron runner."
  exit 1
fi

APP_SERVICE_NAME="${APP_SERVICE_NAME:-app}"
APP_PORT="${APP_PORT:-3000}"

cat <<EOF >/etc/crontabs/root
* * * * * curl -fsS -X POST -H "Authorization: Bearer ${CRON_SECRET}" http://${APP_SERVICE_NAME}:${APP_PORT}/api/cron/sync-matches >/proc/1/fd/1 2>/proc/1/fd/2
EOF

echo "Local cron enabled: calling http://${APP_SERVICE_NAME}:${APP_PORT}/api/cron/sync-matches every minute."
exec crond -f -l 8
