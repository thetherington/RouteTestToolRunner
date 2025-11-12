import { type FC, type ReactElement } from "react";

import styles from "./StepProgress.module.css";

interface StepProgressProps {
    step: number;
    error: boolean;
}

const STEPS = [
    { key: "Starting log tailing", label: "Start Log" },
    { key: "Connecting to scheduler", label: "Scheduler" },
    { key: "Shutting down SDVN log tailing", label: "Stop Log" },
    { key: "Scheduler", label: "SDVN" },
    { key: "Preparing to run local script", label: "Slab" },
];

const StepProgress: FC<StepProgressProps> = ({ step, error }): ReactElement => {
    let currentStep = step;

    return (
        <div className={styles["step-progress-container"]}>
            <div className={styles["step-progress-bar"]}>
                {STEPS.map((step, i) => {
                    let statusClass = "";

                    if (i < currentStep) statusClass = "completed";
                    else if (i === currentStep) statusClass = "current";

                    return (
                        <div
                            key={i}
                            className={`${styles.step} ${styles[statusClass]}`}
                        >
                            <span
                                className={`${styles.circle} ${
                                    error ? styles.error : ""
                                }`}
                                data-step={i}
                            >
                                {i + 1}
                            </span>
                            <span className={styles.label}>{step.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StepProgress;
