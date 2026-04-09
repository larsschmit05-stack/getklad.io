-- Migration 005: Switch from monthly tier-based AI limits to daily per-user limits
-- Removes free/pro project limits, adds per-user daily AI limit override

-- 1. Rename month_reset_date → reset_date for daily semantics
ALTER TABLE public.ai_usage RENAME COLUMN month_reset_date TO reset_date;

-- 2. Recreate index with correct name
DROP INDEX IF EXISTS idx_ai_usage_user_month;
CREATE INDEX idx_ai_usage_user_reset ON public.ai_usage (user_id, reset_date);

-- 3. Drop the free-tier project limit trigger and function
DROP TRIGGER IF EXISTS check_project_limit ON public.projects;
DROP FUNCTION IF EXISTS public.enforce_free_project_limit();

-- 4. Add per-user daily AI limit override to profiles
--    NULL  = use system default (20/day)
--    -1    = unlimited
--    N > 0 = custom daily limit
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_ai_limit integer DEFAULT NULL;

-- 5. Atomic increment function (replaces non-atomic SELECT+UPDATE pattern)
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id uuid, p_reset_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.ai_usage (user_id, reset_date, calls_count)
  VALUES (p_user_id, p_reset_date, 1)
  ON CONFLICT (user_id, reset_date)
  DO UPDATE SET
    calls_count = public.ai_usage.calls_count + 1,
    updated_at = now();
END;
$$;
