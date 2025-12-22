package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/sammcclenaghan/scheduler/db"
)

// Mock store for schedule tests
type mockScheduleStore struct {
	schedule              db.Schedule
	scheduleByOwner       db.Schedule
	getErr                error
	getByOwnerErr         error
	upsertErr             error
	updateCollaboratorErr error
	deleteErr             error
}

func (m *mockScheduleStore) GetSchedule(ctx context.Context, arg db.GetScheduleParams) (db.Schedule, error) {
	return m.schedule, m.getErr
}

func (m *mockScheduleStore) GetScheduleByOwner(ctx context.Context, arg db.GetScheduleByOwnerParams) (db.Schedule, error) {
	return m.scheduleByOwner, m.getByOwnerErr
}

func (m *mockScheduleStore) UpsertSchedule(ctx context.Context, arg db.UpsertScheduleParams) error {
	return m.upsertErr
}

func (m *mockScheduleStore) UpdateScheduleCollaborators(ctx context.Context, arg db.UpdateScheduleCollaboratorsParams) error {
	return m.updateCollaboratorErr
}

func (m *mockScheduleStore) DeleteSchedule(ctx context.Context, arg db.DeleteScheduleParams) error {
	return m.deleteErr
}

func TestGetSchedule(t *testing.T) {
	tests := []struct {
		name       string
		term       string
		token      string
		mock       *mockScheduleStore
		wantStatus int
		wantCRNs   []string
	}{
		{
			name:  "success - schedule found",
			term:  "202409",
			token: "test-token",
			mock: &mockScheduleStore{
				schedule: db.Schedule{
					ID:          1,
					Token:       "test-token",
					Term:        "202409",
					SectionCrns: `["12345","12346"]`,
				},
			},
			wantStatus: http.StatusOK,
			wantCRNs:   []string{"12345", "12346"},
		},
		{
			name:  "success - no schedule returns empty CRNs",
			term:  "202409",
			token: "new-token",
			mock: &mockScheduleStore{
				getErr: sql.ErrNoRows,
			},
			wantStatus: http.StatusOK,
			wantCRNs:   []string{},
		},
		{
			name:       "missing token header",
			term:       "202409",
			token:      "",
			mock:       &mockScheduleStore{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:  "database error",
			term:  "202409",
			token: "test-token",
			mock: &mockScheduleStore{
				getErr: sql.ErrConnDone,
			},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:  "invalid JSON in section_crns returns empty array",
			term:  "202409",
			token: "test-token",
			mock: &mockScheduleStore{
				schedule: db.Schedule{
					ID:          1,
					Token:       "test-token",
					Term:        "202409",
					SectionCrns: `invalid-json`,
				},
			},
			wantStatus: http.StatusOK,
			wantCRNs:   []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := chi.NewRouter()
			router.Get("/api/schedules/{term}", GetSchedule(tt.mock))

			path := "/api/schedules/" + tt.term
			req := httptest.NewRequest(http.MethodGet, path, nil)
			if tt.token != "" {
				req.Header.Set("X-Schedule-Token", tt.token)
			}
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d, body: %s", rr.Code, tt.wantStatus, rr.Body.String())
			}

			if tt.wantStatus == http.StatusOK && tt.wantCRNs != nil {
				var result ScheduleResponse
				if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}

				if len(result.SectionCRNs) != len(tt.wantCRNs) {
					t.Errorf("got %d CRNs, want %d", len(result.SectionCRNs), len(tt.wantCRNs))
				}

				for i, crn := range tt.wantCRNs {
					if i < len(result.SectionCRNs) && result.SectionCRNs[i] != crn {
						t.Errorf("CRN[%d]: got %s, want %s", i, result.SectionCRNs[i], crn)
					}
				}
			}
		})
	}
}

func TestGetSchedule_MissingTerm(t *testing.T) {
	mock := &mockScheduleStore{}

	req := httptest.NewRequest(http.MethodGet, "/api/schedules/", nil)
	req.Header.Set("X-Schedule-Token", "test-token")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("term", "")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	GetSchedule(mock).ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestSaveSchedule(t *testing.T) {
	tests := []struct {
		name       string
		term       string
		token      string
		body       SaveScheduleRequest
		mock       *mockScheduleStore
		wantStatus int
	}{
		{
			name:  "success",
			term:  "202409",
			token: "test-token",
			body: SaveScheduleRequest{
				SectionCRNs: []string{"12345", "12346"},
			},
			mock:       &mockScheduleStore{},
			wantStatus: http.StatusOK,
		},
		{
			name:  "success - empty CRNs",
			term:  "202409",
			token: "test-token",
			body: SaveScheduleRequest{
				SectionCRNs: []string{},
			},
			mock:       &mockScheduleStore{},
			wantStatus: http.StatusOK,
		},
		{
			name:       "missing token",
			term:       "202409",
			token:      "",
			body:       SaveScheduleRequest{SectionCRNs: []string{"12345"}},
			mock:       &mockScheduleStore{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:  "database error",
			term:  "202409",
			token: "test-token",
			body: SaveScheduleRequest{
				SectionCRNs: []string{"12345"},
			},
			mock: &mockScheduleStore{
				upsertErr: sql.ErrConnDone,
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := chi.NewRouter()
			router.Put("/api/schedules/{term}", SaveSchedule(tt.mock))

			bodyBytes, _ := json.Marshal(tt.body)
			path := "/api/schedules/" + tt.term
			req := httptest.NewRequest(http.MethodPut, path, bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")
			if tt.token != "" {
				req.Header.Set("X-Schedule-Token", tt.token)
			}
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d, body: %s", rr.Code, tt.wantStatus, rr.Body.String())
			}

			if tt.wantStatus == http.StatusOK {
				var result ScheduleResponse
				if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				if result.Term != tt.term {
					t.Errorf("got term %s, want %s", result.Term, tt.term)
				}
			}
		})
	}
}

func TestSaveSchedule_InvalidBody(t *testing.T) {
	mock := &mockScheduleStore{}
	router := chi.NewRouter()
	router.Put("/api/schedules/{term}", SaveSchedule(mock))

	req := httptest.NewRequest(http.MethodPut, "/api/schedules/202409", strings.NewReader("invalid json"))
	req.Header.Set("X-Schedule-Token", "test-token")
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestDeleteSchedule(t *testing.T) {
	tests := []struct {
		name       string
		term       string
		token      string
		mock       *mockScheduleStore
		wantStatus int
	}{
		{
			name:       "success",
			term:       "202409",
			token:      "test-token",
			mock:       &mockScheduleStore{},
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "missing token",
			term:       "202409",
			token:      "",
			mock:       &mockScheduleStore{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:  "database error",
			term:  "202409",
			token: "test-token",
			mock: &mockScheduleStore{
				deleteErr: sql.ErrConnDone,
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := chi.NewRouter()
			router.Delete("/api/schedules/{term}", DeleteSchedule(tt.mock))

			path := "/api/schedules/" + tt.term
			req := httptest.NewRequest(http.MethodDelete, path, nil)
			if tt.token != "" {
				req.Header.Set("X-Schedule-Token", tt.token)
			}
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d", rr.Code, tt.wantStatus)
			}
		})
	}
}

func TestJoinSchedule(t *testing.T) {
	tests := []struct {
		name       string
		term       string
		userToken  string
		ownerToken string
		mock       *mockScheduleStore
		wantStatus int
	}{
		{
			name:       "success - new collaborator",
			term:       "202409",
			userToken:  "user-token",
			ownerToken: "owner-token",
			mock: &mockScheduleStore{
				scheduleByOwner: db.Schedule{
					ID:                 1,
					Token:              "owner-token",
					Term:               "202409",
					CollaboratorTokens: `[]`,
				},
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "success - join own schedule",
			term:       "202409",
			userToken:  "owner-token",
			ownerToken: "owner-token",
			mock:       &mockScheduleStore{},
			wantStatus: http.StatusOK,
		},
		{
			name:       "success - already collaborator",
			term:       "202409",
			userToken:  "user-token",
			ownerToken: "owner-token",
			mock: &mockScheduleStore{
				scheduleByOwner: db.Schedule{
					ID:                 1,
					Token:              "owner-token",
					Term:               "202409",
					CollaboratorTokens: `["user-token"]`,
				},
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "missing user token",
			term:       "202409",
			userToken:  "",
			ownerToken: "owner-token",
			mock:       &mockScheduleStore{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing owner token in body",
			term:       "202409",
			userToken:  "user-token",
			ownerToken: "",
			mock:       &mockScheduleStore{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "schedule not found",
			term:       "202409",
			userToken:  "user-token",
			ownerToken: "nonexistent-owner",
			mock: &mockScheduleStore{
				getByOwnerErr: sql.ErrNoRows,
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "database error on get",
			term:       "202409",
			userToken:  "user-token",
			ownerToken: "owner-token",
			mock: &mockScheduleStore{
				getByOwnerErr: sql.ErrConnDone,
			},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:       "database error on update",
			term:       "202409",
			userToken:  "user-token",
			ownerToken: "owner-token",
			mock: &mockScheduleStore{
				scheduleByOwner: db.Schedule{
					ID:                 1,
					Token:              "owner-token",
					Term:               "202409",
					CollaboratorTokens: `[]`,
				},
				updateCollaboratorErr: sql.ErrConnDone,
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := chi.NewRouter()
			router.Post("/api/schedules/{term}/join", JoinSchedule(tt.mock))

			body := JoinScheduleRequest{OwnerToken: tt.ownerToken}
			bodyBytes, _ := json.Marshal(body)

			path := "/api/schedules/" + tt.term + "/join"
			req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")
			if tt.userToken != "" {
				req.Header.Set("X-Schedule-Token", tt.userToken)
			}
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d, body: %s", rr.Code, tt.wantStatus, rr.Body.String())
			}

			if tt.wantStatus == http.StatusOK {
				var result map[string]bool
				if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				if !result["joined"] {
					t.Error("expected joined to be true")
				}
			}
		})
	}
}

func TestJoinSchedule_InvalidBody(t *testing.T) {
	mock := &mockScheduleStore{}
	router := chi.NewRouter()
	router.Post("/api/schedules/{term}/join", JoinSchedule(mock))

	req := httptest.NewRequest(http.MethodPost, "/api/schedules/202409/join", strings.NewReader("invalid json"))
	req.Header.Set("X-Schedule-Token", "test-token")
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rr.Code)
	}
}
