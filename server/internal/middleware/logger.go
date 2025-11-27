package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

// Logger returns a chi middleware that logs HTTP requests with slog
func Logger(logger *slog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			t1 := time.Now()
			next.ServeHTTP(ww, r)
			t2 := time.Since(t1)

			logger.LogAttrs(context.TODO(), slog.LevelInfo, "request",
				slog.String("method", r.Method),
				slog.String("path", r.RequestURI),
				slog.Int("status", ww.Status()),
				slog.Duration("duration_ms", t2),
				slog.Int("bytes", ww.BytesWritten()),
			)
		})
	}
}
