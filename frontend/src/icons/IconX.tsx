import { type FC, type ReactElement } from "react";

const IconX: FC = (): ReactElement => {
    return (
        <svg
            viewBox="0 0 20 20"
            width="22"
            height="22"
            aria-hidden="true"
            focusable="false"
        >
            <rect
                x="3"
                y="3"
                width="14"
                height="14"
                rx="4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            />
            <line
                x1="6"
                y1="6"
                x2="14"
                y2="14"
                stroke="currentColor"
                stroke-width="2"
            />
            <line
                x1="14"
                y1="6"
                x2="6"
                y2="14"
                stroke="currentColor"
                stroke-width="2"
            />
        </svg>
    );
};

export default IconX;
