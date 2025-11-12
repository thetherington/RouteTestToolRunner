import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
    fetchJobResult,
    fetchJobStatus,
    fetchVersion,
    sendRunJob,
    sendStopJob,
} from "../api/jobApi";
import { formatOutput } from "../util/utils";
import { toast } from "react-toastify";

type StateMutate = React.Dispatch<React.SetStateAction<string>>;

const useRouteTestTool = (setOutputText: StateMutate) => {
    const [jobCompleted, setJobCompleted] = useState(false);
    const [jobRunning, setJobRunning] = useState(false);
    const [intervalTime, setIntervalTime] = useState<number | false>(false);

    const queryClient = useQueryClient();

    let activeStep = 0;

    // Get version from backend
    const { data: version } = useQuery({
        queryKey: ["version"],
        queryFn: fetchVersion,
    });

    const { data: results, refetch: fetchResults } = useQuery({
        queryKey: ["jobresult"],
        queryFn: fetchJobResult,
        refetchInterval: intervalTime,
        refetchIntervalInBackground: true,
        staleTime: 0,
    });

    // Get Status from backend
    const { data: status } = useQuery({
        queryKey: ["jobstatus"],
        queryFn: fetchJobStatus,
        refetchInterval: 600,
        refetchIntervalInBackground: true,
    });

    const markJobAsStarted = () => {
        setJobCompleted(false);
        setJobRunning(true);
        setIntervalTime(200);

        queryClient.invalidateQueries({
            queryKey: ["schedules"],
        });
    };

    const markJobAsStopped = async () => {
        fetchResults();
        setJobCompleted(true);
        setJobRunning(false);

        queryClient.invalidateQueries({
            queryKey: ["schedules"],
        });
    };

    const getLastJobResult = () => {
        fetchResults();
        setOutputText(formatOutput(results!));
        setJobCompleted(true);
    };

    const startJobMutation = useMutation({
        mutationFn: sendRunJob,
        onSuccess: () => {
            markJobAsStarted();
        },
    });

    const stopJobMutation = useMutation({
        mutationFn: sendStopJob,
        onSuccess: () => {
            markJobAsStopped();
        },
    });

    const startJob = () => {
        activeStep = 0;
        startJobMutation.mutate();
        markJobAsStarted();
    };

    const stopJob = async () => {
        stopJobMutation.mutate();
    };

    const clearResults = () => {
        queryClient.removeQueries({
            queryKey: ["jobresult"],
        });
    };

    useEffect(() => {
        if (status?.running) {
            markJobAsStarted();
        } else {
            setIntervalTime(false);

            if (jobRunning) {
                results?.Error
                    ? toast.error("Job Failed with Error")
                    : toast.success("Job Completed");

                markJobAsStopped();
            }
        }
    }, [status]);

    activeStep = results?.Step!;

    return {
        version,
        status,
        activeStep,
        results,
        jobCompleted,
        getLastJobResult,
        clearResults,
        startJob,
        stopJob,
    };
};

export { useRouteTestTool };
