import { useMutation, useQuery } from "@tanstack/react-query";
import {
    createSchedule,
    deleteSchedule,
    fetchReport,
    fetchSchedules,
    updateSchedule,
    type ScheduleReport,
} from "../api/scheduleApi";

const useRouteTestScheduler = () => {
    const createScheduleMutate = useMutation({
        mutationFn: createSchedule,
    });

    const updateScheduleMutate = useMutation({
        mutationFn: updateSchedule,
    });

    const deleteScheduleMutate = useMutation({
        mutationFn: deleteSchedule,
    });

    const { data: schedules, refetch: refetchSchedules } = useQuery({
        queryKey: ["schedules"],
        queryFn: fetchSchedules,
        staleTime: 0,
    });

    const getReport = async (id: string): Promise<ScheduleReport> => {
        const resp = fetchReport(id);
        return resp;
    };

    return {
        createScheduleMutate,
        deleteScheduleMutate,
        updateScheduleMutate,
        schedules,
        refetchSchedules,
        getReport,
    };
};

export { useRouteTestScheduler };
