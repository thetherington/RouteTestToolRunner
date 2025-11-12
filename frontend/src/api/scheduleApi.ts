export type Schedule = {
    id: string;
    time: string;
    hasError: boolean;
    isRunning: boolean;
    isPast?: boolean;
};

export type SchedulesResponse = {
    schedules: Schedule[];
};

export type ScheduleReport = {
    output: string;
    RunType: string;
};

export async function createSchedule(time: string): Promise<Schedule> {
    const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time }),
    });

    if (!res.ok) {
        let msg = "Failed to create schedule.";

        const errData = await res.json();
        msg = errData.error || msg;

        throw new Error(msg);
    }

    return res.json();
}

type updateScheduleParams = {
    id: string;
    time: string;
};

export async function updateSchedule(
    params: updateScheduleParams
): Promise<Schedule> {
    const res = await fetch(`/api/schedules/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: params.time }),
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
