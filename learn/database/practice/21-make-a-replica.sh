#!/bin/sh
# Lesson 21: Replication and read replicas. Make a primary and a streaming replica on your own computer.
# Lesson: learn/database/21-replication-and-read-replicas.md
#
# It starts TWO throwaway Postgres servers in a new folder, on two ports. It does not touch any other
# Postgres on your computer (as long as the two ports are free). Nothing is installed.
#
# You need the Postgres programs: initdb, pg_ctl, pg_basebackup, psql.
#   Mac with Postgres.app:  PGBIN=/Applications/Postgres.app/Contents/Versions/latest/bin
#   Linux:                  PGBIN=/usr/lib/postgresql/16/bin     (the folder that has initdb in it)
#   Homebrew:               PGBIN=$(brew --prefix postgresql@16)/bin
#
# Run it:
#   PGBIN=/path/to/bin sh practice/21-make-a-replica.sh
#   PGBIN=/path/to/bin sh practice/21-make-a-replica.sh stop      (stops both and deletes the folder)
#
# Then run the Node script:  node practice/21-replication-and-read-replicas.js
#
# Checked on PostgreSQL 18.3 (Mac, Postgres.app). Use a recent version (12 or newer).

set -eu

: "${PGBIN:?Set PGBIN to the folder that contains initdb, pg_ctl and pg_basebackup}"
BASE="${BASE:-/tmp/l21-demo}"
P_PORT="${P_PORT:-56432}"
R_PORT="${R_PORT:-56433}"
SOCK="$BASE/sock"          # keep this path short: Unix socket paths have a length limit

if [ "${1:-}" = "stop" ]; then
  "$PGBIN/pg_ctl" -D "$BASE/replica" stop -m fast 2>/dev/null || true
  "$PGBIN/pg_ctl" -D "$BASE/primary" stop -m fast 2>/dev/null || true
  rm -rf "$BASE"
  echo "Both servers stopped, and $BASE deleted."
  exit 0
fi

if [ -e "$BASE" ]; then
  echo "$BASE already exists. Run:  PGBIN=$PGBIN sh $0 stop" >&2
  exit 1
fi

mkdir -p "$SOCK"
USER_NAME="$(id -un)"

echo "1. Make the primary in $BASE/primary (port $P_PORT)"
"$PGBIN/initdb" -D "$BASE/primary" -U "$USER_NAME" --auth=trust -E UTF8 >/dev/null
"$PGBIN/pg_ctl" -D "$BASE/primary" -l "$BASE/primary.log" -w \
  -o "-p $P_PORT -k $SOCK -c listen_addresses=127.0.0.1" start >/dev/null
"$PGBIN/psql" -X -h 127.0.0.1 -p "$P_PORT" -d postgres -q -c "CREATE DATABASE practice"

echo "2. Copy it to a replica in $BASE/replica (port $R_PORT)"
# -R writes standby.signal and primary_conninfo, so the copy starts as a standby.
"$PGBIN/pg_basebackup" -h 127.0.0.1 -p "$P_PORT" -U "$USER_NAME" -D "$BASE/replica" -R -X stream --checkpoint=fast
"$PGBIN/pg_ctl" -D "$BASE/replica" -l "$BASE/replica.log" -w \
  -o "-p $R_PORT -k $SOCK -c listen_addresses=127.0.0.1" start >/dev/null

echo "3. Check"
sleep 1
"$PGBIN/psql" -X -h 127.0.0.1 -p "$R_PORT" -d practice -At -c "SELECT 'replica: in recovery = ' || pg_is_in_recovery()"
"$PGBIN/psql" -X -h 127.0.0.1 -p "$P_PORT" -d postgres -At -c "SELECT 'primary sees: ' || state || ', ' || sync_state FROM pg_stat_replication"

cat <<EOF

Ready.
  primary: psql -h 127.0.0.1 -p $P_PORT practice
  replica: psql -h 127.0.0.1 -p $R_PORT practice

Try:  on the primary:  CREATE TABLE hello (id int); INSERT INTO hello VALUES (1);
      on the replica:  SELECT * FROM hello;          (the row is there)
      on the replica:  INSERT INTO hello VALUES (2); (ERROR: cannot execute INSERT in a read-only transaction)

Stop and clean up:  PGBIN=$PGBIN sh $0 stop
EOF
