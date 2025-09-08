package internal

import (
	"encoding/json"
)

// RunType is a small enum
type RunType int

const (
	Manual RunType = iota
	Scheduled
)

var runTypeName = map[RunType]string{
	Manual:    "manual",
	Scheduled: "scheduled",
}

func (rt RunType) String() string {
	return runTypeName[rt]
}

func (rt RunType) MarshalJSON() ([]byte, error) {
	return json.Marshal(runTypeName[rt])
}
