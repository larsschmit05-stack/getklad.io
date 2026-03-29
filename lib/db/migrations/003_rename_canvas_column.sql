-- Migration 003: Rename tldraw_state column to canvas_data
-- This migration supports the switch from tldraw to a custom canvas engine.

alter table public.canvas_state
  rename column tldraw_state to canvas_data;

-- Update the comment on the table to reflect the change
comment on table public.canvas_state is 'Stores custom canvas engine state per project (replaced tldraw)';
