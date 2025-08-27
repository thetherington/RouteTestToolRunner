package internal

import (
	"context"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"golang.org/x/crypto/ssh"
)

var AppVersion = "dev" // Default; will  overwritten by -ldflags at build time

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
}

// Construction
func NewApp(config *AppConfig) (*App, error) {
	app := &App{
		Config: config,
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

	RegisterHandlers(r, app)
	RegisterFrontend(r)

	app.Router = r

	return app, nil
}
