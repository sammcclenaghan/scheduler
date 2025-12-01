package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

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
	SearchCoursesBySubjectCodeAndTerm(ctx context.Context, arg db.SearchCoursesBySubjectCodeAndTermParams) ([]db.Course, error)
}

type CourseWithDefaultSections struct {
	Course          db.Course    `json:"course"`
	DefaultSections []db.Section `json:"defaultSections"`
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

func SearchCourses(courseStore CourseSearcher, sectionStore SectionsLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		if query == "" {
			http.Error(w, "missing q parameter", http.StatusBadRequest)
			return
		}

		term := r.URL.Query().Get("term")

		var courses []db.Course
		var err error

		if term != "" {
			// Filter courses by term (only courses with sections in the given term)
			courses, err = courseStore.SearchCoursesBySubjectCodeAndTerm(r.Context(), db.SearchCoursesBySubjectCodeAndTermParams{
				Column1: &query,
				REPLACE: query,
				Term:    term,
			})
		} else {
			// Return all matching courses regardless of term
			courses, err = courseStore.SearchCoursesBySubjectCode(r.Context(), db.SearchCoursesBySubjectCodeParams{
				Column1: &query,
				REPLACE: query,
			})
		}

		if err != nil {
			http.Error(w, "failed to search courses", http.StatusInternalServerError)
			return
		}

		// Enrich courses with default sections
		coursesWithDefaults := make([]CourseWithDefaultSections, 0, len(courses))
		for _, course := range courses {
			var sections []db.Section
			if term != "" {
				sections, err = sectionStore.ListSectionsByCourseAndTerm(r.Context(), db.ListSectionsByCourseAndTermParams{
					CoursePid: &course.Pid,
					Term:      term,
				})
			} else {
				sections, err = sectionStore.ListSectionsByCourse(r.Context(), &course.Pid)
			}

			if err != nil {
				http.Error(w, "failed to fetch sections", http.StatusInternalServerError)
				return
			}

			// Group sections by type and select defaults
			grouped := make(map[string][]db.Section)
			grouped["lectures"] = []db.Section{}
			grouped["labs"] = []db.Section{}
			grouped["tutorials"] = []db.Section{}
			grouped["other"] = []db.Section{}

			for _, sec := range sections {
				switch strings.ToLower(sec.ScheduleType) {
				case "lecture":
					grouped["lectures"] = append(grouped["lectures"], sec)
				case "lab":
					grouped["labs"] = append(grouped["labs"], sec)
				case "tutorial":
					grouped["tutorials"] = append(grouped["tutorials"], sec)
				default:
					grouped["other"] = append(grouped["other"], sec)
				}
			}

			// Get default sections (first lecture, first lab, first tutorial)
			defaults := []db.Section{}
			if len(grouped["lectures"]) > 0 {
				defaults = append(defaults, grouped["lectures"][0])
			}
			if len(grouped["labs"]) > 0 {
				defaults = append(defaults, grouped["labs"][0])
			}
			if len(grouped["tutorials"]) > 0 {
				defaults = append(defaults, grouped["tutorials"][0])
			}

			coursesWithDefaults = append(coursesWithDefaults, CourseWithDefaultSections{
				Course:          course,
				DefaultSections: defaults,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(coursesWithDefaults); err != nil {
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
