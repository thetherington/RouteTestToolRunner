import { useEffect, useState } from "react";

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
import Scheduler from "./components/Scheduler";
import { ScheduleContextProvider } from "./context/ScheduleContext";
import { useRouteTestTool } from "./hooks/useRouteTestTool";
import { formatOutput } from "./util/utils";

function App() {
    const [panelOpen, setPanelOpen] = useState<boolean>(false);
    const [outputText, setOutputText] = useState(
        "Output will appear here.\n\n\n"
    );
    const [hideUIComponents, setHideUIComponents] = useState(false);

    const {
        version,
        status,
        activeStep,
        results,
        jobCompleted,
        getLastJobResult,
        startJob,
        stopJob,
    } = useRouteTestTool(setOutputText);

    const handleReportLoad = (output: string) => {
        setOutputText(output === "" ? "No Scheduled Report Yet\n\n\n" : output);
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
        jobCompleted
            ? setOutputText(formatOutput(results!))
            : setOutputText("Output will appear here.\n\n\n");
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
                    text={outputText}
                    badge={
                        jobCompleted && results && !hideUIComponents
                            ? results?.RunType
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
