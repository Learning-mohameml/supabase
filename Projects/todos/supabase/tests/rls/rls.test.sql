begin;

select plan(20);

create or replace function pg_temp.try_insert_category(p_user_id uuid)
returns text
language plpgsql
as $$
begin
  insert into public.categories (name, color, user_id)
  values ('RLS category probe', '#111111', p_user_id);
  return 'ok';
exception
  when others then
    return sqlstate;
end;
$$;

create or replace function pg_temp.try_insert_todo(p_user_id uuid)
returns text
language plpgsql
as $$
begin
  insert into public.todos (title, description, priority, user_id)
  values ('RLS todo probe', 'probe', 1, p_user_id);
  return 'ok';
exception
  when others then
    return sqlstate;
end;
$$;

create or replace function pg_temp.try_update_bob_todo()
returns integer
language plpgsql
as $$
declare
  affected integer;
begin
  update public.todos
     set title = 'Alice tried to update Bob'
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002'
     and title = 'Bob task 1';

  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function pg_temp.try_delete_bob_todo()
returns integer
language plpgsql
as $$
declare
  affected integer;
begin
  delete from public.todos
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000002'
     and title = 'Bob task 2';

  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function pg_temp.try_insert_tag(p_user_id uuid)
returns text
language plpgsql
as $$
begin
  insert into public.tags (name, color, user_id)
  values ('rls-tag-probe', '#222222', p_user_id);
  return 'ok';
exception
  when others then
    return sqlstate;
end;
$$;

create or replace function pg_temp.try_insert_todo_tag(p_todo_id uuid, p_tag_id uuid)
returns text
language plpgsql
as $$
begin
  insert into public.todo_tags (todo_id, tag_id)
  values (p_todo_id, p_tag_id);
  return 'ok';
exception
  when others then
    return sqlstate;
end;
$$;

create or replace function pg_temp.try_delete_bob_todo_tag()
returns integer
language plpgsql
as $$
declare
  affected integer;
begin
  delete from public.todo_tags
   where todo_id = (
     select id
     from public.todos
     where user_id = 'aaaaaaaa-0000-0000-0000-000000000002'
       and title = 'Bob task 1'
     limit 1
   );

  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Categories RLS
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select is((select count(*)::int from public.categories), 3, 'Alice should only see her categories');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', true);
select is((select count(*)::int from public.categories), 1, 'Bob should only see his categories');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::int from public.categories), 0, 'Anonymous users should not see categories');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select is(
  pg_temp.try_insert_category('aaaaaaaa-0000-0000-0000-000000000002'),
  '42501',
  'Alice should not be able to insert a category for Bob'
);

-- Todos RLS
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select is((select count(*)::int from public.todos), 10, 'Alice should only see her todos');
select is(
  pg_temp.try_insert_todo('aaaaaaaa-0000-0000-0000-000000000001'),
  'ok',
  'Alice should be able to insert her own todo'
);
select is(
  pg_temp.try_insert_todo('aaaaaaaa-0000-0000-0000-000000000002'),
  '42501',
  'Alice should not be able to insert a todo for Bob'
);
select is(
  pg_temp.try_update_bob_todo(),
  0,
  'Alice should not be able to update Bob''s todo'
);
select is(
  pg_temp.try_delete_bob_todo(),
  0,
  'Alice should not be able to delete Bob''s todo'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', true);
select is((select count(*)::int from public.todos), 2, 'Bob should only see his todos');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::int from public.todos), 0, 'Anonymous users should not see todos');

-- Tags RLS
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select is((select count(*)::int from public.tags), 5, 'Alice should only see her tags');
select is(
  pg_temp.try_insert_tag('aaaaaaaa-0000-0000-0000-000000000002'),
  '42501',
  'Alice should not be able to insert a tag for Bob'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', true);
select is((select count(*)::int from public.tags), 0, 'Bob should not see Alice''s tags');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::int from public.tags), 0, 'Anonymous users should not see tags');

-- Todo tags RLS
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select is((select count(*)::int from public.todo_tags), 7, 'Alice should only see todo_tags linked to her todos');
select is(
  pg_temp.try_insert_todo_tag(
    (
      select id
      from public.todos
      where user_id = 'aaaaaaaa-0000-0000-0000-000000000002'
        and title = 'Bob task 1'
      limit 1
    ),
    'cccccccc-0000-0000-0000-000000000001'
  ),
  '42501',
  'Alice should not be able to link Bob''s todo to her tag'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);

insert into public.tags (id, user_id, name, color)
values ('cccccccc-0000-0000-0000-000000000099', 'aaaaaaaa-0000-0000-0000-000000000002', 'bob-private', '#000000');

insert into public.todo_tags (todo_id, tag_id)
select id, 'cccccccc-0000-0000-0000-000000000099'
from public.todos
where user_id = 'aaaaaaaa-0000-0000-0000-000000000002'
  and title = 'Bob task 1'
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

select is(
  pg_temp.try_delete_bob_todo_tag(),
  0,
  'Alice should not be able to delete Bob''s todo_tags'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', true);
select is((select count(*)::int from public.todo_tags), 1, 'Bob should only see todo_tags linked to his todos');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::int from public.todo_tags), 0, 'Anonymous users should not see todo_tags');

select * from finish();

rollback;
