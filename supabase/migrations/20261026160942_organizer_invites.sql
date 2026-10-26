-- One-time co-organizer invites: the owner can invite someone without sharing (or resetting) the organizer link.
-- Like the organizer link, only a hash of the invite secret is stored.

create table public.organizer_invites (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  token_hash bytea not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);
alter table public.organizer_invites enable row level security;
revoke all on public.organizer_invites from anon, authenticated;

-- Owner only. Returns the invite secret, which is shown once.
create function public.create_invite(p_share_id text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text := public.random_token(18); v_id uuid;
begin
  select s.id into v_id from public.schedules s join public.schedule_organizers o on o.schedule_id = s.id
  where s.share_id = p_share_id and o.user_id = auth.uid() and o.role = 'owner';
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.organizer_invites (schedule_id, token_hash, created_by)
  values (v_id, extensions.digest(v_token, 'sha256'), auth.uid());
  return v_token;
end $$;

-- What the invite page shows before accepting: the schedule title, or null when the invite is used, expired or unknown.
create function public.get_invite(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('title', s.title, 'shareId', s.share_id)
  from public.organizer_invites i join public.schedules s on s.id = i.schedule_id
  where p_token is not null and i.token_hash = extensions.digest(p_token, 'sha256')
    and i.used_at is null and i.expires_at > now()
$$;

-- The signed-in person becomes a co-organizer (or keeps their role) and the invite is used up. Returns the share id.
create function public.accept_invite(p_token text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_invite public.organizer_invites; v_share text;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into v_invite from public.organizer_invites
  where p_token is not null and token_hash = extensions.digest(p_token, 'sha256') and used_at is null and expires_at > now()
  for update;
  if v_invite.id is null then return null; end if;
  insert into public.schedule_organizers (schedule_id, user_id, role) values (v_invite.schedule_id, auth.uid(), 'co')
  on conflict do nothing;
  update public.organizer_invites set used_by = auth.uid(), used_at = now() where id = v_invite.id;
  select share_id into v_share from public.schedules where id = v_invite.schedule_id;
  return v_share;
end $$;

revoke execute on function public.create_invite, public.get_invite, public.accept_invite from public, anon;
grant execute on function public.create_invite, public.accept_invite to authenticated;
grant execute on function public.get_invite to anon, authenticated;
