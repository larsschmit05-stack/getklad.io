-- Migration 004: Feedback / bug report table

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  message text not null,
  page_url text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Users can insert their own feedback
create policy "Users can insert feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id or user_id is null);

-- Only service role can read feedback (admin use only)
create policy "Service role can read feedback"
  on public.feedback for select
  using (false);
