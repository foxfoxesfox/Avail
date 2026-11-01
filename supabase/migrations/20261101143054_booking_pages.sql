-- Booking pages (slice B1): a second schedule type. The host paints their own free times; anyone with the link will
-- book a meeting of a set length (B2). Capacity 1 = one person per meeting; more = group sessions up to that many.

alter table public.schedules drop constraint schedules_kind_check;
alter table public.schedules add constraint schedules_kind_check check (kind in ('dates', 'booking'));
alter table public.schedules
  add column meeting_minutes smallint,
  add column capacity smallint,
  add constraint schedules_booking_check check (
    kind <> 'booking' or (meeting_minutes is not null and capacity between 1 and 100
      and meeting_minutes % slot_minutes = 0 and meeting_minutes between slot_minutes and day_end_min - day_start_min));

-- The host's free times on a booking page, one row per free grid slot (day + minute, in the schedule's time zone).
create table public.open_times (
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  day date not null,
  minute smallint not null check (minute between 0 and 1439),
  primary key (schedule_id, day, minute)
);
alter table public.open_times enable row level security;
revoke all on public.open_times from anon, authenticated;

-- Like create_schedule, but no member list. Server-only (secret key), so the bot check in front can't be skipped.
create function public.create_booking_page(
  p_title text, p_start_date date, p_end_date date, p_weekdays smallint[], p_day_start_min smallint, p_day_end_min smallint,
  p_slot_minutes smallint, p_time_zone text, p_deadline_local timestamp, p_meeting_minutes smallint, p_capacity smallint
) returns table (share_id text, admin_token text)
language plpgsql security definer set search_path = '' as $$
declare v_share text; v_token text := public.random_token(24); v_deadline timestamptz;
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception 'invalid time zone' using errcode = '22023';
  end if;
  v_deadline := p_deadline_local at time zone p_time_zone;
  if v_deadline <= now() then raise exception 'deadline has passed' using errcode = '22023'; end if;
  loop
    v_share := public.random_token(8);
    exit when not exists (select 1 from public.schedules s where s.share_id = v_share);
  end loop;
  insert into public.schedules (share_id, admin_token_hash, title, kind, start_date, end_date, weekdays,
    day_start_min, day_end_min, slot_minutes, time_zone, deadline, show_names, meeting_minutes, capacity)
  values (v_share, extensions.digest(v_token, 'sha256'), btrim(p_title), 'booking', p_start_date, p_end_date, p_weekdays,
    p_day_start_min, p_day_end_min, p_slot_minutes, p_time_zone, v_deadline, false, p_meeting_minutes, p_capacity);
  return query select v_share, v_token;
end $$;
revoke execute on function public.create_booking_page from public, anon, authenticated;
grant execute on function public.create_booking_page to service_role;

-- The host's free times, for the organizer (link or account).
create function public.get_open_times(p_share_id text, p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_array(o.day, o.minute, 2) order by o.day, o.minute), '[]'::jsonb)
  from public.open_times o where o.schedule_id = public.organizer_schedule(p_share_id, p_token)
$$;

-- Replace the host's free times inside the current dates and hours (rows outside them are kept, like answers).
create function public.save_open_times(p_share_id text, p_token text, p_days date[], p_minutes smallint[]) returns int
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token); s public.schedules; n int;
begin
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if cardinality(p_days) is distinct from cardinality(p_minutes) or cardinality(p_days) > 20000 then
    raise exception 'bad slots' using errcode = '22023';
  end if;
  select * into s from public.schedules where id = v_id;
  delete from public.open_times o
  where o.schedule_id = v_id and o.day between s.start_date and s.end_date and extract(dow from o.day)::smallint = any (s.weekdays)
    and o.minute >= s.day_start_min and o.minute < s.day_end_min;
  insert into public.open_times (schedule_id, day, minute)
  select v_id, u.d, u.m from unnest(p_days, p_minutes) as u(d, m)
  where u.d between s.start_date and s.end_date and extract(dow from u.d)::smallint = any (s.weekdays)
    and u.m >= s.day_start_min and u.m < s.day_end_min and u.m % s.slot_minutes = 0
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Editing: same rules as before, plus booking settings, and the host's free times follow slot-size changes like answers.
drop function public.update_schedule(text, text, text, date, date, smallint[], smallint, smallint, smallint, timestamp, boolean);
create function public.update_schedule(
  p_share_id text, p_token text, p_title text, p_start_date date, p_end_date date, p_weekdays smallint[],
  p_day_start_min smallint, p_day_end_min smallint, p_slot_minutes smallint, p_deadline_local timestamp, p_show_names boolean,
  p_meeting_minutes smallint default null, p_capacity smallint default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token); s public.schedules;
begin
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into s from public.schedules where id = v_id for update;
  if p_slot_minutes > s.slot_minutes and (
       exists (select 1 from public.responses r join public.participants p on p.id = r.participant_id where p.schedule_id = v_id)
       or exists (select 1 from public.open_times o where o.schedule_id = v_id)) then
    raise exception 'slots can only get smaller once people have answered' using errcode = '22023';
  end if;
  if exists (select 1 from public.sessions x
             where x.schedule_id = v_id and (x.start_min % p_slot_minutes <> 0 or x.end_min % p_slot_minutes <> 0)) then
    raise exception 'a confirmed session does not fit that slot size' using errcode = '22023';
  end if;
  if p_slot_minutes < s.slot_minutes then
    insert into public.responses (participant_id, day, minute, state)
    select r.participant_id, r.day, r.minute + k * p_slot_minutes, r.state
    from public.responses r join public.participants p on p.id = r.participant_id
    cross join generate_series(1, s.slot_minutes / p_slot_minutes - 1) as k
    where p.schedule_id = v_id
    on conflict do nothing;
    insert into public.open_times (schedule_id, day, minute)
    select o.schedule_id, o.day, o.minute + k * p_slot_minutes
    from public.open_times o cross join generate_series(1, s.slot_minutes / p_slot_minutes - 1) as k
    where o.schedule_id = v_id
    on conflict do nothing;
  end if;
  update public.schedules set
    title = btrim(p_title), start_date = p_start_date, end_date = p_end_date, weekdays = p_weekdays,
    day_start_min = p_day_start_min, day_end_min = p_day_end_min, slot_minutes = p_slot_minutes,
    deadline = p_deadline_local at time zone s.time_zone, show_names = p_show_names,
    meeting_minutes = case when s.kind = 'booking' then coalesce(p_meeting_minutes, s.meeting_minutes) end,
    capacity = case when s.kind = 'booking' then coalesce(p_capacity, s.capacity) end
  where id = v_id;
end $$;

-- Public view: adds the booking settings.
create or replace function public.get_schedule(p_share_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'shareId', s.share_id, 'title', s.title, 'kind', s.kind,
    'startDate', s.start_date, 'endDate', s.end_date, 'weekdays', s.weekdays,
    'dayStartMin', s.day_start_min, 'dayEndMin', s.day_end_min, 'slotMinutes', s.slot_minutes,
    'timeZone', s.time_zone, 'deadline', s.deadline, 'closed', s.deadline is not null and s.deadline <= now(),
    'showNames', s.show_names, 'createdAt', s.created_at,
    'meetingMinutes', s.meeting_minutes, 'capacity', s.capacity,
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

revoke execute on function public.get_open_times, public.save_open_times, public.update_schedule from public;
grant execute on function public.get_open_times, public.save_open_times, public.update_schedule to anon, authenticated;
