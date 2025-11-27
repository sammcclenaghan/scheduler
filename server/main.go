package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
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
	s.Router.Get("/api/sections/{pid}", handlers.ListSectionsByPID(s.Queries))
	s.Router.Get("/api/sections/{pid}/{term}", handlers.ListSectionsByPID(s.Queries))
}

func main() {
	seed := flag.Bool("seed", false, "seed the database with courses")
	flag.Parse()

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

	if *seed {
		if err := seedDatabase(ctx, queries, log); err != nil {
			logger.Fatal(log, "seeding failed", err)
		}
		logger.Info(log, "seeding completed successfully")
		return
	}

	s := CreateNewServer(queries, log)
	s.MountHandlers()

	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: s.Router,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	// Runs the server in a goroutine
	go func() {
		logger.Info(log, "server starting", slog.String("addr", ":"+port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error(log, "listen failed", err, slog.String("port", port))
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

type CourseJSON struct {
	CourseID string `json:"courseID"`
	Pid      string `json:"pid"`
	Title    string `json:"title"`
}

func seedDatabase(ctx context.Context, q *db.Queries, log *slog.Logger) error {
	logger.Info(log, "starting database seeding")

	// Try multiple locations for courses.json
	paths := []string{"courses.json", "/courses.json", "../courses.json"}
	var file *os.File
	var err error

	for _, p := range paths {
		file, err = os.Open(p)
		if err == nil {
			logger.Info(log, "found courses.json", slog.String("path", p))
			break
		}
	}

	if file == nil {
		return fmt.Errorf("could not find courses.json: %w", err)
	}
	defer file.Close()

	var courses []CourseJSON
	if err := json.NewDecoder(file).Decode(&courses); err != nil {
		return fmt.Errorf("failed to decode courses.json: %w", err)
	}

	logger.Info(log, "found courses to seed", slog.Int("count", len(courses)))

	for _, c := range courses {
		err := q.UpsertCourse(ctx, db.UpsertCourseParams{
			Title:              c.Title,
			Pid:                c.Pid,
			SubjectCode:        c.CourseID,
			Description:        "",
			Credits:            "",
			HoursCatalogText:   "",
			Notes:              "",
			PreAndCorequisites: "",
		})
		if err != nil {
			return fmt.Errorf("failed to upsert course %s: %w", c.Pid, err)
		}
	}

	return nil
}
