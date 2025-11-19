package internal

import (
	"encoding/json"
	"log/slog"
	"strings"
	"text/template"
)

type Source struct {
	Value     string `json:"value,omitempty"`
	Multicast string `json:"multicast,omitempty"`
}

type Destinations struct {
	Value string   `json:"value,omitempty"`
	Dst   int      `json:"dst,omitempty"`
	Slabs []string `json:"slabs,omitempty"`
}

type ExtendedOptions struct {
	Source       *Source        `json:"source,omitempty"`
	Destinations []Destinations `json:"destinations,omitempty"`
}

type Route struct {
	Eng   string   `json:"eng"`
	Dst   int      `json:"dst"`
	Slabs []string `json:"slabs"`
}

type RouteMap = map[string]Route

type DataSlice = map[string]any

func NewDataSlice() DataSlice {
	return map[string]any{
		"ScheduleTime": nil,
		"Source":       nil,
		"Destinations": []string{},
		"Multicast":    nil,
		"RouteMapData": nil,
	}
}

// normalizeTemplateCmd removes newlines and tabs for readability prior to parsing.
func normalizeTemplateCmd(cmd string) string {
	// Replace all newline characters (\n)
	cmd = strings.ReplaceAll(cmd, "\n", "")

	// Remove all tab characters (\t)
	cmd = strings.ReplaceAll(cmd, "\t", "")

	return cmd
}

// renderTemplate parses and executes a text/template with missingkey=zero.
func renderTemplate(cmd string, data map[string]any) (string, error) {
	cmd = normalizeTemplateCmd(cmd)

	tmpl, err := template.New("cli").Option("missingkey=zero").Parse(cmd)
	if err != nil {
		return "", err
	}

	b := new(strings.Builder)
	if err := tmpl.Execute(b, data); err != nil {
		return "", err
	}

	return b.String(), nil
}

func renderCommandTemplate(cmd string, time string, options *ExtendedOptions) (string, error) {
	var data = NewDataSlice()

	data["ScheduleTime"] = time

	if options != nil {
		if options.Source != nil && options.Source.Value != "" {
			data["Source"] = options.Source.Value
		}

		if options.Source != nil && options.Source.Multicast != "" {
			data["Multicast"] = options.Source.Multicast
		}

		var (
			dests    []string
			routemap = make(RouteMap)
		)

		for _, d := range options.Destinations {
			dests = append(dests, d.Value)

			routemap[d.Value] = Route{
				Eng:   d.Value,
				Dst:   d.Dst,
				Slabs: d.Slabs,
			}
		}

		data["Destinations"] = dests

		if len(dests) > 0 {
			b, _ := json.Marshal(routemap)
			data["RouteMapData"] = string(b)
		}
	}

	out, err := renderTemplate(cmd, data)
	if err != nil {
		return "", err
	}

	// fmt.Printf("Rendered command: %s\n", out)
	return out, nil
}

func clearCommandTemplateKeys(cmd string) string {
	// keep behavior simple: return normalized/rendered string, fall back to normalized if parsing fails
	out, err := renderTemplate(cmd, NewDataSlice())
	if err != nil {
		return normalizeTemplateCmd(cmd)
	}
	return out
}

type renderAllOptionArgs struct {
	time            string
	extendedOptions *ExtendedOptions
}

// renderAllCommandSlices renders all command slices (Scheduler, SDVN, Slab) with the given time and options
// If options is nil, it clears any unreplaced template keys instead.
func renderAllCommandSlices(cfg *FileConfig, options *renderAllOptionArgs) error {
	commandSlices := []*[]string{
		&cfg.Scheduler.Commands,
		&cfg.Sdvn.Commands,
		&cfg.Slab.Commands,
	}

	for _, cmds := range commandSlices {
		for i, cmd := range *cmds {
			if options != nil {
				c, err := renderCommandTemplate(cmd, options.time, options.extendedOptions)
				if err != nil {
					slog.Error("failed to render cli template", "error", err)
					return err
				}

				(*cmds)[i] = c
			} else {
				(*cmds)[i] = clearCommandTemplateKeys(cmd)
			}
		}
	}

	return nil
}
