create table if not exists accounts (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('player', 'clinician')),
  created_at timestamptz not null default now()
);

create table if not exists clinicians (
  id text primary key,
  display_name text not null,
  email text not null unique,
  specialty text not null,
  member_board text not null,
  registration_number text not null unique,
  verified boolean not null default true,
  active boolean not null default true
);

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

alter table players add column if not exists clinician_id text references clinicians(id);

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

create table if not exists messages (
  id text primary key,
  player_id text not null references players(id) on delete cascade,
  clinician_id text not null references clinicians(id),
  sender_role text not null check (sender_role in ('player', 'clinician')),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_by_player boolean not null default false,
  read_by_clinician boolean not null default false
);

create index if not exists messages_conversation_created
on messages (player_id, clinician_id, created_at);

create table if not exists notifications (
  id text primary key,
  recipient_id text not null,
  recipient_role text not null check (recipient_role in ('player', 'clinician')),
  type text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_created
on notifications (recipient_id, recipient_role, created_at desc);
