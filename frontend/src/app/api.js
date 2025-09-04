export async function fetchJobStatus() {
    const r = await fetch("/api/jobstatus");
    return r.json();
}

export async function fetchJobResult() {
    const r = await fetch("/api/jobresult");
    return r.json();
}

export async function fetchRunJob() {
    const r = await fetch("/api/runjob", { method: "POST" });
    return r.json();
}

export async function fetchStopJob() {
    const r = await fetch("/api/stopjob", { method: "POST" });
    return r.json();
}

export async function fetchVersion() {
    const r = await fetch("/api/version");
    return r.json();
}

export async function fetchSchedules() {
    const r = await fetch("/api/schedules");
    return r.json();
}

export async function createSchedule(time) {
    const r = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time }),
    });

    return r.json();
}

export async function updateSchedule(id, time) {
    await fetch(`/api/schedules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time }),
    });
}

export async function deleteSchedule(id) {
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
}

export async function loadReport(id) {
    const r = await fetch(`/api/schedules/${id}/result`);
    return r.json();
}
