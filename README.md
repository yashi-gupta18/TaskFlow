# TaskFlow

**Containerized Task Management System Using Docker and Docker Compose**

A beginner-friendly college DevOps mini project: organize tasks in a React dashboard while learning how three containers communicate. Add a title and optional description, mark a task completed or pending, delete tasks, filter the list, and view live summary counts. MongoDB stores the tasks; they are never stored only in browser memory.

## Objectives and stack

- Build a small, complete full-stack application using JavaScript.
- Package the frontend and API into reproducible Docker images.
- Start the whole stack with a single Compose command.
- Demonstrate networking, health checks, and persistent database storage.

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Dashboard | React, Vite, CSS, Lucide icons | Forms, task list, filters, loading and feedback |
| Frontend container | Multi-stage Node 24 build, Nginx Alpine runtime | Serve the built website and proxy API requests |
| API container | Node 24, Express 5, Mongoose 8 | Validate requests and read/write tasks |
| Database container | MongoDB 8.0 | Store task documents |
| Orchestration | Docker Compose v2 | Network, health dependencies, ports, named volume |
| Version control | Git | Track source and lockfiles; exclude secrets and generated files |

No authentication is included. This is a local educational project. Published ports bind to `127.0.0.1`, and MongoDB has no published host port. The bundled database uses no credentials; do not expose this configuration as a public service.

## Architecture and Docker networking

```text
Browser: http://localhost:5173
          |
          | / and static assets
          v
frontend:5173 (Nginx)
          |
          | /api/* -> http://backend:5000/api/*
          v
backend:5000 (Express)
          |
          | MONGODB_URI=mongodb://mongodb:27017/taskflow
          v
mongodb:27017 -> mongodb_data volume -> /data/db

Host API access: http://localhost:5000/api/health
```

The browser requests the relative URL `/api/tasks` on the same origin as the dashboard. Nginx forwards it to `backend:5000` inside the `taskflow` Compose network. Docker's DNS resolves the service names `backend` and `mongodb`. Your browser does not need to resolve these names, and there is no cross-origin CORS configuration to get wrong.

`localhost` in the browser refers to your computer; inside the API container it refers to the API container itself. Therefore the API connects to `mongodb`, not `localhost`. Compose waits for MongoDB's health check before starting the API, then waits for the API's health check before starting the frontend. The API connects before listening and reports HTTP 503 if its database connection is lost.

This follows [Docker's healthy dependency guidance](https://docs.docker.com/compose/how-tos/startup-order/). Local frontend development uses [Vite's development server](https://vite.dev/guide/); the Docker frontend serves the production build with Nginx.

## Folder structure

```text
TaskFlow/
├── frontend/
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── App.jsx             # Dashboard and small UI components
│   │   ├── api.js              # Configurable fetch helper
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── .env.example
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/Task.js
│   │   ├── routes/tasks.js
│   │   ├── app.js
│   │   └── server.js
│   ├── test/api.test.js
│   ├── .env.example
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package.json
│   └── package-lock.json
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Prerequisites and quick start

Install Docker Desktop on Windows/macOS, or Docker Engine and the Compose v2 plugin on Linux. On Windows, start Docker Desktop, enable its WSL 2 backend if needed, and use **Linux containers**. Git is useful for version control. Node and npm are only required for running outside Docker or executing tests.

From the project root, verify Docker is running:

```sh
docker version
docker compose version
```

The default configuration runs without creating `.env`. If you want to customize ports or the database URI, first copy `.env.example` to `.env`:

```powershell
# PowerShell (optional)
Copy-Item .env.example .env
```

```sh
# macOS/Linux shell (optional)
cp .env.example .env
```

Start all three services:

```sh
docker compose up --build
```

The first run downloads images and installs dependencies, so allow a few minutes. Open:

- Frontend: **http://localhost:5173**
- API health: **http://localhost:5000/api/health**
- API through the frontend proxy: **http://localhost:5173/api/health**

An empty dashboard is expected initially. Add a task to begin. You can also run in the background with `docker compose up --build -d`.

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://mongodb:27017/taskflow` | Server-only Compose database address |
| `FRONTEND_PORT` | `5173` | Host frontend port |
| `BACKEND_PORT` | `5000` | Host API port; internal port remains 5000 |
| `VITE_API_BASE_URL` | `/api` | Public frontend API prefix, set at build time |

Compose sets the backend's `PORT=5000` and `NODE_ENV=production`. MongoDB receives `MONGO_INITDB_DATABASE=taskflow`. The database is created when its first document is written. If you change the database name in the URI, that database is used for task writes.

Keep `/api` for the supplied deployment. Changing the host backend port does not require changing the frontend because the proxy uses the internal container port. `VITE_` variables are embedded in browser JavaScript: never put database credentials there. If you choose a separate API origin, you must configure that server's CORS policy yourself. Rebuild the frontend after changing its build-time variables. All `.env` files are ignored by Git and Docker builds.

## Move TaskFlow to another computer

### Files to transfer

Transfer the project root with `docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`, and the complete `frontend/` and `backend/` source directories. Preserve the directory structure, spelling, and hidden files. In particular, include:

- Both `Dockerfile` and `.dockerignore` files.
- Both `package.json` and `package-lock.json` files. Builds use `npm ci`, so lockfiles are required.
- `frontend/src/`, `frontend/public/`, `frontend/index.html`, `frontend/vite.config.js`, `frontend/nginx.conf`, and the frontend lint configuration.
- `backend/src/`, the backend tests, and both directories' `.env.example` templates. Tests and lint configuration are useful for development, though they are not needed by the runtime containers.

Do not transfer `node_modules/`, `dist/`, `.cache/`, coverage reports, logs, or real `.env` files. Docker installs dependencies and builds the frontend inside Linux containers. Copying dependencies installed on Windows or another CPU is unnecessary and can be incompatible. `.dockerignore` excludes host dependencies and environment files from image builds; `.gitignore` excludes local configuration and generated files from Git. Neither file deletes files from an archive you create manually.

You can transfer an archive containing these files or clone a repository that contains them. Before using Git to transfer the project, confirm all required source files and lockfiles are committed and pushed; `git status --short` shows untracked files with `??`. A clone cannot retrieve uncommitted files. The `.git/` directory is unnecessary for an archive-based deployment.

**Existing task data is separate.** The Docker named volume is not part of the source folder or a Git clone. A new computer starts with an empty database. Moving existing tasks requires a separate MongoDB backup and restore; copying source alone does not migrate them.

### Requirements on the destination

Use a compatible 64-bit computer with a running Linux-container Docker engine and a recent Compose CLI supporting this file's top-level `name` and healthy-service dependencies (`docker compose`, rather than legacy `docker-compose`). Windows/macOS typically use Docker Desktop; Linux can use Docker Engine with Compose. Node.js, npm, Nginx, and MongoDB do **not** need host installation.

The selected Linux images must be available for the destination CPU, and that CPU/VM must support MongoDB 8.0. Older machines can fail its CPU requirements; see [MongoDB's platform and CPU requirements](https://www.mongodb.com/docs/manual/administration/production-notes/). No CPU architecture is forced in Compose. ARM computers, other operating systems, and another physical computer have not been tested by this review.

Allow enough Docker disk space and memory for the three services and image builds. The first build needs access to Docker Hub and the npm registry, even though no Node installation is required on the host. A clean offline computer cannot build this project without separately preloading the required images/dependencies. Google Fonts is optional: local fallback fonts work without it.

### Configuration the destination user must provide

**No application configuration or credentials are required for the supplied local deployment.** With ports 5173 and 5000 free, use the defaults and omit `.env`. There are no host bind mounts, absolute host paths, user-specific directories, external accounts, or pre-existing database requirements.

If needed, copy the root `.env.example` to a new root `.env` and change only:

| Value | What to supply |
| --- | --- |
| `FRONTEND_PORT` | An unused host port, for example `15173`, if 5173 is occupied. Open the frontend on that port. |
| `BACKEND_PORT` | An unused host port, for example `15000`, if 5000 is occupied. Use that port for direct API access. |
| `MONGODB_URI` | Keep `mongodb://mongodb:27017/taskflow` for the bundled database. No credentials are required. An external URI requires a reachable, separately configured database and any credentials it requires. |
| `VITE_API_BASE_URL` | Keep `/api` so browser requests use the frontend's Nginx proxy. Do not set it to `http://backend:5000/api`: browsers cannot resolve Compose service names. |

Changing host ports does not change the internal service ports or require an API URL change. Do not copy the direct-development `backend/.env.example` into the root `.env`: its `127.0.0.1` database address is for a MongoDB process on the host, not for Compose. The `frontend/.env` and `backend/.env` files are unnecessary for container deployment and excluded from builds.

Check for previously exported shell variables with these names: they can override `.env` values during [Compose interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/). Also check for an unintended `COMPOSE_FILE`, `COMPOSE_PROJECT_NAME`, or `DOCKER_HOST` when troubleshooting a new shell. Inspect the effective configuration locally with `docker compose config`.

### Exact destination run steps

1. Extract or clone the source into any folder, including folders with spaces. Open a terminal in the root containing `docker-compose.yml`; use quotes around a folder path when navigating to it.
2. Start Docker and verify both client and server appear in `docker version`. Run `docker compose version`.
3. Leave `.env` absent for defaults, or create it as described above. No local `npm install` step is necessary.
4. Run:

   ```sh
   docker compose config --quiet
   docker compose up --build
   ```

5. Wait for MongoDB and the backend to become healthy. In another terminal in the same root, run `docker compose ps` and confirm all three services are running. For detached startup, use `docker compose up --build -d --wait` with a recent CLI.
6. Open http://localhost:5173, http://localhost:5000/api/health, and http://localhost:5173/api/health. Both health URLs should return HTTP 200 with `status: "ok"` and `database: "connected"`. Substitute customized host ports if applicable.
7. Stop the deployment with `docker compose down` when finished. Keep the named volume to retain tasks.

The published addresses are deliberately loopback-only. Open these URLs in a browser on the computer running Docker with a local Docker engine; another computer's browser cannot access this deployment over the LAN. A remote Docker context also makes `localhost` refer to a different machine than the engine host.

### Manual portability verification checklist

- [ ] Start from transferred source without `node_modules`, `dist`, `.cache`, a real `.env`, or an existing TaskFlow database volume. On a computer already running TaskFlow, use a different Compose project name and unused host ports instead of deleting existing data.
- [ ] Run `docker compose config --quiet`, then `docker compose up --build`; confirm startup succeeds.
- [ ] Confirm `docker compose ps` lists frontend running and backend/MongoDB healthy. Check `docker compose logs` if anything exits or remains unhealthy.
- [ ] Open the frontend and both health URLs above in a browser on the Docker host.
- [ ] Add a uniquely named task with a description. Refresh the browser and confirm it remains. Toggle completed and pending; verify counts and filters. Delete a separate disposable test task.
- [ ] In browser developer tools, verify task requests go to the frontend origin under `/api/tasks` and succeed, rather than requesting a Compose hostname.
- [ ] Run `docker compose exec backend node -e "console.log(new URL(process.env.MONGODB_URI).hostname)"`; the default deployment should print `mongodb`.
- [ ] Run `docker volume inspect taskflow_mongodb_data`; confirm it exists. With a custom project name, substitute `<project>_mongodb_data`.
- [ ] Keep one test task, run `docker compose down`, then `docker compose up --build`, and confirm its title, description, and completion state remain. Do not use `down -v` for this check.
- [ ] Stop with `docker compose down`. Only use `docker compose down -v` if you intentionally want to permanently delete that deployment's database.

### Remaining portability limits

The top-level project name is `taskflow`, independent of the folder name. Two copies on the same Docker engine therefore share the project identity unless you use a separate name, such as `docker compose -p taskflow-demo up --build`, and distinct host ports. Use the same `-p taskflow-demo` on subsequent status, log, and shutdown commands. That deployment's volume is `taskflow-demo_mongodb_data`.

The Node/MongoDB/Nginx image tags can receive updates; package lockfiles fix npm dependency versions but do not pin base-image digests. A future build or a different CPU can therefore differ from this review. No authentication is included, and the bundled configuration is intended for local use. The browser needs modern JavaScript support, including `AbortSignal.timeout`. Replacing the backend container independently can require restarting the frontend so Nginx resolves its current address; normal `docker compose down` followed by `up` recreates both.

## Container operations

```sh
# Validate configuration without starting services
docker compose config --quiet

# Container state and health
docker compose ps

# Stream all logs (Ctrl+C exits the log viewer)
docker compose logs -f

# View just the backend logs
docker compose logs -f backend

# Stop and remove containers and network; retain database data
docker compose down

# Start again, preserving data
docker compose up --build
```

Pressing Ctrl+C during foreground `up` stops the stack. `docker compose down` also removes the containers and network, while retaining the named database volume.

**Destructive reset:**

```sh
docker compose down -v
```

**`docker compose down -v` removes the named database volume and permanently deletes the stored database data.** Only use it when you deliberately want a fresh database.

## Verify persistence manually

1. Start the stack and add a task named `Persistence demo`.
2. Refresh the browser and confirm the task remains.
3. Run `docker compose restart`, wait for health checks, and refresh again.
4. Run `docker compose down` followed by `docker compose up --build`.
5. Confirm the task and its completed/pending status are still present.

The volume is normally named `taskflow_mongodb_data`. Inspect it with `docker volume inspect taskflow_mongodb_data`. Persistence applies to container restarts and recreation on this Docker installation; a volume is not an off-machine backup.

## API reference

All responses are JSON. Task fields are `_id`, `title`, `description`, `completed`, `createdAt`, and `updatedAt`. Lists are newest first. Titles are trimmed and limited to 1–120 characters. Descriptions are optional, trimmed, and limited to 1,000 characters. Unknown write fields are rejected. PATCH accepts only a boolean `completed`.

| Method | Path | Success | Response |
| --- | --- | --- | --- |
| GET | `/api/health` | 200 | `{ "status": "ok", "database": "connected", "application": "TaskFlow" }` |
| GET | `/api/tasks` | 200 | `{ "tasks": [] }` |
| POST | `/api/tasks` | 201 | `{ "task": { ... } }` |
| PATCH | `/api/tasks/:id` | 200 | `{ "task": { ... } }` |
| DELETE | `/api/tasks/:id` | 200 | `{ "message": "Task deleted." }` |

Errors use `{ "message": "..." }`: 400 for invalid data/IDs/JSON, 404 for missing tasks/endpoints, 413 for oversized JSON bodies, and 503 for unavailable database operations. The health endpoint returns 503 and a disconnected status when MongoDB is unavailable. No database details are sent to clients.

### PowerShell examples

```powershell
Invoke-RestMethod http://localhost:5000/api/health
Invoke-RestMethod http://localhost:5000/api/tasks
$task = Invoke-RestMethod http://localhost:5000/api/tasks -Method Post -ContentType 'application/json' -Body '{"title":"Prepare Docker demo","description":"Explain networks and volumes"}'
$taskId = $task.task._id
Invoke-RestMethod "http://localhost:5000/api/tasks/$taskId" -Method Patch -ContentType 'application/json' -Body '{"completed":true}'
Invoke-RestMethod "http://localhost:5000/api/tasks/$taskId" -Method Delete
```

### macOS/Linux curl examples

```sh
curl http://localhost:5000/api/health
curl http://localhost:5000/api/tasks
curl -X POST http://localhost:5000/api/tasks -H 'Content-Type: application/json' -d '{"title":"Prepare Docker demo","description":"Explain volumes"}'
# Replace TASK_ID with the _id returned by POST:
curl -X PATCH http://localhost:5000/api/tasks/TASK_ID -H 'Content-Type: application/json' -d '{"completed":true}'
curl -X DELETE http://localhost:5000/api/tasks/TASK_ID
```

## Run locally without Docker

Install Node.js 24 LTS and MongoDB 8.0 locally. Start MongoDB using your platform's service instructions. In one terminal:

```sh
cd backend
npm ci
```

Copy `backend/.env.example` to `backend/.env` (PowerShell: `Copy-Item .env.example .env`; macOS/Linux: `cp .env.example .env`). This uses `mongodb://127.0.0.1:27017/taskflow`, appropriate for a database running on the host. Then:

```sh
npm run dev
```

In a second terminal, from the project root:

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the local API on port 5000. `frontend/.env.example` shows how to change this target. The root `.env` is used by Compose; the local Node process reads `backend/.env`, and Vite reads `frontend/.env`.

## Development checks

```sh
cd frontend
npm ci
npm run lint
npm run build
```

From the root in another terminal:

```sh
cd backend
npm ci
npm run check
npm test
```

Backend tests use a temporary real MongoDB process via `mongodb-memory-server-core`; the first test run downloads a MongoDB binary and needs internet access. The Windows download is roughly 756 MB, so the setup timeout allows 20 minutes; subsequent runs reuse the cached binary. The tests do not use or modify the application database. They exercise task CRUD, completion toggles, storage across a database reconnection, validation, malformed requests, missing IDs, health checks, and unavailable database responses. They do not replace the manual Docker-volume persistence check above.

Commit both package lockfiles so `npm ci` installs the same dependency versions. The backend Docker image installs only runtime dependencies. The frontend build stage installs its build dependencies, then copies only static output into the smaller Nginx runtime image.

## Docker concepts for the viva

- **Dockerfile:** instructions for building an image, including the runtime, dependencies, source, and startup command.
- **Image:** a packaged application template. Here, frontend and backend images are built from source; MongoDB uses an official image.
- **Container:** a running instance of an image with its own filesystem and process. These services run independently.
- **Volume:** storage managed outside the disposable container filesystem. `mongodb_data` is mounted at `/data/db` so MongoDB survives container removal.
- **Network:** the private bridge connecting services and supplying DNS names. `ports` exposes selected container ports on the host.
- **Compose:** one YAML file describes services, builds, environment variables, network, volume, ports, and startup dependencies.
- **Health check:** a command that reports readiness. Merely starting a database process does not mean it can accept API requests yet.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Cannot connect to Docker daemon / named pipe missing | Start Docker Desktop, wait until the engine is running, and use Linux containers. Check `docker version`. |
| Port already allocated | Stop the conflicting application or change `FRONTEND_PORT`/`BACKEND_PORT` in root `.env`, then recreate with `docker compose up --build`. |
| Database unhealthy | Run `docker compose logs mongodb`. Check free disk space, Docker memory allocation, and CPU compatibility with MongoDB 8.0. |
| API cannot connect | Check backend logs and `MONGODB_URI`. Compose must use hostname `mongodb`; direct local development uses `127.0.0.1`. |
| Dashboard cannot load tasks / 502 | Check `docker compose ps`, then backend and frontend logs. Test both health URLs. After replacing the backend independently, run `docker compose restart frontend` to refresh Nginx's upstream DNS resolution. |
| Build/image download fails | Check internet, Docker registry access, and any local proxy. Retry when access is restored. |
| `npm.ps1` execution policy error in PowerShell | Use `npm.cmd` in place of `npm`; no policy change is needed. |
| Tests fail downloading MongoDB | Allow the MongoDB binary download, then rerun `npm test`. Tests require a compatible local MongoDB binary and do not require Docker. |
| Fonts are unavailable offline | The UI uses local sans-serif fallback fonts; core features still work. |
| Tasks appear missing | Check the URI/database and volume. `down -v` deletes data; changing Compose project name changes the volume name. |

## Future enhancements

Possible later extensions include task editing, due dates, search, user authentication, database backups, and deployment automation. They are intentionally outside this basic project.

## Verification record

Verified in the creation environment on 23 October 2026:

- Frontend dependencies installed; ESLint and the Vite production build passed.
- Backend dependencies installed; JavaScript syntax checks passed.
- Both API integration tests passed against a real temporary MongoDB 8.0.17 process, including CRUD, validation, health checks, and saved data after reconnecting.
- An HTTP smoke check through the running Vite `/api` proxy passed health, create, list, completion update, and deletion against Express and MongoDB. The frontend HTML returned HTTP 200.
- `docker compose config --quiet` passed. The Docker CLI emitted a warning about access to the local Docker user configuration.
- Both dependency installs reported zero known vulnerabilities at installation time.

At initial creation the Docker engine was not running, so container execution was not tested at that time. The later portability review below adds Docker verification. No browser automation surface was available, so visual layout and browser interactions remain unverified. The temporary local development server used for the initial checks was stopped.

### Portability review on 23 October 2026

Reviewed `docker-compose.yml`, both Dockerfiles, both `.dockerignore` files, `.gitignore`, all `.env.example` templates, the Nginx/API URL configuration, and this README. No application or deployment code changes were needed. Build contexts and Dockerfile copy paths are relative; no real credentials, required local paths, host dependencies, or host database are needed. Container-local health checks and direct-development examples correctly use loopback addresses; inter-container connections use service names.

The review used Docker Desktop's **Linux/amd64** engine on this same Windows computer (Engine 29.1.3, Compose 5.0.1), with a separate project named `taskflow-portability-review` and host ports 15173/15000. It used a source-only copy without `node_modules`, `dist`, `.cache`, or a real `.env`. The review's separate environment file supplied only those two alternate host ports. The source copy included the same deployment files as the project, with no test-specific Dockerfile or Compose overrides.

- Compose configuration validation passed.
- Both application images built with `docker compose ... build --no-cache`, reinstalling dependencies inside Linux containers. Base images already present on this engine could be reused; this was not a test of an empty Docker image store.
- `docker compose ... up --build -d --wait` started frontend, backend, and MongoDB using a newly created named volume and network. MongoDB and backend passed their health checks.
- Direct API health, Nginx-proxied health, and frontend HTML returned successful HTTP responses. CRUD operations through `http://localhost:15173/api/tasks` passed against the containerized API and MongoDB, starting with an empty task list.
- The backend's configured database hostname was confirmed as `mongodb`. Container mount inspection confirmed the named volume `taskflow-portability-review_mongodb_data` at `/data/db`.
- A saved task's ID, title, description, and completed status survived `docker compose ... down` followed by `docker compose ... up --build -d --wait` against the retained volume.
- Review containers and their disposable named test volume were removed afterward. The original `taskflow` services were still running, and their proxied API health check passed.

These checks establish source-only startup on the existing Docker host. **Portability has not been tested on another computer**, another CPU architecture, or a newly installed operating system. Browser UI interactions still need the manual checklist above. The original running TaskFlow project and its database were left untouched.
