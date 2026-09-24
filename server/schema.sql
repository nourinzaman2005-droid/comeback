create table if not exists players (
  id text primary key,
  display_name text not null,
  delivery_date date not null,
  delivery_type text not null,
  cricket_role text not null,
  language text not null default 'en',
  stage text not null default 'Ready',
  stage_status text not null default 'active',
  consent_at timestamptz not null,
  updated_at timestamptz not null default now(),
  check (stage in ('Ready', 'Review', 'Restore', 'Recondition', 'Return', 'Refine')),
  check (stage_status in ('active', 'awaiting-review', 'held'))
);

create table if not exists test_records (
  id text primary key,
  player_id text not null references players(id) on delete cascade,
  kind text not null,
  side text not null,
  metrics jsonb not null,
  symptoms text[] not null default '{}',
  completed_at timestamptz not null
);

create table if not exists clinician_decisions (
  id text primary key,
  player_id text not null references players(id) on delete cascade,
  test_id text not null references test_records(id),
  decision text not null check (decision in ('approve', 'hold')),
  from_stage text not null,
  to_stage text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists test_records_player_completed
on test_records (player_id, completed_at desc);
