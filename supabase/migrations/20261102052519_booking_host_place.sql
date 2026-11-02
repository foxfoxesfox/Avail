-- Booking pages (design fixes): an optional host name and meeting place for visitors, and who cancelled a booking.
alter table public.schedules
  add column host_name text check (char_length(host_name) <= 60),
  add column location text check (char_length(location) <= 300);
alter table public.bookings add column cancelled_by text check (cancelled_by in ('visitor', 'host'));

-- Create: same as before, plus host name and place.
drop function public.create_booking_page(text, date, date, smallint[], smallint, smallint, smallint, text, timestamp, smallint, smallint);
create function public.create_booking_page(
  p_title text, p_start_date date, p_end_date date, p_weekdays smallint[], p_day_start_min smallint, p_day_end_min smallint,
  p_slot_minutes smallint, p_time_zone text, p_deadline_local timestamp, p_meeting_minutes smallint, p_capacity smallint,
  p_host_name text default null, p_location text default null
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
    day_start_min, day_end_min, slot_minutes, time_zone, deadline, show_names, meeting_minutes, capacity, host_name, location)
  values (v_share, extensions.digest(v_token, 'sha256'), btrim(p_title), 'booking', p_start_date, p_end_date, p_weekdays,
    p_day_start_min, p_day_end_min, p_slot_minutes, p_time_zone, v_deadline, false, p_meeting_minutes, p_capacity,
    nullif(btrim(p_host_name), ''), nullif(btrim(p_location), ''));
  return query select v_share, v_token;
end $$;
revoke execute on function public.create_booking_page from public, anon, authenticated;
grant execute on function public.create_booking_page to service_role;

-- Edit: same as before, plus host name and place (null keeps them, empty clears them).
drop function public.update_schedule(text, text, text, date, date, smallint[], smallint, smallint, smallint, timestamp, boolean, smallint, smallint);
create function public.update_schedule(
  p_share_id text, p_token text, p_title text, p_start_date date, p_end_date date, p_weekdays smallint[],
  p_day_start_min smallint, p_day_end_min smallint, p_slot_minutes smallint, p_deadline_local timestamp, p_show_names boolean,
  p_meeting_minutes smallint default null, p_capacity smallint default null, p_host_name text default null, p_location text default null
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
    capacity = case when s.kind = 'booking' then coalesce(p_capacity, s.capacity) end,
    host_name = case when s.kind = 'booking' then nullif(btrim(coalesce(p_host_name, s.host_name)), '') end,
    location = case when s.kind = 'booking' then nullif(btrim(coalesce(p_location, s.location)), '') end
  where id = v_id;
end $$;
revoke execute on function public.update_schedule from public;
grant execute on function public.update_schedule to anon, authenticated;

-- Public view: adds host name and place.
create or replace function public.get_schedule(p_share_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'shareId', s.share_id, 'title', s.title, 'kind', s.kind,
    'startDate', s.start_date, 'endDate', s.end_date, 'weekdays', s.weekdays,
    'dayStartMin', s.day_start_min, 'dayEndMin', s.day_end_min, 'slotMinutes', s.slot_minutes,
    'timeZone', s.time_zone, 'deadline', s.deadline, 'closed', s.deadline is not null and s.deadline <= now(),
    'showNames', s.show_names, 'createdAt', s.created_at,
    'meetingMinutes', s.meeting_minutes, 'capacity', s.capacity, 'hostName', s.host_name, 'location', s.location,
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

-- Who cancelled.
create or replace function public.cancel_booking(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.bookings set cancelled_at = now(), cancelled_by = 'visitor'
  where p_token is not null and token_hash = extensions.digest(p_token, 'sha256') and cancelled_at is null;
  return found;
end $$;

create or replace function public.host_cancel_booking(p_share_id text, p_token text, p_booking uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.bookings set cancelled_at = now(), cancelled_by = 'host'
  where id = p_booking and schedule_id = public.organizer_schedule(p_share_id, p_token) and cancelled_at is null;
  return found;
end $$;

-- The visitor's booking: adds host name, place and who cancelled.
create or replace function public.get_booking(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', b.id, 'shareId', s.share_id, 'title', s.title, 'timeZone', s.time_zone,
    'day', b.day, 'startMin', b.start_min, 'endMin', b.end_min, 'name', b.name, 'email', b.email,
    'cancelled', b.cancelled_at is not null, 'cancelledBy', b.cancelled_by, 'hostName', s.host_name, 'location', s.location)
  from public.bookings b join public.schedules s on s.id = b.schedule_id
  where p_token is not null and b.token_hash = extensions.digest(p_token, 'sha256')
$$;

-- The host's list: adds who cancelled.
create or replace function public.get_bookings(p_share_id text, p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'day', b.day, 'startMin', b.start_min, 'endMin', b.end_min,
      'name', b.name, 'email', b.email, 'createdAt', b.created_at, 'cancelled', b.cancelled_at is not null,
      'cancelledBy', b.cancelled_by,
      'past', (b.day + make_interval(mins => b.end_min)) at time zone s.time_zone <= now(),
      'outside', not (b.day between s.start_date and s.end_date and extract(dow from b.day)::smallint = any (s.weekdays)
        and b.start_min >= s.day_start_min and b.end_min <= s.day_end_min
        and (select count(*) from public.open_times f
             where f.schedule_id = s.id and f.day = b.day and f.minute >= b.start_min and f.minute < b.end_min)
            >= (b.end_min - b.start_min) / s.slot_minutes))
    order by b.day, b.start_min, b.created_at), '[]'::jsonb)
  from public.bookings b join public.schedules s on s.id = b.schedule_id
  where b.schedule_id = public.organizer_schedule(p_share_id, p_token)
$$;

-- Emails: adds host name and place.
create or replace function public.booking_notice(p_booking uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('shareId', s.share_id, 'title', s.title, 'timeZone', s.time_zone,
    'day', b.day, 'startMin', b.start_min, 'endMin', b.end_min, 'name', b.name, 'email', b.email,
    'hostName', s.host_name, 'location', s.location,
    'hostEmails', coalesce((
      select jsonb_agg(u.email order by o.role desc, o.added_at)
      from public.schedule_organizers o join auth.users u on u.id = o.user_id
      where o.schedule_id = s.id and u.email is not null), '[]'::jsonb))
  from public.bookings b join public.schedules s on s.id = b.schedule_id
  where b.id = p_booking
$$;
