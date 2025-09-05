package internal

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-co-op/gocron/v2"
	"golang.org/x/crypto/ssh"
)

var AppVersion = "dev" // Default; will be overwritten by -ldflags at build time

type Schedule struct {
	ID     string    `json:"id"`
	Time   time.Time `json:"time"`
	IsPast bool      `json:"isPast,omitempty"`
}

type ScheduleResult struct {
	Output string `json:"output"`
}

type JobResult struct {
	SchedulerOutput string
	SDVNOutput      string
	Error           string
	Running         bool
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
