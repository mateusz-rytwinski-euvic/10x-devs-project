-- migration: add nullable preferred_ai_model column to public.profiles
-- purpose: allow therapists to persist their preferred AI model for visit recommendation generation workflows.

alter table public.profiles
    add column if not exists preferred_ai_model text;
