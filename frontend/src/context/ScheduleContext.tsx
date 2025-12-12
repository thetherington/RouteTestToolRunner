import {
    createContext,
    useContext,
    useState,
    type Dispatch,
    type FC,
    type ReactNode,
} from "react";
import type { ScheduleReport } from "../api/scheduleApi";
import { useRouteTestScheduler } from "../hooks/useRouteTestScheduler";
import type { IExtendedOptions, Schedule } from "../types/schedule";

type ScheduleContextType = {
    schedules: Schedule[];
    refreshSchedules: () => void;
    createSchedule: (
        time: string,
        extendedOptions: IExtendedOptions | undefined
    ) => void;
    updateSchedule: (time: string) => void;
    deleteSchedule: (id: string) => void;
    cancelEdit: () => void;
    fetchScheduleResult: (id: string) => void;
    clearError: () => void;
    enableEdit: (
        id: string,
        time: string,
        extendedOptions: IExtendedOptions | null
    ) => void;
    setTime: Dispatch<React.SetStateAction<string>>;
    extendedOptions: IExtendedOptions | null;
    setExtendedOptions: Dispatch<React.SetStateAction<IExtendedOptions | null>>;
    error: string | undefined;
    time: string;
    editId: string;
};

const ScheduleContext = createContext<ScheduleContextType>({
    schedules: [],
    refreshSchedules: function (): void {},
    clearError: function (): void {},
    createSchedule: function (): void {},
    updateSchedule: function (): void {},
    deleteSchedule: function (): void {},
    cancelEdit: function (): void {},
    fetchScheduleResult: function (): void {},
    enableEdit: function (): void {},
    setTime: function (): void {},
    setExtendedOptions: function (): void {},
    extendedOptions: null,
    error: "",
    time: "",
    editId: "",
});

interface SchedulerProviderProps {
    children: ReactNode;
    reportLoadCallBack: (report: ScheduleReport) => void;
}

export const ScheduleContextProvider: FC<SchedulerProviderProps> = ({
    children,
    reportLoadCallBack,
}) => {
    const [time, setTime] = useState<string>("");
    const [editId, setEditId] = useState<string>("");
    const [extendedOptions, setExtendedOptions] =
        useState<IExtendedOptions | null>(null);

    const {
        createScheduleMutate,
        updateScheduleMutate,
        schedules,
        refetchSchedules,
        deleteScheduleMutate,
        getReport,
    } = useRouteTestScheduler();

    const createSchedule = (
        time: string,
        extendedOptions: IExtendedOptions | undefined = undefined
    ) => {
        createScheduleMutate.mutate(
            { time, extendedOptions },
            {
                onSuccess: () => {
                    refetchSchedules();
                    setTime("");
                },
                onError: () => {
                    setTime(time);
                },
            }
        );
    };

    const updateSchedule = (time: string) => {
        updateScheduleMutate.mutate(
            { id: editId, time, extendedOptions: extendedOptions || undefined },
            {
                onSuccess: () => {
                    refetchSchedules();
                    setTime("");
                    setEditId("");
                },
                onError: () => {
                    setTime(time);
                },
            }
        );
    };

    const deleteSchedule = (id: string) => {
        deleteScheduleMutate.mutate(id, {
            onSuccess: () => {
                refetchSchedules();
            },
        });
    };

    const cancelEdit = () => {
        setEditId("");
        setTime("");
        setExtendedOptions(null);
    };

    const refreshSchedules = () => {
        refetchSchedules();
    };

    const fetchScheduleResult = async (id: string): Promise<void> => {
        const resp = await getReport(id);
        reportLoadCallBack(resp);
    };

    const clearError = () => {
        createScheduleMutate.reset();
        updateScheduleMutate.reset();
    };

    const enableEdit = (
        id: string,
        time: string,
        options: IExtendedOptions | null = null
    ) => {
        setEditId(id);
        setTime(time);
        setExtendedOptions(options);
    };

    const error =
        createScheduleMutate.error?.message ||
        updateScheduleMutate.error?.message;

    const contextValue: ScheduleContextType = {
        createSchedule,
        updateSchedule,
        deleteSchedule,
        refreshSchedules,
        fetchScheduleResult,
        setExtendedOptions,
        extendedOptions,
        cancelEdit,
        clearError,
        enableEdit,
        setTime,
        error,
        time,
        editId,
        schedules: schedules?.schedules!,
    };

    return (
        <ScheduleContext.Provider value={contextValue}>
            {children}
        </ScheduleContext.Provider>
    );
};

export const useScheduler = () => {
    const context = useContext(ScheduleContext);
    if (context === undefined || context === null) {
        throw new Error(
            "Cannot use SchedulerContext without using SchedulerOverview Provider"
        );
    }

    return context;
};
