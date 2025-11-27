package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/sammcclenaghan/scheduler/db"
	"github.com/sammcclenaghan/scheduler/internal/database"
	"github.com/sammcclenaghan/scheduler/internal/handlers"
	"github.com/sammcclenaghan/scheduler/internal/logger"
	"github.com/sammcclenaghan/scheduler/internal/middleware"
)

type Server struct {
	Router  *chi.Mux
	Queries *db.Queries
	Logger  *slog.Logger
}

func CreateNewServer(queries *db.Queries, log *slog.Logger) *Server {
	s := &Server{
		Router:  chi.NewRouter(),
		Queries: queries,
		Logger:  log,
	}
	return s
}

func (s *Server) MountHandlers() {
	// Mount all middleware here
	s.Router.Use(middleware.Logger(s.Logger))

	// Mount all handlers here
	s.Router.Get("/api/healthcheck", handlers.Healthcheck())
	s.Router.Get("/api/courses/{id}", handlers.GetCourse(s.Queries))
}

func main() {
	ctx := context.Background()
	log := logger.New(os.Stdout)

	// Connect to database
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "scheduler.db"
	}

	sqlDB, err := database.Open(ctx, database.Config{DSN: dbURL})
	if err != nil {
		logger.Fatal(log, "database init failed", err)
	}
	defer sqlDB.Close()

	queries := db.New(sqlDB)

	s := CreateNewServer(queries, log)
	s.MountHandlers()

	srv := &http.Server{
		Addr:    ":4000",
		Handler: s.Router,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	// Runs the server in a goroutine
	go func() {
		logger.Info(log, "server starting", slog.String("addr", ":4000"))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error(log, "listen failed", err, slog.String("port", "4000"))
		}
	}()

	<-stop

	logger.Info(log, "shutting down server")

	ctxShutdown, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctxShutdown); err != nil {
		logger.Error(log, "shutdown failed", err)
	}
}
