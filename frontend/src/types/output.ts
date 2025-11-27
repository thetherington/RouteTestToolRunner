// A single log line within a slab
export type LogLine = string;

// Map of slab ID -> array of log lines
export type SlabsMap = Record<string, LogLine[]>;

// One destination entry (e.g., "PMPB01", "PMPB02", ...)
export interface Destination {
    eng: string;
    slabs: SlabsMap;
}

// Map of destination ID -> Destination
export type DestinationsMap = Record<string, Destination>;

// Top-level shape of the JSON object
export interface SlabLogs {
    source: string;
    mcast: string;
    destinations: DestinationsMap;
}

export type StructuredOutput = {
    json?: Record<string, string>;
};
