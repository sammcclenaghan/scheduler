-- +goose Up
-- Create the junction table for schedule collaborators
CREATE TABLE schedule_collaborators (
    schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (schedule_id, token)
);

CREATE INDEX idx_schedule_collaborators_token ON schedule_collaborators(token);
CREATE INDEX idx_schedule_collaborators_schedule_id ON schedule_collaborators(schedule_id);

-- Migrate existing data from JSON array to junction table
INSERT INTO schedule_collaborators (schedule_id, token)
SELECT s.id, json_each.value
FROM schedules s, json_each(s.collaborator_tokens)
WHERE s.collaborator_tokens != '[]' AND s.collaborator_tokens IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS schedule_collaborators;
