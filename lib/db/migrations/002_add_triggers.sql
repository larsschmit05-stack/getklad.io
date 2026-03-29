-- Klad Database Triggers
-- Migration 002: Auto-create profiles on signup, enforce free project limit

-- ============================================================
-- 1. AUTO-CREATE PROFILE ON SIGN-UP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- 2. ENFORCE FREE TIER PROJECT LIMIT (max 3 projects)
-- ============================================================
create or replace function public.enforce_free_project_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_plan text;
  project_count integer;
begin
  -- Get user's plan
  select plan into user_plan
  from public.profiles
  where user_id = new.user_id;

  -- Only enforce for free tier
  if user_plan = 'free' then
    select count(*) into project_count
    from public.projects
    where user_id = new.user_id;

    if project_count >= 3 then
      raise exception 'Free tier limited to 3 projects. Upgrade to Pro for unlimited projects.';
    end if;
  end if;

  return new;
end;
$$;

create trigger check_project_limit
  before insert on public.projects
  for each row
  execute function public.enforce_free_project_limit();

-- ============================================================
-- 3. AUTO-UPDATE updated_at TIMESTAMPS
-- ============================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at();

create trigger update_projects_updated_at
  before update on public.projects
  for each row
  execute function public.update_updated_at();

create trigger update_canvas_state_updated_at
  before update on public.canvas_state
  for each row
  execute function public.update_updated_at();

create trigger update_ai_usage_updated_at
  before update on public.ai_usage
  for each row
  execute function public.update_updated_at();
