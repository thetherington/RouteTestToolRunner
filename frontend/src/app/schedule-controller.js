import flatpickr from "flatpickr";
import "flatpickr/dist/themes/dark.css";

import * as api from "./api.js";

// Handles scheduling CRUD UI and API state
export class ScheduleController {
    constructor(dom, ui) {
        this.ui = ui;
        this.dom = dom;

        this.ui.setSchedulerController(this);

        this.form = dom.scheduleForm;
        this.pickerInput = dom.pickerInput;

        this.flatpickr = flatpickr(this.pickerInput, {
            enableTime: true,
            dateFormat: "Z",
            altInput: true,
            altFormat: "Y-m-d h:i K",
            minDate: "today",
            // Use onChange to trigger button enable/disable
            onChange: this.handlePickerChange.bind(this),
        });

        // Also respond to direct typing (if allowed)
        this.pickerInput.addEventListener(
            "input",
            this.handlePickerChange.bind(this)
        );

        this.editingId = null;

        this.form.onsubmit = (e) => {
            e.preventDefault();

            if (this.dom.saveScheduleBtn.disabled) return;

            this.editingId ? this.updateSchedule() : this.createSchedule();
        };

        this.dom.cancelEditBtn.onclick = () => this.cancelEdit();
    }

    async loadSchedules() {
        const data = await api.fetchSchedules();

        let schedules = data.schedules || [];
        const now = Date.now();

        // Sort schedules: running (or .isRunning) at the top
        schedules.sort((a, b) => {
            // 1. Running at top
            if (a.isRunning && !b.isRunning) return -1;
            if (b.isRunning && !a.isRunning) return 1;

            // 2. Future jobs before past jobs, sorted by date
            const aIsPast = !a.isRunning && new Date(a.time) < now;
            const bIsPast = !b.isRunning && new Date(b.time) < now;

            if (aIsPast && !bIsPast) return 1; // past goes after any future
            if (bIsPast && !aIsPast) return -1;

            // 3. Within same group: sort by timestamp ascending
            return new Date(a.time) - new Date(b.time);
        });

        this.renderSchedules(data.schedules || []);
    }

    renderSchedules(schedules) {
        this.dom.listPanel.innerHTML = "";

        if (schedules.length === 0) {
            this.dom.listPanel.innerHTML =
                "<p class='empty'>No scheduled jobs.</p>";
            return;
        }

        schedules.forEach((sched) =>
            this.dom.listPanel.appendChild(this.createCard(sched))
        );
    }

    createCard(sched) {
        const card = document.createElement("div");
        card.className = "schedule-card" + (sched.isPast ? " past" : "");
        card.innerHTML = `
            <div class="schedule-info">
                <div>
                    <strong>
                        ${this.formatDate(sched.time)}
                    </strong>
                    <span id="spinner" class="spinner" hidden></span>
                    <div id="loading-beam" class="loading-beam-card" hidden></div>
                </div>
            </div>
            <div class="schedule-actions">
                <button class="btn-sm btn--icon btn--primary" title="Run report" aria-label="View report">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff">
                        <g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> 
                            <path d="M17 17H17.01M17.4 14H18C18.9319 14 19.3978 14 19.7654 14.1522C20.2554 14.3552 20.6448 14.7446 20.8478 15.2346C21 15.6022 21 16.0681 21 17C21 17.9319 21 18.3978 20.8478 18.7654C20.6448 19.2554 20.2554 19.6448 19.7654 19.8478C19.3978 20 18.9319 20 18 20H6C5.06812 20 4.60218 20 4.23463 19.8478C3.74458 19.6448 3.35523 19.2554 3.15224 18.7654C3 18.3978 3 17.9319 3 17C3 16.0681 3 15.6022 3.15224 15.2346C3.35523 14.7446 3.74458 14.3552 4.23463 14.1522C4.60218 14 5.06812 14 6 14H6.6M12 15V4M12 15L9 12M12 15L15 12" stroke="#ffffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            </path> 
                        </g>
                    </svg>
                </button>
                <button class="btn-sm btn--icon btn--success" title="Edit" aria-label="Edit">
                    <svg viewBox="0 0 24 24" id="_24x24_On_Light_Edit" data-name="24x24/On Light/Edit" xmlns="http://www.w3.org/2000/svg" fill="#000000">
                        <g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round">
                        </g>
                        <g id="SVGRepo_iconCarrier"> <rect id="view-box" width="24" height="24" fill="none"></rect> 
                            <path id="Shape" d="M.75,17.5A.751.751,0,0,1,0,16.75V12.569a.755.755,0,0,1,.22-.53L11.461.8a2.72,2.72,0,0,1,3.848,0L16.7,2.191a2.72,2.72,0,0,1,0,3.848L5.462,17.28a.747.747,0,0,1-.531.22ZM1.5,12.879V16h3.12l7.91-7.91L9.41,4.97ZM13.591,7.03l2.051-2.051a1.223,1.223,0,0,0,0-1.727L14.249,1.858a1.222,1.222,0,0,0-1.727,0L10.47,3.91Z" transform="translate(3.25 3.25)" fill="#ffffff">
                            </path> 
                        </g>
                    </svg>
                </button>
                <button class="btn-sm btn--icon btn--danger" title="Delete" aria-label="Delete">
                    <svg width="128" height="128" viewBox="0 0 28 28" aria-hidden="true"
                        focusable="false">
                        <line x1="8" y1="8" x2="20" y2="20" stroke="currentColor"
                            stroke-width="2.4" stroke-linecap="round" />
                        <line x1="20" y1="8" x2="8" y2="20" stroke="currentColor"
                            stroke-width="2.4" stroke-linecap="round" />
                    </svg>
                </button>
                
            </div>
    `;
        // Attach event listeners
        card.querySelector(".btn--danger").onclick = () =>
            this.deleteSchedule(sched.id);
        card.querySelector(".btn--success").onclick = () =>
            this.startEdit(sched);
        card.querySelector(".btn--primary").onclick = () =>
            this.loadReport(sched.id);

        if (sched.isPast) {
            const div = document.createElement("div");
            div.classList.add("muted");

            div.innerHTML = `
                (Past Job)
                ${
                    sched.hasError
                        ? `<svg fill="#d6577f" height="64px" width="64px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 460.775 460.775" xml:space="preserve" stroke="#d6577f" stroke-width="23.03875"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55 c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55 c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505 c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55 l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719 c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"></path> </g></svg>`
                        : `<svg fill="#51e16c" width="64px" height="64px" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" stroke="#51e16c" stroke-width="192"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M1827.701 303.065 698.835 1431.801 92.299 825.266 0 917.564 698.835 1616.4 1919.869 395.234z" fill-rule="evenodd"></path> </g></svg>`
                }
            `;

            card.querySelector(".schedule-info").appendChild(div);
            card.querySelector(".btn--success").setAttribute("disabled", true);
        } else if (sched.isRunning) {
            card.querySelector("#spinner").hidden = false;
            card.querySelector("#loading-beam").hidden = false;
            card.querySelector(".btn--success").setAttribute("disabled", true);
            card.querySelector(".btn--danger").setAttribute("disabled", true);
        }

        return card;
    }

    async createSchedule() {
        this.ui.clearFormError();
        const time = this.pickerInput.value;

        try {
            await api.createSchedule(time);

            this.loadSchedules();
            this.form.reset();
            this.flatpickr.clear();
        } catch (error) {
            this.ui.showFormError(error);
        }
    }

    startEdit(schedule) {
        this.ui.clearFormError();
        this.editingId = schedule.id;
        this.pickerInput.value = schedule.time;
        this.flatpickr.setDate(schedule.time);
        this.dom.saveScheduleBtn.textContent = "Update";
        this.dom.cancelEditBtn.hidden = false;
    }

    cancelEdit() {
        this.ui.clearFormError();
        this.editingId = null;
        this.form.reset();
        this.flatpickr.clear();
        this.dom.saveScheduleBtn.textContent = "Save";
        this.dom.cancelEditBtn.hidden = true;
    }

    async updateSchedule() {
        this.ui.clearFormError();

        const id = this.editingId;
        const time = this.pickerInput.value;

        try {
            await api.updateSchedule(id, time);

            this.loadSchedules();
            this.cancelEdit();
        } catch (error) {
            this.ui.showFormError(error);
        }
    }

    async deleteSchedule(id) {
        await api.deleteSchedule(id);
        this.loadSchedules();
    }

    async loadReport(id) {
        const data = await api.loadReport(id);
        const output = data.output || "(No report available)\n\n";
        this.ui.setOutputResult(output, data.RunType);

        this.ui.closeMenu();
    }

    formatDate(dt) {
        // Format for readable display: customize as needed
        return new Date(dt).toLocaleString();
    }

    // Called on picker change or direct input
    handlePickerChange() {
        const value = this.pickerInput.value;
        const fp = this.flatpickr;

        // Only enable if flatpickr parsed a valid date and not empty
        const valid =
            value &&
            fp.selectedDates &&
            fp.selectedDates.length === 1 &&
            !isNaN(fp.selectedDates[0]);

        this.dom.saveScheduleBtn.disabled = !valid;
    }
}
