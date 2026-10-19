-- BoltBall : table du classement mondial (Supabase, offre gratuite)
-- 1. Crée un projet sur supabase.com
-- 2. Menu "SQL Editor" > colle ce fichier > Run
-- 3. Menu "Project Settings" > "API" : copie "Project URL" et la clé "anon public"
-- 4. Colle-les dans index.html, en haut du script : LB_URL et LB_KEY

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  player_id   text not null check (char_length(player_id) between 4 and 40),
  name        text not null check (char_length(name) between 1 and 12),
  mode        text not null check (mode in ('endless', 'daily', 'story')),
  day         text not null default 'all' check (char_length(day) <= 10),
  score       bigint not null check (score >= -100000 and score <= 10000000),
  deaths      integer not null default 0 check (deaths >= 0),
  extra       integer not null default 0 check (extra >= 0 and extra <= 100),
  updated_at  timestamptz not null default now(),
  unique (player_id, mode, day)
);

create index if not exists scores_rank on public.scores (mode, day, score desc, deaths asc);

alter table public.scores enable row level security;

-- Lecture publique, écriture par le jeu (clé anon)
drop policy if exists "lecture" on public.scores;
create policy "lecture" on public.scores for select using (true);
drop policy if exists "ajout" on public.scores;
create policy "ajout" on public.scores for insert with check (true);
drop policy if exists "maj" on public.scores;
create policy "maj" on public.scores for update using (true) with check (true);

-- Un score ne peut que s'améliorer (protège contre l'écrasement par un score plus faible)
create or replace function public.keep_best() returns trigger language plpgsql as $$
begin
  if new.score < old.score then
    new.score := old.score;
    new.deaths := old.deaths;
    new.extra := old.extra;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists scores_keep_best on public.scores;
create trigger scores_keep_best before update on public.scores for each row execute function public.keep_best();
