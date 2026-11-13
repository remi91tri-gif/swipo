#!/usr/bin/env bash
# Lance une base PostgreSQL jetable, applique les migrations et exécute les tests.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
DATA="$(mktemp -d)"
trap '"$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"' EXIT
if [ "$(id -u)" = "0" ]; then RUN="runuser -u postgres --"; chown -R postgres "$DATA"; else RUN=""; fi
$RUN "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$DATA" -o "-k $DATA -p 54329 -c listen_addresses=''" -l "$DATA/log" -w start >/dev/null
PSQL="psql -t -A -h $DATA -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
$PSQL -f "$ROOT/tests/db/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do $PSQL -f "$f"; done
$PSQL -f "$ROOT/tests/db/workflow_test.sql" 2>&1 | grep -E "ok  |ÉCHEC|ERROR|passés" | sed -E "s/^psql:[^ ]+ (NOTICE|ERROR): +//"
exit ${PIPESTATUS[0]}
