-- =========================================================
-- PLANORA PRODUCTION DATABASE SCHEMA
-- PostgreSQL with Supabase Row Level Security (RLS)
-- =========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text default 'Sophia',
  tagline text default 'My Personal Digital Journal & Planner',
  theme text default 'blush',
  color_mode text default 'light',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 2. PAGES TABLE
create table if not exists public.pages (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null default 'Untitled Planner',
  icon text default '📄',
  cover_color text,
  page_type text not null default 'blank',
  is_favorite boolean default false,
  is_archived boolean default false,
  is_deleted boolean default false,
  deleted_at timestamp with time zone,
  date text,
  position integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.pages enable row level security;

create policy "Users can view their own pages"
  on public.pages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own pages"
  on public.pages for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own pages"
  on public.pages for update
  using (auth.uid() = user_id);

create policy "Users can delete their own pages"
  on public.pages for delete
  using (auth.uid() = user_id);

-- Index on user_id and position
create index if not exists idx_pages_user_id on public.pages(user_id);
create index if not exists idx_pages_is_deleted on public.pages(is_deleted);
create index if not exists idx_pages_date on public.pages(date);

-- 3. PAGE BLOCKS TABLE
create table if not exists public.page_blocks (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  page_id text references public.pages(id) on delete cascade not null,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.page_blocks enable row level security;

create policy "Users can view their own blocks"
  on public.page_blocks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own blocks"
  on public.page_blocks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own blocks"
  on public.page_blocks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own blocks"
  on public.page_blocks for delete
  using (auth.uid() = user_id);

-- Index on page_id
create index if not exists idx_blocks_page_id on public.page_blocks(page_id);
create index if not exists idx_blocks_position on public.page_blocks(position);

-- 4. WALK SESSIONS TABLE
create table if not exists public.walk_sessions (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  page_id text references public.pages(id) on delete set null,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone not null,
  duration_seconds integer not null,
  target_duration_seconds integer not null default 300,
  date text not null,
  hour integer not null,
  feeling text,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.walk_sessions enable row level security;

create policy "Users can view their own walk sessions"
  on public.walk_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own walk sessions"
  on public.walk_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own walk sessions"
  on public.walk_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own walk sessions"
  on public.walk_sessions for delete
  using (auth.uid() = user_id);

create index if not exists idx_walk_sessions_user_id on public.walk_sessions(user_id);
create index if not exists idx_walk_sessions_date on public.walk_sessions(date);
create index if not exists idx_walk_sessions_page_id on public.walk_sessions(page_id);

-- 5. PROFILE AUTO-TRIGGER ON SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, tagline, theme, color_mode)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'My Personal Digital Journal & Planner',
    'blush',
    'light'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

