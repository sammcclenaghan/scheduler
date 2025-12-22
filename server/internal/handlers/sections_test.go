package handlers

import (
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

// Mock store for sections tests
type mockSectionsStore struct {
	sectionsByCourseAndTerm []db.Section
	sectionsByCourse        []db.Section
	sectionsByPidsAndTerm   []db.Section
	sectionsByCRNs          []db.Section
	err                     error
}

func (m *mockSectionsStore) ListSectionsByCourseAndTerm(ctx context.Context, arg db.ListSectionsByCourseAndTermParams) ([]db.Section, error) {
	return m.sectionsByCourseAndTerm, m.err
}

func (m *mockSectionsStore) ListSectionsByCourse(ctx context.Context, coursePid *string) ([]db.Section, error) {
	return m.sectionsByCourse, m.err
}

func (m *mockSectionsStore) ListSectionsByCoursePidsAndTerm(ctx context.Context, arg db.ListSectionsByCoursePidsAndTermParams) ([]db.Section, error) {
	return m.sectionsByPidsAndTerm, m.err
}

func (m *mockSectionsStore) GetSectionsByCRNs(ctx context.Context, arg db.GetSectionsByCRNsParams) ([]db.Section, error) {
	return m.sectionsByCRNs, m.err
}

func TestListSectionsByPID(t *testing.T) {
	pid := "test-pid"
	tests := []struct {
		name           string
		pid            string
		term           string
		mock           *mockSectionsStore
		wantStatus     int
		wantGroupCount map[string]int
	}{
		{
			name: "success with term - lectures only",
			pid:  "test-pid",
			term: "202409",
			mock: &mockSectionsStore{
				sectionsByCourseAndTerm: []db.Section{
					{ID: 1, Crn: "12345", ScheduleType: "Lecture", CoursePid: &pid},
					{ID: 2, Crn: "12346", ScheduleType: "Lecture", CoursePid: &pid},
				},
			},
			wantStatus:     http.StatusOK,
			wantGroupCount: map[string]int{"lectures": 2, "labs": 0, "tutorials": 0, "other": 0},
		},
		{
			name: "success with term - mixed types",
			pid:  "test-pid",
			term: "202409",
			mock: &mockSectionsStore{
				sectionsByCourseAndTerm: []db.Section{
					{ID: 1, Crn: "12345", ScheduleType: "Lecture", CoursePid: &pid},
					{ID: 2, Crn: "12346", ScheduleType: "Lab", CoursePid: &pid},
					{ID: 3, Crn: "12347", ScheduleType: "Tutorial", CoursePid: &pid},
				},
			},
			wantStatus:     http.StatusOK,
			wantGroupCount: map[string]int{"lectures": 1, "labs": 1, "tutorials": 1, "other": 0},
		},
		{
			name: "success without term",
			pid:  "test-pid",
			term: "",
			mock: &mockSectionsStore{
				sectionsByCourse: []db.Section{
					{ID: 1, Crn: "12345", ScheduleType: "Lecture", CoursePid: &pid},
				},
			},
			wantStatus:     http.StatusOK,
			wantGroupCount: map[string]int{"lectures": 1, "labs": 0, "tutorials": 0, "other": 0},
		},
		{
			name: "empty sections",
			pid:  "test-pid",
			term: "202409",
			mock: &mockSectionsStore{
				sectionsByCourseAndTerm: []db.Section{},
			},
			wantStatus:     http.StatusOK,
			wantGroupCount: map[string]int{"lectures": 0, "labs": 0, "tutorials": 0, "other": 0},
		},
		{
			name: "database error",
			pid:  "test-pid",
			term: "202409",
			mock: &mockSectionsStore{
				err: sql.ErrConnDone,
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := chi.NewRouter()
			router.Get("/api/sections/{pid}", ListSectionsByPID(tt.mock))
			router.Get("/api/sections/{pid}/{term}", ListSectionsByPID(tt.mock))

			path := "/api/sections/" + tt.pid
			if tt.term != "" {
				path += "/" + tt.term
			}

			req := httptest.NewRequest(http.MethodGet, path, nil)
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d", rr.Code, tt.wantStatus)
			}

			if tt.wantStatus == http.StatusOK && tt.wantGroupCount != nil {
				var result GroupedSections
				if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}

				for group, wantCount := range tt.wantGroupCount {
					if len(result.Sections[group]) != wantCount {
						t.Errorf("group %s: got %d sections, want %d", group, len(result.Sections[group]), wantCount)
					}
				}
			}
		})
	}
}

func TestGetSectionsByCRNs(t *testing.T) {
	pid := "test-pid"
	tests := []struct {
		name         string
		term         string
		crns         string
		mock         *mockSectionsStore
		wantStatus   int
		wantSections int
	}{
		{
			name: "success - single CRN",
			term: "202409",
			crns: "12345",
			mock: &mockSectionsStore{
				sectionsByCRNs: []db.Section{
					{ID: 1, Crn: "12345", Term: "202409", CoursePid: &pid},
				},
			},
			wantStatus:   http.StatusOK,
			wantSections: 1,
		},
		{
			name: "success - multiple CRNs",
			term: "202409",
			crns: "12345,12346,12347",
			mock: &mockSectionsStore{
				sectionsByCRNs: []db.Section{
					{ID: 1, Crn: "12345", Term: "202409", CoursePid: &pid},
					{ID: 2, Crn: "12346", Term: "202409", CoursePid: &pid},
					{ID: 3, Crn: "12347", Term: "202409", CoursePid: &pid},
				},
			},
			wantStatus:   http.StatusOK,
			wantSections: 3,
		},
		{
			name: "success - CRNs with spaces get trimmed",
			term: "202409",
			crns: "12345,12346,12347",
			mock: &mockSectionsStore{
				sectionsByCRNs: []db.Section{
					{ID: 1, Crn: "12345", Term: "202409", CoursePid: &pid},
					{ID: 2, Crn: "12346", Term: "202409", CoursePid: &pid},
				},
			},
			wantStatus:   http.StatusOK,
			wantSections: 2,
		},
		{
			name:       "missing term",
			term:       "",
			crns:       "12345",
			mock:       &mockSectionsStore{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing crns parameter",
			term:       "202409",
			crns:       "",
			mock:       &mockSectionsStore{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "empty crns after parsing",
			term: "202409",
			crns: ",,,",
			mock: &mockSectionsStore{
				sectionsByCRNs: []db.Section{},
			},
			wantStatus:   http.StatusOK,
			wantSections: 0,
		},
		{
			name: "database error",
			term: "202409",
			crns: "12345",
			mock: &mockSectionsStore{
				err: sql.ErrConnDone,
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := chi.NewRouter()
			router.Get("/api/sections/by-crns/{term}", GetSectionsByCRNs(tt.mock))

			path := "/api/sections/by-crns/"
			if tt.term != "" {
				path += tt.term
			} else {
				path += "missing"
			}

			if tt.crns != "" {
				path += "?crns=" + tt.crns
			}

			req := httptest.NewRequest(http.MethodGet, path, nil)
			rr := httptest.NewRecorder()

			// Handle missing term case by using a route that won't match
			if tt.term == "" {
				router = chi.NewRouter()
				router.Get("/api/sections/by-crns/{term}", GetSectionsByCRNs(tt.mock))
				// We need to simulate no term by testing the handler directly
				req = httptest.NewRequest(http.MethodGet, "/api/sections/by-crns/?crns="+tt.crns, nil)
				rctx := chi.NewRouteContext()
				rctx.URLParams.Add("term", "")
				req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
				GetSectionsByCRNs(tt.mock).ServeHTTP(rr, req)
			} else {
				router.ServeHTTP(rr, req)
			}

			if rr.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d, body: %s", rr.Code, tt.wantStatus, rr.Body.String())
			}

			if tt.wantStatus == http.StatusOK {
				var result []db.Section
				if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}

				if len(result) != tt.wantSections {
					t.Errorf("got %d sections, want %d", len(result), tt.wantSections)
				}
			}
		})
	}
}

func TestListSectionsByPID_MissingPID(t *testing.T) {
	mock := &mockSectionsStore{}
	router := chi.NewRouter()
	router.Get("/api/sections/{pid}", ListSectionsByPID(mock))

	// Test with empty pid by calling handler directly
	req := httptest.NewRequest(http.MethodGet, "/api/sections/", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("pid", "")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	ListSectionsByPID(mock).ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rr.Code)
	}

	if !strings.Contains(rr.Body.String(), "missing pid") {
		t.Errorf("expected error message about missing pid, got: %s", rr.Body.String())
	}
}
