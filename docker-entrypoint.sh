#!/bin/sh
set -eu

mkdir -p "$PGDATA"
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  initdb -D "$PGDATA" --username=root --auth-local=trust --auth-host=trust
fi

postgres -D "$PGDATA" -c listen_addresses=127.0.0.1 -c unix_socket_directories="$PGDATA" &
postgres_pid=$!
app_pid=

stop() {
  if [ -n "$app_pid" ]; then
    kill -TERM "$app_pid" 2>/dev/null || true
    wait "$app_pid" 2>/dev/null || true
  fi
  kill -TERM "$postgres_pid" 2>/dev/null || true
  wait "$postgres_pid" 2>/dev/null || true
}

trap stop EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

ready=false
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  if pg_isready -h 127.0.0.1 -p 5432 -U root -d postgres >/dev/null 2>&1; then
    ready=true
    break
  fi
  kill -0 "$postgres_pid"
  sleep 1
done
if [ "$ready" != true ]; then
  echo "PostgreSQL did not become ready" >&2
  exit 1
fi

"$@" &
app_pid=$!
wait "$app_pid"
