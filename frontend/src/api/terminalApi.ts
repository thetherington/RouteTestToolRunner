export type validateTerminalRequest = {
    source: string;
    destinations: string[];
};

export type validateTerminalResponse = {
    valid: boolean;
    message: string;
    source: {
        value: string;
        multicast?: string;
    } | null;
    destinations:
        | {
              value: string;
              dst?: number;
              slabs?: string[];
          }[]
        | null;
};

export async function validateTerminals(
    data: validateTerminalRequest
): Promise<validateTerminalResponse> {
    await sleep(5000); // Simulate network delay

    if (data.source == "asdf") {
        throw new Error("failure with validation");
    }

    return Promise.resolve({
        valid: true,
        message: "All terminals are valid.",
        source: { value: data.source, multicast: "239.1.1.1" },
        destinations: data.destinations.map((dst, index) => ({
            value: dst,
            dst: index,
            slabs: ["iad1bc-slab018", "iad1bc-slab037"],
        })),
    });
}

// Sleep for 5 seconds by default
export function sleep(ms: number = 5000): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
