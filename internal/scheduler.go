package internal

import (
	"context"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron/v2"
)

type Schedule struct {
	ID        string    `json:"id"`
	Time      time.Time `json:"time"`
	IsPast    bool      `json:"isPast,omitempty"`
	HasError  bool      `json:"hasError"`
	IsRunning bool      `json:"isRunning"`
}

type ScheduleResult struct {
	Output  string  `json:"output"`
	RunType RunType `json:"RunType"`
}

// checkScheduleConflict will return a conflict message if another schedule (other than exceptID) is within 5 minute of schedTime.
func (app *App) CheckScheduleConflict(schedTime time.Time, exceptID string) string {
	const conflictWindow = time.Minute * 5

	app.scheduleMutex.Lock()
	defer app.scheduleMutex.Unlock()

	for id, s := range app.schedules {
		if id == exceptID {
			continue
		}

		dt := s.Time.Sub(schedTime)
		if dt < 0 {
			dt = -dt
		}

		if dt < conflictWindow {
			return "Schedule conflicts with an existing job"
		}
	}

	return ""
}

// Adds a scheduled job with Gocron
func (app *App) AddScheduledJob(sched *Schedule) error {
	app.scheduleMutex.Lock()
	defer app.scheduleMutex.Unlock()

	// Remove existing job for this ID, if present
	if job, ok := app.scheduleJobs[sched.ID]; ok {
		app.scheduler.RemoveJob(job.ID())
	}

	// Defensive: ensure future time; in real app, also check that time is not past
	job, err := app.scheduler.NewJob(
		gocron.OneTimeJob(gocron.OneTimeJobStartDateTime(sched.Time)),
		gocron.NewTask(func() {
			app.runScheduledJob(sched.ID)
		}),
	)
	if err != nil {
		return err
	}

	app.scheduleJobs[sched.ID] = job

	return nil
}

// Called by gocron callback for this schedule
func (app *App) runScheduledJob(scheduleID string) {
	slog.Info("Running Job Schedule", "id", scheduleID)

	// Acquire lock for one-job-at-a-time
	app.mutex.Lock()
	if app.running {
		app.mutex.Unlock()

		// Optionally: record that the job was skipped due to a conflict
		app.scheduleMutex.Lock()
		app.scheduleResults[scheduleID] = &ScheduleResult{Output: "Job skipped: another job was already running.\n\n", RunType: Scheduled}
		app.schedules[scheduleID].IsPast = true
		app.schedules[scheduleID].HasError = true
		app.scheduleMutex.Unlock()

		slog.Error("Schedule Job skipped another job was already running", "id", scheduleID)
		return
	}

	app.running = true
	ctx, cancel := context.WithCancel(context.Background())
	app.jobCancel = cancel
	app.mutex.Unlock()

	// defer resetting of the app state
	defer func() {
		app.ResetApp()
		app.schedules[scheduleID].IsRunning = false
	}()

	app.schedules[scheduleID].IsRunning = true

	// ---- Execute the Tasks
	result := app.ExecuteRunnerTasks(ctx, Scheduled)

	// Store result for this schedule (even if manually canceled)
	app.scheduleMutex.Lock()
	app.scheduleResults[scheduleID] = &ScheduleResult{
		Output:  result.SchedulerOutput + "\n\n" + result.SDVNOutput + "\n" + result.Error,
		RunType: Scheduled,
	}
	app.schedules[scheduleID].IsPast = true
	app.schedules[scheduleID].HasError = result.Error != ""
	app.scheduleMutex.Unlock()

	// Set the last result
	app.SetLastResult(result)
}
