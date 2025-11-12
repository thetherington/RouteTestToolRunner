import { type FC, type ReactElement } from "react";
import type { Schedule } from "../api/scheduleApi";
import ScheduleItem from "./ScheduleItem";
import { useScheduler } from "../context/ScheduleContext";

type ScheduleTime = string | number | Date;

const toMs = (t: ScheduleTime): number => {
    const d = t instanceof Date ? t : new Date(t);
    const ms = d.getTime();
    return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms; // invalid dates go to the end
};

const ScheduleList: FC = (): ReactElement => {
    const { schedules } = useScheduler();

    if (!schedules || schedules.length < 1)
        return <p className="empty">No scheduled jobs.</p>;

    let schedules_sorted = schedules || [];
    const nowMs = Date.now();

    // Sort schedules: running at the top, then future before past, then by timestamp asc
    schedules_sorted.sort((a: Schedule, b: Schedule) => {
        const aRunning = !!a.isRunning;
        const bRunning = !!b.isRunning;

        // 1) Running at top
        if (aRunning && !bRunning) return -1;
        if (bRunning && !aRunning) return 1;

        // 2) Future before past (non-running items)
        const aMs = toMs(a.time);
        const bMs = toMs(b.time);
        const aIsPast = !aRunning && aMs < nowMs;
        const bIsPast = !bRunning && bMs < nowMs;

        if (aIsPast && !bIsPast) return 1; // past goes after future
        if (bIsPast && !aIsPast) return -1;

        // 3) Within same group: timestamp ascending
        if (aMs !== bMs) return aMs - bMs;

        // Optional stable tie-breaker if you have IDs
        if (a.id && b.id) return a.id.localeCompare(b.id);

        return 0;
    });

    return (
        <div className="schedule-list">
            {schedules_sorted.map((schedule: Schedule) => (
                <ScheduleItem key={schedule.id} schedule={schedule} />
            ))}
        </div>
    );
};

export default ScheduleList;
