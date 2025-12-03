package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/sammcclenaghan/scheduler/db"
)

type ScheduleStore interface {
	GetSchedule(ctx context.Context, arg db.GetScheduleParams) (db.Schedule, error)
	UpsertSchedule(ctx context.Context, arg db.UpsertScheduleParams) error
	DeleteSchedule(ctx context.Context, arg db.DeleteScheduleParams) error
}

type ScheduleResponse struct {
	Term        string   `json:"term"`
	SectionCRNs []string `json:"sectionCrns"`
}

type SaveScheduleRequest struct {
	SectionCRNs []string `json:"sectionCrns"`
}

func GetSchedule(store ScheduleStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("X-Schedule-Token")
		if token == "" {
			http.Error(w, "missing X-Schedule-Token header", http.StatusBadRequest)
			return
		}

		term := chi.URLParam(r, "term")
		if term == "" {
			http.Error(w, "missing term parameter", http.StatusBadRequest)
			return
		}

		schedule, err := store.GetSchedule(r.Context(), db.GetScheduleParams{
			Token: token,
			Term:  term,
		})
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(ScheduleResponse{
					Term:        term,
					SectionCRNs: []string{},
				})
				return
			}
			http.Error(w, "failed to fetch schedule", http.StatusInternalServerError)
			return
		}

		var crns []string
		if err := json.Unmarshal([]byte(schedule.SectionCrns), &crns); err != nil {
			crns = []string{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ScheduleResponse{
			Term:        schedule.Term,
			SectionCRNs: crns,
		})
	}
}

func SaveSchedule(store ScheduleStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("X-Schedule-Token")
		if token == "" {
			http.Error(w, "missing X-Schedule-Token header", http.StatusBadRequest)
			return
		}

		term := chi.URLParam(r, "term")
		if term == "" {
			http.Error(w, "missing term parameter", http.StatusBadRequest)
			return
		}

		var req SaveScheduleRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		crnsJSON, err := json.Marshal(req.SectionCRNs)
		if err != nil {
			http.Error(w, "failed to encode CRNs", http.StatusInternalServerError)
			return
		}

		err = store.UpsertSchedule(r.Context(), db.UpsertScheduleParams{
			Token:       token,
			Term:        term,
			SectionCrns: string(crnsJSON),
		})
		if err != nil {
			http.Error(w, "failed to save schedule", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ScheduleResponse{
			Term:        term,
			SectionCRNs: req.SectionCRNs,
		})
	}
}

func DeleteSchedule(store ScheduleStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("X-Schedule-Token")
		if token == "" {
			http.Error(w, "missing X-Schedule-Token header", http.StatusBadRequest)
			return
		}

		term := chi.URLParam(r, "term")
		if term == "" {
			http.Error(w, "missing term parameter", http.StatusBadRequest)
			return
		}

		err := store.DeleteSchedule(r.Context(), db.DeleteScheduleParams{
			Token: token,
			Term:  term,
		})
		if err != nil {
			http.Error(w, "failed to delete schedule", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
