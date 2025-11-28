package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/mattn/go-sqlite3"
	"github.com/sammcclenaghan/scheduler/db"
)

type ScrapedCourse struct {
	SubjectCode        string `json:"subject_code"`
	Credits            string `json:"credits"`
	PreAndCorequisites string `json:"pre_and_corequisites"`
	Description        string `json:"description"`
	HoursCatalogText   string `json:"hours_catalog_text"`
	PID                string `json:"pid"`
	Notes              string `json:"notes"`
	Title              string `json:"title"`
}

type ScrapedSection struct {
	Term                     string `json:"term"`
	Subject                  string `json:"subject"`
	CourseName               string `json:"course_name"`
	CourseNumber             string `json:"course_number"`
	CRN                      string `json:"crn"`
	Section                  string `json:"section"`
	Frequency                string `json:"frequency"`
	Time                     string `json:"time"`
	Days                     string `json:"days"`
	Location                 string `json:"location"`
	DateRange                string `json:"date_range"`
	ScheduleType             string `json:"schedule_type"`
	Instructor               string `json:"instructor"`
	InstructionalMethod      string `json:"instructional_method"`
	Units                    string `json:"units"`
	AdditionalInformation    string `json:"additional_information"`
	EnrollmentActual         int    `json:"enrollment_actual"`
	EnrollmentMaximum        int    `json:"enrollment_maximum"`
	EnrollmentSeatsAvailable int    `json:"enrollment_seats_available"`
	WaitlistCapacity         int    `json:"waitlist_capacity"`
	WaitlistActual           int    `json:"waitlist_actual"`
	WaitlistSeatsAvailable   int    `json:"waitlist_seats_available"`
}

func main() {
	dbPath := flag.String("db", "", "Path to SQLite database (required)")
	dataDir := flag.String("data", "", "Path to data directory (required)")
	flag.Parse()

	if *dbPath == "" || *dataDir == "" {
		fmt.Println("Usage: seeder -db=<database-path> -data=<data-directory>")
		fmt.Println("\nExample:")
		fmt.Println("  seeder -db=/data/scheduler.db -data=/data")
		os.Exit(1)
	}

	ctx := context.Background()

	conn, err := sql.Open("sqlite3", *dbPath)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer conn.Close()

	if err := conn.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	q := db.New(conn)

	log.Printf("Seeding database from %s", *dataDir)

	// Print files inside the data directory
	entries, err := os.ReadDir(*dataDir)
	if err != nil {
		log.Printf("Failed to read data directory %s: %v", *dataDir, err)
	} else {
		log.Printf("Contents of %s:", *dataDir)
		for _, entry := range entries {
			if entry.IsDir() {
				log.Printf(" - %s/ (dir)", entry.Name())
			} else {
				log.Printf(" - %s", entry.Name())
			}
		}
	}

	// Seed courses
	coursesPath := filepath.Join(*dataDir, "courses-scraped.json")
	if err := seedCourses(ctx, q, coursesPath); err != nil {
		log.Fatalf("Failed to seed courses: %v", err)
	}

	// Build PID index
	pidIndex := buildPIDIndex(ctx, q)

	// Seed sections from all sections-*.json files
	entries, err = os.ReadDir(*dataDir)
	if err != nil {
		log.Fatalf("Failed to read data directory: %v", err)
	}

	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "sections-") && strings.HasSuffix(entry.Name(), ".json") {
			sectionsPath := filepath.Join(*dataDir, entry.Name())
			if err := seedSections(ctx, q, sectionsPath, pidIndex); err != nil {
				log.Printf("Warning: failed to seed %s: %v", entry.Name(), err)
			}
		}
	}

	log.Println("Seeding completed successfully")
}

func seedCourses(ctx context.Context, q *db.Queries, path string) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("could not open %s: %w", path, err)
	}
	defer file.Close()

	var courses []ScrapedCourse
	if err := json.NewDecoder(file).Decode(&courses); err != nil {
		return fmt.Errorf("failed to decode %s: %w", path, err)
	}

	log.Printf("Seeding %d courses from %s", len(courses), filepath.Base(path))

	for _, c := range courses {
		err := q.UpsertCourse(ctx, db.UpsertCourseParams{
			Title:              c.Title,
			Pid:                c.PID,
			SubjectCode:        c.SubjectCode,
			Description:        c.Description,
			Credits:            c.Credits,
			HoursCatalogText:   c.HoursCatalogText,
			Notes:              c.Notes,
			PreAndCorequisites: c.PreAndCorequisites,
		})
		if err != nil {
			return fmt.Errorf("failed to upsert course %s: %w", c.PID, err)
		}
	}

	log.Printf("Courses seeded successfully")
	return nil
}

func buildPIDIndex(ctx context.Context, q *db.Queries) map[string]string {
	index := make(map[string]string)

	courses, err := q.ListCourses(ctx, db.ListCoursesParams{Limit: 10000, Offset: 0})
	if err != nil {
		log.Printf("Warning: failed to list courses for PID index: %v", err)
		return index
	}

	for _, c := range courses {
		key := strings.ToUpper(strings.TrimSpace(c.SubjectCode))
		index[key] = c.Pid
	}

	log.Printf("Built PID index with %d entries", len(index))
	return index
}

func seedSections(ctx context.Context, q *db.Queries, path string, pidIndex map[string]string) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("could not open %s: %w", path, err)
	}
	defer file.Close()

	var sections []ScrapedSection
	if err := json.NewDecoder(file).Decode(&sections); err != nil {
		return fmt.Errorf("failed to decode %s: %w", path, err)
	}

	log.Printf("Seeding %d sections from %s", len(sections), filepath.Base(path))

	for _, s := range sections {
		key := strings.ToUpper(fmt.Sprintf("%s %s", s.Subject, s.CourseNumber))
		pid := pidIndex[key]
		var pidPtr *string
		if pid != "" {
			pidPtr = &pid
		}

		err := q.UpsertSection(ctx, db.UpsertSectionParams{
			Term:                     s.Term,
			Crn:                      s.CRN,
			CoursePid:                pidPtr,
			Subject:                  s.Subject,
			CourseNumber:             s.CourseNumber,
			CourseName:               s.CourseName,
			Section:                  s.Section,
			ScheduleType:             s.ScheduleType,
			InstructionalMethod:      s.InstructionalMethod,
			Frequency:                s.Frequency,
			Time:                     s.Time,
			Days:                     s.Days,
			Location:                 s.Location,
			DateRange:                s.DateRange,
			Instructor:               s.Instructor,
			Units:                    s.Units,
			AdditionalInformation:    s.AdditionalInformation,
			EnrollmentActual:         int64(s.EnrollmentActual),
			EnrollmentMaximum:        int64(s.EnrollmentMaximum),
			EnrollmentSeatsAvailable: int64(s.EnrollmentSeatsAvailable),
			WaitlistCapacity:         int64(s.WaitlistCapacity),
			WaitlistActual:           int64(s.WaitlistActual),
			WaitlistSeatsAvailable:   int64(s.WaitlistSeatsAvailable),
		})
		if err != nil {
			return fmt.Errorf("failed to upsert section %s: %w", s.CRN, err)
		}
	}

	log.Printf("Sections seeded successfully")
	return nil
}
