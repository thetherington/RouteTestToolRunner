package internal

import (
	"bytes"
	"context"
	"fmt"
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

// sshRunCmd executes one or more shell commands on a remote host via SSH,
// updating the app's job activity status for each phase. For every command in target.Commands,
// it opens a new SSH session, updates activity, and runs the command, appending the full output
// (stdout and stderr) to a combined result string.
// If any command fails or if the provided context is canceled (such as by a user-initiated stop),
// execution halts immediately: the current SSH session is closed, partial output is returned,
// and an error is propagated upstream.
// This function ensures thread-safe setting and clearing of the app's active session pointer
// for robust interruption and status UX feedback.
// Returns the complete aggregated output for all completed commands and an error if the job was stopped
// or a command failed.
func sshRunCmd(ctx context.Context, app *App, target SSHJobTarget) (string, error) {
	app.SetJobActivity(fmt.Sprintf("Connecting to %s (%s) via SSH...", target.Label, target.IP))
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
		app.SetJobActivity(fmt.Sprintf(
			"Running command %d/%d on %s (%s):\n%s",
			i+1, len(target.Commands), target.Label, target.IP, cmd,
		))

		session, err := conn.NewSession()
		if err != nil {
			combinedOutput += fmt.Sprintf("Failed to create session for command %d: %v\n", i+1, err)
			return combinedOutput, err
		}

		app.setActiveSession(session) // <-- new helper, thread-safe field set

		var outBuf, errBuf bytes.Buffer

		session.Stdout = &outBuf
		session.Stderr = &errBuf

		done := make(chan struct{})
		var runErr error

		// run the command in the background
		go func() {
			defer close(done)
			runErr = session.Run(cmd)
		}()

		// check if the stop button is clicked / done channel is closed
		select {
		case <-ctx.Done():
			// Job was canceled by user
			<-done // wait for the run goroutine to finish

			combinedOutput += fmt.Sprintf("[CANCELED] Command: %s\nOutput:\n%s%s\n", cmd, outBuf.String(), errBuf.String())
			app.clearActiveSession()

			return combinedOutput, fmt.Errorf("job stopped by user")

		case <-done:
			app.clearActiveSession()

			combinedOutput += fmt.Sprintf("Command: %s\nOutput:\n%s%s\n", cmd, outBuf.String(), errBuf.String())
			if runErr != nil {
				combinedOutput += fmt.Sprintf("[ERROR] Command failed: %v\n", runErr)
				return combinedOutput, runErr
			}
		}

		session.Close()
	}

	return combinedOutput, nil
}

// RunJob is the primary job orchestration method, launched by the REST API to execute a full job.
// It ensures job serialization with a mutex, then starts a cancelable context for use by SSH execution
// (allowing for safe interruption/stopping).
// This function runs all scheduler host commands in order (via sshRunCmd); if and only if they all succeed,
// it then runs all sdvn commands.
// At every important step it updates the job's activity/status string for real-time user feedback.
// If the job is canceled (via StopJob), or a command fails, execution stops immediately, cleanup is performed,
// and an appropriate error and all partial output are returned and surfaced to the frontend.
// Always resets internal cancel func, clears the session pointer, and updates activity and state on completion or stop.
func (app *App) RunJob(ctx context.Context) JobResult {
	app.mutex.Lock()

	if app.running {
		app.mutex.Unlock()
		return JobResult{Running: true, Error: "job already running"}
	}

	// background routine to run the job
	go func() {
		defer app.ResetApp()

		app.running = true
		app.jobActivity = "Starting job"

		// Set up cancelable context for this job
		ctx, cancel := context.WithCancel(ctx)
		app.jobCancel = cancel

		app.mutex.Unlock()

		app.SetLastResult(app.ExecuteRunnerTasks(ctx, Manual))
	}()

	return JobResult{Running: true}
}

// StopJob allows a running job to be forcibly stopped, either via API or UI action.
// It acquires the mutex, sets the cancellation function if present (signaling all context-aware routines to stop),
// and if an SSH session is currently active, closes the session to immediately interrupt any in-progress remote command.
// The activity string is updated to reflect user intervention, and all related fields are safely cleaned up when the job exits.
// Returns an error if no job was running, otherwise nil.
func (app *App) StopJob() error {
	app.mutex.Lock()
	defer app.mutex.Unlock()

	if !app.running {
		return fmt.Errorf("no job running")
	}

	if app.activeSession != nil {
		app.activeSession.Signal(ssh.SIGINT)
		go app.activeSession.Close()
	}

	if app.jobCancel != nil {
		app.jobCancel()
	}

	app.jobActivity = "Stopped by user"

	return nil
}

func (app *App) setActiveSession(s *ssh.Session) {
	app.mutex.Lock()
	app.activeSession = s
	app.mutex.Unlock()
}

func (app *App) clearActiveSession() {
	app.mutex.Lock()
	app.activeSession = nil
	app.mutex.Unlock()
}
