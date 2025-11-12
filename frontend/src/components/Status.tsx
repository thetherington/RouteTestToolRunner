import { type FC, type ReactElement, type ReactNode } from "react";

interface StatusProps {
    children?: ReactNode;
}

const Status: FC<StatusProps> = ({ children }): ReactElement => {
    return <pre>{children}</pre>;
};

export default Status;
