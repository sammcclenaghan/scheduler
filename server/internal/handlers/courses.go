package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/sammcclenaghan/scheduler/db"
)

type CourseGetter interface {
	GetCourse(ctx context.Context, id int64) (db.Course, error)
}

type CourseSearcher interface {
	SearchCoursesBySubjectCode(ctx context.Context, subjectCode *string) ([]db.Course, error)
}

func GetCourse(store CourseGetter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "id")
		if idParam == "" {
			http.Error(w, "missing id parameter", http.StatusBadRequest)
			return
		}

		id, err := strconv.ParseInt(idParam, 10, 64)
		if err != nil {
			http.Error(w, "invalid id parameter", http.StatusBadRequest)
			return
		}

		course, err := store.GetCourse(r.Context(), id)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				http.Error(w, "course not found", http.StatusNotFound)
				return
			}

			http.Error(w, "failed to fetch course", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(course); err != nil {
			// If we fail to encode, there isn't much we can do besides return 500.
			http.Error(w, "failed to encode response", http.StatusInternalServerError)
			return
		}
	}
}

func SearchCourses(store CourseSearcher) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		if query == "" {
			http.Error(w, "missing q parameter", http.StatusBadRequest)
			return
		}

		courses, err := store.SearchCoursesBySubjectCode(r.Context(), &query)
		if err != nil {
			http.Error(w, "failed to search courses", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(courses); err != nil {
			http.Error(w, "failed to encode response", http.StatusInternalServerError)
			return
		}
	}
}
