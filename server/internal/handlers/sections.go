package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/sammcclenaghan/scheduler/db"
)

type SectionsLister interface {
	ListSectionsByCourseAndTerm(ctx context.Context, arg db.ListSectionsByCourseAndTermParams) ([]db.Section, error)
	ListSectionsByCourse(ctx context.Context, coursePid sql.NullString) ([]db.Section, error)
}

type GroupedSections struct {
	Sections map[string][]db.Section `json:"sections"`
}

func ListSectionsByPID(store SectionsLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		pid := chi.URLParam(r, "pid")
		term := chi.URLParam(r, "term")

		if pid == "" {
			http.Error(w, "missing pid parameter", http.StatusBadRequest)
			return
		}

		var sections []db.Section
		var err error

		if term != "" {
			sections, err = store.ListSectionsByCourseAndTerm(r.Context(), db.ListSectionsByCourseAndTermParams{
				CoursePid: sql.NullString{String: pid, Valid: true},
				Term:      term,
			})
		} else {
			sections, err = store.ListSectionsByCourse(r.Context(), sql.NullString{String: pid, Valid: true})
		}

		if err != nil {
			http.Error(w, "failed to fetch sections", http.StatusInternalServerError)
			return
		}

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

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(GroupedSections{Sections: grouped}); err != nil {
			http.Error(w, "failed to encode response", http.StatusInternalServerError)
		}
	}
}
