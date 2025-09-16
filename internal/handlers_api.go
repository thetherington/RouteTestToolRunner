package internal

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// WriteJSON takes a response, status code, and arbitrary data and writes json to the client
func WriteJSON(w http.ResponseWriter, status int, data interface{}, headers ...http.Header) error {
	out, err := json.Marshal(data)
	if err != nil {
		return err
	}

	// add additional header if provided (variadic parameter)
	if len(headers) > 0 {
		for k, v := range headers[0] {
			w.Header()[k] = v
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	_, err = w.Write(out)
	if err != nil {
		return err
	}

	return nil
}

func RegisterJobHandlers(r chi.Router, app *App) {
	r.Post("/api/runjob", func(w http.ResponseWriter, r *http.Request) {
		ctx := context.Background()
		result := app.RunJob(ctx)

		WriteJSON(w, http.StatusAccepted, result)
	})

	r.Post("/api/stopjob", func(w http.ResponseWriter, r *http.Request) {
		err := app.StopJob()

		if err != nil {
			WriteJSON(w, http.StatusInternalServerError, map[string]any{"stopped": false, "error": err.Error()})
			return
		}

		WriteJSON(w, http.StatusAccepted, map[string]any{"stopped": true})
	})

	r.Get("/api/jobresult", func(w http.ResponseWriter, r *http.Request) {
		res := app.GetLastResult()

		WriteJSON(w, http.StatusOK, res)
	})

	r.Get("/api/jobstatus", func(w http.ResponseWriter, r *http.Request) {
		app.mutex.Lock()
		running := app.running
		activity := app.jobActivity
		step := app.step
		app.mutex.Unlock()

		WriteJSON(w, http.StatusOK, map[string]any{
			"running":  running,
			"activity": activity,
			"step":     step,
		})
	})

	r.Get("/api/version", func(w http.ResponseWriter, r *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]string{"version": AppVersion})
	})
}

func RegisterSchedulerHandlers(r chi.Router, app *App) {
	r.Get("/api/schedules", func(w http.ResponseWriter, r *http.Request) {
		app.scheduleMutex.Lock()
		defer app.scheduleMutex.Unlock()

		var list []*Schedule
		for _, sched := range app.schedules {
			list = append(list, sched)
		}

		WriteJSON(w, http.StatusOK, map[string]any{"schedules": list})
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
			WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid time"})
			return
		}

		// Conflict check
		if conflict := app.CheckScheduleConflict(schedTime, ""); conflict != "" {
			WriteJSON(w, http.StatusConflict, map[string]string{"error": conflict})
			return
		}

		id := uuid.New().String()
		sched := &Schedule{ID: id, Time: schedTime}

		if err := app.AddScheduledJob(sched); err != nil {
			slog.Error("failed to create cron task", "error", err)
			WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		app.scheduleMutex.Lock()
		app.schedules[id] = sched
		app.scheduleMutex.Unlock()

		WriteJSON(w, http.StatusCreated, sched)
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
			WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid time"})
			return
		}

		// Conflict, but allow for updating THIS schedule
		if conflict := app.CheckScheduleConflict(schedTime, scheduleID); conflict != "" {
			WriteJSON(w, http.StatusConflict, map[string]string{"error": conflict})
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

		if err := app.AddScheduledJob(sched); err != nil {
			slog.Error("failed to create cron task", "error", err)
			WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		WriteJSON(w, http.StatusCreated, sched)
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

		WriteJSON(w, http.StatusOK, result)
	})
}
