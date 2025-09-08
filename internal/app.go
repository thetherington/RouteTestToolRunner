package internal

import (
	"context"
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
	Error           string
	Running         bool
	RunType         RunType
}

// App is the main application struct holding all state, config, and HTTP/router details.
type App struct {
	Config      *AppConfig
	SchedulerIP string
	SdvnIP      string
	Router      *chi.Mux

	mutex       sync.Mutex
	running     bool
	lastResult  JobResult
	jobActivity string

	// Job-cancellation support:
	jobCancel     context.CancelFunc
	activeSession *ssh.Session

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
// - Connect SSH to Magnum Scheduler and execute the scheduler script
// - Connect SSH to Magnum SDVN and execute the script to analyze the route logs
func (app *App) ExecuteRunnerTasks(ctx context.Context, runType RunType) JobResult {
	result := JobResult{Running: false, RunType: runType}

	// ------- Step 1: Connecting to scheduler
	app.SetJobActivity("Preparing to connect to scheduler")
	schedTarget := SSHJobTarget{
		Label:    "scheduler",
		IP:       app.Config.File.Scheduler.IP,
		User:     app.Config.SchedulerSSH.User,
		Pass:     app.Config.SchedulerSSH.Pass,
		Commands: app.Config.File.Scheduler.Commands,
	}
	schedOut, err := sshRunCmd(ctx, app, schedTarget)
	result.SchedulerOutput = schedOut
	if err != nil {
		if ctx.Err() == context.Canceled {
			result.Error = err.Error()
			slog.Warn(result.Error)
		} else {
			result.Error = "Scheduler script error: " + err.Error()
			slog.Error("Scheduler script", "error", err, "output", schedOut)
		}

		return result
	}

	// ------- Step 2: Connecting to sdvn
	app.SetJobActivity("Preparing to connect to sdvn")
	sdvnTarget := SSHJobTarget{
		Label:    "sdvn",
		IP:       app.Config.File.Sdvn.IP,
		User:     app.Config.SdvnSSH.User,
		Pass:     app.Config.SdvnSSH.Pass,
		Commands: app.Config.File.Sdvn.Commands,
	}
	sdvnOut, err := sshRunCmd(ctx, app, sdvnTarget)
	result.SDVNOutput = sdvnOut
	if err != nil {
		if ctx.Err() == context.Canceled {
			result.Error = err.Error()
			slog.Warn(result.Error)
		} else {
			result.Error = "SDVN script error: " + err.Error()
			slog.Error("SDVN script", "error", err, "output", sdvnOut)
		}
	}

	return result
}

// Resets the App state to default and clears out the references
func (app *App) ResetApp() {
	app.mutex.Lock()
	app.running = false
	app.jobCancel = nil
	app.activeSession = nil
	app.jobActivity = "Idle"
	app.mutex.Unlock()
}

// Helper functions for safe activity of App getterss
func (app *App) GetLastResult() JobResult {
	app.mutex.Lock()
	defer app.mutex.Unlock()

	result := app.lastResult
	result.Running = app.running

	return result
}

// Helper functions for safe activity of App setters
func (app *App) SetLastResult(res JobResult) {
	app.mutex.Lock()
	defer app.mutex.Unlock()

	app.lastResult = res
}

func (app *App) SetJobActivity(desc string) {
	app.mutex.Lock()

	slog.Info(strings.ReplaceAll(desc, "\n", ""))
	app.jobActivity = desc

	app.mutex.Unlock()
}
