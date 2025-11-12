import { useEffect, useRef, useState, type FC, type ReactElement } from "react";
import styles from "./Nav.module.css";

interface NavProps {
    onClickMenu?: () => void;
    verson?: string;
}

const Nav: FC<NavProps> = ({ onClickMenu, verson }): ReactElement => {
    const [open, setOpen] = useState(false);
    const navRef = useRef<HTMLElement | null>(null);

    const handleMenuClick = () => {
        setOpen(!open);
        if (onClickMenu) {
            onClickMenu();
        }
    };

    useEffect(() => {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 4)
                navRef.current?.classList.add(styles["nav-transparent"]);
            else navRef.current?.classList.remove(styles["nav-transparent"]);
        });

        return () => {
            window.removeEventListener("scroll", () => {
                if (window.scrollY > 4)
                    navRef.current?.classList.add(styles["nav-transparent"]);
                else
                    navRef.current?.classList.remove(styles["nav-transparent"]);
            });
        };
    }, []);

    return (
        <>
            <nav ref={navRef} className={styles.navbar}>
                <div className={styles["navbar--group"]}>
                    <button
                        id="menuBtn"
                        className={`${styles.hamburger} ${
                            open ? styles.open : ""
                        }`}
                        aria-label="Open menu"
                        onClick={handleMenuClick}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 28 28"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <rect
                                className="bar bar1"
                                x="6"
                                y="8"
                                width="16"
                                height="2.2"
                                rx="1"
                                fill="currentColor"
                            />
                            <rect
                                className="bar bar2"
                                x="6"
                                y="13"
                                width="16"
                                height="2.2"
                                rx="1"
                                fill="currentColor"
                            />
                            <rect
                                className="bar bar3"
                                x="6"
                                y="18"
                                width="16"
                                height="2.2"
                                rx="1"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                    <h1>Route Test Tool Runner</h1>
                </div>
                <span id="version" className={styles["app-version"]}>
                    {verson ? `v${verson}` : ""}
                </span>
            </nav>
        </>
    );
};

export default Nav;
