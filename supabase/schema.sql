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
  source_paper_id text references public.research_papers(id) on delete set null,
  source_type text default 'custom',
  source_title text default '',
  word text not null,
  meaning text not null default '',
  example text default '',
  synonyms text[] default array[]::text[],
  antonyms text[] default array[]::text[],
  part_of_speech text default '',
  pronunciation text default '',
  category text default 'General',
  tags text[] default array[]::text[],
  my_notes text default '',
  is_favorite boolean default false,
  is_trash boolean default false,
  last_reviewed_at timestamp with time zone,
  next_review_at timestamp with time zone,
  review_count integer default 0,
  interval_days integer default 0,
  ease_factor numeric default 2.5,
  status text not null default 'new', -- 'new' | 'learning' | 'known' | 'needs_review'
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
create index if not exists idx_vocabulary_items_status on public.vocabulary_items(status);
create index if not exists idx_vocabulary_items_next_review on public.vocabulary_items(next_review_at);
create index if not exists idx_vocabulary_items_is_trash on public.vocabulary_items(is_trash);

-- 8. RESEARCH PAPERS TABLE
create table if not exists public.research_papers (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  authors text default '',
  year integer,
  journal_conference text default '',
  doi text default '',
  url text default '',
  pdf_url text default '',
  research_area text default 'General',
  tags text[] default array[]::text[],
  status text not null default 'to_read',
  priority text not null default 'medium',
  reading_progress integer not null default 0,
  pages_read integer default 0,
  total_pages integer default 0,
  is_favorite boolean default false,
  is_archived boolean default false,
  is_trash boolean default false,
  structured_notes jsonb default '{}'::jsonb,
  notes text default '',
  key_insights text default '',
  sources jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.research_papers enable row level security;

create policy "Users can view their own research papers"
  on public.research_papers for select
  using (auth.uid() = user_id);

create policy "Users can insert their own research papers"
  on public.research_papers for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own research papers"
  on public.research_papers for update
  using (auth.uid() = user_id);

create policy "Users can delete their own research papers"
  on public.research_papers for delete
  using (auth.uid() = user_id);

create index if not exists idx_research_papers_user_id on public.research_papers(user_id);
create index if not exists idx_research_papers_status on public.research_papers(status);
create index if not exists idx_research_papers_research_area on public.research_papers(research_area);
create index if not exists idx_research_papers_is_favorite on public.research_papers(is_favorite);
create index if not exists idx_research_papers_created_at on public.research_papers(created_at);

-- 9. FOCUS SESSIONS TABLE
create table if not exists public.focus_sessions (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  category text not null default 'Research',
  related_goal_id text,
  related_paper_id text references public.research_papers(id) on delete set null,
  related_subject_id text,
  related_sprint_id text references public.learning_sprints(id) on delete set null,
  target_duration_seconds integer not null default 1500,
  actual_duration_seconds integer not null default 0,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone,
  distraction_count integer default 0,
  focus_rating integer default 5,
  energy_level text default 'medium',
  difficulty text default 'moderate',
  accomplishment text default '',
  notes text default '',
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.focus_sessions enable row level security;

create policy "Users can view their own focus sessions"
  on public.focus_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own focus sessions"
  on public.focus_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own focus sessions"
  on public.focus_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own focus sessions"
  on public.focus_sessions for delete
  using (auth.uid() = user_id);

create index if not exists idx_focus_sessions_user_id on public.focus_sessions(user_id);
create index if not exists idx_focus_sessions_category on public.focus_sessions(category);
create index if not exists idx_focus_sessions_started_at on public.focus_sessions(started_at);
create index if not exists idx_focus_sessions_related_paper_id on public.focus_sessions(related_paper_id);

-- 10. WEEKLY REVIEWS TABLE
create table if not exists public.weekly_reviews (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  week_start_date text not null,
  week_end_date text not null,
  title text not null default '',
  status text not null default 'draft', -- draft, completed
  rating_overall integer default 0,
  rating_energy text default 'medium',
  rating_productivity integer default 0,
  rating_stress integer default 0,
  reflection jsonb default '{}'::jsonb,
  next_week jsonb default '{}'::jsonb,
  stats_snapshot jsonb default '{}'::jsonb,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.weekly_reviews enable row level security;

create policy "Users can view their own weekly reviews"
  on public.weekly_reviews for select
  using (auth.uid() = user_id);

create policy "Users can insert their own weekly reviews"
  on public.weekly_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own weekly reviews"
  on public.weekly_reviews for update
  using (auth.uid() = user_id);

create policy "Users can delete their own weekly reviews"
  on public.weekly_reviews for delete
  using (auth.uid() = user_id);

create index if not exists idx_weekly_reviews_user_id on public.weekly_reviews(user_id);
create index if not exists idx_weekly_reviews_week_start on public.weekly_reviews(week_start_date);
create index if not exists idx_weekly_reviews_status on public.weekly_reviews(status);

-- 11. GOALS TABLE
create table if not exists public.goals (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  description text default '',
  category text not null default 'Personal',
  priority text not null default 'medium',
  status text not null default 'not_started',
  start_date text,
  target_date text,
  why_it_matters text default '',
  progress integer not null default 0,
  is_favorite boolean default false,
  is_archived boolean default false,
  is_trash boolean default false,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.goals enable row level security;

create policy "Users can view their own goals"
  on public.goals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own goals"
  on public.goals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own goals"
  on public.goals for delete
  using (auth.uid() = user_id);

create index if not exists idx_goals_user_id on public.goals(user_id);
create index if not exists idx_goals_status on public.goals(status);
create index if not exists idx_goals_category on public.goals(category);
create index if not exists idx_goals_is_trash on public.goals(is_trash);

-- 12. GOAL MILESTONES TABLE
create table if not exists public.goal_milestones (
  id text primary key,
  goal_id text references public.goals(id) on delete cascade,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  description text default '',
  target_date text,
  status text not null default 'pending', -- pending, in_progress, completed
  position integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.goal_milestones enable row level security;

create policy "Users can view their own goal milestones"
  on public.goal_milestones for select
  using (auth.uid() = user_id);

create policy "Users can insert their own goal milestones"
  on public.goal_milestones for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own goal milestones"
  on public.goal_milestones for update
  using (auth.uid() = user_id);

create policy "Users can delete their own goal milestones"
  on public.goal_milestones for delete
  using (auth.uid() = user_id);

create index if not exists idx_goal_milestones_goal_id on public.goal_milestones(goal_id);
create index if not exists idx_goal_milestones_user_id on public.goal_milestones(user_id);

-- 13. GOAL TASKS TABLE
create table if not exists public.goal_tasks (
  id text primary key,
  goal_id text references public.goals(id) on delete cascade,
  milestone_id text references public.goal_milestones(id) on delete set null,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  due_date text,
  priority text default 'medium',
  notes text default '',
  position integer not null default 0,
  daily_planner_date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.goal_tasks enable row level security;

create policy "Users can view their own goal tasks"
  on public.goal_tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own goal tasks"
  on public.goal_tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own goal tasks"
  on public.goal_tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own goal tasks"
  on public.goal_tasks for delete
  using (auth.uid() = user_id);

create index if not exists idx_goal_tasks_goal_id on public.goal_tasks(goal_id);
create index if not exists idx_goal_tasks_milestone_id on public.goal_tasks(milestone_id);
create index if not exists idx_goal_tasks_user_id on public.goal_tasks(user_id);

-- 14. INBOX ITEMS TABLE
create table if not exists public.inbox_items (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  content text not null,
  title text default '',
  type text not null default 'note', -- task, idea, note, research_idea, link, reminder, vocabulary, someday
  tags text[] default array[]::text[],
  due_date text,
  url text,
  priority text default 'medium',
  related_goal_id text references public.goals(id) on delete set null,
  related_paper_id text references public.research_papers(id) on delete set null,
  related_knowledge_id text references public.knowledge_items(id) on delete set null,
  is_organized boolean default false,
  organized_into text,
  organized_at timestamp with time zone,
  is_archived boolean default false,
  is_trash boolean default false,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.inbox_items enable row level security;

create policy "Users can view their own inbox items"
  on public.inbox_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own inbox items"
  on public.inbox_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own inbox items"
  on public.inbox_items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own inbox items"
  on public.inbox_items for delete
  using (auth.uid() = user_id);

create index if not exists idx_inbox_items_user_id on public.inbox_items(user_id);
create index if not exists idx_inbox_items_type on public.inbox_items(type);
create index if not exists idx_inbox_items_is_organized on public.inbox_items(is_organized);
create index if not exists idx_inbox_items_is_trash on public.inbox_items(is_trash);
create index if not exists idx_inbox_items_created_at on public.inbox_items(created_at);

-- 15. MONTHLY REVIEWS TABLE
create table if not exists public.monthly_reviews (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  month_key text not null, -- e.g. '2026-10'
  month_label text default '',
  year integer not null,
  month_number integer not null,
  rating_overall integer default 0,
  rating_productivity integer default 0,
  rating_energy text default 'medium',
  rating_focus integer default 0,
  reflection jsonb default '{}'::jsonb,
  next_month jsonb default '{}'::jsonb,
  stats_snapshot jsonb default '{}'::jsonb,
  notes text default '',
  status text not null default 'draft', -- draft, completed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.monthly_reviews enable row level security;

create policy "Users can view their own monthly reviews"
  on public.monthly_reviews for select
  using (auth.uid() = user_id);

create policy "Users can insert their own monthly reviews"
  on public.monthly_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own monthly reviews"
  on public.monthly_reviews for update
  using (auth.uid() = user_id);

create policy "Users can delete their own monthly reviews"
  on public.monthly_reviews for delete
  using (auth.uid() = user_id);

create index if not exists idx_monthly_reviews_user_id on public.monthly_reviews(user_id);
create index if not exists idx_monthly_reviews_month_key on public.monthly_reviews(month_key);
create index if not exists idx_monthly_reviews_status on public.monthly_reviews(status);

-- 16. PROFILE AUTO-TRIGGER ON SIGNUP
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


