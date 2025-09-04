package internal

import (
	"context"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"golang.org/x/crypto/ssh"
)

var AppVersion = "dev" // Default; will be overwritten by -ldflags at build time

type Schedule struct {
	ID     string `json:"id"`
	Time   string `json:"time"` // or time.Time, but send as string to frontend
	IsPast bool   `json:"isPast,omitempty"`
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

	// Schedule maps
	scheduleMutex   sync.Mutex
	schedules       map[string]*Schedule // in-memory fake DB for demo
	scheduleResults map[string]*ScheduleResult
}

// Construction
func NewApp(config *AppConfig) (*App, error) {
	app := &App{
		Config:          config,
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

	return app, nil
}
