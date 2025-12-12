import type { StructuredOutput } from "../types/output";
import type { IExtendedOptions, Schedule } from "../types/schedule";

export type SchedulesResponse = {
    schedules: Schedule[];
};

export type ScheduleReport = {
    output: string;
    RunType: string;
    structured?: StructuredOutput;
    runTime?: string;
};

export type CreateScheduleParams = {
    time: string;
    extendedOptions?: IExtendedOptions;
};

export async function createSchedule({
    time,
    extendedOptions,
}: CreateScheduleParams): Promise<Schedule> {
    const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time, extendedOptions }),
    });

    if (!res.ok) {
        let msg = "Failed to create schedule.";

        const errData = await res.json();
        msg = errData.error || msg;

        throw new Error(msg);
    }

    return res.json();
}

type UpdateScheduleParams = CreateScheduleParams & {
    id: string;
};

export async function updateSchedule({
    id,
    time,
    extendedOptions = undefined,
}: UpdateScheduleParams): Promise<Schedule> {
    const res = await fetch(`/api/schedules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time, extendedOptions }),
    });

    if (!res.ok) {
        let msg = "Failed to update schedule.";

        const errData = await res.json();
        msg = errData.error || msg;

        throw new Error(msg);
    }

    return res.json();
}

export async function fetchSchedules(): Promise<SchedulesResponse> {
    const r = await fetch("/api/schedules");
    return r.json();
}

export async function deleteSchedule(id: string) {
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
}

export async function fetchReport(id: string): Promise<ScheduleReport> {
    const r = await fetch(`/api/schedules/${id}/result`);
    return r.json();
}
