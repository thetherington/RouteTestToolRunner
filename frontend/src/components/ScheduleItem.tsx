import { type FC, type ReactElement } from "react";
import type { Schedule } from "../api/scheduleApi";
import Spinner from "./Spinner";
import LoadingBeam from "./LoadingBeam";

import styles from "./ScheduleItem.module.css";
import Button from "./Button";
import IconDownload from "../icons/IconDownload";
import IconPencil from "../icons/IconPencil";
import IconXLine from "../icons/IconXLine";
import IconXBold from "../icons/IconXBold";
import IconCheckMark from "../icons/IconCheckMark";
import { useScheduler } from "../context/ScheduleContext";

interface ScheduleItemProps {
    schedule: Schedule;
}

const formatDate = (date: string): string => {
    return new Date(date).toLocaleString();
};

const ScheduleItem: FC<ScheduleItemProps> = ({ schedule }): ReactElement => {
    const { deleteSchedule, fetchScheduleResult, enableEdit, editId } =
        useScheduler();

    const editMode = editId === schedule.id;

    return (
        <div
            className={`${styles["schedule-card"]} ${
                schedule.isPast ? styles["past"] : ""
            }`}
        >
            <div className={styles["schedule-info"]}>
                <div>
                    <strong>{formatDate(schedule.time)}</strong>
                    {schedule.isRunning && <Spinner />}
                    {schedule.isRunning && <LoadingBeam variant="card" />}
                </div>
                {schedule.isPast && (
                    <div className={styles.muted}>
                        (Past Job)
                        {schedule.hasError ? <IconXBold /> : <IconCheckMark />}
                    </div>
                )}
            </div>
            <div className={styles["schedule-actions"]}>
                <Button
                    onClick={() => fetchScheduleResult(schedule.id)}
                    size="sm"
                    variant="primary"
                    icon
                >
                    <IconDownload />
                </Button>
                <Button
                    onClick={() => enableEdit(schedule.id, schedule.time)}
                    size="sm"
                    variant={editMode ? "edit" : "success"}
                    icon
                    disabled={schedule.isPast || schedule.isRunning}
                >
                    <IconPencil />
                </Button>
                <Button
                    onClick={() => deleteSchedule(schedule.id)}
                    size="sm"
                    variant="danger"
                    icon
                    disabled={schedule.isRunning}
                >
                    <IconXLine />
                </Button>
            </div>
        </div>
    );
};

export default ScheduleItem;
