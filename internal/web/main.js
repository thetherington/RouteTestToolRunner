// Flag to prevent duplicate polling requests
let polling = false;

window.addEventListener("scroll", function () {
    const nav = document.querySelector("nav");
    if (window.scrollY > 4) {
        // Set to "4" or "1" pixel so it triggers as soon as anything scrolls under
        nav.classList.add("nav-transparent");
    } else {
        nav.classList.remove("nav-transparent");
    }
});

document.getElementById("fetchResultBtn").onclick = function () {
    // Optionally show a loading message/toast
    const output = document.getElementById("output");
    output.textContent = "Fetching last result...";
    fetch("/api/jobresult")
        .then((resp) => resp.json())
        .then((data) => {
            // Compose output just like the main poll logic
            setOutputResult(
                `Scheduler:\n${data.SchedulerOutput}\n\nSDVN:\n${
                    data.SDVNOutput
                }\n${data.Error ? "\nError: " + data.Error : ""}`
            );

            showToast("Fetched Previous Results!", "success");
        })
        .catch((err) => {
            showToast("Failed to Fetch Previous Results", "error");
        });
};

document.getElementById("saveBtn").onclick = function () {
    const output = document.getElementById("output");
    const text = output.textContent || output.innerText;
    // Format today's date as YYYY-MM-DD for the filename
    const today = new Date();
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    const dateStr =
        today.getFullYear() +
        "-" +
        pad(today.getMonth() + 1) +
        "-" +
        pad(today.getDate());
    const filename = `RouteTestResult_${dateStr}.txt`;

    // Create a Blob and download link
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and click it
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 150);
    showToast("Saved output to file!", "success");
};

// Copy-to-clipboard functionality for output panel
document.getElementById("copyBtn").onclick = function () {
    const output = document.getElementById("output");
    const text = output.textContent || output.innerText;
    // Use native Clipboard API if available (most browsers)
    if (navigator.clipboard) {
        navigator.clipboard
            .writeText(text)
            .then(() => showToast("Copied output to clipboard!", "success"))
            .catch(() => showToast("Failed to copy output.", "error"));
    } else {
        // Fallback for older browsers
        try {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            showToast("Copied output to clipboard!", "success");
        } catch (e) {
            showToast("Failed to copy output.", "error");
        }
    }
};

/**
 * Enable or disable the Run button and show/hide the spinner
 * according to whether a job is running.
 */
function setButtonState(isRunning) {
    const runBtn = document.getElementById("runBtn");
    const fetchBtn = document.getElementById("fetchResultBtn");
    const spinner = document.getElementById("spinner");
    const beam = document.getElementById("nav-loading-beam");
    if (isRunning) {
        runBtn.disabled = true;
        runBtn.classList.add("disabled-running");
        fetchBtn.disabled = true;
        fetchBtn.classList.add("disabled-running");
        spinner.hidden = false;
        beam.hidden = false;
    } else {
        runBtn.disabled = false;
        runBtn.classList.remove("disabled-running");
        fetchBtn.disabled = false;
        fetchBtn.classList.remove("disabled-running");
        spinner.hidden = true;
        beam.hidden = true;
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
            setOutputResult("");
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
                setTimeout(pollResult, 500);
            } else {
                document.getElementById("status").textContent =
                    "Status: Job finished.";

                setOutputResult(
                    `Scheduler:\n${data.SchedulerOutput}\n\n` +
                        `SDVN:\n${data.SDVNOutput}\n` +
                        `${data.Error ? "\nError: " + data.Error : ""}`
                );

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

function setOutputResult(result) {
    const output = document.getElementById("output");
    const copyBtn = document.getElementById("copyBtn");
    const saveBtn = document.getElementById("saveBtn");
    output.textContent = result;

    // Show button only if output is non-empty (excluding whitespace)
    if (result && result.trim().length > 0) {
        copyBtn.hidden = false;
        saveBtn.hidden = false;
    } else {
        copyBtn.hidden = true;
        saveBtn.hidden = true;
    }
}

// Periodically refresh job status and activity in the UI (every 1.5s)
setInterval(updateStatus, 800);

// Immediate update on page load
updateAppVersion();
updateStatus();
