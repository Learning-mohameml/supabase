-- Practice : 

-- step 1 : =============== create  =============
create type type_cour as enum ('info', 'math', 'finance');

create table cours (
    id int generated always as identity primary key,
    name text,
    is_done boolean default false,
    created_at timestamptz default now(),
    type type_cour not null,
    data jsonb not null default '{}'::jsonb,
    topics text[] default array[]::text[]
);

-- setp 2 : =============== add data ==================
insert into cours (name, is_done, type, data, topics)
values 
(
  'Learn PostgreSQL',
  true,
  'info',
  '{"level": "beginner", "duration": 10}',
  array['sql', 'database']
),
(
  'Quant Finance',
  false,
  'finance',
  '{"level": "advanced", "duration": 30}',
  array['pricing', 'risk']
);


-- error insert 
insert into cours (name, type)
values ('Bad Course', 'biology');

-- setp 3 : =================== Query READ DATA ============
select * from cours;

select name, data->>'level' as level
from cours;

select *
from cours
where 'sql' = any(topics);

select name, type from cours;

-- transaction test : 

begin;

create table x(id int);

rollback;

-- clean up : 
drop table if exists cours;
drop table if exists tasks;
drop type if exists type_cour;