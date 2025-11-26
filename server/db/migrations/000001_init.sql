-- +goose Up
CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    pid VARCHAR(255) NOT NULL UNIQUE,
    subject_code VARCHAR(50) NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    credits VARCHAR(50) NOT NULL DEFAULT '',
    hours_catalog_text TEXT NOT NULL,
    notes TEXT NOT NULL,
    pre_and_corequisites TEXT NOT NULL
);

CREATE INDEX idx_courses_pid ON courses(pid);
CREATE INDEX idx_courses_subject_code ON courses(subject_code);
CREATE INDEX idx_courses_created_at ON courses(created_at);
-- SQLite does not support prefix indexing
CREATE INDEX idx_courses_description ON courses(description);
CREATE INDEX idx_courses_subject_id ON courses(subject_code, pid);
-- SQLite does not support prefix indexing
CREATE INDEX idx_courses_pre_and_coreq ON courses(pre_and_corequisites);

CREATE TABLE sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    term VARCHAR(50) NOT NULL,
    crn VARCHAR(50) NOT NULL,
    course_pid VARCHAR(255),

    subject VARCHAR(50) NOT NULL,
    course_number VARCHAR(50) NOT NULL,
    course_name TEXT NOT NULL,
    section VARCHAR(50) NOT NULL,

    schedule_type VARCHAR(255) NOT NULL DEFAULT '',
    instructional_method VARCHAR(255) NOT NULL DEFAULT '',
    frequency VARCHAR(255) NOT NULL DEFAULT '',
    time VARCHAR(255) NOT NULL DEFAULT '',
    days VARCHAR(50) NOT NULL DEFAULT '',
    location VARCHAR(255) NOT NULL DEFAULT '',
    date_range VARCHAR(255) NOT NULL DEFAULT '',
    instructor VARCHAR(255) NOT NULL DEFAULT '',
    units VARCHAR(50) NOT NULL DEFAULT '',
    additional_information TEXT NOT NULL,

    enrollment_actual INT NOT NULL DEFAULT 0,
    enrollment_maximum INT NOT NULL DEFAULT 0,
    enrollment_seats_available INT NOT NULL DEFAULT 0,
    waitlist_capacity INT NOT NULL DEFAULT 0,
    waitlist_actual INT NOT NULL DEFAULT 0,
    waitlist_seats_available INT NOT NULL DEFAULT 0,

    UNIQUE (term, crn),
    FOREIGN KEY (course_pid) REFERENCES courses(pid) ON DELETE SET NULL
);

CREATE INDEX idx_sections_term_crn ON sections(term, crn);
CREATE INDEX idx_sections_course_pid ON sections(course_pid);
CREATE INDEX idx_sections_subject_number ON sections(subject, course_number);
CREATE INDEX idx_sections_instructor ON sections(instructor);

-- +goose Down
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS courses;
