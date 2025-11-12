import { type FC, type ReactElement } from "react";

const IconAsterisk: FC = (): ReactElement => {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
        >
            <title>New</title>
            <g
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
            >
                <path d="M12 2v20M2 12h20M4 4l16 16M20 4L4 20" />
            </g>
        </svg>
    );
};

export default IconAsterisk;
