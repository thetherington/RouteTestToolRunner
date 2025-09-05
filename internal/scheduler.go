package internal

import (
	"context"
	"time"

	"github.com/go-co-op/gocron/v2"
)

// checkScheduleConflict will return a conflict message if another schedule (other than exceptID) is within 1 minute of schedTime.
func (app *App) checkScheduleConflict(schedTime time.Time, exceptID string) string {
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

func (app *App) addGocronJobForSchedule(sched *Schedule) error {
	app.scheduleMutex.Lock()
	defer app.scheduleMutex.Unlock()
	return app.addGocronJobForScheduleLocked(sched)
}

func (app *App) addGocronJobForScheduleLocked(sched *Schedule) error {
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
	// Acquire lock for one-job-at-a-time
	app.mutex.Lock()
	if app.running {
		app.mutex.Unlock()
		// Optionally: record that the job was skipped due to a conflict
		app.scheduleMutex.Lock()
		app.scheduleResults[scheduleID] = &ScheduleResult{Output: "Job skipped: another job was already running.\n\n"}
		app.schedules[scheduleID].IsPast = true
		app.scheduleMutex.Unlock()
		return
	}

	app.running = true
	_, cancel := context.WithCancel(context.Background())
	app.jobCancel = cancel
	app.mutex.Unlock()

	defer func() {
		app.mutex.Lock()
		app.running = false
		app.jobCancel = nil
		app.activeSession = nil
		app.jobActivity = "Idle"
		app.mutex.Unlock()
	}()

	// ---- Run your SSH jobs (multi-command logic, etc.)
	// result := app.RunJob(ctx)
	result := JobResult{SchedulerOutput: "test", SDVNOutput: "test2"}
	time.Sleep(20 * time.Second)

	// Store result for this schedule (even if manually canceled)
	app.scheduleMutex.Lock()
	app.scheduleResults[scheduleID] = &ScheduleResult{Output: result.SchedulerOutput + "\n\n" + result.SDVNOutput + "\n" + result.Error}
	app.schedules[scheduleID].IsPast = true
	app.scheduleMutex.Unlock()
}
