import React, { type FC } from "react";
import styles from "./ScheduleForm.module.css";
import type { ExtendedOptionsData } from "./ExtendedOptionsForm";

type Props = {
    extendedOptions: ExtendedOptionsData | null;
    onClearSource: (e?: React.MouseEvent) => void;
    onClearDestinations: (e?: React.MouseEvent) => void;
};

const ExtendedOptionsBadges: FC<Props> = ({
    extendedOptions,
    onClearSource,
    onClearDestinations,
}) => {
    if (!extendedOptions) return null;

    return (
        <div className={styles["extended-options-badges-bottom"]}>
            {extendedOptions.source.value && (
                <span className={styles["source-badge"]}>
                    <span className={styles["badge-text"]}>
                        {extendedOptions.source.value}
                    </span>
                    <button
                        type="button"
                        className={styles["badge-clear-btn"]}
                        onClick={onClearSource}
                        aria-label="Clear source"
                    >
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            aria-hidden
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M18 6L6 18M6 6l12 12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                            />
                        </svg>
                    </button>
                </span>
            )}

            <span className={styles["count-badge"]}>
                <span className={styles["badge-text"]}>
                    {extendedOptions.destinations.length}
                </span>

                <div
                    className={styles["destinations-tooltip"]}
                    role="tooltip"
                    aria-hidden={extendedOptions.destinations.length === 0}
                >
                    <div className={styles["destinations-list"]}>
                        {extendedOptions.destinations
                            .slice(0, 10)
                            .map((d, i) => (
                                <div
                                    key={`dest-${i}`}
                                    className={styles["dest-item"]}
                                    title={d.value}
                                >
                                    {d.value}
                                </div>
                            ))}
                        {extendedOptions.destinations.length > 10 && (
                            <div className={styles["dest-item--more"]}>...</div>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    className={styles["badge-clear-btn"]}
                    onClick={onClearDestinations}
                    aria-label="Clear destinations"
                >
                    <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        aria-hidden
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M18 6L6 18M6 6l12 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    </svg>
                </button>
            </span>
        </div>
    );
};

export default ExtendedOptionsBadges;
