package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/sammcclenaghan/scheduler/db"
	"github.com/sammcclenaghan/scheduler/internal/scraper"
)

var courseIDRe = regexp.MustCompile(`^([A-Z]+)(\d+[A-Z]?)$`)

func main() {
	command := flag.String("cmd", "help", "Command: fetch-course, fetch-section, bulk-scrape, help")
	pid := flag.String("pid", "", "Course PID (for fetch-course)")
	subject := flag.String("subject", "", "Course subject code (for fetch-section)")
	courseNumber := flag.String("number", "", "Course number (for fetch-section)")
	term := flag.String("term", "", "Term code (for fetch-section and bulk-scrape)")
	catalogID := flag.String("catalog", "", "Catalog ID (optional)")
	coursesJSON := flag.String("courses", "", "Path to courses.json for indexing (required for bulk-scrape)")
	dbPath := flag.String("db", "", "Path to SQLite database (optional, if provided data will be saved)")
	outDir := flag.String("out", "", "Output directory for bulk-scrape (default: ./data)")
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

	case "bulk-scrape":
		if *coursesJSON == "" {
			log.Fatal("Error: --courses is required for bulk-scrape")
		}
		if *term == "" {
			log.Fatal("Error: --term is required for bulk-scrape")
		}
		output := *outDir
		if output == "" {
			output = "./data"
		}
		bulkScrape(*coursesJSON, *term, output)

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

type courseEntry struct {
	CourseID string `json:"courseID"`
	PID      string `json:"pid"`
	Title    string `json:"title"`
}

func bulkScrape(coursesJSONPath, term, outDir string) {
	f, err := os.Open(coursesJSONPath)
	if err != nil {
		log.Fatalf("Failed to open courses.json: %v", err)
	}
	defer f.Close()

	var courses []courseEntry
	if err := json.NewDecoder(f).Decode(&courses); err != nil {
		log.Fatalf("Failed to parse courses.json: %v", err)
	}

	if err := os.MkdirAll(outDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}

	s, err := scraper.New("", "")
	if err != nil {
		log.Fatalf("Failed to create scraper: %v", err)
	}

	var allCourses []scraper.CourseInfo
	var allSections []scraper.SectionInfo
	var courseErrors []string
	var sectionErrors []string

	log.Printf("Starting bulk scrape of %d courses for term %s", len(courses), term)

	for i, c := range courses {
		log.Printf("[%d/%d] Processing %s (%s)", i+1, len(courses), c.CourseID, c.PID)

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		course, err := s.FetchCourseInfo(ctx, c.PID)
		cancel()

		if err != nil {
			log.Printf("  ERROR fetching course info: %v", err)
			courseErrors = append(courseErrors, fmt.Sprintf("%s: %v", c.CourseID, err))
		} else {
			allCourses = append(allCourses, course)
			log.Printf("  ✓ Course info fetched")
		}

		match := courseIDRe.FindStringSubmatch(strings.ToUpper(c.CourseID))
		if match == nil {
			log.Printf("  SKIP sections: couldn't parse courseID %s", c.CourseID)
			time.Sleep(1 * time.Second)
			continue
		}
		subject, number := match[1], match[2]

		ctx2, cancel2 := context.WithTimeout(context.Background(), 30*time.Second)
		sections, err := s.FetchSectionInfo(ctx2, subject, number, term)
		cancel2()

		if err != nil {
			if !strings.Contains(err.Error(), "no sections found") {
				log.Printf("  ERROR fetching sections: %v", err)
				sectionErrors = append(sectionErrors, fmt.Sprintf("%s: %v", c.CourseID, err))
			} else {
				log.Printf("  No sections for term %s", term)
			}
		} else {
			allSections = append(allSections, sections...)
			log.Printf("  ✓ %d sections fetched", len(sections))
		}

		time.Sleep(1 * time.Second)
	}

	coursesOutPath := fmt.Sprintf("%s/courses-scraped.json", outDir)
	if err := writeJSON(coursesOutPath, allCourses); err != nil {
		log.Fatalf("Failed to write courses: %v", err)
	}
	log.Printf("Wrote %d courses to %s", len(allCourses), coursesOutPath)

	sectionsOutPath := fmt.Sprintf("%s/sections-%s.json", outDir, term)
	if err := writeJSON(sectionsOutPath, allSections); err != nil {
		log.Fatalf("Failed to write sections: %v", err)
	}
	log.Printf("Wrote %d sections to %s", len(allSections), sectionsOutPath)

	log.Printf("\n=== Summary ===")
	log.Printf("Courses: %d success, %d errors", len(allCourses), len(courseErrors))
	log.Printf("Sections: %d success, %d errors", len(allSections), len(sectionErrors))

	if len(courseErrors) > 0 || len(sectionErrors) > 0 {
		errorsPath := fmt.Sprintf("%s/errors-%s.json", outDir, term)
		writeJSON(errorsPath, map[string][]string{
			"course_errors":  courseErrors,
			"section_errors": sectionErrors,
		})
		log.Printf("Errors written to %s", errorsPath)
	}
}

func writeJSON(path string, data any) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	return enc.Encode(data)
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
  bulk-scrape     Scrape all courses and sections from courses.json
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
    	Term code (required for fetch-section and bulk-scrape, e.g., 202409)

  -catalog string
    	Catalog ID (optional, uses default if not provided)

  -courses string
    	Path to courses.json (required for bulk-scrape)

  -db string
    	Path to SQLite database (optional, if provided data will be saved)

  -out string
    	Output directory for bulk-scrape (default: ./data)

EXAMPLES:
  # Fetch course info
  go run ./server/cmd/scraper -cmd=fetch-course -pid=your-pid-here

  # Fetch section info
  go run ./server/cmd/scraper -cmd=fetch-section -subject=CSC -number=111 -term=202409

  # Fetch section info with custom catalog
  go run ./server/cmd/scraper -cmd=fetch-section -subject=CSC -number=111 -term=202409 -catalog=your-catalog-id

  # Fetch and save to DB
  go run ./server/cmd/scraper -cmd=fetch-section -subject=CSC -number=111 -term=202409 -db=./server/scheduler.db

  # Bulk scrape all courses and sections for a term
  go run ./server/cmd/scraper -cmd=bulk-scrape -courses=./courses.json -term=202409

  # Bulk scrape with custom output directory
  go run ./server/cmd/scraper -cmd=bulk-scrape -courses=./courses.json -term=202409 -out=./scraped-data
`)
}
