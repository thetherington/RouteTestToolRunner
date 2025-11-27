import { useState } from "react";

import styles from "./Output.module.css";
import OutputView from "./OutputView";
import TableView from "./TableView";

import type { SlabLogs } from "../types/output";
import { capitalizeFirstLetter } from "../util/utils";

const formatDate = (date: string): string => {
    return new Date(date).toLocaleString();
};

interface OutputProps {
    outputText?: string;
    outputData?: SlabLogs | undefined;
    scheduleTime?: string;
    badge?: "manual" | "scheduled";
}

const Output = ({
    outputText = "",
    badge,
    outputData,
    scheduleTime,
}: OutputProps) => {
    const [active, setActive] = useState<"output" | "table">("output");

    const badgeClass =
        badge == "manual"
            ? styles["manual"]
            : badge == "scheduled"
            ? styles["scheduled"]
            : "";

    return (
        <div className={styles["output-container"]}>
            <div className={styles["tabsBar"]}>
                <div className={styles["tabsLeft"]}>
                    <button
                        type="button"
                        className={`${styles.tab} ${
                            active === "table" ? styles["tabActive"] : ""
                        }`}
                        onClick={() => setActive("table")}
                        aria-pressed={active === "table"}
                    >
                        Table View
                    </button>

                    <button
                        type="button"
                        className={`${styles.tab} ${
                            active === "output" ? styles["tabActive"] : ""
                        }`}
                        onClick={() => setActive("output")}
                        aria-pressed={active === "output"}
                    >
                        Output View
                    </button>
                </div>

                <div className={styles["tabsRight"]}>
                    {badge && (
                        <span
                            className={`${styles["output-source-badge"]} ${badgeClass} `}
                        >
                            {badge == "manual"
                                ? `${capitalizeFirstLetter(badge)} Run`
                                : `${capitalizeFirstLetter(badge)} Job`}
                        </span>
                    )}
                    {scheduleTime && !badge && (
                        <span
                            className={`${styles["output-source-badge"]} ${styles["scheduled"]}`}
                        >
                            Report for: {formatDate(scheduleTime)}
                        </span>
                    )}
                </div>
            </div>

            <div className={styles["output-panel"]}>
                {active === "output" ? (
                    <OutputView outputText={outputText} />
                ) : (
                    <TableView
                        outputData={outputData}
                        scheduleTime={scheduleTime}
                    />
                )}
            </div>
        </div>
    );
};

export default Output;
