package main

import (
	"flag"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/lmittmann/tint"
	"github.com/thetherington/RouteTestTool/internal"
)

// Version will be set at build time via -ldflags "-X main.Version=..."
var (
	Version string = "Dev"
	Commit  string
	Date    string
	BuiltBy string
)

// --- ASCII Banner ---
var banner = `
  ____             _         _____        _     _____           _ 
 |  _ \ ___  _   _| |_ ___  |_   _|__ ___| |_  |_   _|__   ___ | |
 | |_) / _ \| | | | __/ _ \   | |/ _ Y __| __|   | |/ _ \ / _ \| |
 |  _ < (_) | |_| | ||  __/   | |  __|__ \ |_    | | (_) | (_) | |
 |_| \_\___/ \__,_|\__\___|   |_|\___|___/\__|   |_|\___/ \___/|_|
                                                                  
`

func main() {
	fmt.Print(banner)

	// use the tint library to set the logging output
	slog.SetDefault(slog.New(
		tint.NewHandler(os.Stderr, &tint.Options{
			Level:      slog.LevelDebug,
			TimeFormat: time.Kitchen,
		}),
	))

	// Command-line flags
	var configPath string
	var port int

	flag.StringVar(&configPath, "config", "config.yaml", "Path to config file (YAML/JSON)")
	flag.IntVar(&port, "port", 8080, "TCP port to listen on")
	flag.Parse()

	// Load config file (Viper)
	fileCfg, err := internal.LoadFileConfig(configPath)
	if err != nil {
		log.Fatalf("Config load error: %v", err)
	}

	// Load SSH credentials from .env and merge them with the file config
	envCfg, err := internal.LoadAppConfig()
	if err != nil {
		log.Fatalf("Error loading SSH credentials from .env: %v", err)
	}

	// Assemble final config struct for application
	appConfig := &internal.AppConfig{
		SchedulerSSH: envCfg.SchedulerSSH,
		SdvnSSH:      envCfg.SdvnSSH,
		File:         fileCfg,
	}

	// Print application version to console
	fmt.Printf("\nApplication Version: %s\n", Version)
	fmt.Printf("Build Date: %s (Commit: %s) By: %s\n\n", Date, Commit, BuiltBy)

	// Pass version to App/handlers via package var (needed for /api/version endpoint)
	internal.AppVersion = Version

	// Initialize the main App with all configs
	app, err := internal.NewApp(appConfig)
	if err != nil {
		log.Fatalf("Failed to initialize application: %v", err)
	}

	addr := fmt.Sprintf(":%d", port)
	log.Printf("Server listening on %s", addr)

	if err := http.ListenAndServe(addr, app.Router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
