-- +goose Up
CREATE TABLE schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    token VARCHAR(36) NOT NULL,
    term VARCHAR(50) NOT NULL,
    section_crns TEXT NOT NULL DEFAULT '[]',
    UNIQUE (token, term)
);

CREATE INDEX idx_schedules_token ON schedules(token);
CREATE INDEX idx_schedules_token_term ON schedules(token, term);

-- +goose Down
DROP TABLE IF EXISTS schedules;
