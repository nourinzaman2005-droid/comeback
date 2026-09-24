create extension if not exists pgcrypto;

create type public.comeback_stage as enum (
  'Ready', 'Review', 'Restore', 'Recondition', 'Return', 'Refine'
);
create type public.stage_status as enum ('active', 'awaiting-review', 'held');
create type public.clinical_decision as enum ('approve', 'hold');

create table public.profiles (
  id text primary key,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null,
  delivery_date date not null,
  delivery_type text not null check (delivery_type in ('vaginal', 'caesarean', 'other')),
  cricket_role text not null check (cricket_role in ('batter', 'bowler', 'all-rounder', 'wicketkeeper')),
  language text not null default 'en' check (language in ('en', 'bn', 'hi', 'ur')),
  consent_at timestamptz not null,
  stage public.comeback_stage not null default 'Ready',
  stage_status public.stage_status not null default 'active',
  updated_at timestamptz not null default now(),
  unique (owner_user_id)
);

create table public.clinician_links (
  id uuid primary key default gen_random_uuid(),
  player_id text not null references public.profiles(id) on delete cascade,
  clinician_user_id uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (player_id, clinician_user_id)
);

create table public.test_records (
  id text primary key,
  player_id text not null references public.profiles(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id),
  kind text not null check (kind in ('squat', 'balance', 'hop', 'bridge')),
  side text not null check (side in ('left', 'right', 'both')),
  metrics jsonb not null,
  symptoms text[] not null default '{}',
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.clinician_decisions (
  id text primary key,
  player_id text not null references public.profiles(id) on delete cascade,
  test_id text not null references public.test_records(id) on delete restrict,
  clinician_user_id uuid not null default auth.uid() references auth.users(id),
  decision public.clinical_decision not null,
  from_stage public.comeback_stage not null,
  to_stage public.comeback_stage not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table public.red_flag_alerts (
  id uuid primary key default gen_random_uuid(),
  player_id text not null references public.profiles(id) on delete cascade,
  test_id text not null references public.test_records(id) on delete cascade,
  symptoms text[] not null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.clinician_links enable row level security;
alter table public.test_records enable row level security;
alter table public.clinician_decisions enable row level security;
alter table public.red_flag_alerts enable row level security;

create function public.is_linked_clinician(target_player_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinician_links
    where player_id = target_player_id
      and clinician_user_id = auth.uid()
      and accepted_at is not null
  );
$$;

create policy "players manage own profile" on public.profiles
for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "linked clinicians read profiles" on public.profiles
for select using (public.is_linked_clinician(id));

create policy "players read own links" on public.clinician_links
for select using (
  exists (select 1 from public.profiles where id = player_id and owner_user_id = auth.uid())
  or clinician_user_id = auth.uid()
);
create policy "players create links" on public.clinician_links
for insert with check (
  exists (select 1 from public.profiles where id = player_id and owner_user_id = auth.uid())
);
create policy "clinicians accept links" on public.clinician_links
for update using (clinician_user_id = auth.uid()) with check (clinician_user_id = auth.uid());

create policy "players manage own tests" on public.test_records
for all using (
  exists (select 1 from public.profiles where id = player_id and owner_user_id = auth.uid())
) with check (
  created_by = auth.uid()
  and exists (select 1 from public.profiles where id = player_id and owner_user_id = auth.uid())
);
create policy "linked clinicians read tests" on public.test_records
for select using (public.is_linked_clinician(player_id));

create policy "players read own decisions" on public.clinician_decisions
for select using (
  exists (select 1 from public.profiles where id = player_id and owner_user_id = auth.uid())
);
create policy "linked clinicians manage decisions" on public.clinician_decisions
for all using (
  clinician_user_id = auth.uid() and public.is_linked_clinician(player_id)
) with check (
  clinician_user_id = auth.uid() and public.is_linked_clinician(player_id)
);

create function public.prevent_player_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.owner_user_id
     and (new.stage is distinct from old.stage or new.stage_status is distinct from old.stage_status) then
    raise exception 'Stage changes require a linked clinician decision';
  end if;
  return new;
end;
$$;

create trigger player_cannot_change_own_stage
before update on public.profiles
for each row execute function public.prevent_player_stage_change();

create function public.validate_clinician_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stage public.comeback_stage;
  expected_stage public.comeback_stage;
  reported_symptoms text[];
begin
  select stage into current_stage from public.profiles where id = new.player_id for update;
  select symptoms into reported_symptoms from public.test_records where id = new.test_id and player_id = new.player_id;
  expected_stage := case current_stage
    when 'Ready' then 'Review'::public.comeback_stage
    when 'Review' then 'Restore'::public.comeback_stage
    when 'Restore' then 'Recondition'::public.comeback_stage
    when 'Recondition' then 'Return'::public.comeback_stage
    when 'Return' then 'Refine'::public.comeback_stage
    else 'Refine'::public.comeback_stage
  end;
  if new.from_stage <> current_stage then
    raise exception 'Decision is based on a stale player stage';
  end if;
  if new.decision = 'approve' and cardinality(reported_symptoms) > 0 then
    raise exception 'Cannot approve while the reviewed test has reported symptoms';
  end if;
  if new.decision = 'approve' and new.to_stage <> expected_stage then
    raise exception 'Approval must advance exactly one stage';
  end if;
  if new.decision = 'hold' and new.to_stage <> current_stage then
    raise exception 'A hold cannot change stage';
  end if;
  return new;
end;
$$;

create trigger validate_clinician_decision_before_insert
before insert on public.clinician_decisions
for each row execute function public.validate_clinician_decision();

create policy "players read own alerts" on public.red_flag_alerts
for select using (
  exists (select 1 from public.profiles where id = player_id and owner_user_id = auth.uid())
);
create policy "linked clinicians read alerts" on public.red_flag_alerts
for select using (public.is_linked_clinician(player_id));

create function public.apply_clinician_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set stage = new.to_stage,
      stage_status = case when new.decision = 'approve' then 'active'::public.stage_status else 'held'::public.stage_status end,
      updated_at = now()
  where id = new.player_id;
  return new;
end;
$$;

create trigger clinician_decision_updates_stage
after insert on public.clinician_decisions
for each row execute function public.apply_clinician_decision();

create function public.create_red_flag_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if cardinality(new.symptoms) > 0 then
    insert into public.red_flag_alerts (player_id, test_id, symptoms)
    values (new.player_id, new.id, new.symptoms);
  end if;
  return new;
end;
$$;

create trigger test_symptoms_create_alert
after insert on public.test_records
for each row execute function public.create_red_flag_alert();
