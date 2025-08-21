package internal

import (
	"embed"
	"net/http"

	"github.com/go-chi/chi/v5"
)

//go:embed web/*
var webFiles embed.FS

func RegisterFrontend(r chi.Router) {
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		data, _ := webFiles.ReadFile("web/index.html")
		w.Header().Set("Content-Type", "text/html")
		w.Write(data)
	})

	r.Get("/main.js", func(w http.ResponseWriter, r *http.Request) {
		data, _ := webFiles.ReadFile("web/main.js")
		w.Header().Set("Content-Type", "application/javascript")
		w.Write(data)
	})

	r.Get("/style.css", func(w http.ResponseWriter, r *http.Request) {
		data, _ := webFiles.ReadFile("web/style.css")
		w.Header().Set("Content-Type", "text/css")
		w.Write(data)
	})
}
