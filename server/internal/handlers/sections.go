package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/sammcclenaghan/scheduler/db"
)

type SectionsLister interface {
	ListSectionsByCourseAndTerm(ctx context.Context, arg db.ListSectionsByCourseAndTermParams) ([]db.Section, error)
	ListSectionsByCourse(ctx context.Context, coursePid *string) ([]db.Section, error)
	ListSectionsByCoursePidsAndTerm(ctx context.Context, arg db.ListSectionsByCoursePidsAndTermParams) ([]db.Section, error)
	GetSectionsByCRNs(ctx context.Context, arg db.GetSectionsByCRNsParams) ([]db.Section, error)
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
				CoursePid: &pid,
				Term:      term,
			})
		} else {
			sections, err = store.ListSectionsByCourse(r.Context(), &pid)
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

func GetSectionsByCRNs(store SectionsLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		term := chi.URLParam(r, "term")
		if term == "" {
			http.Error(w, "missing term parameter", http.StatusBadRequest)
			return
		}

		crnsParam := r.URL.Query().Get("crns")
		if crnsParam == "" {
			http.Error(w, "missing crns query parameter", http.StatusBadRequest)
			return
		}

		// Parse and clean CRNs
		rawCrns := strings.Split(crnsParam, ",")
		crns := make([]string, 0, len(rawCrns))
		for _, crn := range rawCrns {
			crn = strings.TrimSpace(crn)
			if crn != "" {
				crns = append(crns, crn)
			}
		}

		if len(crns) == 0 {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode([]db.Section{})
			return
		}

		// Single batch query instead of N queries
		sections, err := store.GetSectionsByCRNs(r.Context(), db.GetSectionsByCRNsParams{
			Term: term,
			Crns: crns,
		})
		if err != nil {
			http.Error(w, "failed to fetch sections", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(sections); err != nil {
			http.Error(w, "failed to encode response", http.StatusInternalServerError)
		}
	}
}
