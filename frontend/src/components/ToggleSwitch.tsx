import { type FC } from "react";
import styles from "./Button.module.css";

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    className?: string;
    swapLabels?: boolean;
}

const ToggleSwitch: FC<ToggleSwitchProps> = ({
    checked,
    onChange,
    label,
    className,
    swapLabels = false,
}) => {
    return (
        <label
            className={`${styles.toggleSwitch} ${
                swapLabels ? styles["toggleSwitch-reverse"] : ""
            } ${className || ""}`.trim()}
        >
            {label && <span className={styles.toggleLabel}>{label}</span>}
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className={styles.toggleInput}
            />
            <span className={styles.toggleSlider} />
        </label>
    );
};

export default ToggleSwitch;
