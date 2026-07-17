# PostgreSQL Persistence Verification Checklist

Verifies that the named Docker volume `postgres_data` retains data across container stop and restart.

Run this checklist after any change to `docker-compose.yml` or Docker Desktop configuration.

## Prerequisites

- Docker Desktop is running.
- `.env` file exists (copy from `.env.example` if not).
- No other process is using the configured `POSTGRES_PORT`.

## Steps

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
docker compose ps
```

Expected: `jobflow_postgres` status is `Up`.

### 2. Create test data

```bash
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv \
  -c "CREATE TABLE IF NOT EXISTS _persist_check (id serial PRIMARY KEY, note text, created_at timestamptz DEFAULT now());"

docker exec jobflow_postgres psql -U jobflow -d jobflow_cv \
  -c "INSERT INTO _persist_check (note) VALUES ('persistence-check-$(date +%Y%m%d%H%M%S)');"

docker exec jobflow_postgres psql -U jobflow -d jobflow_cv \
  -c "SELECT * FROM _persist_check;"
```

Expected: one row returned with the inserted note.

### 3. Stop containers (WITHOUT deleting volume)

```bash
docker compose down
```

Expected output includes `Container jobflow_postgres Removed`. The named volume `postgres_data` is **not** listed as removed.

> **WARNING:** Never run `docker compose down -v` in normal development.
> The `-v` flag removes the `postgres_data` named volume and **permanently deletes all local database data**.
> It is a destructive operation and is not part of any normal startup or shutdown sequence.

### 4. Restart PostgreSQL

```bash
docker compose up -d postgres
docker compose ps
```

Expected: container starts fresh, status is `Up`.

### 5. Verify data survived

```bash
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv \
  -c "SELECT * FROM _persist_check;"
```

Expected: same row is still present. If the row is missing, the volume is not persisting — check that `docker-compose.yml` defines `postgres_data` under top-level `volumes:`.

### 6. Clean up

```bash
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv \
  -c "DROP TABLE _persist_check;"
```

## Pass Criteria

| Check | Expected |
|---|---|
| Container starts | `Up` status in `docker compose ps` |
| Row exists before stop | `SELECT` returns 1 row |
| Container stops cleanly | No volume listed as removed in `down` output |
| Container restarts | `Up` status again |
| Row exists after restart | Same row present — data survived |

## Docker Desktop Restart Check (Manual Only)

Tests that data survives a full Docker Desktop shutdown — simulates what happens after a Windows reboot or Docker Desktop update.

This cannot be automated via script because it requires interacting with the Desktop app itself.

### Steps

1. Make sure a row exists in the database (run Steps 1–2 above if needed).

2. **Quit Docker Desktop** — right-click the tray icon → *Quit Docker Desktop*. Wait until the icon disappears from the tray and Docker Engine is fully stopped.

3. **Reopen Docker Desktop**. Wait until it finishes starting (tray icon stops animating, Engine is `Running`).

4. Start the container:

   ```bash
   docker compose up -d postgres
   ```

5. Verify data is still there:

   ```bash
   docker exec jobflow_postgres psql -U jobflow -d jobflow_cv \
     -c "SELECT * FROM _persist_check;"
   ```

   Expected: same row present.

6. Clean up if done:

   ```bash
   docker exec jobflow_postgres psql -U jobflow -d jobflow_cv \
     -c "DROP TABLE _persist_check;"
   ```

### Why this works

On Windows, Docker stores named volumes inside the Docker VM (Hyper-V or WSL2 disk). The volume lives outside any container — shutting down Docker Desktop stops the Engine but does not touch volumes. Data is only lost by explicit `docker compose down -v`, `docker volume rm`, or *Reset to factory defaults* in Docker Desktop settings.

### When data IS lost

| Action | Effect |
|---|---|
| Quit Docker Desktop + reopen | **Safe** — volume survives |
| Windows reboot | **Safe** — volume survives |
| `docker compose down` | **Safe** — volume survives |
| `docker compose down -v` | **Data lost** — volume deleted |
| `docker volume rm jobflow-cv-pipeline_postgres_data` | **Data lost** |
| Docker Desktop → Settings → *Reset to factory defaults* | **Data lost** — entire Docker VM reset |

---

## Destructive Commands — Do Not Use in Normal Workflow

| Command | Effect |
|---|---|
| `docker compose down` | Stops and removes containers. **Volume is preserved.** Safe. |
| `docker compose down -v` | Stops containers AND removes named volumes. **All data lost.** Destructive. |
| `docker volume rm jobflow-cv-pipeline_postgres_data` | Removes the volume directly. **All data lost.** Destructive. |

## Automated Version

Run the bash script for automated output:

```bash
bash scripts/check-postgres-persistence.sh
```

Or via npm:

```bash
npm run db:check-persistence
```
