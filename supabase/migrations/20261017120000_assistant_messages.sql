-- In-app assistant, "Ask Braventa" (D-042). One row per answered question: the source for the per-organization daily
-- limit (40 a day) and the per-user burst limit, and the user's question history. Written by the server only
-- (POST /api/assistant, service client scoped to the organization the user's membership resolved). Must be applied
-- before the assistant is deployed: without it the route fails closed and answers "isn't available right now".

create table public.assistant_messages (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 1000),
  answer text not null check (char_length(answer) <= 20000),
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index assistant_messages_org_time_idx on public.assistant_messages(organization_id, created_at desc);
create index assistant_messages_user_time_idx on public.assistant_messages(user_id, created_at desc);

alter table public.assistant_messages enable row level security;
-- Members read their own questions and answers, within an organization they belong to. Colleagues' questions stay
-- private to them.
create policy "own messages read" on public.assistant_messages for select to authenticated
  using (public.is_member(organization_id) and user_id = (select auth.uid()));
revoke insert, update, delete on public.assistant_messages from authenticated, anon;

comment on table public.assistant_messages is 'In-app assistant questions and answers (D-042): history and rate-limit source. Written by the server only.';
