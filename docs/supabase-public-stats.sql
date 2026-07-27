-- Public product analytics (no personal balances / no raw wallet addresses)
-- Run in Supabase → SQL Editor after feedback table setup.
-- Project: https://gmayiclggpoylbmjohoq.supabase.co

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  created_at timestamptz not null default now()
);

create index if not exists app_events_created_at_idx on public.app_events (created_at desc);
create index if not exists app_events_event_idx on public.app_events (event);

-- Pseudonymous wallet ids (SHA-256 prefix) for unique-user counts — not reversible to G… addresses
create table if not exists public.app_wallets (
  wallet_hash text primary key,
  first_seen timestamptz not null default now()
);

alter table public.app_events enable row level security;
alter table public.app_wallets enable row level security;

drop policy if exists "Anyone can insert app events" on public.app_events;
drop policy if exists "Anyone can read app events" on public.app_events;
drop policy if exists "Anyone can insert app wallets" on public.app_wallets;
drop policy if exists "Anyone can read app wallets" on public.app_wallets;

create policy "Anyone can insert app events"
  on public.app_events for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can read app events"
  on public.app_events for select
  to anon, authenticated
  using (true);

create policy "Anyone can insert app wallets"
  on public.app_wallets for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can read app wallets"
  on public.app_wallets for select
  to anon, authenticated
  using (true);
