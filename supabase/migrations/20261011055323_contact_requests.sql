-- Contact and early-access requests from the public site braventa.io (D-031). Visitors are anonymous, so they may
-- only insert, never read; the Braventa team reads requests in the Supabase dashboard. Not a tenant table: it holds
-- no organization's data.

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  intent text not null default 'question' check (intent in ('early_access', 'demo', 'question')),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254 and email like '%_@_%'),
  business text check (business is null or char_length(business) <= 160),
  website text check (website is null or char_length(website) <= 300),
  message text not null check (char_length(message) between 1 and 2000),
  -- D-014: separate, unticked, never required.
  marketing_opt_in boolean not null default false,
  status text not null default 'new' check (status in ('new', 'replied', 'closed', 'spam')),
  created_at timestamptz not null default now()
);
create index contact_requests_created_idx on public.contact_requests(created_at desc);

alter table public.contact_requests enable row level security;
create policy "public insert" on public.contact_requests for insert to anon, authenticated with check (true);

-- Insert only the form fields; no reads, updates or deletes from the public API.
revoke all on public.contact_requests from anon, authenticated;
grant insert (intent, name, email, business, website, message, marketing_opt_in) on public.contact_requests to anon, authenticated;

comment on table public.contact_requests is 'Contact and early-access requests from braventa.io (D-031). Insert-only for the public; read in the dashboard.';
