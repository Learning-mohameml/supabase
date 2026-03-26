CREATE INDEX idx_todos_user_id ON todos (user_id);
CREATE INDEX idx_todos_category_id ON todos (category_id);
CREATE INDEX idx_todos_due_date ON todos (due_date);
CREATE INDEX idx_categories_user_id ON categories (user_id);
CREATE INDEX idx_tags_user_id ON tags (user_id);