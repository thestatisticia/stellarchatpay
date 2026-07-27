-- Run once in Supabase → SQL Editor
-- Project: https://gmayiclggpoylbmjohoq.supabase.co
-- Note: wallet column is unused (kept nullable). Feedback is anonymous.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  rating int not null check (rating between 1 and 5),
  comment text default '',
  wallet text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "Anyone can insert feedback" on public.feedback;
drop policy if exists "Anyone can read feedback" on public.feedback;

create policy "Anyone can insert feedback"
  on public.feedback for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can read feedback"
  on public.feedback for select
  to anon, authenticated
  using (true);

-- Scrub any wallet addresses already stored (run as project owner in SQL Editor)
update public.feedback set wallet = null where wallet is not null;
