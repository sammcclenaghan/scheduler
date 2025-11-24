package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthcheck(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/healthcheck", nil)
	rr := httptest.NewRecorder()

	handler := Healthcheck()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	const expectedBody = `{"status":"ok"}`
	if rr.Body.String() != expectedBody+"\n" && rr.Body.String() != expectedBody {
		t.Fatalf("unexpected body: got %q, want %q", rr.Body.String(), expectedBody)
	}
}



