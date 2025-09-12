package internal

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

type HostSSHConfig struct {
	User string
	Pass string
}

type HostConfig struct {
	IP       string   `mapstructure:"ip"`
	Commands []string `mapstructure:"commands"`
}

type LocalConfig struct {
	Commands []string `mapstructure:"commands"`
}

type FileConfig struct {
	Scheduler HostConfig  `mapstructure:"scheduler"`
	Sdvn      HostConfig  `mapstructure:"sdvn"`
	Slab      LocalConfig `mapstructure:"slab"`
}

// AppConfig merges .env-based SSH credentials and file config.
type AppConfig struct {
	SchedulerSSH HostSSHConfig
	SdvnSSH      HostSSHConfig
	File         FileConfig
}

// Loads both credential sets from the .env file
func LoadSSHCredentials() (*AppConfig, error) {
	_ = godotenv.Load(".env")

	schedulerUser := os.Getenv("SCHEDULER_SSH_USER")
	schedulerPass := os.Getenv("SCHEDULER_SSH_PASS")

	sdvnUser := os.Getenv("SDVN_SSH_USER")
	sdvnPass := os.Getenv("SDVN_SSH_PASS")

	if schedulerUser == "" || schedulerPass == "" {
		return nil, fmt.Errorf("SCHEDULER_SSH_USER or SCHEDULER_SSH_PASS not set in .env")
	}
	if sdvnUser == "" || sdvnPass == "" {
		return nil, fmt.Errorf("SDVN_SSH_USER or SDVN_SSH_PASS not set in .env")
	}

	return &AppConfig{
		SchedulerSSH: HostSSHConfig{User: schedulerUser, Pass: schedulerPass},
		SdvnSSH:      HostSSHConfig{User: sdvnUser, Pass: sdvnPass},
	}, nil
}

// Loads FileConfig from config.yaml (or config.json, etc)
func LoadFileConfig(configPath string) (FileConfig, error) {
	var cfg FileConfig

	v := viper.New()
	v.SetConfigFile(configPath) // e.g., "./config.yaml"

	if err := v.ReadInConfig(); err != nil {
		return cfg, fmt.Errorf("error reading config: %w", err)
	}

	if err := v.Unmarshal(&cfg); err != nil {
		return cfg, fmt.Errorf("error parsing config: %w", err)
	}

	return cfg, nil
}
