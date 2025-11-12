import {
    createContext,
    useContext,
    useState,
    type Dispatch,
    type FC,
    type ReactNode,
} from "react";
import { useRouteTestScheduler } from "../hooks/useRouteTestScheduler";
import type { Schedule } from "../api/scheduleApi";

type ScheduleContextType = {
    schedules: Schedule[];
    refreshSchedules: () => void;
    createSchedule: (time: string) => void;
    updateSchedule: (time: string) => void;
    deleteSchedule: (id: string) => void;
    cancelEdit: () => void;
    fetchScheduleResult: (id: string) => void;
    clearError: () => void;
    enableEdit: (id: string, time: string) => void;
    setTime: Dispatch<React.SetStateAction<string>>;
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
    error: "",
    time: "",
    editId: "",
});

interface SchedulerProviderProps {
    children: ReactNode;
    reportLoadCallBack: (output: string) => void;
}

export const ScheduleContextProvider: FC<SchedulerProviderProps> = ({
    children,
    reportLoadCallBack,
}) => {
    const [time, setTime] = useState<string>("");
    const [editId, setEditId] = useState<string>("");

    const {
        createScheduleMutate,
        updateScheduleMutate,
        schedules,
        refetchSchedules,
        deleteScheduleMutate,
        getReport,
    } = useRouteTestScheduler();

    const createSchedule = (time: string) => {
        createScheduleMutate.mutate(time, {
            onSuccess: () => {
                refetchSchedules();
                setTime("");
            },
            onError: () => {
                setTime(time);
            },
        });
    };

    const updateSchedule = (time: string) => {
        updateScheduleMutate.mutate(
            { id: editId, time },
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
    };

    const refreshSchedules = () => {
        refetchSchedules();
    };

    const fetchScheduleResult = async (id: string): Promise<void> => {
        const resp = await getReport(id);
        reportLoadCallBack(resp.output);
    };

    const clearError = () => {
        createScheduleMutate.reset();
        updateScheduleMutate.reset();
    };

    const enableEdit = (id: string, time: string) => {
        setEditId(id);
        setTime(time);
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
