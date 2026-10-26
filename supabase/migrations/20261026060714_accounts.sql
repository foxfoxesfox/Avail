-- Slice 7: accounts. An account is a second way in, next to the links: signed-in organizers keep schedules
-- (the first account is the owner, later ones co-organizers), and members can lock their name to their account.

create table public.schedule_organizers (
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'co')),
  added_at timestamptz not null default now(),
  primary key (schedule_id, user_id)
);
create index on public.schedule_organizers (user_id);
create unique index schedule_one_owner on public.schedule_organizers (schedule_id) where role = 'owner';
alter table public.schedule_organizers enable row level security;
revoke all on public.schedule_organizers from anon, authenticated;

alter table public.participants add column user_id uuid references auth.users (id) on delete set null;
alter table public.participants add constraint participants_one_name_per_account unique (schedule_id, user_id);

-- The schedule id when the organizer secret matches or the signed-in account organizes it, else null.
create or replace function public.organizer_schedule(p_share_id text, p_token text) returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.schedules s
  where s.share_id = p_share_id
    and ((p_token is not null and s.admin_token_hash = extensions.digest(p_token, 'sha256'))
      or exists (select 1 from public.schedule_organizers o where o.schedule_id = s.id and o.user_id = auth.uid()))
$$;

create or replace function public.get_schedule_admin(p_share_id text, p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when public.organizer_schedule(p_share_id, p_token) is not null then public.get_schedule(p_share_id) end
$$;

-- A name locked to an account opens only for that account; otherwise the PIN rule applies.
create or replace function public.member_ok(p_share_id text, p_participant uuid, p_pin text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.participants p join public.schedules s on s.id = p.schedule_id
    where s.share_id = p_share_id and p.id = p_participant
      and case when p.user_id is not null then p.user_id = auth.uid()
               else p.pin_hash is null or (p_pin is not null and p.pin_hash = extensions.crypt(p_pin, p.pin_hash)) end)
$$;

create or replace function public.set_pin(p_share_id text, p_participant uuid, p_pin text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_pin !~ '^\d{4,8}$' then raise exception 'PIN must be 4 to 8 digits' using errcode = '22023'; end if;
  update public.participants p set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  from public.schedules s
  where s.id = p.schedule_id and s.share_id = p_share_id and p.id = p_participant and p.pin_hash is null and p.user_id is null;
  return found;
end $$;

-- Public view: adds whether each name is locked to an account (never which account).
create or replace function public.get_schedule(p_share_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'shareId', s.share_id, 'title', s.title, 'kind', s.kind,
    'startDate', s.start_date, 'endDate', s.end_date, 'weekdays', s.weekdays,
    'dayStartMin', s.day_start_min, 'dayEndMin', s.day_end_min, 'slotMinutes', s.slot_minutes,
    'timeZone', s.time_zone, 'deadline', s.deadline, 'showNames', s.show_names, 'createdAt', s.created_at,
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'hasPin', p.pin_hash is not null, 'isKey', p.is_key,
        'claimed', p.user_id is not null) order by p.position)
      from public.participants p where p.schedule_id = s.id), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'day', x.day, 'startMin', x.start_min, 'endMin', x.end_min,
        'location', x.location, 'link', x.link, 'notes', x.notes) order by x.day, x.start_min)
      from public.sessions x where x.schedule_id = s.id), '[]'::jsonb))
  from public.schedules s where s.share_id = p_share_id
$$;

-- Totals show names when the schedule allows it or the viewer organizes it (by link or account).
create or replace function public.get_totals(p_share_id text, p_token text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  with s as (
    select id, show_names or public.organizer_schedule(p_share_id, p_token) is not null as names
    from public.schedules where share_id = p_share_id
  ),
  p as (select p.* from public.participants p join s on s.id = p.schedule_id),
  r as (select r.day, r.minute, r.state, p.name, p.position from public.responses r join p on p.id = r.participant_id)
  select jsonb_build_object(
    'people', (select count(*) from p),
    'replied', (select count(*) from p where responded_at is not null),
    'pending', case when (select names from s) then
      (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from p where responded_at is null) end,
    'slots', coalesce((
      select jsonb_agg(jsonb_build_array(day, minute, free, ifn, fnames, inames) order by day, minute)
      from (
        select day, minute,
          count(*) filter (where state = 2) as free,
          count(*) filter (where state = 1) as ifn,
          case when (select names from s) then jsonb_agg(name order by position) filter (where state = 2) end as fnames,
          case when (select names from s) then jsonb_agg(name order by position) filter (where state = 1) end as inames
        from r group by day, minute
      ) t), '[]'::jsonb))
  where exists (select 1 from s)
$$;

-- Through the organizer link, add the schedule to the signed-in account. Returns the account's role.
create function public.add_organizer(p_share_id text, p_token text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_role text;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select id into v_id from public.schedules
  where share_id = p_share_id and p_token is not null and admin_token_hash = extensions.digest(p_token, 'sha256');
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.schedule_organizers (schedule_id, user_id, role)
  values (v_id, auth.uid(),
    case when exists (select 1 from public.schedule_organizers where schedule_id = v_id and role = 'owner') then 'co' else 'owner' end)
  on conflict do nothing;
  select role into v_role from public.schedule_organizers where schedule_id = v_id and user_id = auth.uid();
  return v_role;
end $$;

-- Who organizes this schedule by account, for organizers only.
create function public.get_organizers(p_share_id text, p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'myRole', (select o.role from public.schedule_organizers o where o.schedule_id = v.id and o.user_id = auth.uid()),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object('userId', o.user_id, 'email', u.email, 'role', o.role, 'isMe', o.user_id = auth.uid())
        order by o.role desc, o.added_at)
      from public.schedule_organizers o join auth.users u on u.id = o.user_id where o.schedule_id = v.id), '[]'::jsonb))
  from (select public.organizer_schedule(p_share_id, p_token) as id) v where v.id is not null
$$;

-- The owner removes a co-organizer; a co-organizer can remove themself.
create function public.remove_organizer(p_share_id text, p_token text, p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token);
begin
  if v_id is null or auth.uid() is null
     or (p_user <> auth.uid() and not exists (
       select 1 from public.schedule_organizers where schedule_id = v_id and user_id = auth.uid() and role = 'owner')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.schedule_organizers where schedule_id = v_id and user_id = p_user and role = 'co';
  return found;
end $$;

-- The owner issues a new organizer link; the old one stops working. Returns the new secret (only its hash is kept).
create function public.new_organizer_link(p_share_id text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text := public.random_token(24);
begin
  update public.schedules s set admin_token_hash = extensions.digest(v_token, 'sha256')
  where s.share_id = p_share_id and exists (
    select 1 from public.schedule_organizers o where o.schedule_id = s.id and o.user_id = auth.uid() and o.role = 'owner');
  if not found then raise exception 'not allowed' using errcode = '42501'; end if;
  return v_token;
end $$;

-- Schedules the signed-in account organizes or has a name on, newest first.
create function public.my_schedules() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x ->> 'createdAt' desc), '[]'::jsonb) from (
    select jsonb_build_object('shareId', s.share_id, 'title', s.title, 'startDate', s.start_date, 'endDate', s.end_date,
      'createdAt', s.created_at, 'role', o.role, 'name', p.name) as x
    from public.schedules s
    left join public.schedule_organizers o on o.schedule_id = s.id and o.user_id = auth.uid()
    left join public.participants p on p.schedule_id = s.id and p.user_id = auth.uid()
    where auth.uid() is not null and (o.user_id is not null or p.user_id is not null)
  ) t
$$;

-- The signed-in account's name on a schedule, if it has locked one.
create function public.my_participant(p_share_id text) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.participants p join public.schedules s on s.id = p.schedule_id
  where s.share_id = p_share_id and auth.uid() is not null and p.user_id = auth.uid()
$$;

-- Lock a name to the signed-in account (one name per account per schedule). The PIN, if set, must match.
create function public.claim_name(p_share_id text, p_participant uuid, p_pin text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.member_ok(p_share_id, p_participant, p_pin) then return false; end if;
  update public.participants p set user_id = auth.uid()
  where p.id = p_participant and p.user_id is null
    and not exists (select 1 from public.participants q where q.schedule_id = p.schedule_id and q.user_id = auth.uid());
  return found;
end $$;

create function public.unclaim_name(p_share_id text, p_participant uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.participants p set user_id = null
  from public.schedules s
  where s.id = p.schedule_id and s.share_id = p_share_id and p.id = p_participant and auth.uid() is not null and p.user_id = auth.uid();
  return found;
end $$;

revoke execute on function public.add_organizer, public.get_organizers, public.remove_organizer, public.new_organizer_link,
  public.my_schedules, public.my_participant, public.claim_name, public.unclaim_name from public, anon;
grant execute on function public.add_organizer, public.get_organizers, public.remove_organizer, public.new_organizer_link,
  public.my_schedules, public.my_participant, public.claim_name, public.unclaim_name to authenticated;
