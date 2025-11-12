import type { FC, ReactElement } from "react";

const IconXLine: FC = (): ReactElement => {
    return (
        <svg
            width="128"
            height="128"
            viewBox="0 0 28 28"
            aria-hidden="true"
            focusable="false"
        >
            <line
                x1="8"
                y1="8"
                x2="20"
                y2="20"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
            />
            <line
                x1="20"
                y1="8"
                x2="8"
                y2="20"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
            />
        </svg>
    );
};

export default IconXLine;
