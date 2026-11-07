-- Legal acceptances (D-057; docs/architecture/LEGAL_ACCEPTANCE.md).
--
-- One append-only row each time someone agrees to Braventa's legal documents, or gives a confirmation the documents
-- require, in the app: at sign-up, when accepting updated terms, when starting an analysis of a website, when connecting
-- Google Search Console, when creating an access key and when approving an app's access (OAuth). It is the evidence
-- that the Terms of Service, MSA and DPA bind the user, and of what they confirmed and when.
--
-- The server writes every row with the secret key after authenticating the user (lib/legal/acceptances.ts), so the
-- time and version can't be forged; users read only their own rows. organization_id is empty for sign-up and terms
-- updates (they're about the person, before or regardless of a business), set for the others. Rows go with the user
-- (and with the organization) on deletion, like the rest of their data.

create table public.legal_acceptances (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  context text not null check (context in (
    'signup', 'terms_update', 'website_authorization', 'search_console_connect', 'access_key', 'assistant_oauth'
  )),
  documents_version text not null check (documents_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  documents text[] not null check (cardinality(documents) between 1 and 5
    and documents <@ array['terms', 'msa', 'dpa', 'privacy', 'refunds']),
  -- What the confirmation was about, when there is one: the website analyzed, an access key's prefix, an OAuth client id.
  subject text check (char_length(subject) <= 2048),
  accepted_at timestamptz not null default now()
);
create index legal_acceptances_user_idx on public.legal_acceptances(user_id, accepted_at desc);
create index legal_acceptances_org_idx on public.legal_acceptances(organization_id);

alter table public.legal_acceptances enable row level security;
create policy "users read their own acceptances" on public.legal_acceptances
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.legal_acceptances from anon, authenticated;
grant select on public.legal_acceptances to authenticated;

comment on table public.legal_acceptances is
  'Append-only record of agreements to the legal documents (D-057). Written by the server with the secret key only.';
