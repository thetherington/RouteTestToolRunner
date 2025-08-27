package internal

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
)

type SSHJobTarget struct {
	Label    string // e.g. "scheduler" or "sdvn"
	IP       string
	User     string
	Pass     string
	Commands []string
}

func sshRunCmd(ctx context.Context, app *App, target SSHJobTarget) (string, error) {
	app.setJobActivity(fmt.Sprintf("Connecting to %s (%s) via SSH...", target.Label, target.IP))
	config := &ssh.ClientConfig{
		User: target.User,
		Auth: []ssh.AuthMethod{
			ssh.Password(target.Pass),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	conn, err := ssh.Dial("tcp", fmt.Sprintf("%s:22", target.IP), config)
	if err != nil {
		return "", err
	}
	defer conn.Close()

	var combinedOutput string

	for i, cmd := range target.Commands {
		app.setJobActivity(fmt.Sprintf(
			"Running command %d/%d on %s (%s):\n%s",
			i+1, len(target.Commands), target.Label, target.IP, cmd,
		))

		session, err := conn.NewSession()
		if err != nil {
			combinedOutput += fmt.Sprintf("Failed to create session for command %d: %v\n", i+1, err)
			continue
		}

		var outBuf, errBuf bytes.Buffer

		session.Stdout = &outBuf
		session.Stderr = &errBuf

		runErr := session.Run(cmd)

		// Always aggregate output up to and including the error
		combinedOutput += fmt.Sprintf("Command: %s\nOutput:\n%s%s\n", cmd, outBuf.String(), errBuf.String())
		session.Close()

		if runErr != nil {
			// Stop execution on first failure, return early
			combinedOutput += fmt.Sprintf("[ERROR] Command failed: %v\n", runErr)
			return combinedOutput, runErr
		}
	}

	return combinedOutput, nil
}

// Ensure only one SSH job at a time
func (app *App) RunJob(ctx context.Context) JobResult {
	app.mutex.Lock()

	if app.running {
		app.mutex.Unlock()
		return JobResult{Running: true, Error: "job already running"}
	}

	// background job
	go func() {
		app.running = true
		app.jobActivity = "Starting job"
		app.mutex.Unlock()

		defer func() {
			app.mutex.Lock()
			app.running = false
			app.jobActivity = "Idle"
			app.mutex.Unlock()
		}()

		result := JobResult{Running: false}

		// ------- Step 1: Connecting to scheduler
		app.setJobActivity("Preparing to connect to scheduler")
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
			result.Error = "Scheduler script error: " + err.Error()
			slog.Error("Scheduler script", "error", err, "output", schedOut)
			app.setLastResult(result)
			return
		}

		// ------- Step 2: Connecting to sdvn
		app.setJobActivity("Preparing to connect to sdvn")
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
			result.Error = "SDVN script error: " + err.Error()
			slog.Error("SDVN script", "error", err, "output", sdvnOut)
		}

		app.setLastResult(result)
	}()

	return JobResult{Running: true}
}

func (app *App) setLastResult(res JobResult) {
	app.mutex.Lock()
	defer app.mutex.Unlock()

	app.lastResult = res
}

func (app *App) GetLastResult() JobResult {
	app.mutex.Lock()
	defer app.mutex.Unlock()

	result := app.lastResult
	result.Running = app.running

	return result
}

// Helper for safe activity update
func (app *App) setJobActivity(desc string) {
	app.mutex.Lock()

	slog.Info(strings.ReplaceAll(desc, "\n", ""))
	app.jobActivity = desc

	app.mutex.Unlock()
}
