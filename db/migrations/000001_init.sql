-- +goose Up
CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    pid VARCHAR(255) NOT NULL UNIQUE,
    subject_code VARCHAR(50) NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    credits VARCHAR(50) NOT NULL DEFAULT '',
    hours_catalog_text TEXT NOT NULL,
    notes TEXT NOT NULL,
    pre_and_corequisites TEXT NOT NULL,

    INDEX idx_courses_pid (pid),
    INDEX idx_courses_subject_code (subject_code),
    INDEX idx_courses_created_at (created_at),
    INDEX idx_courses_description (description(255)),
    INDEX idx_courses_subject_id (subject_code, pid),
    INDEX idx_courses_pre_and_coreq (pre_and_corequisites(255))
);

CREATE TABLE sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

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

    UNIQUE KEY unique_term_crn (term, crn),
    FOREIGN KEY (course_pid) REFERENCES courses(pid) ON DELETE SET NULL,

    INDEX idx_sections_term_crn (term, crn),
    INDEX idx_sections_course_pid (course_pid),
    INDEX idx_sections_subject_number (subject, course_number),
    INDEX idx_sections_instructor (instructor)
);

-- +goose Down
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS courses;
