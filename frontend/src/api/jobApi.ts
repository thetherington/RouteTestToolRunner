import type { StructuredOutput } from "../types/output";

export type VersionResponse = {
    version: string;
};

export type JobStatusResponse = {
    activity: string;
    running: boolean;
    step: number;
};

export type JobResultResponse = {
    SchedulerOutput: string;
    SDVNOutput: string;
    SlabOutput: string;
    Error: string;
    Step: number;
    Running: boolean;
    RunType: "manual" | "scheduled" | undefined;
    structured?: StructuredOutput;
    runTime?: string;
};

export type JobStopResult = {
    stopped: boolean;
};

export async function fetchVersion(): Promise<VersionResponse> {
    const r = await fetch("/api/version");
    return r.json();
}

export async function fetchJobStatus(): Promise<JobStatusResponse> {
    const r = await fetch("/api/jobstatus");
    return r.json();
}

export async function fetchJobResult(): Promise<JobResultResponse> {
    const r = await fetch("/api/jobresult");
    return r.json();
}

export async function sendRunJob(): Promise<JobResultResponse> {
    const r = await fetch("/api/runjob", { method: "POST" });
    return r.json();
}

export async function sendStopJob(): Promise<JobStopResult> {
    const r = await fetch("/api/stopjob", { method: "POST" });
    return r.json();
}
