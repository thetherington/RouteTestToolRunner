import { getDom } from "./dom.js";
import * as api from "./api.js";
import { registerActions } from "./actions.js";

export class App {
    constructor() {
        this.dom = getDom();
        this.polling = false;
        this.statusTimer = null;
    }

    async start() {
        // Load version
        this.updateAppVersion();

        // Wire up actions
        registerActions(this);

        // Poll for job status
        this.statusTimer = setInterval(() => this.updateStatus(), 800);
        this.updateStatus();
    }

    async updateAppVersion() {
        const v = await api.fetchVersion();
        if (v?.version) this.dom.version.textContent = "v" + v.version;
    }

    /**
     * Called when the Run button is pressed.
     * If a job is running, prevents duplicate trigger and updates status.
     * If not, starts the job, disables button, and clears previous output.
     */
    async startJob() {
        const status = await api.fetchJobStatus();

        if (status.running) {
            this.dom.status.textContent = `Status: Job is already running!\n${
                status.activity || ""
            }`;
            this.setButtonState(true);
            return;
        }

        this.dom.status.textContent = "Status: Starting job...";
        this.setOutputResult("");
        this.setButtonState(true);

        const resp = await api.fetchRunJob();

        if (resp.Running == true) {
            this.polling = true;
            this.pollResult();
            this.showToast("Job Started!", "success");
        } else {
            this.showToast("Job Failed to start", "error");
        }
    }

    /**
     * Called when the fetchResultBtn is clicked to get the last results
     */
    async fetchLastResult() {
        const data = await api.fetchJobResult();

        try {
            // Compose output just like the main poll logic
            this.setOutputResult(
                `Scheduler:\n${data.SchedulerOutput}\n\nSDVN:\n${
                    data.SDVNOutput
                }\n${data.Error ? "\nError: " + data.Error : ""}`
            );

            this.showToast("Fetched Previous Results!", "success");
        } catch (error) {
            showToast("Failed to Fetch Previous Results", "error");
        }
    }

    /**
     * Called when the stopBtn is clicked to stop the running job
     */
    async stopJob() {
        const res = await api.fetchStopJob();

        if (res.stopped) {
            this.showToast("Job stopped by user", "success");
        } else {
            this.showToast(
                "Failed to stop job: " + (data.error || "?"),
                "error"
            );
        }
    }

    /**
     * Called when the copyBtn is clicked to copy the output to the clipboard
     */
    async copyOutput() {
        const text = this.dom.output.textContent || this.dom.output.innerText;

        try {
            // Use native Clipboard API if available (most browsers)
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                try {
                    const textarea = document.createElement("textarea");
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textarea);
                } catch (e) {
                    throw new Error(e);
                }
            }

            this.showToast("Copied output to clipboard!", "success");
        } catch (e) {
            this.showToast("Failed to copy output.", "error");
        }
    }

    /**
     * Called when the saveBtn is clicked to save the output to a file
     */
    saveOutput() {
        const text = this.dom.output.textContent || this.dom.output.innerText;

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

        this.showToast("Saved output to file!", "success");
    }

    /**
     * Polls the backend for job results if the job is running.
     * When complete, prints the results and resets the UI.
     */
    async pollResult() {
        const data = await api.fetchJobResult();

        if (data.Running) {
            setTimeout(() => this.pollResult(), 500);
        } else {
            this.dom.status.textContent = "Status: Job finished.";

            this.setOutputResult(
                `Scheduler:\n${data.SchedulerOutput}\n\n` +
                    `SDVN:\n${data.SDVNOutput}\n` +
                    `${data.Error ? "\nError: " + data.Error : ""}`
            );

            this.setButtonState(false);
            this.polling = false;

            // Show green toast if no error, red if any error in job result
            if (data.Error && data.Error.length > 0) {
                this.showToast("Job finished with ERROR!", "error");
            } else {
                this.showToast("Job completed successfully.", "success");
            }
        }
    }

    /**
     * Polls the backend job status API and updates the status area,
     * run button, and spinner. If a job is running, also starts polling results.
     * Runs periodically and on page load.
     */
    async updateStatus() {
        const status = await api.fetchJobStatus();

        if (status.running) {
            this.dom.status.textContent = `Status: Job is running...\n${
                status.activity || ""
            }`;

            this.setButtonState(true);

            if (!this.polling) {
                this.polling = true;
                this.pollResult();
            }
        } else {
            this.dom.status.textContent = `Status: Ready to run job.\n${
                status.activity || ""
            }`;

            this.polling = false;
        }
    }

    /**
     * Helper function to set button states for the application
     * @param {boolean} isRunning - Job running status
     */
    setButtonState(isRunning) {
        if (isRunning) {
            this.dom.runBtn.disabled = true;
            this.dom.runBtn.classList.add("disabled-running");
            this.dom.fetchBtn.disabled = true;
            this.dom.fetchBtn.classList.add("disabled-running");
            this.dom.spinner.hidden = false;
            this.dom.beam.hidden = false;
            this.dom.stopBtn.hidden = false;
            this.dom.stopBtn.disabled = false;
        } else {
            this.dom.runBtn.disabled = false;
            this.dom.runBtn.classList.remove("disabled-running");
            this.dom.fetchBtn.disabled = false;
            this.dom.fetchBtn.classList.remove("disabled-running");
            this.dom.spinner.hidden = true;
            this.dom.beam.hidden = true;
            this.dom.stopBtn.hidden = true;
            this.dom.stopBtn.disabled = true;
        }
    }

    /**
     * Show a toast notification.
     * @param {string} message - The toast message to display.
     * @param {string} type - Either 'success' or 'error' (for green/red).
     */
    showToast(message, type) {
        this.dom.toast.textContent = message;

        // Remove previous animation classes
        this.dom.toast.className = `toast ${type}`;
        this.dom.toast.hidden = false;

        // Start slide-in animation
        setTimeout(() => {
            this.dom.toast.className = `toast ${type} show-in`;
        }, 10); // short delay ensures animation triggers

        // After display duration, start slide-out
        setTimeout(() => {
            this.dom.toast.className = `toast ${type} show-out`;
            // Hide the toast after slide-out animation completes (match duration)
            setTimeout(() => {
                toast.hidden = true;
                toast.className = `toast ${type}`; // reset to base for next show
            }, 1000); // should match .show-out animation duration
        }, 3200); // show duration (toast remains visible before sliding out)
    }

    /**
     * Helper function to set the output content and display the copy/save buttons
     * @param {string} result - Result data
     */
    setOutputResult(result) {
        this.dom.output.textContent = result;

        // Show button only if output is non-empty (excluding whitespace)
        if (result && result.trim().length > 0) {
            this.dom.copyBtn.hidden = false;
            this.dom.saveBtn.hidden = false;
        } else {
            this.dom.copyBtn.hidden = true;
            this.dom.saveBtn.hidden = true;
        }
    }
}
