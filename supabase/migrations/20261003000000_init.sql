create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  test_date date,
  current_quant int,
  current_verbal int,
  target_score int,
  hours_per_day numeric not null default 2,
  weak_areas text[] not null default '{}',
  diagnostic_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table questions (
  id text primary key,
  section text not null,
  category text not null,
  number int not null,
  question_type text not null,
  choices jsonb not null default '[]',
  answer text not null,
  stem text not null default '',
  has_image boolean not null default true,
  parse_status text not null default 'ok',
  ai_generated boolean not null default false
);

create table attempts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  section text not null,
  category text not null,
  selected text not null,
  correct boolean not null,
  seconds int not null,
  created_at timestamptz not null default now()
);

create table bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  primary key (user_id, question_id)
);

create table study_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  mode text not null,
  label text not null,
  minutes int not null,
  items jsonb not null,
  primary key (user_id, plan_date)
);

create table wrong_questions (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  tag text not null,
  resolved_at timestamptz,
  primary key (user_id, question_id)
);

create table writing_submissions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day int not null,
  essay text not null,
  rubric jsonb not null,
  created_at timestamptz not null default now()
);

create table subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null,
  access_until timestamptz not null,
  stripe_session_id text
);

create table ai_caches (
  cache_key text primary key,
  content text not null,
  created_at timestamptz not null default now()
);

create table generated_questions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table attempts enable row level security;
alter table bookmarks enable row level security;
alter table study_plans enable row level security;
alter table wrong_questions enable row level security;
alter table writing_submissions enable row level security;
alter table subscriptions enable row level security;
alter table ai_caches enable row level security;
alter table generated_questions enable row level security;
alter table questions enable row level security;

create policy profiles_own on profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy attempts_own on attempts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy bookmarks_own on bookmarks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy plans_own on study_plans for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wrongs_own on wrong_questions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy writing_own on writing_submissions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy subscriptions_read on subscriptions for select to authenticated using (user_id = auth.uid());
create policy ai_read on ai_caches for select to authenticated using (true);
create policy ai_write on ai_caches for insert to authenticated with check (true);
create policy ai_update on ai_caches for update to authenticated using (true) with check (true);
create policy generated_own on generated_questions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy questions_read on questions for select to authenticated using (true);
