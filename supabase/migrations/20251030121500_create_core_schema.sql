-- migration: create core schema for 10x-physio
-- purpose: bootstrap physiotherapist, patient, visit, and ai logging tables with extensions, triggers, and rls policies.
-- tables: public.profiles, public.patients, public.visits, public.visit_ai_generations
-- notes: ensures pgcrypto and moddatetime extensions exist, sets utc timezone, and registers supabase-specific triggers for auth and ai ownership.

set timezone to 'utc';

-- ensure required extensions exist before using uuid generation and automatic timestamp helpers.
create extension if not exists pgcrypto;
create extension if not exists moddatetime;

-- create the profiles table that stores therapist identities mapped to supabase auth users.
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    first_name text not null,
    last_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- create the patients table owned by individual therapists.
create table if not exists public.patients (
    id uuid primary key default gen_random_uuid(),
    therapist_id uuid not null references public.profiles (id) on delete cascade,
    first_name text not null,
    last_name text not null,
    date_of_birth date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- create the visits table that holds subjective and objective notes plus ai recommendation metadata.
create table if not exists public.visits (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients (id) on delete cascade,
    visit_date timestamptz not null,
    interview text,
    description text,
    recommendations text,
    recommendations_generated_by_ai boolean not null default false,
    recommendations_generated_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- create the visit_ai_generations table for storing raw ai prompts and responses per visit.
create table if not exists public.visit_ai_generations (
    id uuid primary key default gen_random_uuid(),
    visit_id uuid not null references public.visits (id) on delete cascade,
    therapist_id uuid not null references public.profiles (id) on delete cascade,
    prompt text not null,
    ai_response text not null,
    model_used text not null,
    temperature numeric(3,2),
    created_at timestamptz not null default now()
);

-- accelerate ownership lookups and deduplicate patients per therapist.
create index if not exists idx_patients_therapist on public.patients (therapist_id);
create unique index if not exists uq_patients_name_dob on public.patients (therapist_id, lower(first_name), lower(last_name), date_of_birth);

-- expedite visit history queries and ai usage metrics.
create index if not exists idx_visits_patient_date on public.visits (patient_id, visit_date desc);
create index if not exists idx_visits_recommendations_ai on public.visits (recommendations_generated_by_ai) where recommendations_generated_by_ai is true;

-- support visit ai generation audits.
create index if not exists idx_visit_ai_generations_visit on public.visit_ai_generations (visit_id);
create index if not exists idx_visit_ai_generations_therapist on public.visit_ai_generations (therapist_id);

-- register a trigger handler that provisions therapist profiles for new auth users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    if new.id is null then
        raise exception 'new auth user id cannot be null';
    end if;

    insert into public.profiles (id, first_name, last_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'first_name', 'pending'),
        coalesce(new.raw_user_meta_data->>'last_name', 'pending')
    )
    on conflict (id) do update
        set first_name = excluded.first_name,
            last_name = excluded.last_name,
            updated_at = now();

    return new;
end;
$$;

-- ensure ai generation records automatically inherit the owning therapist.
create or replace function public.set_therapist_from_visit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_patient_id uuid;
begin
    if new.visit_id is null then
        raise exception 'visit_ai_generations.visit_id cannot be null';
    end if;

    select patient_id
    into v_patient_id
    from public.visits
    where id = new.visit_id;

    if v_patient_id is null then
        raise exception 'visit % not found while setting therapist', new.visit_id;
    end if;

    select therapist_id
    into new.therapist_id
    from public.patients
    where id = v_patient_id;

    if new.therapist_id is null then
        raise exception 'therapist could not be resolved for visit %', new.visit_id;
    end if;

    return new;
end;
$$;

-- keep updated_at in sync using moddatetime extension triggers.
do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'profiles_set_timestamp') then
        create trigger profiles_set_timestamp
            before update on public.profiles
            for each row
            execute function moddatetime(updated_at);
    end if;

    if not exists (select 1 from pg_trigger where tgname = 'patients_set_timestamp') then
        create trigger patients_set_timestamp
            before update on public.patients
            for each row
            execute function moddatetime(updated_at);
    end if;

    if not exists (select 1 from pg_trigger where tgname = 'visits_set_timestamp') then
        create trigger visits_set_timestamp
            before update on public.visits
            for each row
            execute function moddatetime(updated_at);
    end if;
end;
$$;

-- wire up supabase auth hook that auto-creates a profile per new user.
do $$
begin
    if not exists (
        select 1
        from pg_trigger
        where tgname = 'on_auth_user_created'
    ) then
        create trigger on_auth_user_created
            after insert on auth.users
            for each row
            execute function public.handle_new_user();
    end if;
end;
$$;

-- guarantee visit ai logs copy the therapist owner from the underlying visit.
do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'visit_ai_generations_set_owner') then
        create trigger visit_ai_generations_set_owner
            before insert on public.visit_ai_generations
            for each row
            execute function public.set_therapist_from_visit();
    end if;
end;
$$;

-- enable and enforce row level security on all application tables.
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.visits enable row level security;
alter table public.visit_ai_generations enable row level security;

alter table public.profiles force row level security;
alter table public.patients force row level security;
alter table public.visits force row level security;
alter table public.visit_ai_generations force row level security;

-- rls policies for profiles ensure therapists only see and edit their own data; anonymous callers are explicitly denied.
do $$
begin
    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'profiles'
          and policyname = 'profiles_select_authenticated'
    ) then
        create policy profiles_select_authenticated
            on public.profiles
            for select
            to authenticated
            using (id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'profiles'
          and policyname = 'profiles_select_anon'
    ) then
        create policy profiles_select_anon
            on public.profiles
            for select
            to anon
            using (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'profiles'
          and policyname = 'profiles_insert_authenticated'
    ) then
        create policy profiles_insert_authenticated
            on public.profiles
            for insert
            to authenticated
            with check (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'profiles'
          and policyname = 'profiles_insert_anon'
    ) then
        create policy profiles_insert_anon
            on public.profiles
            for insert
            to anon
            with check (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'profiles'
          and policyname = 'profiles_update_authenticated'
    ) then
        create policy profiles_update_authenticated
            on public.profiles
            for update
            to authenticated
            using (id = auth.uid())
            with check (id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'profiles'
          and policyname = 'profiles_update_anon'
    ) then
        create policy profiles_update_anon
            on public.profiles
            for update
            to anon
            using (false)
            with check (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'profiles'
          and policyname = 'profiles_delete_authenticated'
    ) then
        create policy profiles_delete_authenticated
            on public.profiles
            for delete
            to authenticated
            using (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'profiles'
          and policyname = 'profiles_delete_anon'
    ) then
        create policy profiles_delete_anon
            on public.profiles
            for delete
            to anon
            using (false);
    end if;
end;
$$;

-- rls policies for patients grant therapists ownership while blocking anonymous callers.
do $$
begin
    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'patients'
          and policyname = 'patients_select_authenticated'
    ) then
        create policy patients_select_authenticated
            on public.patients
            for select
            to authenticated
            using (therapist_id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'patients'
          and policyname = 'patients_select_anon'
    ) then
        create policy patients_select_anon
            on public.patients
            for select
            to anon
            using (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'patients'
          and policyname = 'patients_insert_authenticated'
    ) then
        create policy patients_insert_authenticated
            on public.patients
            for insert
            to authenticated
            with check (therapist_id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'patients'
          and policyname = 'patients_insert_anon'
    ) then
        create policy patients_insert_anon
            on public.patients
            for insert
            to anon
            with check (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'patients'
          and policyname = 'patients_update_authenticated'
    ) then
        create policy patients_update_authenticated
            on public.patients
            for update
            to authenticated
            using (therapist_id = auth.uid())
            with check (therapist_id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'patients'
          and policyname = 'patients_update_anon'
    ) then
        create policy patients_update_anon
            on public.patients
            for update
            to anon
            using (false)
            with check (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'patients'
          and policyname = 'patients_delete_authenticated'
    ) then
        create policy patients_delete_authenticated
            on public.patients
            for delete
            to authenticated
            using (therapist_id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'patients'
          and policyname = 'patients_delete_anon'
    ) then
        create policy patients_delete_anon
            on public.patients
            for delete
            to anon
            using (false);
    end if;
end;
$$;

-- rls policies for visits ensure therapists maintain exclusive access to visit history.
do $$
begin
    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visits'
          and policyname = 'visits_select_authenticated'
    ) then
        create policy visits_select_authenticated
            on public.visits
            for select
            to authenticated
            using (exists (
                select 1
                from public.patients p
                where p.id = visits.patient_id
                  and p.therapist_id = auth.uid()
            ));
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visits'
          and policyname = 'visits_select_anon'
    ) then
        create policy visits_select_anon
            on public.visits
            for select
            to anon
            using (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visits'
          and policyname = 'visits_insert_authenticated'
    ) then
        create policy visits_insert_authenticated
            on public.visits
            for insert
            to authenticated
            with check (exists (
                select 1
                from public.patients p
                where p.id = visits.patient_id
                  and p.therapist_id = auth.uid()
            ));
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visits'
          and policyname = 'visits_insert_anon'
    ) then
        create policy visits_insert_anon
            on public.visits
            for insert
            to anon
            with check (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visits'
          and policyname = 'visits_update_authenticated'
    ) then
        create policy visits_update_authenticated
            on public.visits
            for update
            to authenticated
            using (exists (
                select 1
                from public.patients p
                where p.id = visits.patient_id
                  and p.therapist_id = auth.uid()
            ))
            with check (exists (
                select 1
                from public.patients p
                where p.id = visits.patient_id
                  and p.therapist_id = auth.uid()
            ));
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visits'
          and policyname = 'visits_update_anon'
    ) then
        create policy visits_update_anon
            on public.visits
            for update
            to anon
            using (false)
            with check (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visits'
          and policyname = 'visits_delete_authenticated'
    ) then
        create policy visits_delete_authenticated
            on public.visits
            for delete
            to authenticated
            using (exists (
                select 1
                from public.patients p
                where p.id = visits.patient_id
                  and p.therapist_id = auth.uid()
            ));
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visits'
          and policyname = 'visits_delete_anon'
    ) then
        create policy visits_delete_anon
            on public.visits
            for delete
            to anon
            using (false);
    end if;
end;
$$;

-- rls policies for visit_ai_generations align ai logs with therapist ownership rules.
do $$
begin
    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visit_ai_generations'
          and policyname = 'visit_ai_generations_select_authenticated'
    ) then
        create policy visit_ai_generations_select_authenticated
            on public.visit_ai_generations
            for select
            to authenticated
            using (therapist_id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visit_ai_generations'
          and policyname = 'visit_ai_generations_select_anon'
    ) then
        create policy visit_ai_generations_select_anon
            on public.visit_ai_generations
            for select
            to anon
            using (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visit_ai_generations'
          and policyname = 'visit_ai_generations_insert_authenticated'
    ) then
        create policy visit_ai_generations_insert_authenticated
            on public.visit_ai_generations
            for insert
            to authenticated
            with check (therapist_id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visit_ai_generations'
          and policyname = 'visit_ai_generations_insert_anon'
    ) then
        create policy visit_ai_generations_insert_anon
            on public.visit_ai_generations
            for insert
            to anon
            with check (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visit_ai_generations'
          and policyname = 'visit_ai_generations_update_authenticated'
    ) then
        create policy visit_ai_generations_update_authenticated
            on public.visit_ai_generations
            for update
            to authenticated
            using (therapist_id = auth.uid())
            with check (therapist_id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visit_ai_generations'
          and policyname = 'visit_ai_generations_update_anon'
    ) then
        create policy visit_ai_generations_update_anon
            on public.visit_ai_generations
            for update
            to anon
            using (false)
            with check (false);
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visit_ai_generations'
          and policyname = 'visit_ai_generations_delete_authenticated'
    ) then
        create policy visit_ai_generations_delete_authenticated
            on public.visit_ai_generations
            for delete
            to authenticated
            using (therapist_id = auth.uid());
    end if;

    if not exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename = 'visit_ai_generations'
          and policyname = 'visit_ai_generations_delete_anon'
    ) then
        create policy visit_ai_generations_delete_anon
            on public.visit_ai_generations
            for delete
            to anon
            using (false);
    end if;
end;
$$;
