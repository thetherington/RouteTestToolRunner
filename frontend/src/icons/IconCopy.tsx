import { type FC, type ReactElement } from "react";

const IconCopy: FC = (): ReactElement => {
    return (
        <svg
            viewBox="0 0 20 20"
            width="22"
            height="22"
            aria-hidden="true"
            focusable="false"
        >
            <rect
                x="6"
                y="2.5"
                width="8"
                height="3"
                rx="1.2"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
            />
            <rect
                x="4"
                y="5"
                width="12"
                height="12"
                rx="2.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
            />
            <rect
                x="8.5"
                y="7.7"
                width="3"
                height="5.3"
                rx="1"
                fill="currentColor"
                opacity="0.25"
            />
        </svg>
    );
};

export default IconCopy;
