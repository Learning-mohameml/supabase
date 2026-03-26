-- create todos table :

create table todos (
    id uuid primary key default gen_random_uuid(),
    title text not null , 
    description text,
    completed boolean not null default false , 
    priority int not null default 0 check (priority between 0 and 3),
    metadata  JSONB not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
)

-- insert some data : 
INSERT INTO todos (title)
VALUES ('Learn Docker');

INSERT INTO todos (title, description, priority)
VALUES (
  'Build FastAPI app',
  'Create REST API for todo service',
  2
);

INSERT INTO todos (title, completed, priority)
VALUES (
  'Setup PostgreSQL',
  true,
  1
);

INSERT INTO todos (title, metadata)
VALUES (
  'Read quant research paper',
  '{"topic": "stochastic control", "difficulty": "hard"}'
);

INSERT INTO todos (
  title,
  description,
  completed,
  priority,
  metadata,
  created_at,
  updated_at
)
VALUES (
  'Implement portfolio optimizer',
  'Use cvxpy to optimize Sharpe ratio',
  false,
  3,
  '{"project": "Quantify", "type": "backend"}',
  now(),
  now()
);

