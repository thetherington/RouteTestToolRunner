package internal

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

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

		schedTime, err := time.Parse(time.RFC3339, req.Time)
		if err != nil {
			http.Error(w, "invalid time", http.StatusBadRequest)
			return
		}

		// Conflict check
		if conflict := app.checkScheduleConflict(schedTime, ""); conflict != "" {
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(map[string]string{"error": conflict})
			return
		}

		id := uuid.New().String()
		sched := &Schedule{ID: id, Time: schedTime}

		app.scheduleMutex.Lock()
		app.schedules[id] = sched
		app.scheduleMutex.Unlock()

		if err := app.addGocronJobForSchedule(sched); err != nil {
			slog.Error("failed to create cron task", "error", err)
			http.Error(w, "internal failure", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sched)
	})

	r.Put("/api/schedules/{id}", func(w http.ResponseWriter, r *http.Request) {
		scheduleID := chi.URLParam(r, "id")

		var req struct {
			Time string `json:"time"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		schedTime, err := time.Parse(time.RFC3339, req.Time)
		if err != nil {
			http.Error(w, "invalid time", http.StatusBadRequest)
			return
		}

		// Conflict, but allow for updating THIS schedule
		if conflict := app.checkScheduleConflict(schedTime, scheduleID); conflict != "" {
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(map[string]string{"error": conflict})
			return
		}

		var sched *Schedule
		var ok bool

		func() {
			app.scheduleMutex.Lock()
			defer app.scheduleMutex.Unlock()

			sched, ok = app.schedules[scheduleID]
			if !ok {
				http.Error(w, "not found", http.StatusNotFound)
				return
			}

			// Remove old job, update, add new job
			if oldJob, has := app.scheduleJobs[scheduleID]; has {
				app.scheduler.RemoveJob(oldJob.ID())
			}
		}()

		sched.Time = schedTime

		if err := app.addGocronJobForSchedule(sched); err != nil {
			slog.Error("failed to create cron task", "error", err)
			http.Error(w, "internal failure", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sched)
	})

	r.Delete("/api/schedules/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		app.scheduleMutex.Lock()
		defer app.scheduleMutex.Unlock()

		delete(app.schedules, id)

		if job, ok := app.scheduleJobs[id]; ok {
			app.scheduler.RemoveJob(job.ID())
			delete(app.scheduleJobs, id)
		}

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
