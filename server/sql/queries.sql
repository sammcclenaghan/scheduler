-- Courses queries

-- name: GetCourse :one
SELECT id, created_at, updated_at, title, pid, subject_code, description, credits, hours_catalog_text, notes, pre_and_corequisites
FROM courses
WHERE id = ? LIMIT 1;

-- name: GetCourseByPID :one
SELECT id, created_at, updated_at, title, pid, subject_code, description, credits, hours_catalog_text, notes, pre_and_corequisites
FROM courses
WHERE pid = ? LIMIT 1;

-- name: ListCourses :many
SELECT id, created_at, updated_at, title, pid, subject_code, description, credits, hours_catalog_text, notes, pre_and_corequisites
FROM courses
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: UpsertCourse :exec
INSERT INTO courses (title, pid, subject_code, description, credits, hours_catalog_text, notes, pre_and_corequisites)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(pid) DO UPDATE SET
    title = excluded.title,
    subject_code = excluded.subject_code,
    description = excluded.description,
    credits = excluded.credits,
    hours_catalog_text = excluded.hours_catalog_text,
    notes = excluded.notes,
    pre_and_corequisites = excluded.pre_and_corequisites,
    updated_at = CURRENT_TIMESTAMP;

-- name: ListSectionsByCourseAndTerm :many
SELECT id, created_at, updated_at, term, crn, course_pid, subject, course_number, course_name, section, schedule_type, instructional_method, frequency, time, days, location, date_range, instructor, units, additional_information, enrollment_actual, enrollment_maximum, enrollment_seats_available, waitlist_capacity, waitlist_actual, waitlist_seats_available
FROM sections
WHERE course_pid = ? AND term = ?
ORDER BY crn ASC;

-- name: ListSectionsByCourse :many
SELECT id, created_at, updated_at, term, crn, course_pid, subject, course_number, course_name, section, schedule_type, instructional_method, frequency, time, days, location, date_range, instructor, units, additional_information, enrollment_actual, enrollment_maximum, enrollment_seats_available, waitlist_capacity, waitlist_actual, waitlist_seats_available
FROM sections
WHERE course_pid = ?
ORDER BY term DESC, crn ASC;

-- name: UpsertSection :exec
INSERT INTO sections (term, crn, course_pid, subject, course_number, course_name, section, schedule_type, instructional_method, frequency, time, days, location, date_range, instructor, units, additional_information, enrollment_actual, enrollment_maximum, enrollment_seats_available, waitlist_capacity, waitlist_actual, waitlist_seats_available)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(term, crn) DO UPDATE SET
    course_pid = excluded.course_pid,
    subject = excluded.subject,
    course_number = excluded.course_number,
    course_name = excluded.course_name,
    section = excluded.section,
    schedule_type = excluded.schedule_type,
    instructional_method = excluded.instructional_method,
    frequency = excluded.frequency,
    time = excluded.time,
    days = excluded.days,
    location = excluded.location,
    date_range = excluded.date_range,
    instructor = excluded.instructor,
    units = excluded.units,
    additional_information = excluded.additional_information,
    enrollment_actual = excluded.enrollment_actual,
    enrollment_maximum = excluded.enrollment_maximum,
    enrollment_seats_available = excluded.enrollment_seats_available,
    waitlist_capacity = excluded.waitlist_capacity,
    waitlist_actual = excluded.waitlist_actual,
    waitlist_seats_available = excluded.waitlist_seats_available,
    updated_at = CURRENT_TIMESTAMP;

-- name: SearchCoursesBySubjectCode :many
SELECT id, created_at, updated_at, title, pid, subject_code, description, credits, hours_catalog_text, notes, pre_and_corequisites
FROM courses
WHERE subject_code LIKE ? || '%' OR REPLACE(subject_code, ' ', '') LIKE REPLACE(?, ' ', '') || '%'
ORDER BY subject_code
LIMIT 50;

-- name: SearchCoursesBySubjectCodeAndTerm :many
SELECT DISTINCT c.id, c.created_at, c.updated_at, c.title, c.pid, c.subject_code, c.description, c.credits, c.hours_catalog_text, c.notes, c.pre_and_corequisites
FROM courses c
INNER JOIN sections s ON (s.subject || s.course_number) = REPLACE(c.subject_code, ' ', '')
WHERE (c.subject_code LIKE ? || '%' OR REPLACE(c.subject_code, ' ', '') LIKE REPLACE(?, ' ', '') || '%')
  AND s.term = ?
ORDER BY c.subject_code
LIMIT 50;

-- name: GetCourseBySubjectCode :one
SELECT id, created_at, updated_at, title, pid, subject_code, description, credits, hours_catalog_text, notes, pre_and_corequisites
FROM courses
WHERE subject_code = ? OR REPLACE(subject_code, ' ', '') = REPLACE(?, ' ', '')
LIMIT 1;

-- Schedule queries

-- name: GetSchedule :one
SELECT id, created_at, updated_at, token, term, section_crns
FROM schedules
WHERE token = ? AND term = ?
LIMIT 1;

-- name: UpsertSchedule :exec
INSERT INTO schedules (token, term, section_crns)
VALUES (?, ?, ?)
ON CONFLICT(token, term) DO UPDATE SET
    section_crns = excluded.section_crns,
    updated_at = CURRENT_TIMESTAMP;

-- name: DeleteSchedule :exec
DELETE FROM schedules
WHERE token = ? AND term = ?;

-- name: ListSchedulesByToken :many
SELECT id, created_at, updated_at, token, term, section_crns
FROM schedules
WHERE token = ?
ORDER BY term DESC;

-- name: GetSectionByCRN :one
SELECT id, created_at, updated_at, term, crn, course_pid, subject, course_number, course_name, section, schedule_type, instructional_method, frequency, time, days, location, date_range, instructor, units, additional_information, enrollment_actual, enrollment_maximum, enrollment_seats_available, waitlist_capacity, waitlist_actual, waitlist_seats_available
FROM sections
WHERE term = ? AND crn = ?
LIMIT 1;

