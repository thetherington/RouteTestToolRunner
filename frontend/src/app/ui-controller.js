export class UIController {
    constructor(dom) {
        this.dom = dom;
    }

    setSchedulerController(sched) {
        this.scheduler = sched;
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
     * @param {string} runType - Type (manual || schedule || scheduled)
     */
    setOutputResult(result, runType) {
        this.dom.output.textContent = result;

        // Show button only if output is non-empty (excluding whitespace)
        if (result && result.trim().length > 0) {
            this.dom.copyBtn.hidden = false;
            this.dom.saveBtn.hidden = false;

            // Show and style the badge
            if (runType === "manual") {
                this.dom.badge.textContent = "Manual Run";
                this.dom.badge.className = "output-source-badge manual";
                this.dom.badge.hidden = false;
            } else if (runType === "schedule" || runType === "scheduled") {
                this.dom.badge.textContent = "Scheduled Job";
                this.dom.badge.className = "output-source-badge schedule";
                this.dom.badge.hidden = false;
            } else {
                this.dom.badge.hidden = true;
            }
        } else {
            this.dom.copyBtn.hidden = true;
            this.dom.saveBtn.hidden = true;
            this.dom.badge.hidden = true;
        }
    }

    /**
     * Opens the sidebar slide out menu
     */
    openMenu() {
        this.scheduler.loadSchedules();
        this.dom.menuBtn.classList.add("open");
        this.dom.slidePanel.classList.add("open");
        this.dom.slidePanel.ariaHidden = "false";
    }

    /**
     * Closes the sidebar slide out menu
     */
    closeMenu() {
        this.dom.slidePanel.classList.remove("open");
        this.dom.menuBtn.classList.remove("open");
        this.dom.slidePanel.ariaHidden = "true";
    }

    // Call this before any API call or successful save
    clearFormError() {
        this.dom.errorDiv.textContent = "";
        this.dom.errorDiv.hidden = true;
    }

    // Call this to display any error in the form
    showFormError(message) {
        this.dom.errorDiv.innerHTML = `
        <div>${message || "Failed to save schedule. Please try again."}</div> 
        <button id="closeAlert" class="btn-sm btn--icon btn--danger" title="Delete" aria-label="Delete">
            <svg width="128" height="128" viewBox="0 0 28 28" aria-hidden="true"
                focusable="false">
                <line x1="8" y1="8" x2="20" y2="20" stroke="currentColor"
                    stroke-width="2.4" stroke-linecap="round" />
                <line x1="20" y1="8" x2="8" y2="20" stroke="currentColor"
                    stroke-width="2.4" stroke-linecap="round" />
            </svg>
        </button>
        `;

        this.dom.errorDiv.querySelector("button").onclick = (e) => {
            e.preventDefault();
            this.clearFormError();
        };

        this.dom.errorDiv.hidden = false;
    }
}
