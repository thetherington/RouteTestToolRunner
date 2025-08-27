# Makefile for SSH Web Job Runner
BINARY=RouteTestToolRunner
MAIN=cmd/main.go

VERSION ?= dev
TODAY_DATE := $(shell date +%Y-%m-%d)
CONFIG ?=
PORT ?=
ARGS ?=

.PHONY: all build run release clean

all: build

build:
	go build -ldflags "-X 'main.Version=$(VERSION)' -X 'main.Date=$(TODAY_DATE)' -X 'main.BuiltBy=makefile'" -o $(BINARY) $(MAIN)

run: build
	@CMD="./$(BINARY)"; \
	if [ -n "$(CONFIG)" ]; then CMD="$$CMD -config=$(CONFIG)"; fi; \
	if [ -n "$(PORT)" ]; then CMD="$$CMD -port=$(PORT)"; fi; \
	if [ -n "$(ARGS)" ]; then CMD="$$CMD $(ARGS)"; fi; \
	echo "Running: $$CMD"; \
	$$CMD

release:
	goreleaser release --snapshot

clean:
	rm -rf ${BINARY}
	rm -rf dist