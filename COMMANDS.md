# SCOPE Studio — Commands Reference (WSL 2 / bash)

This project runs **natively inside WSL 2 (Ubuntu)** using Docker Engine installed in
WSL — not Docker Desktop. All setup scripts are bash (`scripts/*.sh`).

---

## First-time setup (once)

### 1. Install Docker Engine inside WSL

```bash
npm run docker:install
# (asks for your sudo password)
```

### 2. Restart WSL so your user joins the `docker` group  ← REQUIRED

In **Windows PowerShell**:

```powershell
wsl --shutdown
```

Then reopen your Ubuntu terminal and verify (no sudo needed):

```bash
docker run --rm hello-world
```

### 3. (Optional) Stop using Docker Desktop

Docker Desktop → **Settings → Resources → WSL Integration** → turn **OFF**
integration for this distro, so the native engine is used. You may then uninstall
Docker Desktop from Windows entirely if you no longer need it.

---

Complete the environment setup in [the README](README.md) first. For a backend outside Docker, also set `DATABASE_URL` to your local asyncpg connection URL.

## Run the project

```bash
npm run dev:full          # full stack: build + start db/api containers, then frontend
npm run dev:full:nobuild  # same but skip the docker image rebuild (faster)
npm run restart:fe        # frontend only (use after frontend edits — fastest)
npm run stop              # stop everything (containers + frontend)
```

These all call `scripts/scope-dev.sh`. You can also call it directly:

```bash
bash scripts/scope-dev.sh              # full
bash scripts/scope-dev.sh --no-build   # skip image rebuild
bash scripts/scope-dev.sh --skip-docker# frontend only
bash scripts/scope-dev.sh --stop       # stop all
```

---

## URLs

| Service            | URL                          |
|--------------------|------------------------------|
| Frontend           | http://localhost:8080 (or 8081 if busy) |
| Backend API        | http://localhost:8000        |
| API docs (Swagger) | http://localhost:8000/docs   |
| Database           | localhost:5432 (scope_db)    |

---

## Individual services

### Frontend only (Vite, no Docker)

```bash
npm run dev          # vite dev (frontend only)
```

### Backend + database (Docker)

```bash
docker compose up -d --build   # start with rebuild
docker compose up -d           # start without rebuild
docker compose down            # stop
docker compose logs -f api     # follow backend logs
docker compose logs -f db      # follow database logs
docker compose ps              # status
```

### Backend without Docker (needs Postgres running separately)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## After frontend edits

Vite uses filesystem polling (`vite.config.ts`) to detect edits on the Windows
mount. After code changes:

```bash
npm run restart:fe     # restart frontend
# then hard-refresh the browser:  Ctrl + Shift + R
```

---

## Validate code (without running)

```bash
npx tsc --noEmit     # TypeScript type check
npm run lint         # ESLint
npm run format       # Prettier
```

---

## Troubleshooting

| Problem                                   | Fix |
|-------------------------------------------|-----|
| `Cannot talk to the Docker daemon`        | Restart WSL: `wsl --shutdown` (PowerShell), reopen Ubuntu |
| `docker: command not found`               | `npm run docker:install` |
| Docker works only with `sudo`             | You haven't restarted WSL since install — `wsl --shutdown` |
| Daemon not started                        | `sudo systemctl start docker` (and `sudo systemctl enable docker`) |
| Changes not showing in browser            | `npm run restart:fe` then `Ctrl+Shift+R` |
| Frontend port already in use              | The dev script auto-frees Vite ports 8080/8081 |
| Backend port already in use               | Stop the conflicting service or run `docker compose down`; the dev script leaves Docker's `:8000` port alone |
| API not responding                        | `docker compose logs api` |
| DB connection error                       | `docker compose ps` — confirm `db` is healthy |
| `backend/.env is missing`                 | Create it as described in README.md |

---

## Notes

- The old Windows PowerShell scripts (`run-scope.ps1`, `start-dev.ps1`,
  `scope-restart.ps1`) were removed in favor of bash equivalents.
- The backend container bind-mounts `./backend` and runs `uvicorn --reload`;
  the database uses a named volume `pgdata` (data persists across restarts).
