package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/sammcclenaghan/scheduler/db"
)

type fakeCourseStore struct {
	course db.Course
	err    error
}

func (f fakeCourseStore) GetCourse(ctx context.Context, id int32) (db.Course, error) {
	return f.course, f.err
}

func TestGetCourse_Success(t *testing.T) {
	store := fakeCourseStore{
		course: db.Course{
			ID:          1,
			Title:       "Test Course",
			Pid:         "TEST-101",
			SubjectCode: "TEST",
			Description: "A test course",
		},
	}

	r := chi.NewRouter()
	r.Get("/api/courses/{id}", GetCourse(store))

	req := httptest.NewRequest(http.MethodGet, "/api/courses/1", nil)
	rr := httptest.NewRecorder()

	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	var got db.Course
	if err := json.Unmarshal(rr.Body.Bytes(), &got); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if got.ID != store.course.ID || got.Title != store.course.Title {
		t.Fatalf("unexpected course returned: got %+v, want %+v", got, store.course)
	}
}

func TestGetCourse_InvalidID(t *testing.T) {
	store := fakeCourseStore{}

	r := chi.NewRouter()
	r.Get("/api/courses/{id}", GetCourse(store))

	req := httptest.NewRequest(http.MethodGet, "/api/courses/not-a-number", nil)
	rr := httptest.NewRecorder()

	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestGetCourse_NotFound(t *testing.T) {
	store := fakeCourseStore{
		err: sql.ErrNoRows,
	}

	r := chi.NewRouter()
	r.Get("/api/courses/{id}", GetCourse(store))

	req := httptest.NewRequest(http.MethodGet, "/api/courses/123", nil)
	rr := httptest.NewRecorder()

	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d", http.StatusNotFound, rr.Code)
	}
}



