package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/sammcclenaghan/scheduler/db"
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
	dbPath := flag.String("db", "", "Path to SQLite database (optional, if provided data will be saved)")
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	s, err := scraper.New(*coursesJSON, *catalogID)
	if err != nil {
		log.Fatalf("Failed to initialize scraper: %v", err)
	}

	var q *db.Queries
	if *dbPath != "" {
		conn, err := sql.Open("sqlite3", *dbPath)
		if err != nil {
			log.Fatalf("Failed to open database: %v", err)
		}
		defer conn.Close()
		if err := conn.Ping(); err != nil {
			log.Fatalf("Failed to ping database: %v", err)
		}
		q = db.New(conn)
	}

	switch *command {
	case "fetch-course":
		if *pid == "" {
			log.Fatal("Error: --pid is required for fetch-course")
		}
		fetchCourse(ctx, s, q, *pid)

	case "fetch-section":
		if *subject == "" || *courseNumber == "" || *term == "" {
			log.Fatal("Error: --subject, --number, and --term are required for fetch-section")
		}
		fetchSection(ctx, s, q, *subject, *courseNumber, *term)

	case "help", "":
		printHelp()

	default:
		fmt.Printf("Unknown command: %s\n\n", *command)
		printHelp()
		os.Exit(1)
	}
}

func fetchCourse(ctx context.Context, s *scraper.Scraper, q *db.Queries, pid string) {
	course, err := s.FetchCourseInfo(ctx, pid)
	if err != nil {
		log.Fatalf("Error fetching course: %v", err)
	}

	if q != nil {
		err := q.UpsertCourse(ctx, db.UpsertCourseParams{
			Title:              course.Title,
			Pid:                course.PID,
			SubjectCode:        course.SubjectCode,
			Description:        course.Description,
			Credits:            course.Credits,
			HoursCatalogText:   course.HoursCatalogText,
			Notes:              course.Notes,
			PreAndCorequisites: course.PreAndCorequisites,
		})
		if err != nil {
			log.Printf("Error saving course to DB: %v", err)
		} else {
			log.Printf("Saved course %s to DB", course.PID)
		}
	}

	data, err := json.MarshalIndent(course, "", "  ")
	if err != nil {
		log.Fatalf("Error marshaling JSON: %v", err)
	}

	fmt.Println(string(data))
}

func fetchSection(ctx context.Context, s *scraper.Scraper, q *db.Queries, subject, courseNumber, term string) {
	sections, err := s.FetchSectionInfo(ctx, subject, courseNumber, term)
	if err != nil {
		log.Fatalf("Error fetching sections: %v", err)
	}

	if q != nil {
		for _, sec := range sections {
			// Try to find PID from index
			key := strings.ToUpper(fmt.Sprintf("%s %s", sec.Subject, sec.CourseNumber))
			pid := s.Index[key]

			err := q.UpsertSection(ctx, db.UpsertSectionParams{
				Term:                     sec.Term,
				Crn:                      sec.CRN,
				CoursePid:                &pid,
				Subject:                  sec.Subject,
				CourseNumber:             sec.CourseNumber,
				CourseName:               sec.CourseName,
				Section:                  sec.Section,
				ScheduleType:             sec.ScheduleType,
				InstructionalMethod:      sec.InstructionalMethod,
				Frequency:                sec.Frequency,
				Time:                     sec.Time,
				Days:                     sec.Days,
				Location:                 sec.Location,
				DateRange:                sec.DateRange,
				Instructor:               sec.Instructor,
				Units:                    sec.Units,
				AdditionalInformation:    sec.AdditionalInformation,
				EnrollmentActual:         int64(sec.EnrollmentActual),
				EnrollmentMaximum:        int64(sec.EnrollmentMaximum),
				EnrollmentSeatsAvailable: int64(sec.EnrollmentSeatsAvailable),
				WaitlistCapacity:         int64(sec.WaitlistCapacity),
				WaitlistActual:           int64(sec.WaitlistActual),
				WaitlistSeatsAvailable:   int64(sec.WaitlistSeatsAvailable),
			})
			if err != nil {
				log.Printf("Error saving section %s to DB: %v", sec.CRN, err)
			}
		}
		if len(sections) > 0 {
			log.Printf("Saved %d sections to DB", len(sections))
		}
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

  -db string
    	Path to SQLite database (optional, if provided data will be saved)

EXAMPLES:
  # Fetch course info
  go run ./server/cmd/scraper -cmd=fetch-course -pid=your-pid-here

  # Fetch section info
  go run ./server/cmd/scraper -cmd=fetch-section -subject=CSC -number=111 -term=202409

  # Fetch section info with custom catalog
  go run ./server/cmd/scraper -cmd=fetch-section -subject=CSC -number=111 -term=202409 -catalog=your-catalog-id

  # Fetch and save to DB
  go run ./server/cmd/scraper -cmd=fetch-section -subject=CSC -number=111 -term=202409 -db=./server/scheduler.db
`)
}
