# Route Test Tool Runner

A web-based tool for remotely executing scripts on two hosts over SSH, scheduling jobs in advance, and presenting robust job status and results—featuring secure credential management, full REST API, and a modern, embeddable frontend built with Vite, JavaScript, and SASS.

---

## Features

-   **Web UI** (single-page, Go-embedded): Trigger and view the results of a route test job from any browser.
-   **SSH Job Orchestration:** Connects to a "scheduler" host, runs its script(s), then connects to an "sdvn" host and runs its script(s), collecting output from each in order.
-   **Secure Per-Host Credentials:** SSH username/password for each host loaded from a `.env` file (never hard-coded).
-   **Configurable Hosts & Commands:** IP addresses and per-host SSH command lists come from a `config.yaml` file (via Viper).
-   **Serialized Execution:** Only one job can run at a time; concurrent API triggers are gracefully rejected.
-   **Live REST API:** Simple endpoints to trigger a new job, poll the latest job result, and query job status/activity and app version.
-   **Real-Time Frontend:** JS polls job status/activity, displays progress, disables UI when busy, and offers "copy" and "download" of output with feedback.
-   **User Experience:** Animated loading spinner, pulsating beam under the navbar, in-app toasts (error/success), scroll-sensitive transparent navbar.
-   **Versioned & Scriptable:** Build-time version display in both the console and UI; Makefile-based build/run with CLI version injection.

## Scheduler Features

-   **Full CRUD for Job Schedules:**  
    Create, read, update, or delete schedule entries via a user-friendly card UI in the slide-out panel. Users pick date/time with a modern Flatpickr widget.
-   **One-Job-at-a-Time Execution (Manual or Scheduled):**  
    Only a single job (manual, or background-scheduled) can run at any moment, enforced at the backend; all UI disables/reflects wait state accordingly.
-   **Persistent Scheduling (using gocron):**  
    Each schedule is registered as a unique job with go-co-op/gocron. Scheduled jobs will trigger the same SSH orchestration as a manual job at their specified time.
-   **Conflict Detection:**  
    When schedules are created or updated, the API checks for conflicts (overlapping jobs) within a configurable window and returns an error if the new schedule overlaps an existing job.
-   **Cancel Support:**  
    Running scheduled jobs may be canceled/stopped from the frontend just like a manual run, forcibly interrupting any SSH process.
-   **Result Reporting:**  
    After scheduled jobs run (or if canceled), their logs/output are stored and can be loaded into the UI via “View report”/“Run report” on the schedule card.
-   **Frontend CRUD UX:**  
    All schedule operations (CRUD, run report) are managed in a dedicated ScheduleController class and rendered as SASS-styled cards inside the slideout panel.
-   **Error Surfacing:**  
    If the backend rejects a schedule for any reason (e.g., conflict, invalid date), the associated error message is shown immediately and clearly in the schedule form.

---

## Directory Overview

```
RouteTestToolRunner/
├── cmd/
│    └── main.go                      # Go backend main entrypoint
├── internal/
│    ├── app.go
│    ├── config.go
│    ├── handlers.go
│    ├── sshjob.go
│    ├── schedule.go
│    ├── frontend.go                  # Go static asset handler with SPA support
│    └── web/                         # Where Vite build outputs go (embedded in Go binary)
│         ├── index.html
│         ├── style.css
│         ├── main.js
│         ├── ... (other JS/CSS/assets from Vite)
├── frontend/                         # Vite app src (npm, SASS, Flatpickr, etc)
│    ├── index.html
│    ├── main.js
│    ├── schedule-controller.js
│    ├── scss/
│    │    ├── _button.scss
│    │    ├── _input.scss
│    │    ├── _schedule.scss
│    │    └── style.scss
│    └── ... (Vite config, npm pkg files, etc)
├── config.yaml                       # Host IPs and command lists (YAML)
├── .env                              # SSH user/password per host
├── go.mod
├── makefile
```

---

## Quick Start

### 1. Clone and Prepare

```sh
git clone <this_repo_URL>
cd RouteTestToolRunner
```

### 2. Prepare Your `.env` With SSH Credentials

```
SCHEDULER_SSH_USER=your_scheduler_user
SCHEDULER_SSH_PASS=your_scheduler_password
SDVN_SSH_USER=your_sdvn_user
SDVN_SSH_PASS=your_sdvn_password
```

### 3. Create/Edit `config.yaml` (Host IPs and Commands)

```yaml
scheduler:
    ip: "192.168.1.101"
    commands:
        - "python3 /home/user/scheduler_script.py"
sdvn:
    ip: "192.168.1.102"
    commands:
        - "python3 /home/user/sdvn_script.py"
```

-   `commands` is a YAML list of strings; you can specify **one or more** for each host.

### 4. Build the Application

```sh
make build VERSION=1.0.0
```

-   (Set VERSION to inject the release stamp into both UI and API.)

### 5. Run the Application

```sh
make run CONFIG=config.yaml PORT=8080
```

-   The app defaults to listening on port 8080 unless overridden.
-   `CONFIG` can be set to point to any valid config.yaml file.

### 6. Access the Web UI

Open your browser to:

```
http://localhost:8080/
```

Use from any computer that can reach the server.

---

## Usage Details

## Vite Frontend: npm Scripts & Workflow

### Setup

```sh
cd frontend
npm install
```

### Common Scripts

-   **Development (hot reload, local dev server):**

    ```sh
    npm run dev
    ```

    _Runs the SPA at localhost:5173 (or as configured); best for UI development. Proxy setup may be needed for API routes if testing against the running Go backend._

-   **Build for Go Backend (production):**

    ```sh
    npm run build
    ```

    _Outputs all JS/CSS/static files to ../internal/web/. The backend will then embed and serve these assets._

-   **Preview Built App:**
    ```sh
    npm run preview
    ```
    _Serves the production build (for QA, before backend embedding)._

### Using SASS and JavaScript

-   All styles should be authored in `frontend/src/scss/` and imported in `style.scss` (e.g. `@import "button"; @import "schedule";` etc).
-   You can organize controller logic (such as ScheduleController) and all utility modules in JS/ES module files under frontend/src/.

---

### Backend (API)

-   **POST `/api/runjob`**  
    Triggers a new SSH job if one isn't already running.
-   **GET `/api/jobstatus`**  
    Returns JSON: `{ "running": bool, "activity": string }` — polled by UI for live feedback.
-   **GET `/api/jobresult`**  
    Returns the latest complete job's combined output for both hosts.
-   **GET `/api/version`**  
    Returns `{ "version": "X.Y.Z" }` from the build stamp.

### Job Execution Semantics

-   Each host's commands (from YAML array) are run **in order**; if any command fails, execution for that host halts and the error is returned (with all previous output).
-   Only one job can execute at a time (mutex-protected).
-   Job status/activity is updated at each major step for detailed UI feedback.

---

## Configuration Summary

-   All **SSH credentials**: stored in `.env` (not in code or config.yaml).
-   **Host IPs and commands**: stored in `config.yaml` (change as needed).
-   **App version**: injected at build time via `make build VERSION=X.Y.Z`.
-   **Port/config path**: CLI flags (default: `8080` and `config.yaml`).

---

## Example Workflow

```sh
# 1. Build frontend for backend embedding
cd frontend
npm run build

# 2. Build and start Go backend from project root
make build VERSION=2.7.4
make run CONFIG=config.yaml PORT=8080

# 3. Browse to: http://localhost:8080/
# 4. Use the hamburger/menu panel to create and manage schedules.
```

---

## Backend Libraries Used

-   **go-co-op/gocron:** Registers and manages scheduled jobs, runs background tasks, mutually exclusive with manual runs.
-   **go-chi/chi:** HTTP routing, REST APIs, and middleware setup.
-   **spf13/viper:** Loads hosts and commands from `config.yaml`.
-   **joho/godotenv:** Loads separate per-host SSH credentials from `.env`.
-   **golang.org/x/crypto/ssh:** Handles remote SSH command orchestration.

---

## Key Scheduler Table

| Feature              | User Experience                                           | API/Backend                                          |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| Create schedule      | Flatpickr, only valid times enabled, errors shown         | `POST /api/schedules`, 409 if conflict (overlap)     |
| Edit/update schedule | Edit icon on schedule card, pre-loads picker              | `PUT /api/schedules/:id`, applies conflict check     |
| Delete schedule      | Trash icon removes immediately, live update               | `DELETE /api/schedules/:id`, all live jobs removed   |
| List/order schedules | Running jobs at top, future by soonest, past at bottom    | Schedules sorted in Go & UI                          |
| Run/cancel job       | Spinner, light beam, badge always reflect real job status | Unified mutex/state gating                           |
| Output/reporting     | Badge “Manual Run” or “Scheduled Job” above output        | Any job result available `/api/schedules/:id/result` |
| Error feedback       | Form field, toast, and notification feedback              | Returns proper status code/messages on error         |

---

## For Developers

-   **Frontend authoring:** All SASS and modular JS in `frontend/`, best authored via Vite hotreload.
-   **Embedding/serving:** Built with Vite, all frontend assets are embedded in Go via Go 1.16+ `embed.FS` and a general SPA handler.
-   **Extensible architecture:** Fully ready for integrations like DB persistence or more advanced scheduling in the future.

---

## Sample ASCII Banner

When you run the app, the console shows:

```
   ____             _        _____         _   _         _   _
  |  _ \ ___   ___ | |_ ___ | |_ _|_ _ ___| |_| |__  ___| |_(_)_ __   __ _
  | |_) / _ \ / _ \| __/ _ \| || | '_/ -_)  _| '_ \/ -_)  _| | '  \ / _` |
  |____/\___/ \___/ \__\___/|_|___|_| \___|\__|_.__/\___|\__|_|_|_|_\__, |
                                                                  |___/

Application Version: 2.5.1
Server listening on :9090
```

---

## License

This project does not currently specify a license. For proprietary, internal, or evaluation-only use at Evertz or related organizations. Add licensing as needed for your distribution model.

---

## Authors

-   Maintained by Tom Hetherington (Evertz Engineering, Senior Product Technical Specialist — MAGNUM OS)

---

## Contributions and Issues

Open an issue or submit a pull request as needed.  
For enhancements, integration help, or non-public development, please contact the maintainer directly.

---

**Enjoy secure, robust network tool orchestration — powered by Go, SSH, and a modern web UI!**
