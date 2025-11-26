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

-- name: CreateCourse :exec
INSERT INTO courses (title, pid, subject_code, description, credits, hours_catalog_text, notes, pre_and_corequisites)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateCourse :exec
UPDATE courses
SET title = ?, subject_code = ?, description = ?, credits = ?, hours_catalog_text = ?, notes = ?, pre_and_corequisites = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ?;

-- name: DeleteCourse :exec
DELETE FROM courses
WHERE id = ?;

-- Sections queries

-- name: GetSection :one
SELECT id, created_at, updated_at, term, crn, course_pid, subject, course_number, course_name, section, schedule_type, instructional_method, frequency, time, days, location, date_range, instructor, units, additional_information, enrollment_actual, enrollment_maximum, enrollment_seats_available, waitlist_capacity, waitlist_actual, waitlist_seats_available
FROM sections
WHERE id = ? LIMIT 1;

-- name: GetSectionByTermCRN :one
SELECT id, created_at, updated_at, term, crn, course_pid, subject, course_number, course_name, section, schedule_type, instructional_method, frequency, time, days, location, date_range, instructor, units, additional_information, enrollment_actual, enrollment_maximum, enrollment_seats_available, waitlist_capacity, waitlist_actual, waitlist_seats_available
FROM sections
WHERE term = ? AND crn = ? LIMIT 1;

-- name: ListSectionsByTerm :many
SELECT id, created_at, updated_at, term, crn, course_pid, subject, course_number, course_name, section, schedule_type, instructional_method, frequency, time, days, location, date_range, instructor, units, additional_information, enrollment_actual, enrollment_maximum, enrollment_seats_available, waitlist_capacity, waitlist_actual, waitlist_seats_available
FROM sections
WHERE term = ?
ORDER BY crn ASC;

-- name: ListSectionsByCourse :many
SELECT id, created_at, updated_at, term, crn, course_pid, subject, course_number, course_name, section, schedule_type, instructional_method, frequency, time, days, location, date_range, instructor, units, additional_information, enrollment_actual, enrollment_maximum, enrollment_seats_available, waitlist_capacity, waitlist_actual, waitlist_seats_available
FROM sections
WHERE course_pid = ?
ORDER BY term DESC, crn ASC;

-- name: CreateSection :exec
INSERT INTO sections (term, crn, course_pid, subject, course_number, course_name, section, schedule_type, instructional_method, frequency, time, days, location, date_range, instructor, units, additional_information, enrollment_actual, enrollment_maximum, enrollment_seats_available, waitlist_capacity, waitlist_actual, waitlist_seats_available)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateSection :exec
UPDATE sections
SET term = ?, crn = ?, course_pid = ?, subject = ?, course_number = ?, course_name = ?, section = ?, schedule_type = ?, instructional_method = ?, frequency = ?, time = ?, days = ?, location = ?, date_range = ?, instructor = ?, units = ?, additional_information = ?, enrollment_actual = ?, enrollment_maximum = ?, enrollment_seats_available = ?, waitlist_capacity = ?, waitlist_actual = ?, waitlist_seats_available = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ?;

-- name: DeleteSection :exec
DELETE FROM sections
WHERE id = ?;
