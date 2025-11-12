import { useEffect, useRef, useState, type FC, type ReactElement } from "react";

import IconDownArrow from "../icons/IconDownArrow";
import IconX from "../icons/IconX";
import Button from "./Button";
import Divider from "./Divider";
import styles from "./ExtendedOptionsForm.module.css";
import stylesForm from "./ScheduleForm.module.css";

interface SourceData {
    value: string;
    multicast?: string;
}

interface DestinationData {
    value: string;
    dst?: string;
    slabs?: string[];
}

interface ExtendedOptionsFormProps {
    onSave?: (data: ExtendedOptionsData) => void;
    initialData?: ExtendedOptionsData | null;
    onClose?: () => void;
}

export interface ExtendedOptionsData {
    source: SourceData;
    destinations: DestinationData[];
}

const ExtendedOptionsForm: FC<ExtendedOptionsFormProps> = ({
    onSave,
    initialData,
    onClose,
}): ReactElement => {
    const [source, setSource] = useState<SourceData>({ value: "" });
    const [destinations, setDestinations] = useState<DestinationData[]>([
        { value: "" },
    ]);
    const destinationsScrollRef = useRef<HTMLDivElement>(null);

    // Initialize form with existing data if provided
    useEffect(() => {
        if (initialData) {
            setSource(initialData.source);
            setDestinations(
                initialData.destinations.length > 0
                    ? initialData.destinations
                    : [{ value: "" }]
            );
        }
    }, [initialData]);

    const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSource({ ...source, value: e.target.value });
    };

    const handleDestinationChange = (
        index: number,
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const newDestinations = [...destinations];
        newDestinations[index] = {
            ...newDestinations[index],
            value: e.target.value,
        };
        setDestinations(newDestinations);
    };

    const handleAddDestination = () => {
        // Extract the base label and numeric suffix from the last destination
        const lastDestination = destinations[destinations.length - 1];
        const lastValue = lastDestination?.value || "";

        // Match pattern: base + optional digits at the end
        const match = lastValue.match(/^(.+?)(\d+)$/);
        let newDestinationValue: string;

        if (match) {
            // If numeric suffix exists, extract base and number, increment the number
            const base = match[1];
            const currentNumber = parseInt(match[2], 10);
            const nextNumber = currentNumber + 1;
            newDestinationValue = `${base}${String(nextNumber).padStart(
                2,
                "0"
            )}`;
        } else {
            // If no numeric suffix, use the base from first destination and append 002
            const base = destinations[0]?.value || "";
            newDestinationValue = `${base}02`;
        }

        setDestinations([...destinations, { value: newDestinationValue }]);

        // Scroll to bottom after adding
        setTimeout(() => {
            if (destinationsScrollRef.current) {
                destinationsScrollRef.current.scrollTop =
                    destinationsScrollRef.current.scrollHeight;
            }
        }, 0);
    };

    const handleRemoveDestination = (index: number) => {
        const newDestinations = destinations.filter((_, i) => i !== index);
        setDestinations(newDestinations);
    };

    const handleClear = () => {
        setSource({ value: "" });
        setDestinations([{ value: "" }]);
    };

    const handleValidate = () => {
        // Validation to be implemented
        console.log("Validate clicked");
    };

    const handleSave = () => {
        if (onSave) {
            onSave({
                source,
                destinations: destinations.filter((d) => d.value !== ""),
            });
            if (onClose) {
                onClose();
            }
        }
    };

    const badgeCount =
        destinations.length === 1 && destinations[0].value === ""
            ? 0
            : destinations.length;

    return (
        <div className={styles["extended-form-container"]}>
            {/* Source Section */}
            <div className={stylesForm["schedule-form-backdrop"]}>
                <div className={styles["form-section"]}>
                    <label className={styles["form-label"]}>Source:</label>
                    <input
                        type="text"
                        value={source.value}
                        onChange={handleSourceChange}
                        className={styles["form-input"]}
                        placeholder="Enter source"
                    />
                </div>
            </div>

            <Divider />

            {/* Destination Section */}
            <div
                className={stylesForm["schedule-form-backdrop"]}
                style={{ paddingBottom: 0, marginBottom: "2em" }}
            >
                <div className={styles["form-section"]}>
                    <div className={styles["section-header"]}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.6em",
                            }}
                        >
                            <label className={styles["form-label"]}>
                                Destination(s):
                            </label>
                            <span
                                className={styles["dest-count-badge"]}
                                aria-live="polite"
                            >
                                {badgeCount}
                            </span>
                        </div>
                    </div>
                    <div
                        className={styles["destinations-scroll"]}
                        ref={destinationsScrollRef}
                    >
                        <div className={styles["destinations-container"]}>
                            {destinations.map((destination, index) => (
                                <div
                                    key={index}
                                    className={
                                        styles["destination-input-group"]
                                    }
                                >
                                    <input
                                        type="text"
                                        value={destination.value}
                                        onChange={(e) =>
                                            handleDestinationChange(index, e)
                                        }
                                        className={styles["form-input"]}
                                        placeholder={`Enter destination ${
                                            index > 0 ? index + 1 : ""
                                        }`}
                                    />
                                    {index > 0 && (
                                        <Button
                                            onClick={() =>
                                                handleRemoveDestination(index)
                                            }
                                            size="sm"
                                            variant="danger"
                                            icon
                                            className={styles["delete-btn"]}
                                        >
                                            <IconX />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button
                                onClick={handleAddDestination}
                                size="sm"
                                variant="primary"
                                icon
                                className={styles["add-destination-btn"]}
                            >
                                <IconDownArrow />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className={styles["button-row"]}>
                <Button onClick={handleClear} size="md" variant="danger">
                    Clear
                </Button>
                <div className={styles["button-group"]}>
                    <Button
                        onClick={handleValidate}
                        size="md"
                        variant="primary"
                    >
                        Validate
                    </Button>
                    <Button onClick={handleSave} size="md" variant="success">
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExtendedOptionsForm;
