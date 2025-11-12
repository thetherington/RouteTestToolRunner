import { type FC, type ReactElement } from "react";

import styles from "./Divider.module.css";

const Divider: FC = (): ReactElement => {
    return <hr className={styles["schedule-divider"]} />;
};

export default Divider;
