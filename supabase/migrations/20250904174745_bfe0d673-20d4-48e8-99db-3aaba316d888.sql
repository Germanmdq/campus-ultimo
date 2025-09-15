-- Hacer program_id opcional en la tabla courses
ALTER TABLE courses ALTER COLUMN program_id DROP NOT NULL;