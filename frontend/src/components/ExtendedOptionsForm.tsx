import { useEffect, useRef, useState, type FC, type ReactElement } from "react";

import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { validateTerminals } from "../api/terminalApi";
import IconDownArrow from "../icons/IconDownArrow";
import IconExclamation from "../icons/IconExclamation";
import IconXLine from "../icons/IconXLine";
import type { IExtendedOptions } from "../types/schedule";
import Button from "./Button";
import Divider from "./Divider";
import styles from "./ExtendedOptionsForm.module.css";
import LoadingBeam from "./LoadingBeam";
import stylesForm from "./ScheduleForm.module.css";
import Spinner from "./Spinner";

interface ExtendedOptionsFormProps {
    onSave?: (data: IExtendedOptions) => void;
    initialData?: IExtendedOptions | null;
    onClose?: () => void;
}

type SourceType = IExtendedOptions["source"];
type DestinationType = IExtendedOptions["destinations"][number];

const ExtendedOptionsForm: FC<ExtendedOptionsFormProps> = ({
    onSave,
    initialData,
    onClose,
}): ReactElement => {
    const [source, setSource] = useState<SourceType>({ value: "" });
    const [destinations, setDestinations] = useState<DestinationType[]>([
        { value: "" },
    ]);
    const destinationsScrollRef = useRef<HTMLDivElement>(null);

    // Show multicast overlay after Validate button pressed
    const [showOverlay, setShowOverlay] = useState(false);

    const {
        mutate: validate,
        data,
        error,
        isPending,
    } = useMutation({
        mutationFn: validateTerminals,
    });

    // Initialize form with existing data if provided
    useEffect(() => {
        if (initialData) {
            setSource(initialData.source);
            setDestinations(
                initialData.destinations?.length > 0
                    ? initialData.destinations
                    : [{ value: "" }]
            );
            setShowOverlay(false);
        }

        if (!initialData) {
            setSource({ value: "" });
            setDestinations([{ value: "" }]);
            setShowOverlay(false);
        }
    }, [initialData]);

    useEffect(() => {
        if (data) {
            setSource(data.source || { value: "" });
            setDestinations(
                data.destinations && data.destinations.length > 0
                    ? data.destinations
                    : [{ value: "" }]
            );

            // Show overlay when validation is complete
            setShowOverlay(true);

            console.log("Validation result:", data);
        }

        if (error) {
            toast.error(
                `Validation Error: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
            setShowOverlay(false);
        }
    }, [data, error]);

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
        setShowOverlay(false);
    };

    const handleValidate = () => {
        // Show overlay whenever Validate is pressed
        setShowOverlay(false);
        validate({
            source: source.value,
            destinations: destinations
                .map((d) => d.value)
                .filter((val) => val !== ""),
        });
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

    const renderDestinationInput = (
        destination: DestinationType,
        index: number
    ) => (
        <div key={index} className={styles["destination-input-group"]}>
            <div className={styles["input-wrap"]}>
                <input
                    type="text"
                    value={destination.value}
                    onChange={(e) => handleDestinationChange(index, e)}
                    className={styles["form-input"]}
                    placeholder={`Enter destination ${
                        index > 0 ? index + 1 : ""
                    }`}
                    onKeyDown={(e) =>
                        e.key === "Enter" ? handleAddDestination() : undefined
                    }
                />
                {showOverlay && (
                    <div className={styles["overlay"]}>
                        {destination.slabs?.length! > 0 ? (
                            <>
                                <span className={styles["overlay-text-slab"]}>
                                    {destination.slabs?.join(", ")}
                                </span>
                                <span className={styles["overlay-text"]}>
                                    [{destination.dst}]
                                </span>
                            </>
                        ) : (
                            <IconExclamation
                                className={styles["overlay-icon"]}
                            />
                        )}
                    </div>
                )}
            </div>
            {index > 0 && (
                <Button
                    onClick={() => handleRemoveDestination(index)}
                    size="sm"
                    variant="danger"
                    icon
                    className={styles["delete-btn"]}
                >
                    <IconXLine />
                </Button>
            )}
        </div>
    );

    return (
        <div className={styles["extended-form-container"]}>
            {/* Source Section */}
            <div className={stylesForm["schedule-form-backdrop"]}>
                <div className={styles["form-section"]}>
                    <label className={styles["form-label"]}>Source:</label>
                    <div className={styles["input-wrap"]}>
                        <input
                            type="text"
                            value={source.value}
                            onChange={handleSourceChange}
                            className={styles["form-input"]}
                            placeholder="Enter source"
                        />

                        {showOverlay && (
                            <div className={styles["overlay"]}>
                                {source.multicast ? (
                                    <span className={styles["overlay-text"]}>
                                        {source.multicast}
                                    </span>
                                ) : (
                                    <IconExclamation
                                        className={styles["overlay-icon"]}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* <Divider /> */}
            <div
                style={{
                    width: "100%",
                    height: "5px",
                    overflow: "hidden",
                    position: "relative",
                    marginBottom: "2em",
                }}
            >
                {isPending ? <LoadingBeam variant="card" /> : <Divider />}
            </div>

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
                            {destinations.map((destination, index) =>
                                renderDestinationInput(destination, index)
                            )}
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
                <Button
                    onClick={handleClear}
                    size="md"
                    variant="danger"
                    disabled={isPending}
                >
                    Clear
                </Button>
                <div className={styles["button-group"]}>
                    {isPending && <Spinner />}
                    <Button
                        onClick={handleValidate}
                        size="md"
                        variant="primary"
                        disabled={isPending}
                    >
                        Validate
                    </Button>
                    <Button
                        onClick={handleSave}
                        size="md"
                        variant="success"
                        disabled={isPending}
                    >
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExtendedOptionsForm;
