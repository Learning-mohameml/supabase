begin;

select plan(10);

-- Function exists
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'delete_user'
  ),
  'public.delete_user() should exist'
);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'update_updated_at'
  ),
  'public.update_updated_at() should exist'
);

-- Trigger exists on todos
select ok(
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'todos'
      and t.tgname = 'set_updated_at'
      and not t.tgisinternal
  ),
  'set_updated_at trigger should exist on public.todos'
);

-- Trigger behavior
create or replace function pg_temp.updated_at_changed()
returns boolean
language plpgsql
as $$
declare
  target_id uuid;
  before_updated_at timestamptz;
  after_updated_at timestamptz;
begin
  select id, updated_at
    into target_id, before_updated_at
  from public.todos
  where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
    and deleted_at is null
  order by created_at
  limit 1;

  perform pg_sleep(0.01);

  update public.todos
     set title = title || ' [updated by test]'
   where id = target_id;

  select updated_at
    into after_updated_at
  from public.todos
  where id = target_id;

  return after_updated_at > before_updated_at;
end;
$$;

select ok(
  pg_temp.updated_at_changed(),
  'updating a todo should refresh updated_at via the set_updated_at trigger'
);

-- delete_user() behavior
select is(
  (select count(*)::int from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'Alice should exist before delete_user()'
);

select is(
  (select count(*)::int from public.todos where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  10,
  'Alice should have seeded todos before delete_user()'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
select public.delete_user();

reset role;
select set_config('request.jwt.claim.sub', '', true);

select is(
  (select count(*)::int from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'delete_user() should remove the current auth user'
);

select is(
  (select count(*)::int from public.categories where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'deleting the auth user should cascade to categories'
);

select is(
  (select count(*)::int from public.todos where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'deleting the auth user should cascade to todos'
);

select is(
  (select count(*)::int from public.tags where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'deleting the auth user should cascade to tags'
);

select * from finish();

rollback;
