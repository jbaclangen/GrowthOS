-- Spam protection for the braventa.io contact form (Q-033, founder choice 2026-10-11): at most 3 requests per visitor
-- per hour and 5 per email address per day. The visitor is identified only by a salted HMAC of their IP address,
-- computed on the server (CONTACT_HASH_SALT); the raw IP is never stored.

alter table public.contact_requests add column ip_hash text check (ip_hash is null or char_length(ip_hash) = 64);
create index contact_requests_ip_hash_idx on public.contact_requests(ip_hash, created_at desc);
create index contact_requests_email_idx on public.contact_requests(lower(email), created_at desc);

-- Runs as the table owner so it can count earlier rows; anonymous visitors still can't read the table.
-- A trigger function can't be called through the API, so this adds no new public endpoint.
create function public.contact_requests_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ip_hash is not null and (
    select count(*) from public.contact_requests
    where ip_hash = new.ip_hash and created_at > now() - interval '1 hour'
  ) >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.contact_requests
    where lower(email) = lower(new.email) and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.contact_requests_rate_limit() from public, anon, authenticated;

create trigger contact_requests_rate_limit before insert on public.contact_requests
  for each row execute function public.contact_requests_rate_limit();

grant insert (ip_hash) on public.contact_requests to anon, authenticated;

comment on column public.contact_requests.ip_hash is 'HMAC-SHA256 of the visitor IP with a server-side salt (CONTACT_HASH_SALT); used only for rate limiting.';
