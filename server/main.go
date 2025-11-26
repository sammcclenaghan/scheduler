package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/sammcclenaghan/scheduler/db"
	"github.com/sammcclenaghan/scheduler/internal/database"
	"github.com/sammcclenaghan/scheduler/internal/handlers"
)

type Server struct {
	Router  *chi.Mux
	Queries *db.Queries
}

func CreateNewServer(queries *db.Queries) *Server {
	s := &Server{
		Router:  chi.NewRouter(),
		Queries: queries,
	}
	return s
}

func (s *Server) MountHandlers() {
	// Mount all middleware here
	s.Router.Use(middleware.Logger)

	// Mount all handlers here
	s.Router.Get("/v1/healthcheck", handlers.Healthcheck())
	s.Router.Get("/api/courses/{id}", handlers.GetCourse(s.Queries))
}

func main() {
	ctx := context.Background()

	// Connect to database
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "scheduler.db"
	}

	sqlDB, err := database.Open(ctx, database.Config{DSN: dbURL})
	if err != nil {
		log.Fatalf("database init failed: %v", err)
	}
	defer sqlDB.Close()

	queries := db.New(sqlDB)

	s := CreateNewServer(queries)
	s.MountHandlers()

	srv := &http.Server{
		Addr:    ":4000",
		Handler: s.Router,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	// Runs the server in a goroutine
	go func() {
		fmt.Println("Server started at :4000")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("Could not listen on port 4000: %v\n", err)
		}
	}()

	<-stop

	fmt.Println("Shutting down server...")

	ctxShutdown, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctxShutdown); err != nil {
		fmt.Printf("Server shutdown failed: %v\n", err)
	}
}
