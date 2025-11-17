import type { FC, ReactNode } from "react";
import style from "./SideBarPanel.module.css";

interface SlideOutPanelProps {
    isOpen: boolean;
    onClose: () => void;
    children?: ReactNode;
    title?: string;
}

const SlideOutPanel: FC<SlideOutPanelProps> = ({ isOpen, children, title }) => {
    return (
        <aside
            className={`${style["slide-panel"]} ${style["slide-panel-right"]} ${
                isOpen ? style.open : ""
            }`}
        >
            <div className={style["panel-header"]}>
                <h2>{title || "Extended Options"}</h2>
            </div>
            <div className={style["panel-content"]}>{children}</div>
        </aside>
    );
};

export default SlideOutPanel;
