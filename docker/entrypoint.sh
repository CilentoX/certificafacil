#!/bin/sh
set -e

echo "Waiting for MySQL at $DB_HOST:$DB_PORT..."

# Wait up to 60 seconds for MySQL
for i in $(seq 1 60); do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "MySQL is ready!"
    exec /usr/bin/supervisord -c /etc/supervisord.conf
  fi
  echo "Attempt $i/60 - MySQL not ready, waiting..."
  sleep 2
done

echo "WARNING: MySQL not reachable after 120s, starting anyway..."
exec /usr/bin/supervisord -c /etc/supervisord.conf
