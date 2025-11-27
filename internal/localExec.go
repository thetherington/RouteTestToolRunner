package internal

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
)

// LocalJobTarget defines a set of CLI commands to be executed locally as a single job.
type LocalJobTarget struct {
	Label        string   // Example: "local", "preflight", etc.
	Commands     []string // Each shell command to execute, sequentially
	isStructured bool     // Whether it has a structured output format
}

type localCmdResults struct {
	output           string
	structuredOutput string
}

// localRunCmd executes all commands in target.Commands locally on the running host,
// in order, appending stdout+stderr for each. If any command fails or if the context is canceled,
// execution stops and the error/output is returned. Activity is reported for each stage.
func localRunCmd(ctx context.Context, app *App, target LocalJobTarget) (*localCmdResults, error) {
	app.SetJobActivity(fmt.Sprintf("Preparing to run local commands for %s...", target.Label))

	var (
		combinedOutput strings.Builder
		structOut      string
	)

	for i, cmd := range target.Commands {
		app.SetJobActivity(fmt.Sprintf("Running command %d/%d locally (%s):\n%s",
			i+1, len(target.Commands), target.Label, cmd,
		))

		// Note: split cmd for exec.Command—this lets users do ["bash", "-c", "script.sh"] or just "script.sh"
		var c *exec.Cmd
		if parts := strings.Fields(cmd); len(parts) > 1 {
			c = exec.CommandContext(ctx, parts[0], parts[1:]...)
		} else {
			c = exec.CommandContext(ctx, cmd)
		}

		var outBuf, errBuf bytes.Buffer
		c.Stdout = &outBuf
		c.Stderr = &errBuf

		err := c.Start()
		if err != nil {
			combinedOutput.WriteString(fmt.Sprintf(
				"Failed to start command: %q\nError: %v\n", cmd, err,
			))

			return &localCmdResults{output: combinedOutput.String()}, err
		}

		// Wait for completion or cancel/context done
		waitDone := make(chan error, 1)
		go func() { waitDone <- c.Wait() }()

		select {
		case <-ctx.Done():
			fmt.Println("canceled")
			app.SetJobActivity(fmt.Sprintf("Cancelling local command: %s", cmd))

			_ = c.Process.Kill() // Best effort; sends SIGKILL
			<-waitDone

			combinedOutput.WriteString(fmt.Sprintf("[CANCELED] Command: %s\nOutput:\n%s%s\n", cmd, outBuf.String(), errBuf.String()))
			return &localCmdResults{output: combinedOutput.String()}, fmt.Errorf("local job stopped by user")

		case err := <-waitDone:
			// expecting the output to be like JSON or XML
			if target.isStructured {
				combinedOutput.WriteString(fmt.Sprintf("Command: %s\n[Structured Output]\n%s\n", cmd, errBuf.String()))
				structOut = outBuf.String()

			} else {
				combinedOutput.WriteString(fmt.Sprintf("Command: %s\nOutput:\n%s%s\n", cmd, outBuf.String(), errBuf.String()))
			}

			if err != nil {
				combinedOutput.WriteString(fmt.Sprintf("[ERROR] Command failed: %v\n", err))
				return &localCmdResults{output: combinedOutput.String(), structuredOutput: structOut}, err
			}
		}
	}

	return &localCmdResults{output: combinedOutput.String(), structuredOutput: structOut}, nil
}
