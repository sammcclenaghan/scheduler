package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/sammcclenaghan/scheduler/db"
)

type CourseGetter interface {
	GetCourse(ctx context.Context, id int64) (db.Course, error)
}

type CourseBySubjectCodeGetter interface {
	GetCourseBySubjectCode(ctx context.Context, arg db.GetCourseBySubjectCodeParams) (db.Course, error)
}

type CourseSearcher interface {
	SearchCoursesBySubjectCode(ctx context.Context, arg db.SearchCoursesBySubjectCodeParams) ([]db.Course, error)
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

		courses, err := store.SearchCoursesBySubjectCode(r.Context(), db.SearchCoursesBySubjectCodeParams{
			Column1: &query,
			REPLACE: query,
		})
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

func GetCourseBySubjectCode(store CourseBySubjectCodeGetter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		subjectCode := chi.URLParam(r, "subjectCode")
		if subjectCode == "" {
			http.Error(w, "missing subjectCode parameter", http.StatusBadRequest)
			return
		}

		course, err := store.GetCourseBySubjectCode(r.Context(), db.GetCourseBySubjectCodeParams{
			SubjectCode: subjectCode,
			REPLACE:     subjectCode,
		})
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				http.Error(w, "course not found", http.StatusNotFound)
				return
			}

			http.Error(w, "failed to fetch course", http.StatusInternalServerError)
			return
		}
		log.Printf("course: %+v", course)

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(course); err != nil {
			http.Error(w, "failed to encode response", http.StatusInternalServerError)
			return
		}
	}
}
