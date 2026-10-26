-- Slice 5: key members and confirmed sessions. Organizer actions need the link secret.

alter table public.participants add column is_key boolean not null default false;

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  day date not null,
  start_min smallint not null check (start_min between 0 and 1439),
  end_min smallint not null check (end_min between 1 and 1440),
  location text check (char_length(location) <= 200),
  link text check (char_length(link) <= 500 and link ~* '^https?://'),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  check (end_min > start_min)
);
alter table public.sessions enable row level security;
revoke all on public.sessions from anon, authenticated;

-- The schedule id when the organizer secret matches, else null.
create function public.organizer_schedule(p_share_id text, p_token text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.schedules
  where share_id = p_share_id and p_token is not null and admin_token_hash = extensions.digest(p_token, 'sha256')
$$;
revoke execute on function public.organizer_schedule(text, text) from public, anon, authenticated;

create function public.set_key_member(p_share_id text, p_token text, p_participant uuid, p_key boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token);
begin
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.participants set is_key = p_key where id = p_participant and schedule_id = v_id;
  return found;
end $$;

-- A session must sit on a scheduled day, inside the day's hours, on slot boundaries.
create function public.confirm_session(
  p_share_id text, p_token text, p_day date, p_start_min smallint, p_end_min smallint,
  p_location text, p_link text, p_notes text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := public.organizer_schedule(p_share_id, p_token);
  v_session uuid;
  s public.schedules;
begin
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into s from public.schedules where id = v_id;
  if p_day not between s.start_date and s.end_date or not (extract(dow from p_day)::smallint = any (s.weekdays))
     or p_start_min < s.day_start_min or p_end_min > s.day_end_min or p_end_min <= p_start_min
     or p_start_min % s.slot_minutes <> 0 or p_end_min % s.slot_minutes <> 0 then
    raise exception 'session outside the schedule' using errcode = '22023';
  end if;
  insert into public.sessions (schedule_id, day, start_min, end_min, location, link, notes)
  values (v_id, p_day, p_start_min, p_end_min, nullif(btrim(p_location), ''), nullif(btrim(p_link), ''), nullif(btrim(p_notes), ''))
  returning id into v_session;
  return v_session;
end $$;

create function public.cancel_session(p_share_id text, p_token text, p_session uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token);
begin
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  delete from public.sessions where id = p_session and schedule_id = v_id;
  return found;
end $$;

-- Public schedule view: adds key members and confirmed sessions.
create or replace function public.get_schedule(p_share_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'shareId', s.share_id, 'title', s.title, 'kind', s.kind,
    'startDate', s.start_date, 'endDate', s.end_date, 'weekdays', s.weekdays,
    'dayStartMin', s.day_start_min, 'dayEndMin', s.day_end_min, 'slotMinutes', s.slot_minutes,
    'timeZone', s.time_zone, 'deadline', s.deadline, 'showNames', s.show_names, 'createdAt', s.created_at,
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'hasPin', p.pin_hash is not null, 'isKey', p.is_key) order by p.position)
      from public.participants p where p.schedule_id = s.id), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'day', x.day, 'startMin', x.start_min, 'endMin', x.end_min,
        'location', x.location, 'link', x.link, 'notes', x.notes) order by x.day, x.start_min)
      from public.sessions x where x.schedule_id = s.id), '[]'::jsonb))
  from public.schedules s where s.share_id = p_share_id
$$;

revoke execute on function public.set_key_member, public.confirm_session, public.cancel_session from public;
grant execute on function public.set_key_member, public.confirm_session, public.cancel_session to anon, authenticated;
