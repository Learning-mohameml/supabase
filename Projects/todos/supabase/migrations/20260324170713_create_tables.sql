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