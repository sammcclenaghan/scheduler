package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/pressly/goose/v3"

	"github.com/sammcclenaghan/scheduler/db/migrations"
)

type Config struct {
	DSN string
}

// Open connects to the database, verifies the connection, runs migrations,
// and returns the initialized *sql.DB.
func Open(ctx context.Context, cfg Config) (*sql.DB, error) {
	db, err := sql.Open("mysql", cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	ctxPing, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctxPing); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping db: %w", err)
	}

	if err := migrate(db); err != nil {
		_ = db.Close()
		return nil, err
	}

	return db, nil
}

func migrate(db *sql.DB) error {
	goose.SetBaseFS(migrations.Files)

	if err := goose.SetDialect("mysql"); err != nil {
		return fmt.Errorf("set dialect: %w", err)
	}

	if err := goose.Up(db, "db/migrations"); err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	return nil
}


