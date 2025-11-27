package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/sammcclenaghan/scheduler/internal/scraper"
)

func main() {
	command := flag.String("cmd", "help", "Command: fetch-course, fetch-section, help")
	pid := flag.String("pid", "", "Course PID (for fetch-course)")
	subject := flag.String("subject", "", "Course subject code (for fetch-section)")
	courseNumber := flag.String("number", "", "Course number (for fetch-section)")
	term := flag.String("term", "", "Term code (for fetch-section)")
	catalogID := flag.String("catalog", "", "Catalog ID (optional)")
	coursesJSON := flag.String("courses", "", "Path to courses.json for indexing (optional)")
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	s, err := scraper.New(*coursesJSON, *catalogID)
	if err != nil {
		log.Fatalf("Failed to initialize scraper: %v", err)
	}

	switch *command {
	case "fetch-course":
		if *pid == "" {
			log.Fatal("Error: --pid is required for fetch-course")
		}
		fetchCourse(ctx, s, *pid)

	case "fetch-section":
		if *subject == "" || *courseNumber == "" || *term == "" {
			log.Fatal("Error: --subject, --number, and --term are required for fetch-section")
		}
		fetchSection(ctx, s, *subject, *courseNumber, *term)

	case "help", "":
		printHelp()

	default:
		fmt.Printf("Unknown command: %s\n\n", *command)
		printHelp()
		os.Exit(1)
	}
}

func fetchCourse(ctx context.Context, s *scraper.Scraper, pid string) {
	course, err := s.FetchCourseInfo(ctx, pid)
	if err != nil {
		log.Fatalf("Error fetching course: %v", err)
	}

	data, err := json.MarshalIndent(course, "", "  ")
	if err != nil {
		log.Fatalf("Error marshaling JSON: %v", err)
	}

	fmt.Println(string(data))
}

func fetchSection(ctx context.Context, s *scraper.Scraper, subject, courseNumber, term string) {
	sections, err := s.FetchSectionInfo(ctx, subject, courseNumber, term)
	if err != nil {
		log.Fatalf("Error fetching sections: %v", err)
	}

	data, err := json.MarshalIndent(sections, "", "  ")
	if err != nil {
		log.Fatalf("Error marshaling JSON: %v", err)
	}

	fmt.Println(string(data))
}

func printHelp() {
	fmt.Print(`Scraper CLI - Test UVic course scraper

USAGE:
  go run ./server/cmd/scraper -cmd=COMMAND [OPTIONS]

COMMANDS:
  fetch-course    Fetch course information by PID
  fetch-section   Fetch section information by subject, number, and term
  help            Show this help message (default)

OPTIONS:
  -cmd string
    	Command to execute (default: help)
  
  -pid string
    	Course PID (required for fetch-course)
  
  -subject string
    	Course subject code (required for fetch-section, e.g., CSC)
  
  -number string
    	Course number (required for fetch-section, e.g., 111)
  
  -term string
    	Term code (required for fetch-section, e.g., 202409)
  
  -catalog string
    	Catalog ID (optional, uses default if not provided)
  
  -courses string
    	Path to courses.json for indexing (optional)

EXAMPLES:
  # Fetch course info
  go run ./server/cmd/scraper -cmd=fetch-course -pid=your-pid-here

  # Fetch section info
  go run ./server/cmd/scraper -cmd=fetch-section -subject=CSC -number=111 -term=202409

  # Fetch section info with custom catalog
  go run ./server/cmd/scraper -cmd=fetch-section -subject=CSC -number=111 -term=202409 -catalog=your-catalog-id
`)
}
