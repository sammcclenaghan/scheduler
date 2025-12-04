-- +goose Up
ALTER TABLE schedules ADD COLUMN collaborator_tokens TEXT NOT NULL DEFAULT '[]';

-- +goose Down
ALTER TABLE schedules DROP COLUMN collaborator_tokens;
