import { toast } from "react-toastify";
import type { JobResultResponse } from "../api/jobApi";
import type { SlabLogs } from "../types/output";

export function capitalizeFirstLetter(inputString: string): string {
    if (!inputString) {
        return inputString; // Handle empty or null strings
    }
    return inputString.charAt(0).toUpperCase() + inputString.slice(1);
}

export function formatOutput(results: JobResultResponse): string {
    const seperator = "_".repeat(100) + "\n\n";
    let outputParts = [];

    outputParts.push(`Scheduler:\n${results.SchedulerOutput}\n\n`);
    outputParts.push(seperator);
    outputParts.push(`SDVN:\n${results.SDVNOutput}\n\n`);
    outputParts.push(seperator);
    outputParts.push(`Slab:\n${results.SlabOutput}\n\n`);
    outputParts.push(seperator);
    outputParts.push(`${results.Error ? "\nError: " + results.Error : ""}`);

    const slabJson = results.structured?.json?.slab;

    let parsedSlabLogs: SlabLogs | undefined = undefined;

    if (slabJson) {
        try {
            parsedSlabLogs = JSON.parse(slabJson) as SlabLogs;
        } catch (error) {
            console.error("Error parsing slab JSON:", error);
        }
    }

    console.log(
        "Parsed Slab Logs:",
        parsedSlabLogs?.mcast,
        parsedSlabLogs?.source,
        parsedSlabLogs?.destinations
    );

    // const out = JSON.parse(
    //     JSON.parse(JSON.stringify(results.structured?.json?.slab ?? {}))
    // );

    // console.log(out);

    return outputParts.join("");
}

export async function copyToClipBoard(results: string): Promise<void> {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(results);
        } else {
            // Fallback for older browsers
            try {
                const textarea = document.createElement("textarea");
                textarea.value = results;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
            } catch (error) {
                throw new Error("Failed to copy results");
            }
        }
    } catch (error) {
        throw new Error("Failed to copy results");
    }
}

export function saveToFile(results: string) {
    // Format today's date as YYYY-MM-DD for the filename
    const today = new Date();
    const pad = (n: number): string => (n < 10 ? "0" + n : "" + n);
    const dateStr =
        today.getFullYear() +
        "-" +
        pad(today.getMonth() + 1) +
        "-" +
        pad(today.getDate());
    const filename = `RouteTestResult_${dateStr}.txt`;

    // Create a Blob and download link
    const blob = new Blob([results], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and click it
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 150);
}

export function unmarshalSlabLogs(
    data: string | undefined
): SlabLogs | undefined {
    let parsedSlabLogs: SlabLogs | undefined = undefined;

    if (data) {
        try {
            parsedSlabLogs = JSON.parse(data) as SlabLogs;
        } catch (error) {
            toast.error("Error parsing slab JSON");
        }
    }

    return parsedSlabLogs;
}

export function extractEventStartTime(payload: string): string | null {
    const regex = /Event Start Time: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/;
    const match = payload.match(regex);
    return match ? match[1] : null;
}

export function createCSVFileName(t: string): string {
    const today = new Date(t);
    const pad = (n: number): string => (n < 10 ? "0" + n : "" + n);
    const dateStr =
        today.getFullYear() +
        "-" +
        pad(today.getMonth() + 1) +
        "-" +
        pad(today.getDate());
    return `RouteTestResult_${dateStr}.csv`;
}
