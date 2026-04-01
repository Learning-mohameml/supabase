-- =============================================================================
-- SEED DATA
-- Runs as postgres superuser — RLS is bypassed.
-- Users are pre-inserted into auth.users so magic link login reuses the UUID.
-- Sign in locally via magic link at http://localhost:54324 (Inbucket).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Auth users (no password — sign in via magic link)
-- Columns match the actual auth.users schema (no auth.identities in this version)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  id, email, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role,
  instance_id
)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'alice@test.com',
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Alice"}',
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'bob@test.com',
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Bob"}',
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Auth identities (required — without this, magic link can't find the user)
-- email column is generated, so we skip it.
-- -----------------------------------------------------------------------------
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'alice@test.com',
    '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "email": "alice@test.com"}',
    'email',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'bob@test.com',
    '{"sub": "aaaaaaaa-0000-0000-0000-000000000002", "email": "bob@test.com"}',
    'email',
    now(), now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Categories
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, user_id, name, color)
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Work',     '#EF4444'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Personal', '#3B82F6'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Learning', '#10B981'),
  -- Bob's categories (to test RLS isolation)
  ('bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002', 'Work',     '#EF4444');

-- -----------------------------------------------------------------------------
-- Todos
-- -----------------------------------------------------------------------------
INSERT INTO todos (user_id, category_id, title, description, priority, due_date, completed, metadata, deleted_at)
VALUES
  -- Alice's todos
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Finish report',      'Complete Q1 report',      3, NOW() + INTERVAL '1 day',   false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Email client',       NULL,                      2, NOW() + INTERVAL '2 days',  false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Gym session',        'Leg day',                 1, NULL,                        false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Buy groceries',      NULL,                      0, NULL,                        true,  '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Read book',          'Read 30 pages',           1, NULL,                        false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Learn PostgreSQL',   'Triggers & indexes',      2, NOW() + INTERVAL '3 days',  false, '{"notes": "check docs"}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Fix bug',            'Critical API issue',      3, NOW() + INTERVAL '5 hours', false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Call friend',        NULL,                      0, NULL,                        true,  '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Start side project', 'Quant tool idea',         2, NULL,                        false, '{}', NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Review PR',          NULL,                      2, NOW() + INTERVAL '1 day',   false, '{}', NULL),
  -- Bob's todos (to test RLS isolation — Alice must never see these)
  ('aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000004', 'Bob task 1',         'Bob only',                1, NULL,                        false, '{}', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000004', 'Bob task 2',         'Bob only',                2, NULL,                        false, '{}', NULL);

-- -----------------------------------------------------------------------------
-- Tags
-- -----------------------------------------------------------------------------
INSERT INTO tags (id, user_id, name, color)
VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'urgent',    '#EF4444'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'quick-win', '#10B981'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'blocked',   '#F59E0B'),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'review',    '#6366F1'),
  ('cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'idea',      '#8B5CF6');

-- -----------------------------------------------------------------------------
-- Tag assignments
-- -----------------------------------------------------------------------------
-- "Finish report"      → urgent + blocked
-- "Fix bug"            → urgent + review
-- "Buy groceries"      → quick-win
-- "Start side project" → idea
-- "Review PR"          → review
INSERT INTO todo_tags (todo_id, tag_id)
SELECT t.id, 'cccccccc-0000-0000-0000-000000000001'::uuid FROM todos t WHERE t.title = 'Finish report'      AND t.user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000003'::uuid FROM todos t WHERE t.title = 'Finish report'      AND t.user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000001'::uuid FROM todos t WHERE t.title = 'Fix bug'            AND t.user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000004'::uuid FROM todos t WHERE t.title = 'Fix bug'            AND t.user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000002'::uuid FROM todos t WHERE t.title = 'Buy groceries'      AND t.user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000005'::uuid FROM todos t WHERE t.title = 'Start side project' AND t.user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
UNION ALL
SELECT t.id, 'cccccccc-0000-0000-0000-000000000004'::uuid FROM todos t WHERE t.title = 'Review PR'          AND t.user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
