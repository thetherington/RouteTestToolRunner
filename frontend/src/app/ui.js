import { getDom } from "./dom.js";

export class UI {
    constructor() {
        this.dom = getDom();
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

    /**
     * Opens the sidebar slide out menu
     */
    openMenu() {
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
}
