#!/usr/bin/env bash
# Verifies that postgres_data named volume retains data across docker compose down + up.
# Run from the project root: bash scripts/check-postgres-persistence.sh
set -e

CONTAINER="jobflow_postgres"
DB_USER="${POSTGRES_USER:-jobflow}"
DB_NAME="${POSTGRES_DB:-jobflow_cv}"
TABLE="_persist_check"
NOTE="persist-check-$(date +%Y%m%d%H%M%S)"

PASS=0
FAIL=1

psql_exec() {
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "$1"
}

echo ""
echo "=== PostgreSQL Persistence Check ==="
echo ""

echo "-- Step 1: Starting PostgreSQL..."
docker compose up -d postgres
docker compose ps
echo ""

echo "-- Step 2: Creating test table and inserting row..."
psql_exec "CREATE TABLE IF NOT EXISTS $TABLE (id serial PRIMARY KEY, note text, created_at timestamptz DEFAULT now());"
psql_exec "INSERT INTO $TABLE (note) VALUES ('$NOTE');"
echo "   Inserted note: $NOTE"
BEFORE=$(psql_exec "SELECT count(*) FROM $TABLE;" | grep -E '^\s+[0-9]' | tr -d ' ')
echo "   Row count before stop: $BEFORE"
echo ""

echo "-- Step 3: Stopping containers (docker compose down — no -v)..."
docker compose down
echo ""

echo "-- Step 4: Restarting PostgreSQL..."
docker compose up -d postgres
echo ""

echo "-- Step 5: Verifying data survived..."
AFTER=$(psql_exec "SELECT count(*) FROM $TABLE;" | grep -E '^\s+[0-9]' | tr -d ' ')
echo "   Row count after restart: $AFTER"
echo ""

if [ "$AFTER" -ge "1" ]; then
  psql_exec "SELECT * FROM $TABLE;"
  echo ""
  echo "-- Step 6: Cleaning up test table..."
  psql_exec "DROP TABLE $TABLE;"
  echo ""
  echo "=== RESULT: PASS — data survived docker compose down + up ==="
  echo ""
  exit $PASS
else
  echo "=== RESULT: FAIL — no rows found after restart ==="
  echo "    Check that docker-compose.yml defines postgres_data under top-level volumes:"
  echo ""
  exit $FAIL
fi
