package scraper

import (
	"context"
	"strings"
	"testing"
	"time"
)

// Integration tests for the scraper - these hit real UVic APIs
// Run with: go test -v ./internal/scraper/... -run Integration

func TestIntegration_FetchCourseInfo(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	s, err := New("", "")
	if err != nil {
		t.Fatalf("failed to create scraper: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Test fetching known courses - using PIDs from courses.json
	tests := []struct {
		name      string
		pid       string
		wantCode  string
		wantTitle string
	}{{
		name:      "CSC 230 - Intro to Computer Architecture",
		pid:       "HJeY5kOpXN",
		wantCode:  "CSC230",
		wantTitle: "Introduction to Computer Architecture",
	},
		{
			name:      "CSC 100 - Elementary Computing",
			pid:       "r1xcyOamN",
			wantCode:  "CSC100",
			wantTitle: "Elementary Computing",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			course, err := s.FetchCourseInfo(ctx, tt.pid)
			if err != nil {
				t.Fatalf("FetchCourseInfo failed: %v", err)
			}

			// Verify expected fields
			if course.SubjectCode != tt.wantCode {
				t.Errorf("SubjectCode: got %q, want %q", course.SubjectCode, tt.wantCode)
			}

			if !strings.Contains(course.Title, tt.wantTitle) {
				t.Errorf("Title: got %q, want to contain %q", course.Title, tt.wantTitle)
			}

			// Credits should be populated (don't check specific value as it may change)
			if course.Credits == "" {
				t.Error("Credits should not be empty")
			}

			if course.PID != tt.pid {
				t.Errorf("PID: got %q, want %q", course.PID, tt.pid)
			}

			// These fields should be populated
			if course.Description == "" {
				t.Error("Description should not be empty")
			}

			t.Logf("Course: %s - %s (%s credits)", course.SubjectCode, course.Title, course.Credits)
			t.Logf("Description: %.100s...", course.Description)
		})
	}
}

func TestIntegration_FetchCourseInfo_NotFound(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	s, err := New("", "")
	if err != nil {
		t.Fatalf("failed to create scraper: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Test with an invalid PID
	_, err = s.FetchCourseInfo(ctx, "invalid-pid-12345")
	if err == nil {
		t.Error("expected error for invalid PID, got nil")
	}

	t.Logf("Got expected error: %v", err)
}

func TestIntegration_FetchSectionInfo(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	s, err := New("", "")
	if err != nil {
		t.Fatalf("failed to create scraper: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Test fetching sections for a course that should have sections
	// Using term 202501 (Spring 2025) - adjust as needed
	tests := []struct {
		name         string
		subject      string
		courseNumber string
		term         string
	}{
		{
			name:         "CSC 111 Spring 2025",
			subject:      "CSC",
			courseNumber: "111",
			term:         "202501",
		},
		{
			name:         "MATH 100 Spring 2025",
			subject:      "MATH",
			courseNumber: "100",
			term:         "202501",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sections, err := s.FetchSectionInfo(ctx, tt.subject, tt.courseNumber, tt.term)
			if err != nil {
				// It's possible sections don't exist for the given term
				if strings.Contains(err.Error(), "no sections found") {
					t.Skipf("No sections found for %s %s in term %s (this is OK)", tt.subject, tt.courseNumber, tt.term)
				}
				t.Fatalf("FetchSectionInfo failed: %v", err)
			}

			if len(sections) == 0 {
				t.Fatal("expected at least one section")
			}

			// Verify first section has expected fields
			sec := sections[0]

			if sec.CRN == "" {
				t.Error("CRN should not be empty")
			}

			if sec.Subject != tt.subject {
				t.Errorf("Subject: got %q, want %q", sec.Subject, tt.subject)
			}

			if sec.CourseNumber != tt.courseNumber {
				t.Errorf("CourseNumber: got %q, want %q", sec.CourseNumber, tt.courseNumber)
			}

			if sec.Term != tt.term {
				t.Errorf("Term: got %q, want %q", sec.Term, tt.term)
			}

			// Log section details
			t.Logf("Found %d sections for %s %s (term %s)", len(sections), tt.subject, tt.courseNumber, tt.term)
			for i, s := range sections {
				t.Logf("  Section %d: CRN=%s, %s, %s %s, Instructor=%s",
					i+1, s.CRN, s.ScheduleType, s.Days, s.Time, s.Instructor)
				t.Logf("    Enrollment: %d/%d (seats: %d), Waitlist: %d/%d",
					s.EnrollmentActual, s.EnrollmentMaximum, s.EnrollmentSeatsAvailable,
					s.WaitlistActual, s.WaitlistCapacity)
			}
		})
	}
}

func TestIntegration_FetchSectionInfo_InvalidInputs(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	s, err := New("", "")
	if err != nil {
		t.Fatalf("failed to create scraper: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	tests := []struct {
		name         string
		subject      string
		courseNumber string
		term         string
		wantErr      string
	}{
		{
			name:         "empty subject",
			subject:      "",
			courseNumber: "111",
			term:         "202501",
			wantErr:      "required",
		},
		{
			name:         "empty course number",
			subject:      "CSC",
			courseNumber: "",
			term:         "202501",
			wantErr:      "required",
		},
		{
			name:         "empty term",
			subject:      "CSC",
			courseNumber: "111",
			term:         "",
			wantErr:      "required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := s.FetchSectionInfo(ctx, tt.subject, tt.courseNumber, tt.term)
			if err == nil {
				t.Error("expected error, got nil")
				return
			}

			if !strings.Contains(err.Error(), tt.wantErr) {
				t.Errorf("error should contain %q, got: %v", tt.wantErr, err)
			}
		})
	}
}

func TestIntegration_FetchSectionInfo_NoSections(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	s, err := New("", "")
	if err != nil {
		t.Fatalf("failed to create scraper: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Try to fetch sections for a very old term that shouldn't have data
	_, err = s.FetchSectionInfo(ctx, "CSC", "111", "199909")
	if err == nil {
		t.Error("expected error for old term with no sections")
	} else {
		t.Logf("Got expected error: %v", err)
	}
}

// Test the scraper constructor
func TestNew(t *testing.T) {
	tests := []struct {
		name      string
		catalogID string
		wantID    string
	}{
		{
			name:      "default catalog ID",
			catalogID: "",
			wantID:    DefaultCatalogID,
		},
		{
			name:      "custom catalog ID",
			catalogID: "custom-id",
			wantID:    "custom-id",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s, err := New("", tt.catalogID)
			if err != nil {
				t.Fatalf("New failed: %v", err)
			}

			if s.catalogID != tt.wantID {
				t.Errorf("catalogID: got %q, want %q", s.catalogID, tt.wantID)
			}

			if s.client == nil {
				t.Error("client should not be nil")
			}

			if s.Index == nil {
				t.Error("Index should not be nil")
			}
		})
	}
}

// Test helper functions
func TestHtmlToText(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "simple text",
			input: "Hello world",
			want:  "Hello world",
		},
		{
			name:  "html tags stripped",
			input: "<p>Hello <strong>world</strong></p>",
			want:  "Hello world",
		},
		{
			name:  "nested tags",
			input: "<div><p>Hello <em>beautiful</em> world</p></div>",
			want:  "Hello beautiful world",
		},
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
		{
			name:  "whitespace only",
			input: "   ",
			want:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := htmlToText(tt.input)
			if got != tt.want {
				t.Errorf("htmlToText(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestStripTags(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"Hello", "Hello"},
		{"<p>Hello</p>", "Hello"},
		{"<a href='test'>Link</a>", "Link"},
		{"No <b>tags</b> here <i>OK</i>", "No tags here OK"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := stripTags(tt.input)
			if got != tt.want {
				t.Errorf("stripTags(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestParseCredits(t *testing.T) {
	tests := []struct {
		name  string
		input any
		want  string
	}{
		{
			name:  "float",
			input: 1.5,
			want:  "1.50",
		},
		{
			name:  "integer float",
			input: 3.0,
			want:  "3",
		},
		{
			name:  "string",
			input: "1.5",
			want:  "1.5",
		},
		{
			name:  "map with value",
			input: map[string]any{"value": 1.5},
			want:  "1.50",
		},
		{
			name:  "nil",
			input: nil,
			want:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseCredits(tt.input)
			if got != tt.want {
				t.Errorf("parseCredits(%v) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestSplitLines(t *testing.T) {
	tests := []struct {
		input string
		want  []string
	}{
		{"a\nb\nc", []string{"a", "b", "c"}},
		{"  a  \n  b  ", []string{"a", "b"}},
		{"\n\n\n", nil},
		{"single", []string{"single"}},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := splitLines(tt.input)
			if len(got) != len(tt.want) {
				t.Errorf("splitLines(%q) len = %d, want %d", tt.input, len(got), len(tt.want))
				return
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("splitLines(%q)[%d] = %q, want %q", tt.input, i, got[i], tt.want[i])
				}
			}
		})
	}
}
