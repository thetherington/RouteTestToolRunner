import { type FC, type ReactElement } from "react";

import { useOnInView } from "react-intersection-observer";
import Divider from "./Divider";
import ScheduleForm from "./ScheduleForm";
import ScheduleList from "./ScheduleList";
import { useScheduler } from "../context/ScheduleContext";

const Scheduler: FC = (): ReactElement => {
    const { refreshSchedules } = useScheduler();

    const inViewRef = useOnInView((inView) => {
        if (inView) {
            refreshSchedules();
        }
    });

    return (
        <div ref={inViewRef}>
            <ScheduleForm />
            <Divider />
            <ScheduleList />
        </div>
    );
};

export default Scheduler;
