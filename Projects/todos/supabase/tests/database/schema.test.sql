begin;

select plan(29);

-- ---------------------------------------------------------------------------
-- Tables exist
-- ---------------------------------------------------------------------------

select has_table('public', 'categories', 'categories table should exist');
select has_table('public', 'todos', 'todos table should exist');
select has_table('public', 'tags', 'tags table should exist');
select has_table('public', 'todo_tags', 'todo_tags table should exist');

-- ---------------------------------------------------------------------------
-- Key columns exist
-- ---------------------------------------------------------------------------

select has_column('public', 'categories', 'id', 'categories.id should exist');
select has_column('public', 'categories', 'user_id', 'categories.user_id should exist');
select has_column('public', 'todos', 'id', 'todos.id should exist');
select has_column('public', 'todos', 'user_id', 'todos.user_id should exist');
select has_column('public', 'todos', 'category_id', 'todos.category_id should exist');
select has_column('public', 'todos', 'metadata', 'todos.metadata should exist');
select has_column('public', 'tags', 'id', 'tags.id should exist');
select has_column('public', 'tags', 'user_id', 'tags.user_id should exist');
select has_column('public', 'todo_tags', 'todo_id', 'todo_tags.todo_id should exist');
select has_column('public', 'todo_tags', 'tag_id', 'todo_tags.tag_id should exist');

-- ---------------------------------------------------------------------------
-- Primary keys
-- ---------------------------------------------------------------------------

select col_is_pk('public', 'categories', 'id', 'categories.id should be the primary key');
select col_is_pk('public', 'todos', 'id', 'todos.id should be the primary key');
select col_is_pk('public', 'tags', 'id', 'tags.id should be the primary key');

select ok(
  exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
   where tc.table_schema = 'public'
     and tc.table_name = 'todo_tags'
     and tc.constraint_type = 'PRIMARY KEY'
   group by tc.constraint_name
  having array_agg(kcu.column_name::text order by kcu.ordinal_position) = array['todo_id', 'tag_id']::text[]
  ),
  'todo_tags should use a composite primary key on (todo_id, tag_id)'
);

-- ---------------------------------------------------------------------------
-- Important defaults
-- ---------------------------------------------------------------------------

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'todos'
      and column_name = 'completed'
      and column_default = 'false'
  ),
  'todos.completed should default to false'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'todos'
      and column_name = 'priority'
      and column_default = '0'
  ),
  'todos.priority should default to 0'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'todos'
      and column_name = 'metadata'
      and column_default like '''{}''::jsonb%'
  ),
  'todos.metadata should default to an empty JSON object'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'categories'
      and column_name = 'id'
      and column_default like 'gen_random_uuid()%'
  ),
  'categories.id should default to gen_random_uuid()'
);

-- ---------------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------------

select ok(
  exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'tags'
      and constraint_type = 'UNIQUE'
      and constraint_name = 'tags_name_user_id_key'
  ),
  'tags should enforce a unique constraint on (name, user_id)'
);

select ok(
  exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
     and tc.table_schema = ccu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'todos'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'category_id'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'categories'
      and ccu.column_name = 'id'
  ),
  'todos.category_id should reference categories.id'
);

select ok(
  exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
     and tc.table_schema = ccu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'todo_tags'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'todo_id'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'todos'
      and ccu.column_name = 'id'
  ),
  'todo_tags.todo_id should reference todos.id'
);

select ok(
  exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
     and tc.table_schema = ccu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'todo_tags'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'tag_id'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'tags'
      and ccu.column_name = 'id'
  ),
  'todo_tags.tag_id should reference tags.id'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class cls on cls.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    join pg_attribute att
      on att.attrelid = c.conrelid
     and att.attnum = any(c.conkey)
    join pg_class refcls on refcls.oid = c.confrelid
    join pg_namespace refnsp on refnsp.oid = refcls.relnamespace
    join pg_attribute refatt
      on refatt.attrelid = c.confrelid
     and refatt.attnum = any(c.confkey)
    where c.contype = 'f'
      and nsp.nspname = 'public'
      and cls.relname = 'categories'
      and att.attname = 'user_id'
      and refnsp.nspname = 'auth'
      and refcls.relname = 'users'
      and refatt.attname = 'id'
  ),
  'categories.user_id should reference auth.users.id'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class cls on cls.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    join pg_attribute att
      on att.attrelid = c.conrelid
     and att.attnum = any(c.conkey)
    join pg_class refcls on refcls.oid = c.confrelid
    join pg_namespace refnsp on refnsp.oid = refcls.relnamespace
    join pg_attribute refatt
      on refatt.attrelid = c.confrelid
     and refatt.attnum = any(c.confkey)
    where c.contype = 'f'
      and nsp.nspname = 'public'
      and cls.relname = 'todos'
      and att.attname = 'user_id'
      and refnsp.nspname = 'auth'
      and refcls.relname = 'users'
      and refatt.attname = 'id'
  ),
  'todos.user_id should reference auth.users.id'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class cls on cls.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    join pg_attribute att
      on att.attrelid = c.conrelid
     and att.attnum = any(c.conkey)
    join pg_class refcls on refcls.oid = c.confrelid
    join pg_namespace refnsp on refnsp.oid = refcls.relnamespace
    join pg_attribute refatt
      on refatt.attrelid = c.confrelid
     and refatt.attnum = any(c.confkey)
    where c.contype = 'f'
      and nsp.nspname = 'public'
      and cls.relname = 'tags'
      and att.attname = 'user_id'
      and refnsp.nspname = 'auth'
      and refcls.relname = 'users'
      and refatt.attname = 'id'
  ),
  'tags.user_id should reference auth.users.id'
);

select * from finish();

rollback;
