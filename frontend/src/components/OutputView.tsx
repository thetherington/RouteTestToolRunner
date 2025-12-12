import { type FC, type ReactElement } from "react";
import IconCopy from "../icons/IconCopy";
import IconDisk from "../icons/IconDisk";
import Button from "./Button";
import styles from "./Output.module.css";

import { copyToClipBoard, saveToFile } from "../util/utils";
import { toast } from "react-toastify";

type Props = {
    outputText?: string;
};

const OutputView: FC<Props> = ({ outputText = "" }): ReactElement => {
    const copy = async () => {
        try {
            await copyToClipBoard(outputText);
            toast.success("Copied output to clipboard!");
        } catch (error) {
            toast.error("Failed to copy output.");
        }
    };

    const save = () => {
        saveToFile(outputText);
        toast.success("Saved output to file!");
    };

    return (
        <div className={styles["output-view"]}>
            {/* original output content */}
            <pre>{outputText}</pre>
            {outputText.trim().length > 0 && (
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

export default OutputView;
