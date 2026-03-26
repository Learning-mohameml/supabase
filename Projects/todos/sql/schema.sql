-- Step 1: Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Create tables

CREATE TABLE categories (
    id uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    color text NOT NULL DEFAULT '#6B7280',
    icon text,
    user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE todos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    completed boolean NOT NULL DEFAULT false,
    priority integer NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
    due_date timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    position integer NOT NULL DEFAULT 0,
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    embedding vector(384)
);

CREATE TABLE tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    color text NOT NULL DEFAULT '#3B82F6',
    user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (name, user_id)
);

CREATE TABLE todo_tags (
    todo_id uuid REFERENCES todos(id) ON DELETE CASCADE,
    tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
);

-- Step 3: Trigger

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON todos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Step 4: Indexes

CREATE INDEX idx_todos_user_id ON todos (user_id);
CREATE INDEX idx_todos_category_id ON todos (category_id);
CREATE INDEX idx_todos_due_date ON todos (due_date);
CREATE INDEX idx_categories_user_id ON categories (user_id);
CREATE INDEX idx_tags_user_id ON tags (user_id);

-- Step 5: Seed Data

DO $$
DECLARE
  test_user_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
BEGIN
  RAISE NOTICE 'Test user ID: %', test_user_id;
END $$;

-- Insert categories (fixed UUIDs so todos can reference them)
INSERT INTO categories (id, user_id, name, color)
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Work', '#EF4444'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Personal', '#3B82F6'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Learning', '#10B981');

-- Insert todos (explicit category assignments)
INSERT INTO todos (user_id, category_id, title, description, priority, due_date, completed, metadata, deleted_at)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Finish report', 'Complete Q1 report', 3, NOW() + INTERVAL '1 day', false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Email client', NULL, 2, NOW() + INTERVAL '2 days', false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Gym session', 'Leg day', 1, NULL, false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Buy groceries', NULL, 0, NULL, true, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Read book', 'Read 30 pages', 1, NULL, false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Learn PostgreSQL', 'Triggers & indexes', 2, NOW() + INTERVAL '3 days', false, '{"notes": "check docs", "url": "https://supabase.com"}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Fix bug', 'Critical API issue', 3, NOW() + INTERVAL '5 hours', false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Call friend', NULL, 0, NULL, true, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Start side project', 'Quant tool idea', 2, NULL, false, '{}', NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Review PR', NULL, 2, NOW() + INTERVAL '1 day', false, '{}', NULL);

-- Insert tags (fixed UUIDs for deterministic tag assignments)
INSERT INTO tags (id, user_id, name)
VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'urgent'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'quick-win'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'blocked'),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'review'),
  ('cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'idea');

-- Assign tags to todos (deterministic: specific todos get specific tags)
-- "Finish report" → urgent + blocked (2 tags on 1 todo)
-- "Fix bug" → urgent + review (urgent on multiple todos)
-- "Buy groceries" → quick-win
-- "Start side project" → idea
-- "Review PR" → review (review on multiple todos)
INSERT INTO todo_tags (todo_id, tag_id)
SELECT t.id, 'cccccccc-0000-0000-0000-000000000001'::uuid FROM todos t WHERE t.title = 'Finish report'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000003'::uuid FROM todos t WHERE t.title = 'Finish report'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000001'::uuid FROM todos t WHERE t.title = 'Fix bug'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000004'::uuid FROM todos t WHERE t.title = 'Fix bug'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000002'::uuid FROM todos t WHERE t.title = 'Buy groceries'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000005'::uuid FROM todos t WHERE t.title = 'Start side project'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000004'::uuid FROM todos t WHERE t.title = 'Review PR';
