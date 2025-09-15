package internal

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"strings"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-co-op/gocron/v2"
	"golang.org/x/crypto/ssh"
)

var AppVersion = "dev" // Default; will be overwritten by -ldflags at build time

type JobResult struct {
	SchedulerOutput string
	SDVNOutput      string
	SlabOutput      string
	Error           string
	Step            Step
	Running         bool
	RunType         RunType
}

// App is the main application struct holding all state, config, and HTTP/router details.
type App struct {
	Config *AppConfig
	Router *chi.Mux

	running     bool
	lastResult  JobResult
	jobActivity string
	step        Step
	mutex       sync.Mutex

	// Job-cancellation support:
	jobCancel        context.CancelFunc
	activeSession    *ssh.Session
	persistentHandle *SSHPersistentHandle // for new persistent background SSH jobs

	// Schedule
	scheduler       gocron.Scheduler           // global scheduler instance
	scheduleJobs    map[string]gocron.Job      // schedule id → gocron.Job
	schedules       map[string]*Schedule       // id → schedule struct
	scheduleResults map[string]*ScheduleResult // id → result/output for completed jobs
	scheduleMutex   sync.Mutex
}

// Construction
func NewApp(config *AppConfig) (*App, error) {
	sched, _ := gocron.NewScheduler()

	app := &App{
		Config:          config,
		scheduler:       sched,
		scheduleJobs:    make(map[string]gocron.Job),
		schedules:       map[string]*Schedule{},
		scheduleResults: map[string]*ScheduleResult{},
	}

	app.jobActivity = "Idle"

	r := chi.NewRouter()

	// r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	}))

	RegisterJobHandlers(r, app)
	RegisterSchedulerHandlers(r, app)
	RegisterFrontend(r)

	app.Router = r

	log.Print("Starting Scheduler")
	app.scheduler.Start()

	return app, nil
}

// Application main tasks to be performed (Run or Scheduled)
// 1 - Connect SSH to Magnum SDVN and start log tailing
// 2 - Connect SSH to Magnum Scheduler and execute the scheduler script
// 3 - Stop the log tailing on SDVN and close the connection
// 4 - Connect SSH to Magnum SDVN and execute the script to analyze the route logs
// 5 - Execute local script to collect the slab logs
func (app *App) ExecuteRunnerTasks(ctx context.Context, runType RunType) JobResult {
	result := JobResult{Running: false, RunType: runType}

	checkErr := func(e error, descr string, output string) {
		if ctx.Err() == context.Canceled {
			result.Error = e.Error()
			slog.Warn(result.Error)
		} else {
			result.Error = fmt.Sprintf("%s error: %s", descr, e.Error())
			slog.Error(descr, "error", e, "output", output)
		}
	}

	var err error

	// ------- Step 1: Tail log files on magnum
	app.SetJobActivity("Starting log tailing", step.one)
	sdvnTarget := SSHJobTarget{
		Label:    "sdvn",
		IP:       app.Config.File.Sdvn.IP,
		User:     app.Config.SdvnSSH.User,
		Pass:     app.Config.SdvnSSH.Pass,
		Command:  app.Config.File.Sdvn.BackgroundCmd,
		Commands: app.Config.File.Sdvn.Commands,
	}
	logTail, err := sshRunPersistentCmd(ctx, app, sdvnTarget)
	if err != nil {
		checkErr(err, "Background log tail", "")
		return result
	}
	defer logTail.Close()
	app.SetPersistentHandle(logTail)

	// ------- Step 2: Connecting to scheduler
	app.SetJobActivity("Preparing to connect to scheduler", step.two)
	schedTarget := SSHJobTarget{
		Label:    "scheduler",
		IP:       app.Config.File.Scheduler.IP,
		User:     app.Config.SchedulerSSH.User,
		Pass:     app.Config.SchedulerSSH.Pass,
		Commands: app.Config.File.Scheduler.Commands,
	}
	result.SchedulerOutput, err = sshRunCmd(ctx, app, schedTarget)
	if err != nil {
		checkErr(err, "Scheduler script", result.SchedulerOutput)
		return result
	}

	// ------- Step 3: Shutdown the log tailing
	app.SetJobActivity("Shutting down SDVN log tailing", step.three)
	logTail.Close()

	// ------- Step 4: Connecting to sdvn
	app.SetJobActivity("Preparing to connect to sdvn", step.four)
	result.SDVNOutput, err = sshRunCmd(ctx, app, sdvnTarget)
	if err != nil {
		checkErr(err, "SDVN script", result.SDVNOutput)
		return result
	}

	// ------- Step 5: Run local script for Slab logs
	app.SetJobActivity("Preparing to run local script", step.five)
	localTarget := LocalJobTarget{
		Label:    "slab",
		Commands: app.Config.File.Slab.Commands,
	}
	result.SlabOutput, err = localRunCmd(ctx, app, localTarget)
	if err != nil {
		checkErr(err, "Slab script", result.SlabOutput)
		return result
	}

	app.SetJobActivity("Completed", step.complete)

	return result
}

// Resets the App state to default and clears out the references
func (app *App) ResetApp() {
	app.mutex.Lock()
	app.running = false
	app.jobCancel = nil
	app.activeSession = nil
	app.persistentHandle = nil
	app.jobActivity = "Idle"
	app.mutex.Unlock()
}

// Helper functions for safe activity of App getterss
func (app *App) GetLastResult() JobResult {
	app.mutex.Lock()
	defer app.mutex.Unlock()

	result := app.lastResult
	result.Running = app.running
	result.Step = app.step

	return result
}

// Helper functions for safe activity of App setters
func (app *App) SetLastResult(res JobResult) {
	app.mutex.Lock()
	defer app.mutex.Unlock()

	app.lastResult = res
}

func (app *App) SetJobActivity(desc string, step ...Step) {
	app.mutex.Lock()

	slog.Info(strings.ReplaceAll(desc, "\n", ""))
	app.jobActivity = desc

	if len(step) > 0 {
		app.step = step[0]
	}

	app.mutex.Unlock()
}

func (app *App) SetPersistentHandle(h *SSHPersistentHandle) {
	app.mutex.Lock()
	app.persistentHandle = h
	app.mutex.Unlock()
}

func (app *App) ClearPersistentHandle() {
	app.mutex.Lock()
	app.persistentHandle = nil
	app.mutex.Unlock()
}
