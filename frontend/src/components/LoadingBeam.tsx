import { type FC, type ReactElement } from "react";

import styles from "./LoadingBeam.module.css";

interface LoadingBeamProps {
    variant?: "card" | "full";
}

const LoadingBeam: FC<LoadingBeamProps> = ({ variant }): ReactElement => {
    const type = variant === "card" ? "loading-beam-card" : "loading-beam";

    return <div className={styles[type]} />;
};

export default LoadingBeam;
