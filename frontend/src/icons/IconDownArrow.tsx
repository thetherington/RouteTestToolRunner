import { type FC, type ReactElement } from "react";

const IconDownArrow: FC = (): ReactElement => {
    return (
        <svg
            viewBox="0 0 20 20"
            width="22"
            height="22"
            aria-hidden="true"
            focusable="false"
        >
            <polyline
                points="6 8 10 12 14 8"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    );
};

export default IconDownArrow;
