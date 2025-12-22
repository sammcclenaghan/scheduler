.PHONY: test test-short test-integration lint fmt vet build dev sqlc migrate seed up down clean help

# Default target
help:
	@echo "Available targets:"
	@echo "  test             - Run all tests"
	@echo "  test-short       - Run unit tests only (skip integration)"
	@echo "  test-integration - Run integration tests only"
	@echo "  lint             - Run all linting checks"
	@echo "  fmt              - Format Go code"
	@echo "  vet              - Run go vet"
	@echo "  build            - Build all binaries"
	@echo "  dev              - Run server in development mode"
	@echo "  sqlc             - Generate sqlc code"
	@echo "  migrate          - Run database migrations"
	@echo "  seed             - Seed the database"
	@echo "  up               - Start docker compose"
	@echo "  down             - Stop docker compose"
	@echo "  clean            - Clean build artifacts"

# Testing
test:
	cd server && go test -v ./...

test-short:
	cd server && go test -short -v ./...

test-integration:
	cd server && go test -v -run Integration ./...

# Linting
lint: fmt vet

fmt:
	cd server && gofmt -w .

vet:
	cd server && go vet ./...

# Building
build:
	cd server && CGO_ENABLED=1 go build -o bin/scheduler .
	cd server && CGO_ENABLED=1 go build -o bin/seeder ./cmd/seeder
	cd server && CGO_ENABLED=1 go build -o bin/scraper ./cmd/scraper

# Development
dev:
	cd server && go run main.go

sqlc:
	cd server && sqlc generate

migrate:
	cd server && goose -dir db/migrations sqlite3 scheduler.db up

migrate-down:
	cd server && goose -dir db/migrations sqlite3 scheduler.db down

seed:
	cd server && go run ./cmd/seeder -db=scheduler.db -data=../data

# Scraper commands
scrape-course:
	@echo "Usage: make scrape-course PID=<pid>"
	@test -n "$(PID)" && cd server && go run ./cmd/scraper -cmd=fetch-course -pid=$(PID)

scrape-section:
	@echo "Usage: make scrape-section SUBJECT=CSC NUMBER=111 TERM=202501"
	@cd server && go run ./cmd/scraper -cmd=fetch-section -subject=$(SUBJECT) -number=$(NUMBER) -term=$(TERM)

# Docker
up:
	docker compose up --build

down:
	docker compose down

# Cleanup
clean:
	rm -rf server/bin/
	rm -f server/scheduler server/seeder server/scraper
