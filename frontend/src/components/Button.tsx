import { forwardRef } from "react";
import styles from "./Button.module.css";

type Variant =
    | "primary"
    | "danger"
    | "success"
    | "edit"
    | "icon"
    | "copy"
    | "save";

type Size = "sm" | "md" | "default";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    icon?: boolean;
}

const LEGACY_TOKENS = [
    "btn",
    "btn-md",
    "btn-sm",
    "btn--primary",
    "btn--danger",
    "btn--success",
    "btn--edit",
    "btn--icon",
    "btn--copy",
    "btn--save",
];

const mapLegacyVariant = (token: string): Variant | undefined => {
    switch (token) {
        case "btn--primary":
            return "primary";
        case "btn--danger":
            return "danger";
        case "btn--success":
            return "success";
        case "btn--edit":
            return "edit";
        case "btn--icon":
            return "icon";
        case "btn--copy":
            return "copy";
        case "btn--save":
            return "save";
        default:
            return undefined;
    }
};

const mapLegacySize = (token: string): Size | undefined => {
    switch (token) {
        case "btn-sm":
            return "sm";
        case "btn-md":
            return "md";
        default:
            return undefined;
    }
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        { className = "", variant, size, disabled, children, icon, ...rest },
        ref
    ) => {
        // Parse legacy tokens from incoming className so existing usage keeps working
        const tokens = className.split(/\s+/).filter(Boolean);
        let legacyVariant: Variant | undefined;
        let legacySize: Size | undefined;
        let legacyIcon = false;

        const extras: string[] = [];

        for (const t of tokens) {
            if (LEGACY_TOKENS.includes(t)) {
                // treat the icon token as a modifier that can combine with color variants
                if (t === "btn--icon") {
                    legacyIcon = true;
                    continue;
                }

                const v = mapLegacyVariant(t);
                const s = mapLegacySize(t);
                if (v) legacyVariant = v;
                if (s) legacySize = s;
            } else {
                // preserve other classes (module classes from other components, utility classes, etc.)
                extras.push(t);
            }
        }

        const finalVariant = variant ?? legacyVariant;
        const finalSize = size ?? legacySize ?? "default";

        const classList: string[] = [];

        // base class applied to most buttons
        classList.push(styles.base);

        if (finalSize === "sm") classList.push(styles.sm);
        if (finalSize === "md") classList.push(styles.md);

        // add color/role variant (but don't treat 'icon' as the primary color variant)
        if (finalVariant && finalVariant !== "icon") {
            classList.push((styles as any)[finalVariant]);
        }

        // determine whether to apply icon modifier: explicit prop first, then legacy token, then if the variant itself is 'icon'
        const applyIcon =
            (typeof icon === "boolean" ? icon : undefined) ??
            legacyIcon ??
            finalVariant === "icon";
        if (applyIcon) classList.push(styles.icon);

        if (disabled) classList.push(styles.disabled);

        const extraString = extras.join(" ");

        const finalClassName = `${classList.join(" ")}${
            extraString ? ` ${extraString}` : ""
        }`;

        return (
            <button
                ref={ref}
                className={finalClassName}
                disabled={disabled}
                {...rest}
            >
                {children}
            </button>
        );
    }
);

export default Button;
