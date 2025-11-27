package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/sammcclenaghan/scheduler/db"
)

type mockCourseGetter struct {
	course db.Course
	err    error
}

func (m *mockCourseGetter) GetCourse(ctx context.Context, id int64) (db.Course, error) {
	return m.course, m.err
}

func TestGetCourse(t *testing.T) {
	tests := []struct {
		name       string
		id         string
		mock       *mockCourseGetter
		wantStatus int
	}{
		{
			name: "success",
			id:   "1",
			mock: &mockCourseGetter{
				course: db.Course{ID: 1, Title: "CS101"},
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid id",
			id:         "abc",
			mock:       &mockCourseGetter{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "course not found",
			id:   "999",
			mock: &mockCourseGetter{
				err: sql.ErrNoRows,
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "database error",
			id:   "1",
			mock: &mockCourseGetter{
				err: sql.ErrConnDone,
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := chi.NewRouter()
			router.Get("/api/courses/{id}", GetCourse(tt.mock))

			path := "/api/courses/" + tt.id
			req := httptest.NewRequest(http.MethodGet, path, nil)
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d", rr.Code, tt.wantStatus)
			}
		})
	}
}
