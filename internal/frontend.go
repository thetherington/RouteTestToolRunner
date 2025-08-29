package internal

import (
	"bytes"
	"embed"
	"io"
	"io/fs"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
)

//go:embed web/*
var webFiles embed.FS

func RegisterFrontend(r chi.Router) {
	// 1. Strip "web/" prefix to get file roots as served by Vite build
	static, _ := fs.Sub(webFiles, "web")

	// 2. Serve static assets (js, css, images, assets, etc.)
	r.Handle("/*", http.FileServer(http.FS(static)))

	// 2. SPA fallback: If no asset found (and not an asset extension), serve index.html
	r.NotFound(func(w http.ResponseWriter, req *http.Request) {
		path := req.URL.Path
		if strings.Contains(path, ".") {
			// Looks like a static asset (e.g., /foo.js) -- 404
			http.NotFound(w, req)
			return
		}

		file, err := static.Open("index.html")
		if err != nil {
			http.Error(w, "index.html not found", http.StatusInternalServerError)
			return
		}
		defer file.Close()

		info, _ := file.Stat()

		// Read the full index.html into memory
		buf, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, "could not read index.html", http.StatusInternalServerError)
			return
		}

		reader := bytes.NewReader(buf)

		// Serve with correct headers
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		http.ServeContent(w, req, "index.html", info.ModTime(), reader)
	})
}
