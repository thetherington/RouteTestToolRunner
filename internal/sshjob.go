package internal

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"golang.org/x/crypto/ssh"
)

type SSHJobTarget struct {
	Label   string // e.g. "scheduler" or "sdvn"
	IP      string
	User    string
	Pass    string
	Command string
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

	app.setJobActivity(fmt.Sprintf("Running command on %s (%s):\n%s", target.Label, target.IP, target.Command))
	session, err := conn.NewSession()
	if err != nil {
		return "", err
	}
	defer session.Close()

	var outBuf, errBuf bytes.Buffer
	session.Stdout = &outBuf
	session.Stderr = &errBuf

	if err := session.Start(target.Command); err != nil {
		return "", err
	}
	app.setJobActivity(fmt.Sprintf("Receiving output from %s (%s) for command:\n%s", target.Label, target.IP, target.Command))
	err = session.Wait()
	output := outBuf.String() + errBuf.String()

	return output, err
}

// Ensure only one SSH job at a time
func (app *App) RunJob(ctx context.Context) JobResult {
	app.mutex.Lock()

	if app.running {
		app.mutex.Unlock()
		return JobResult{Running: true, Error: "job already running"}
	}

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
		Label:   "scheduler",
		IP:      app.Config.File.Scheduler.IP,
		User:    app.Config.SchedulerSSH.User,
		Pass:    app.Config.SchedulerSSH.Pass,
		Command: app.Config.File.Scheduler.Command,
	}
	schedOut, err := sshRunCmd(ctx, app, schedTarget)
	result.SchedulerOutput = schedOut
	if err != nil {
		result.Error = "Scheduler script error: " + err.Error()
		app.setLastResult(result)
		return result
	}

	// ------- Step 2: Connecting to sdvn
	app.setJobActivity("Preparing to connect to sdvn")
	sdvnTarget := SSHJobTarget{
		Label:   "sdvn",
		IP:      app.Config.File.Sdvn.IP,
		User:    app.Config.SdvnSSH.User,
		Pass:    app.Config.SdvnSSH.Pass,
		Command: app.Config.File.Sdvn.Command,
	}
	sdvnOut, err := sshRunCmd(ctx, app, sdvnTarget)
	result.SDVNOutput = sdvnOut
	if err != nil {
		result.Error = "SDVN script error: " + err.Error()
	}

	app.setLastResult(result)

	return result
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
	app.jobActivity = desc
	app.mutex.Unlock()
}
