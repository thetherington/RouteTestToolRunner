# Route Test Tool Runner

A web-based tool for remotely executing scripts on two hosts over SSH, with secure credential management, robust job handling, RESTful API, and a modern, responsive frontend for real-time status, results retrieval, and advanced UX.

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

---

## Directory Overview

```
RouteTestToolRunner/
├── cmd/
│    └── main.go
├── internal/
│    ├── app.go
│    ├── config.go
│    ├── handlers.go
│    ├── sshjob.go
│    ├── frontend.go
│    └── web/
│         ├── index.html
│         ├── main.js
│         └── style.css
├── config.yaml
├── .env
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

### Web App (Frontend)

-   **Run Route Test:** Starts a job that SSHs into the scheduler host, runs its commands (in order, stopping on first failure), then does the same for the sdvn host. Results are displayed in the output panel.
-   **Status Panel:** Shows in real time whether a job is running and the exact backend step (connection, command, output).
-   **Copy Output:** Use the button (clipboard SVG) to copy the result to the clipboard once available.
-   **Save Output:** Click the save button (floppy SVG) to download the output as a `.txt` file named with today’s date.
-   **Fetch Last Result:** The down-arrow button retrieves the latest result from the past job, without launching a new job.
-   **Toasts:** Inform you of success/failure of job runs and copy/save actions.
-   **Loading Indicators:** Spinner beside Run, animated light beam below the navbar when running.

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

## Example: Build and Run

```sh
# Build with version info
make build VERSION=2.5.1

# Run on port 9090 with your chosen config file
make run CONFIG=myconfig.yaml PORT=9090

# Now browse to: http://localhost:9090/
```

---

## Architecture Overview

-   **Go backend**: Handles all HTTP, job state, concurrency, and SSH orchestration.
-   **Frontend**: Static HTML/CSS/JS embedded via Go’s embed for zero-deps deployment.
-   **Chi v5**: For REST API, logging, CORS, and panic recovery.
-   **Viper**: To load host IPs/commands from YAML at boot; live editing requires app restart.
-   **Job concurrency**: Single job at a time (mutex lock); backend prevents overlap.
-   **No sensitive credentials in sources**: all usernames/passwords in `.env`.

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

## Dependency List

-   [Go 1.20+](https://golang.org/)
-   [Chi v5](https://github.com/go-chi/chi/v5) + [cors](https://github.com/go-chi/cors)
-   [joho/godotenv](https://github.com/joho/godotenv)
-   [spf13/viper](https://github.com/spf13/viper)
-   [x/crypto/ssh](https://pkg.go.dev/golang.org/x/crypto/ssh)

---

## Development Workflow

1. Edit your Go code or frontend assets.
2. Update `.env`/`config.yaml` as needed for your test lab or deployment.
3. Run `make build` then `make run`.
4. Test in browser, interact with the REST API, and monitor the console banner/status output.

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
