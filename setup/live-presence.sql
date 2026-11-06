-- RI Wiki collaborative editor presence (optional addon).
-- Run ONCE in Supabase SQL Editor. Only the trusted Vercel backend accesses it.
create table if not exists public.ri_wiki_presence (
  editor text primary key,
  page text not null default '#/',
  updated_at timestamptz not null default now()
);
create index if not exists ri_wiki_presence_updated_at_idx on public.ri_wiki_presence(updated_at desc);
alter table public.ri_wiki_presence enable row level security;
revoke all on public.ri_wiki_presence from anon, authenticated;
-- SERVICE_ROLE_KEY bypasses RLS; do not add public SELECT policies.
