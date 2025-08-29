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
