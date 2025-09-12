import * as api from "./api.js";
import { registerActions } from "./actions.js";

export class AppController {
    constructor(dom, ui, schedule) {
        this.dom = dom;
        this.ui = ui;
        this.schedule = schedule;
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
            this.ui.setButtonState(true);
            return;
        }

        this.dom.status.textContent = "Status: Starting job...";
        this.ui.setOutputResult("", null);
        this.ui.setButtonState(true);

        const resp = await api.fetchRunJob();

        if (resp.Running == true) {
            this.polling = true;
            this.pollResult();
            this.ui.showToast("Job Started!", "success");
        } else {
            this.ui.showToast("Job Failed to start", "error");
        }
    }

    /**
     * Called when the fetchResultBtn is clicked to get the last results
     */
    async fetchLastResult() {
        const data = await api.fetchJobResult();
        console.log(data);
        try {
            // Compose output just like the main poll logic
            this.ui.setOutputResult(this.ui.formatOutput(data), data.RunType);

            this.ui.showToast("Fetched Previous Results!", "success");
        } catch (error) {
            this.ui.showToast("Failed to Fetch Previous Results", "error");
        }
    }

    /**
     * Called when the stopBtn is clicked to stop the running job
     */
    async stopJob() {
        const res = await api.fetchStopJob();

        if (res.stopped) {
            this.ui.showToast("Job stopped by user", "success");
        } else {
            this.ui.showToast(
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

            this.ui.showToast("Copied output to clipboard!", "success");
        } catch (e) {
            this.ui.showToast("Failed to copy output.", "error");
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

        this.ui.showToast("Saved output to file!", "success");
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

            this.ui.setOutputResult(this.ui.formatOutput(data), data.RunType);

            this.ui.setButtonState(false);
            this.polling = false;

            // Show green toast if no error, red if any error in job result
            if (data.Error && data.Error.length > 0) {
                this.ui.showToast("Job finished with ERROR!", "error");
            } else {
                this.ui.showToast("Job completed successfully.", "success");
            }

            // refresh the schedules incase one was ran
            this.schedule.loadSchedules();
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

            this.ui.setButtonState(true);

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
}
