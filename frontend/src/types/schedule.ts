interface ISourceData {
    value: string;
    multicast?: string;
}

interface IDestinationData {
    value: string;
    dst?: number;
    slabs?: string[];
}

export interface IExtendedOptions {
    source: ISourceData;
    destinations: IDestinationData[];
}

export type Schedule = {
    id: string;
    time: string;
    hasError: boolean;
    isRunning: boolean;
    isPast?: boolean;
    extendedOptions?: IExtendedOptions;
};
