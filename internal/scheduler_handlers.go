package internal

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func RegisterSchedulerHandlers(r chi.Router, app *App) {
	r.Get("/api/schedules", func(w http.ResponseWriter, r *http.Request) {
		app.scheduleMutex.Lock()
		defer app.scheduleMutex.Unlock()

		var list []*Schedule
		for _, sched := range app.schedules {
			list = append(list, sched)
		}

		w.Header().Set("Content-Type", "application/json")

		json.NewEncoder(w).Encode(map[string]interface{}{"schedules": list})
	})

	r.Post("/api/schedules", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Time string `json:"time"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		id := uuid.New().String()
		sched := &Schedule{ID: id, Time: req.Time}

		app.scheduleMutex.Lock()

		if app.schedules == nil {
			app.schedules = map[string]*Schedule{}
		}

		app.schedules[id] = sched

		app.scheduleMutex.Unlock()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sched)
	})

	r.Put("/api/schedules/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		var in struct {
			Time string `json:"time"`
		}

		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		app.scheduleMutex.Lock()
		defer app.scheduleMutex.Unlock()

		sched, ok := app.schedules[id]
		if !ok {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		sched.Time = in.Time

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sched)
	})

	r.Delete("/api/schedules/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		app.scheduleMutex.Lock()
		defer app.scheduleMutex.Unlock()

		if _, ok := app.schedules[id]; !ok {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		delete(app.schedules, id)
		delete(app.scheduleResults, id)

		w.WriteHeader(http.StatusNoContent)
	})

	r.Get("/api/schedules/{id}/result", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		app.scheduleMutex.Lock()
		defer app.scheduleMutex.Unlock()

		result, ok := app.scheduleResults[id]
		if !ok {
			result = &ScheduleResult{Output: ""} // empty if not found
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	})
}
