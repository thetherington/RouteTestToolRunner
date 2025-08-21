// Flag to prevent duplicate polling requests
let polling = false;

/**
 * Enable or disable the Run button and show/hide the spinner
 * according to whether a job is running.
 */
function setButtonState(isRunning) {
    const btn = document.getElementById("runBtn");
    const spinner = document.getElementById("spinner");
    if (isRunning) {
        btn.disabled = true;
        btn.classList.add("disabled-running");
        spinner.hidden = false;
    } else {
        btn.disabled = false;
        btn.classList.remove("disabled-running");
        spinner.hidden = true;
    }
}

/**
 * Polls the backend job status API and updates the status area,
 * run button, and spinner. If a job is running, also starts polling results.
 * Runs periodically and on page load.
 */
function updateStatus() {
    fetch("/api/jobstatus")
        .then((resp) => resp.json())
        .then((status) => {
            let statusPre = document.getElementById("status");
            // Display main job state and job activity/phase details
            if (status.running) {
                statusPre.textContent = `Status: Job is running...\n${
                    status.activity || ""
                }`;
                setButtonState(true);
                if (!polling) {
                    polling = true;
                    pollResult();
                }
            } else {
                statusPre.textContent = `Status: Ready to run job.\n${
                    status.activity || ""
                }`;
                setButtonState(false);
                polling = false;
            }
        });
}

/**
 * Called when the Run button is pressed.
 * If a job is running, prevents duplicate trigger and updates status.
 * If not, starts the job, disables button, and clears previous output.
 */
function startJob() {
    let statusPre = document.getElementById("status");
    fetch("/api/jobstatus")
        .then((resp) => resp.json())
        .then((status) => {
            if (status.running) {
                statusPre.textContent = `Status: Job is already running!\n${
                    status.activity || ""
                }`;
                setButtonState(true);
                return;
            }
            statusPre.textContent = "Status: Starting job...";
            document.getElementById("output").textContent = "";
            setButtonState(true);
            fetch("/api/runjob", { method: "POST" }).then(() => {
                polling = true;
                pollResult();
            });
        });
}

/**
 * Polls the backend for job results if the job is running.
 * When complete, prints the results and resets the UI.
 */
function pollResult() {
    fetch("/api/jobresult")
        .then((resp) => resp.json())
        .then((data) => {
            if (data.Running) {
                setTimeout(pollResult, 1000);
            } else {
                document.getElementById("status").textContent =
                    "Status: Job finished.";
                document.getElementById("output").textContent = `Scheduler:\n${
                    data.SchedulerOutput
                }\n\nSDVN:\n${data.SDVNOutput}\n${
                    data.Error ? "\nError: " + data.Error : ""
                }`;
                setButtonState(false);
                polling = false;

                // Show green toast if no error, red if any error in job result
                if (data.Error && data.Error.length > 0) {
                    showToast("Job finished with ERROR!", "error");
                } else {
                    showToast("Job completed successfully.", "success");
                }
            }
        });
}

/**
 * Show a toast notification.
 * @param {string} message - The toast message to display.
 * @param {string} type - Either 'success' or 'error' (for green/red).
 */
function showToast(message, type) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    // Remove previous animation classes
    toast.className = `toast ${type}`;
    toast.hidden = false;

    // Start slide-in animation
    setTimeout(() => {
        toast.className = `toast ${type} show-in`;
    }, 10); // short delay ensures animation triggers

    // After display duration, start slide-out
    setTimeout(() => {
        toast.className = `toast ${type} show-out`;
        // Hide the toast after slide-out animation completes (match duration)
        setTimeout(() => {
            toast.hidden = true;
            toast.className = `toast ${type}`; // reset to base for next show
        }, 1000); // should match .show-out animation duration
    }, 3200); // show duration (toast remains visible before sliding out)
}

function updateAppVersion() {
    fetch("/api/version")
        .then((resp) => resp.json())
        .then((data) => {
            document.getElementById("version").textContent =
                "v" + (data.version || "?");
        });
}

// Periodically refresh job status and activity in the UI (every 1.5s)
setInterval(updateStatus, 800);

// Immediate update on page load
updateAppVersion();
updateStatus();
