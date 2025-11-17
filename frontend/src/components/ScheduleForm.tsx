import "flatpickr/dist/themes/dark.css";
import { useState, type FC, type ReactElement } from "react";
import Flatpickr from "react-flatpickr";

import { useScheduler } from "../context/ScheduleContext";
import IconAsterisk from "../icons/IconAsterisk";
import IconXLine from "../icons/IconXLine";
import Button from "./Button";
import ExtendedOptionsBadges from "./ExtendedOptionsBadges";
import ExtendedOptionsForm, {
    type ExtendedOptionsData,
} from "./ExtendedOptionsForm";
import styles from "./ScheduleForm.module.css";
import SlideOutPanel from "./SlideOutPanel";
import ToggleSwitch from "./ToggleSwitch";

const Update = "Update";
const Create = "Create";

const ScheduleForm: FC = (): ReactElement => {
    const {
        createSchedule,
        updateSchedule,
        clearError,
        error,
        time,
        editId,
        setTime,
        cancelEdit,
    } = useScheduler();

    const handleDateChange = (_: Date[], dateStr: string) => {
        setTime(dateStr);
    };

    const mode = editId ? Update : Create;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (time && time !== "") {
            switch (mode) {
                case Create:
                    createSchedule(time);
                    break;

                case Update:
                    updateSchedule(time);
            }
        }
    };

    const [showExtended, setShowExtended] = useState(false);
    const [extendedOptions, setExtendedOptions] =
        useState<ExtendedOptionsData | null>(null);

    const handleExtendedOptionsSave = (data: ExtendedOptionsData) => {
        setExtendedOptions(data);
        console.log("Extended options saved:", data);
        setShowExtended(false);
    };

    const handleExtendedOptionsClose = () => {
        setShowExtended(false);
    };

    const clearExtendedSource = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setExtendedOptions((prev) => {
            if (!prev) return prev;
            const newState = { ...prev, source: { ...prev.source, value: "" } };
            if (
                (newState.source.value || "").trim() === "" &&
                (!newState.destinations ||
                    newState.destinations.length === 0 ||
                    newState.destinations.every((d) => !(d.value || "").trim()))
            ) {
                return null;
            }
            return newState;
        });
    };

    const clearExtendedDestinations = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setExtendedOptions((prev) => {
            if (!prev) return prev;
            const newState = { ...prev, destinations: [] };
            if (
                (newState.source.value || "").trim() === "" &&
                (!newState.destinations || newState.destinations.length === 0)
            ) {
                return null;
            }
            return newState;
        });
    };

    return (
        <div className={styles["schedule-form-container"]}>
            <div className={styles["schedule-form-wrapper"]}>
                <div className={styles["schedule-form-backdrop"]}>
                    <div className={styles["toggle-switch-header"]}>
                        <ToggleSwitch
                            checked={showExtended}
                            onChange={setShowExtended}
                            label={
                                showExtended
                                    ? "Hide Extended Options"
                                    : "Show Extended Options"
                            }
                        />
                    </div>
                    <form
                        action=""
                        onSubmit={handleSubmit}
                        className={styles["schedule-form"]}
                    >
                        <label>Schedule Time:</label>
                        <div className={styles["date-picker-with-tooltip"]}>
                            <Flatpickr
                                data-enable-time
                                value={time}
                                style={{ display: "none" }}
                                options={{
                                    enableTime: true,
                                    enableSeconds: true,
                                    dateFormat: "Z",
                                    altInput: true,
                                    altFormat: "Y-m-d h:i:S K",
                                    minDate: "today",
                                }}
                                onChange={handleDateChange}
                            />
                            <button
                                type="button"
                                className={styles["new-icon"]}
                                aria-describedby="start-date-tooltip"
                                aria-label="Scheduler start time info"
                            >
                                <IconAsterisk />
                                <span
                                    role="tooltip"
                                    id="start-date-tooltip"
                                    className={styles["tooltip"]}
                                >
                                    Time selected will be the scheduler event
                                    start time
                                </span>
                            </button>
                        </div>

                        <div className={styles["schedule-form-btn-group"]}>
                            <Button
                                type="submit"
                                size="md"
                                variant="primary"
                                disabled={time === ""}
                            >
                                {mode}
                            </Button>
                            {editId !== "" && (
                                <Button
                                    onClick={cancelEdit}
                                    size="md"
                                    variant="danger"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>
                    {error && (
                        <div className={styles["schedule-form-error"]}>
                            <div>{error}</div>
                            <Button
                                onClick={clearError}
                                size="sm"
                                variant="danger"
                                icon
                            >
                                <IconXLine />
                            </Button>
                        </div>
                    )}
                    {/* bottom-right badges showing saved extended options */}
                    {!error && (
                        <ExtendedOptionsBadges
                            extendedOptions={extendedOptions}
                            onClearSource={clearExtendedSource}
                            onClearDestinations={clearExtendedDestinations}
                        />
                    )}
                </div>
            </div>
            <SlideOutPanel
                isOpen={showExtended}
                onClose={() => setShowExtended(false)}
                title="Extended Options"
            >
                <div className={styles["extended-panel-content"]}>
                    <ToggleSwitch
                        checked={showExtended}
                        onChange={setShowExtended}
                        label="Hide Extended Options"
                        swapLabels
                    />
                    <ExtendedOptionsForm
                        onSave={handleExtendedOptionsSave}
                        initialData={extendedOptions}
                        onClose={handleExtendedOptionsClose}
                    />
                </div>
            </SlideOutPanel>
        </div>
    );
};

export default ScheduleForm;
