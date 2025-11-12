import { type FC, type ReactElement, type ReactNode } from "react";

import IconCopy from "../icons/IconCopy";
import IconDisk from "../icons/IconDisk";
import Button from "./Button";
import styles from "./Output.module.css";

import {
    capitalizeFirstLetter,
    copyToClipBoard,
    saveToFile,
} from "../util/utils";
import { toast } from "react-toastify";

interface OutputProps {
    children?: ReactNode;
    badge?: "manual" | "scheduled" | undefined;
    text: string;
}

const Output: FC<OutputProps> = ({ badge, text }): ReactElement => {
    const badgeClass =
        badge == "manual"
            ? styles["manual"]
            : badge == "scheduled"
            ? styles["scheduled"]
            : "";

    const copy = async () => {
        try {
            await copyToClipBoard(text);
            toast.success("Copied output to clipboard!");
        } catch (error) {
            toast.error("Failed to copy output.");
        }
    };

    const save = () => {
        saveToFile(text);
        toast.success("Saved output to file!");
    };

    return (
        <div className={styles["output-container"]}>
            {badge && (
                <span
                    className={`${styles["output-source-badge"]} ${badgeClass} `}
                >
                    {badge == "manual"
                        ? `${capitalizeFirstLetter(badge)} Run`
                        : `${capitalizeFirstLetter(badge)} Job`}
                </span>
            )}

            <pre>{text}</pre>
            {text.trim().length > 0 && (
                <>
                    <Button
                        variant="copy"
                        icon
                        className={styles.copyBtn}
                        onClick={copy}
                    >
                        Copy
                        <IconCopy />
                    </Button>
                    <Button
                        variant="save"
                        icon
                        className={styles.saveBtn}
                        onClick={save}
                    >
                        <IconDisk />
                    </Button>
                </>
            )}
        </div>
    );
};

export default Output;
