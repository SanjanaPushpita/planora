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

-- 5. LEARNING SPRINTS TABLE
create table if not exists public.learning_sprints (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  topic text not null,
  category text not null default 'General Knowledge',
  difficulty text not null default 'medium',
  status text not null default 'completed',
  target_duration_seconds integer not null default 900,
  actual_duration_seconds integer not null default 0,
  started_at timestamp with time zone not null,
  completed_at timestamp with time zone,
  notes text default '',
  key_questions jsonb default '[]'::jsonb,
  key_points jsonb default '[]'::jsonb,
  new_words jsonb default '[]'::jsonb,
  confusions text,
  explanation text,
  explain_it_back text,
  sources jsonb default '[]'::jsonb,
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.learning_sprints enable row level security;

create policy "Users can view their own learning sprints"
  on public.learning_sprints for select
  using (auth.uid() = user_id);

create policy "Users can insert their own learning sprints"
  on public.learning_sprints for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own learning sprints"
  on public.learning_sprints for update
  using (auth.uid() = user_id);

create policy "Users can delete their own learning sprints"
  on public.learning_sprints for delete
  using (auth.uid() = user_id);

create index if not exists idx_learning_sprints_user_id on public.learning_sprints(user_id);
create index if not exists idx_learning_sprints_category on public.learning_sprints(category);
create index if not exists idx_learning_sprints_created_at on public.learning_sprints(created_at);

-- 6. KNOWLEDGE ITEMS TABLE
create table if not exists public.knowledge_items (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  source_sprint_id text references public.learning_sprints(id) on delete set null,
  title text not null,
  type text not null default 'sprint',
  category text not null default 'General Knowledge',
  tags text[] default array[]::text[],
  summary text,
  content text not null default '',
  key_points jsonb default '[]'::jsonb,
  sources jsonb default '[]'::jsonb,
  related_words jsonb default '[]'::jsonb,
  is_favorite boolean default false,
  is_archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.knowledge_items enable row level security;

create policy "Users can view their own knowledge items"
  on public.knowledge_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own knowledge items"
  on public.knowledge_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own knowledge items"
  on public.knowledge_items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own knowledge items"
  on public.knowledge_items for delete
  using (auth.uid() = user_id);

create index if not exists idx_knowledge_items_user_id on public.knowledge_items(user_id);
create index if not exists idx_knowledge_items_type on public.knowledge_items(type);
create index if not exists idx_knowledge_items_category on public.knowledge_items(category);
create index if not exists idx_knowledge_items_is_favorite on public.knowledge_items(is_favorite);

-- 7. VOCABULARY ITEMS TABLE
create table if not exists public.vocabulary_items (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  source_knowledge_id text references public.knowledge_items(id) on delete set null,
  source_sprint_id text references public.learning_sprints(id) on delete set null,
  word text not null,
  meaning text not null,
  example text,
  category text default 'General',
  tags text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vocabulary_items enable row level security;

create policy "Users can view their own vocabulary items"
  on public.vocabulary_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own vocabulary items"
  on public.vocabulary_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own vocabulary items"
  on public.vocabulary_items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own vocabulary items"
  on public.vocabulary_items for delete
  using (auth.uid() = user_id);

create index if not exists idx_vocabulary_items_user_id on public.vocabulary_items(user_id);
create index if not exists idx_vocabulary_items_word on public.vocabulary_items(word);

-- 8. PROFILE AUTO-TRIGGER ON SIGNUP
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

