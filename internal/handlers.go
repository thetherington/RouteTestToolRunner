package internal

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func RegisterHandlers(r chi.Router, app *App) {
	r.Post("/api/runjob", func(w http.ResponseWriter, r *http.Request) {
		ctx := context.Background()
		result := app.RunJob(ctx)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	})

	r.Post("/api/stopjob", func(w http.ResponseWriter, r *http.Request) {
		err := app.StopJob()
		w.Header().Set("Content-Type", "application/json")
		if err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"stopped": false, "error": err.Error()})
		} else {
			json.NewEncoder(w).Encode(map[string]interface{}{"stopped": true})
		}
	})

	r.Get("/api/jobresult", func(w http.ResponseWriter, r *http.Request) {
		res := app.GetLastResult()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(res)
	})

	r.Get("/api/jobstatus", func(w http.ResponseWriter, r *http.Request) {
		app.mutex.Lock()
		running := app.running
		activity := app.jobActivity
		app.mutex.Unlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"running":  running,
			"activity": activity,
		})
	})

	r.Get("/api/version", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"version": AppVersion})
	})
}
