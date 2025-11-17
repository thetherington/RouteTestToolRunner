import { type FC, type ReactElement } from "react";

const IconDisk: FC = (): ReactElement => {
    return (
        <svg
            viewBox="0 0 22 22"
            width="22"
            height="22"
            aria-hidden="true"
            focusable="false"
        >
            <rect
                x="4"
                y="3"
                width="14"
                height="15"
                rx="2.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
            />
            <rect
                x="7"
                y="5"
                width="8"
                height="3.3"
                rx="0.7"
                fill="none"
                stroke="currentColor"
                stroke-width="1.1"
            />
            <rect
                x="8"
                y="12"
                width="6"
                height="3.2"
                rx="1"
                fill="currentColor"
                opacity="0.25"
            />
            <polyline
                points="7,10 11,15 15,10"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
            />
        </svg>
    );
};

export default IconDisk;
