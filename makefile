# Makefile for SSH Web Job Runner
BINARY=RouteTestTool
MAIN=cmd/main.go

VERSION ?= dev
CONFIG ?= config.yaml
PORT ?= 8080

.PHONY: all build run clean

all: build

build:
	go build -ldflags "-X 'main.Version=$(VERSION)'" -o $(BINARY) $(MAIN)

run: build
	@CONFIG_OPT="-config=$(CONFIG)"; \
	PORT_OPT="-port=$(PORT)"; \
	./$(BINARY) [CONFIG_OPT] PORT_OPT

clean:
	rm -rf BINARY