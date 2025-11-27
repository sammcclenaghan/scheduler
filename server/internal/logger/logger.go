package logger

import (
	"io"
	"log/slog"
	"os"
)

// New creates a structured JSON logger
func New(w io.Writer) *slog.Logger {
	if w == nil {
		w = os.Stdout
	}
	return slog.New(slog.NewJSONHandler(w, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
}

// Info logs an info-level message with attributes
func Info(logger *slog.Logger, msg string, attrs ...slog.Attr) {
	logger.LogAttrs(nil, slog.LevelInfo, msg, attrs...)
}

// Error logs an error-level message with attributes
func Error(logger *slog.Logger, msg string, err error, attrs ...slog.Attr) {
	if err != nil {
		attrs = append(attrs, slog.Any("error", err))
	}
	logger.LogAttrs(nil, slog.LevelError, msg, attrs...)
}

// Fatal logs and exits
func Fatal(logger *slog.Logger, msg string, err error, attrs ...slog.Attr) {
	Error(logger, msg, err, attrs...)
	os.Exit(1)
}
