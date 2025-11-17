import { type FC, type ReactElement } from "react";

import styles from "./Spinner.module.css";

interface SpinnerProps {}

const Spinner: FC<SpinnerProps> = (): ReactElement => {
    return <span className={styles.spinner}></span>;
};

export default Spinner;
