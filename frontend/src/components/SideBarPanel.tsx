import {
    useEffect,
    useRef,
    type FC,
    type ReactElement,
    type ReactNode,
} from "react";

import IconXLine from "../icons/IconXLine";
import Button from "./Button";
import style from "./SideBarPanel.module.css";

interface SideBarPanelProps {
    children?: ReactNode;
    onClose?: () => void;
    isOpen?: boolean;
}

const SideBarPanel: FC<SideBarPanelProps> = ({
    children,
    onClose,
    isOpen,
}): ReactElement => {
    const panelRef = useRef<HTMLElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                if (panelRef.current?.classList.contains(style.open)) {
                    buttonRef.current?.click();
                }
            }
        });

        return () => {
            window.removeEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    if (panelRef.current?.classList.contains(style.open)) {
                        buttonRef.current?.click();
                    }
                }
            });
        };
    }, []);
    return (
        <aside
            ref={panelRef}
            className={`${style["slide-panel"]} ${isOpen ? style.open : ""}`}
        >
            <Button
                ref={buttonRef}
                onClick={onClose}
                size="sm"
                variant="danger"
                icon
                className={style.closePanelBtn}
            >
                <IconXLine />
            </Button>
            <div className={style["panel-header"]}>
                <h2>Schedule Job</h2>
            </div>
            <div className={style["panel-content"]}>{children}</div>
        </aside>
    );
};

export default SideBarPanel;
