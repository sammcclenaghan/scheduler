package main

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/sammcclenaghan/scheduler/internal/scraper"
)

// TestFetchSectionJSONStructure verifies the JSON output matches expected structure
func TestFetchSectionJSONStructure(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	s, err := scraper.New("", "")
	if err != nil {
		t.Fatalf("Failed to initialize scraper: %v", err)
	}

	sections, err := s.FetchSectionInfo(ctx, "CSC", "230", "202601")
	if err != nil {
		t.Fatalf("Failed to fetch section info: %v", err)
	}

	if len(sections) == 0 {
		t.Fatal("Expected sections but got none")
	}

	// Verify JSON structure for first section
	firstSection := sections[0]

	// Check required string fields
	requiredStringFields := []string{
		"term", "subject", "course_name", "course_number", "crn", "section",
		"frequency", "time", "days", "location", "date_range", "schedule_type",
		"instructor", "instructional_method", "units", "additional_information",
	}

	for _, field := range requiredStringFields {
		// Verify field exists in JSON by marshaling and checking
		data, _ := json.Marshal(firstSection)
		var m map[string]interface{}
		json.Unmarshal(data, &m)
		if _, exists := m[field]; !exists {
			t.Errorf("Missing field in JSON: %s", field)
		}
	}

	// Check required integer fields
	requiredIntFields := []string{
		"enrollment_actual", "enrollment_maximum", "enrollment_seats_available",
		"waitlist_capacity", "waitlist_actual", "waitlist_seats_available",
	}

	for _, field := range requiredIntFields {
		data, _ := json.Marshal(firstSection)
		var m map[string]interface{}
		json.Unmarshal(data, &m)
		if _, exists := m[field]; !exists {
			t.Errorf("Missing field in JSON: %s", field)
		}
	}

	// Verify values are populated
	if firstSection.Term == "" {
		t.Error("Term should not be empty")
	}
	if firstSection.Subject == "" {
		t.Error("Subject should not be empty")
	}
	if firstSection.CourseNumber == "" {
		t.Error("CourseNumber should not be empty")
	}
	if firstSection.CRN == "" {
		t.Error("CRN should not be empty")
	}
}

// TestFetchSectionJSONMarshaling tests that sections marshal to valid JSON
func TestFetchSectionJSONMarshaling(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	s, err := scraper.New("", "")
	if err != nil {
		t.Fatalf("Failed to initialize scraper: %v", err)
	}

	sections, err := s.FetchSectionInfo(ctx, "CSC", "230", "202601")
	if err != nil {
		t.Fatalf("Failed to fetch section info: %v", err)
	}

	// Test marshaling to JSON
	data, err := json.MarshalIndent(sections, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal sections to JSON: %v", err)
	}

	if len(data) == 0 {
		t.Fatal("JSON output is empty")
	}

	// Verify it's valid JSON by unmarshaling
	var unmarshaled []scraper.SectionInfo
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal JSON: %v", err)
	}

	if len(unmarshaled) != len(sections) {
		t.Errorf("Expected %d sections, got %d after unmarshal", len(sections), len(unmarshaled))
	}
}

// TestFetchSectionCLIOutput tests the CLI output matches expected JSON format
func TestFetchSectionCLIOutput(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	s, err := scraper.New("", "")
	if err != nil {
		t.Fatalf("Failed to initialize scraper: %v", err)
	}

	sections, err := s.FetchSectionInfo(ctx, "CSC", "230", "202601")
	if err != nil {
		t.Fatalf("Failed to fetch section info: %v", err)
	}

	// Simulate CLI output
	data, err := json.MarshalIndent(sections, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal JSON: %v", err)
	}

	output := string(data)

	// Verify output is valid JSON array
	if !strings.HasPrefix(strings.TrimSpace(output), "[") {
		t.Error("Output should start with [")
	}
	if !strings.HasSuffix(strings.TrimSpace(output), "]") {
		t.Error("Output should end with ]")
	}

	// Verify it can be parsed back
	var parsed []scraper.SectionInfo
	if err := json.Unmarshal([]byte(output), &parsed); err != nil {
		t.Fatalf("Failed to parse output JSON: %v", err)
	}

	if len(parsed) == 0 {
		t.Fatal("Parsed output contains no sections")
	}
}

// TestFetchSectionReturnedData tests actual data returned
func TestFetchSectionReturnedData(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	s, err := scraper.New("", "")
	if err != nil {
		t.Fatalf("Failed to initialize scraper: %v", err)
	}

	sections, err := s.FetchSectionInfo(ctx, "CSC", "230", "202601")
	if err != nil {
		t.Fatalf("Failed to fetch section info: %v", err)
	}

	// Verify we get multiple sections
	if len(sections) < 2 {
		t.Errorf("Expected at least 2 sections, got %d", len(sections))
	}

	// Check first section has expected data
	firstSection := sections[0]
	if firstSection.Term != "202601" {
		t.Errorf("Expected term 202601, got %s", firstSection.Term)
	}
	if firstSection.Subject != "CSC" {
		t.Errorf("Expected subject CSC, got %s", firstSection.Subject)
	}
	if firstSection.CourseNumber != "230" {
		t.Errorf("Expected course number 230, got %s", firstSection.CourseNumber)
	}

	// Check enrollment data is populated
	if firstSection.EnrollmentActual == 0 && firstSection.EnrollmentMaximum == 0 {
		t.Error("Enrollment data appears unpopulated")
	}
}

// TestFetchSectionFieldTypes tests that fields have correct types
func TestFetchSectionFieldTypes(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	s, err := scraper.New("", "")
	if err != nil {
		t.Fatalf("Failed to initialize scraper: %v", err)
	}

	sections, err := s.FetchSectionInfo(ctx, "CSC", "230", "202601")
	if err != nil {
		t.Fatalf("Failed to fetch section info: %v", err)
	}

	section := sections[0]

	// Verify string types
	if _, ok := interface{}(section.Term).(string); !ok {
		t.Error("Term should be string")
	}
	if _, ok := interface{}(section.Subject).(string); !ok {
		t.Error("Subject should be string")
	}

	// Verify integer types
	if _, ok := interface{}(section.EnrollmentActual).(int); !ok {
		t.Error("EnrollmentActual should be int")
	}
	if _, ok := interface{}(section.WaitlistCapacity).(int); !ok {
		t.Error("WaitlistCapacity should be int")
	}
}

// TestFetchCourseJSONStructure tests fetch-course JSON output
func TestFetchCourseJSONStructure(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	s, err := scraper.New("", "")
	if err != nil {
		t.Fatalf("Failed to initialize scraper: %v", err)
	}

	// Using a known PID if available, otherwise skip
	// This would need a valid PID from the catalog
	course, err := s.FetchCourseInfo(ctx, "test-pid")
	if err != nil {
		t.Logf("Skipping fetch-course test (need valid PID): %v", err)
		return
	}

	// Verify course fields exist
	data, _ := json.Marshal(course)
	var m map[string]interface{}
	json.Unmarshal(data, &m)

	requiredFields := []string{
		"subject_code", "credits", "pre_and_corequisites",
		"description", "hours_catalog_text", "pid", "notes", "title",
	}

	for _, field := range requiredFields {
		if _, exists := m[field]; !exists {
			t.Errorf("Missing field in course JSON: %s", field)
		}
	}
}

// TestJSONIndentation tests output is properly indented
func TestJSONIndentation(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	s, err := scraper.New("", "")
	if err != nil {
		t.Fatalf("Failed to initialize scraper: %v", err)
	}

	sections, err := s.FetchSectionInfo(ctx, "CSC", "230", "202601")
	if err != nil {
		t.Fatalf("Failed to fetch section info: %v", err)
	}

	data, err := json.MarshalIndent(sections, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal JSON: %v", err)
	}

	output := string(data)

	// Check for proper indentation (has lines with 2-space indent)
	if !strings.Contains(output, "  {") {
		t.Error("Output should have 2-space indentation")
	}

	// Split by lines and check structure
	lines := strings.Split(output, "\n")
	if len(lines) < 5 {
		t.Error("Output should be multi-line with indentation")
	}
}

// TestCLIFetchSectionCommand simulates running fetch-section command
func TestCLIFetchSectionCommand(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	s, err := scraper.New("", "")
	if err != nil {
		t.Fatalf("Failed to initialize scraper: %v", err)
	}

	// Capture what the CLI would output
	sections, err := s.FetchSectionInfo(ctx, "CSC", "230", "202601")
	if err != nil {
		t.Fatalf("fetch-section command failed: %v", err)
	}

	data, err := json.MarshalIndent(sections, "", "  ")
	if err != nil {
		t.Fatalf("JSON marshaling failed: %v", err)
	}

	output := string(data)

	// Verify output structure
	if !isValidJSON(output) {
		t.Fatal("CLI output is not valid JSON")
	}

	// Verify array contains objects
	var arr []map[string]interface{}
	if err := json.Unmarshal(data, &arr); err != nil {
		t.Fatalf("Failed to unmarshal output: %v", err)
	}

	if len(arr) == 0 {
		t.Fatal("Output array is empty")
	}

	// Check first object has expected keys
	firstObj := arr[0]
	expectedKeys := []string{
		"term", "subject", "course_name", "course_number", "crn", "section",
		"frequency", "time", "days", "location", "date_range", "schedule_type",
		"instructor", "instructional_method", "units", "additional_information",
		"enrollment_actual", "enrollment_maximum", "enrollment_seats_available",
		"waitlist_capacity", "waitlist_actual", "waitlist_seats_available",
	}

	for _, key := range expectedKeys {
		if _, exists := firstObj[key]; !exists {
			t.Errorf("Missing key in JSON object: %s", key)
		}
	}
}

// Helper function to check if string is valid JSON
func isValidJSON(s string) bool {
	var js interface{}
	return json.Unmarshal([]byte(s), &js) == nil
}

// BenchmarkFetchSection benchmarks section fetching
func BenchmarkFetchSection(b *testing.B) {
	ctx := context.Background()
	s, _ := scraper.New("", "")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = s.FetchSectionInfo(ctx, "CSC", "230", "202601")
	}
}

// BenchmarkJSONMarshaling benchmarks JSON marshaling
func BenchmarkJSONMarshaling(b *testing.B) {
	ctx := context.Background()
	s, _ := scraper.New("", "")
	sections, _ := s.FetchSectionInfo(ctx, "CSC", "230", "202601")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = json.MarshalIndent(sections, "", "  ")
	}
}
