import { useEffect, useReducer, useState } from "react";

import Button from "./components/Button";
import LoadingBeam from "./components/LoadingBeam";
import Nav from "./components/Nav";
import Output from "./components/Output";
import SideBarPanel from "./components/SideBarPanel";
import Spinner from "./components/Spinner";
import Status from "./components/Status";
import StepProgress from "./components/StepProgress";
import IconDownArrow from "./icons/IconDownArrow";
import IconX from "./icons/IconX";

import { Bounce, toast, ToastContainer } from "react-toastify";
import type { JobResultResponse } from "./api/jobApi";
import type { ScheduleReport } from "./api/scheduleApi";
import Scheduler from "./components/Scheduler";
import { ScheduleContextProvider } from "./context/ScheduleContext";
import { useRouteTestTool } from "./hooks/useRouteTestTool";
import type { SlabLogs } from "./types/output";
import {
    extractEventStartTime,
    formatOutput,
    unmarshalSlabLogs,
} from "./util/utils";

type OutputState = {
    outputText: string;
    outputData?: SlabLogs;
    scheduleTime: string;
    runType?: "manual" | "scheduled" | undefined;
};

type Action =
    | { type: "SET_OUTPUT_TEXT"; payload: string }
    | { type: "SET_OUTPUT_DATA"; payload?: SlabLogs }
    | { type: "SET_SCHEDULE_TIME"; payload: string }
    | { type: "SET_RUN_TYPE"; payload?: "manual" | "scheduled" | undefined }
    | { type: "RESET" }
    | { type: "LOAD_SCHEDULE_REPORT"; payload: ScheduleReport };

const initialState: OutputState = {
    outputText: "Output will appear here.\n\n\n",
    outputData: undefined,
    scheduleTime: "",
    runType: undefined,
};

function reducer(state: OutputState, action: Action): OutputState {
    switch (action.type) {
        case "SET_OUTPUT_TEXT":
            return { ...state, outputText: action.payload };

        case "SET_OUTPUT_DATA":
            return { ...state, outputData: action.payload };

        case "SET_SCHEDULE_TIME":
            return { ...state, scheduleTime: action.payload };

        case "SET_RUN_TYPE":
            return { ...state, runType: action.payload };

        case "RESET":
            return { ...initialState };

        case "LOAD_SCHEDULE_REPORT": {
            const report = action.payload;
            const text =
                report.output === ""
                    ? "No Scheduled Report Yet\n\n\n"
                    : report.output;
            const slabJson = (report as any)?.structured?.json?.slab;
            const runType = (report as any)?.RunType || undefined;

            return {
                ...state,
                outputText: text,
                outputData: unmarshalSlabLogs(slabJson),
                scheduleTime: report.runTime || "",
                runType: runType,
            };
        }

        default:
            return state;
    }
}

function App() {
    const [panelOpen, setPanelOpen] = useState<boolean>(false);
    const [hideUIComponents, setHideUIComponents] = useState(false);

    const [state, dispatch] = useReducer(reducer, initialState);

    const {
        version,
        status,
        activeStep,
        results,
        jobCompleted,
        getLastJobResult,
        startJob,
        stopJob,
    } = useRouteTestTool(setOutput);

    // helper for passing into hook (it expects a setter-like)
    function setOutput(results: JobResultResponse | undefined) {
        dispatch({
            type: "SET_OUTPUT_TEXT",
            payload: formatOutput(results!),
        });

        const slabJson = results?.structured?.json?.slab;
        dispatch({
            type: "SET_OUTPUT_DATA",
            payload: unmarshalSlabLogs(slabJson),
        });

        if (results?.RunType === "manual") {
            const time = extractEventStartTime(results.SchedulerOutput);
            if (time) {
                dispatch({ type: "SET_SCHEDULE_TIME", payload: time });
            }
        } else {
            dispatch({
                type: "SET_SCHEDULE_TIME",
                payload: results?.runTime || "",
            });
        }

        dispatch({ type: "SET_RUN_TYPE", payload: results?.RunType });
    }

    const handleReportLoad = (report: ScheduleReport) => {
        dispatch({ type: "LOAD_SCHEDULE_REPORT", payload: report });

        setPanelOpen(false);
        setHideUIComponents(true);

        toast.info("Loading Scheduled Report");
    };

    const handleStartJob = () => {
        running = true;
        startJob();
        toast.info("Job Started");
    };

    const handleCancelJob = () => {
        stopJob();
        toast.warn("Job Cancelled");
    };

    const handlFetchLastResults = () => {
        setHideUIComponents(false);
        getLastJobResult();
        toast.info("Fetched Previous Results");
    };

    let running = false;

    status?.running || results?.Running ? (running = true) : (running = false);

    // prevents rapid re-renders
    useEffect(() => {
        jobCompleted ? setOutput(results) : dispatch({ type: "RESET" });
    }, [jobCompleted, results]);

    useEffect(() => {
        if (running) {
            setHideUIComponents(false);
        }
    }, [running]);

    return (
        <>
            <Nav
                onClickMenu={() => setPanelOpen(!panelOpen)}
                verson={version?.version}
            />
            {running && <LoadingBeam />}

            <SideBarPanel
                onClose={() => setPanelOpen(!panelOpen)}
                isOpen={panelOpen}
            >
                <ScheduleContextProvider reportLoadCallBack={handleReportLoad}>
                    <Scheduler />
                </ScheduleContextProvider>
            </SideBarPanel>

            <main>
                <div className="action-row">
                    <div className="run-actions">
                        <Button
                            onClick={handleStartJob}
                            variant="primary"
                            disabled={running}
                        >
                            Run Route Test
                        </Button>
                        {running && <Spinner />}
                    </div>
                    {(running || jobCompleted) && !hideUIComponents && (
                        <StepProgress
                            step={activeStep}
                            error={
                                jobCompleted && results?.Error ? true : false
                            }
                        />
                    )}
                    <div className="run-actions end">
                        {running && (
                            <Button
                                onClick={handleCancelJob}
                                variant="danger"
                                icon
                            >
                                Cancel
                                <IconX />
                            </Button>
                        )}
                        <Button
                            onClick={handlFetchLastResults}
                            disabled={status?.running}
                            icon
                        >
                            <IconDownArrow />
                        </Button>
                    </div>
                </div>

                <Status>
                    {!running
                        ? "Status: Ready to run job"
                        : "Status: Job is running..."}
                    {<br />}
                    {status?.activity}
                </Status>
                <Output
                    outputText={state.outputText}
                    outputData={state.outputData}
                    scheduleTime={state.scheduleTime}
                    badge={
                        jobCompleted && results && !hideUIComponents
                            ? state.runType
                            : undefined
                    }
                />
            </main>
            <ToastContainer
                position="top-center"
                autoClose={1500}
                limit={4}
                pauseOnFocusLoss={false}
                pauseOnHover={false}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick={false}
                rtl={false}
                theme="dark"
                transition={Bounce}
                toastClassName={"toast-bg"}
            />
        </>
    );
}

export default App;
