-- Klad Database Schema
-- Migration 001: Initial schema with tables, RLS policies, and indexes

-- ============================================================
-- 1. PROFILES (user metadata, billing state)
-- ============================================================
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- ============================================================
-- 2. PROJECTS (user's canvas projects)
-- ============================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projects_user_id on public.projects (user_id);

alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can create own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 3. CANVAS_STATE (tldraw document per project)
-- ============================================================
create table public.canvas_state (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  tldraw_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index idx_canvas_state_project_id on public.canvas_state (project_id);

alter table public.canvas_state enable row level security;

create policy "Users can view own canvas state"
  on public.canvas_state for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = canvas_state.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Users can insert own canvas state"
  on public.canvas_state for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = canvas_state.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Users can update own canvas state"
  on public.canvas_state for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = canvas_state.project_id
        and projects.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. AI_USAGE (monthly AI call counter per user)
-- ============================================================
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month_reset_date date not null,
  calls_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_reset_date)
);

create index idx_ai_usage_user_month on public.ai_usage (user_id, month_reset_date);

alter table public.ai_usage enable row level security;

create policy "Users can view own AI usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

create policy "Users can insert own AI usage"
  on public.ai_usage for insert
  with check (auth.uid() = user_id);

create policy "Users can update own AI usage"
  on public.ai_usage for update
  using (auth.uid() = user_id);

-- ============================================================
-- 5. SHARE_LINKS (shareable read-only canvas links)
-- ============================================================
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  share_token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz,
  deprecated_at timestamptz,
  created_by uuid not null references auth.users (id) on delete cascade,
  view_count integer not null default 0,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_share_links_project_id on public.share_links (project_id);
create index idx_share_links_token on public.share_links (share_token);

alter table public.share_links enable row level security;

-- Owners can manage their share links
create policy "Users can view own share links"
  on public.share_links for select
  using (auth.uid() = created_by);

create policy "Users can create share links for own projects"
  on public.share_links for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.projects
      where projects.id = share_links.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Users can update own share links"
  on public.share_links for update
  using (auth.uid() = created_by);

create policy "Users can delete own share links"
  on public.share_links for delete
  using (auth.uid() = created_by);

-- Public read access via share_token (no auth required)
create policy "Anyone can read active share links by token"
  on public.share_links for select
  using (
    deprecated_at is null
    and (expires_at is null or expires_at > now())
  );
