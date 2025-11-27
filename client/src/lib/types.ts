/**
 * TypeScript types mirroring Go backend structs.
 * Keep in sync with server/db/models.go
 */

/**
 * Course mirrors db.Course from the Go backend.
 * @see server/db/models.go
 */
export interface Course {
  id: number;
  createdAt: string; // time.Time serializes to ISO 8601 string
  updatedAt: string;
  title: string;
  pid: string;
  subjectCode: string;
  description: string;
  credits: string;
  hoursCatalogText: string;
  notes: string;
  preAndCorequisites: string;
}

/**
 * Section mirrors db.Section from the Go backend.
 * @see server/db/models.go
 */
export interface Section {
  id: number;
  createdAt: string;
  updatedAt: string;
  term: string;
  crn: string;
  coursePid: string | null; // sql.NullString
  subject: string;
  courseNumber: string;
  courseName: string;
  section: string;
  scheduleType: string;
  instructionalMethod: string;
  frequency: string;
  time: string;
  days: string;
  location: string;
  dateRange: string;
  instructor: string;
  units: string;
  additionalInformation: string;
  enrollmentActual: number;
  enrollmentMaximum: number;
  enrollmentSeatsAvailable: number;
  waitlistCapacity: number;
  waitlistActual: number;
  waitlistSeatsAvailable: number;
}

