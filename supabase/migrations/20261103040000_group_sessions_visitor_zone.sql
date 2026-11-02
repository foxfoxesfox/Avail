-- Booking pages (fifth design review): group pages run fixed sessions, and bookings remember the visitor's time zone.

-- Group pages: starts line up with the meeting length from the first hour of the day (10am, 11am, … for 1-hour meetings),
-- so everyone who picks 10am joins one session instead of staggered, overlapping ones. One-person pages keep every start.
create or replace function public.booking_starts(p_schedule_id uuid) returns table (day date, start_min smallint, places int)
language sql stable security definer set search_path = '' as $$
  select o.day, o.minute, (s.capacity - coalesce((
      select max(n) from (
        select count(b.id) as n
        from generate_series(o.minute::int, (o.minute + s.meeting_minutes - s.slot_minutes)::int, s.slot_minutes::int) g(m)
        left join public.bookings b on b.schedule_id = s.id and b.day = o.day and b.cancelled_at is null
          and b.start_min < g.m + s.slot_minutes and b.end_min > g.m
        group by g.m) z), 0))::int
  from public.schedules s
  join public.open_times o on o.schedule_id = s.id
  where s.id = p_schedule_id and s.kind = 'booking' and (s.deadline is null or s.deadline > now())
    and o.day between s.start_date and s.end_date and extract(dow from o.day)::smallint = any (s.weekdays)
    and o.minute >= s.day_start_min and o.minute + s.meeting_minutes <= s.day_end_min
    and (s.capacity = 1 or (o.minute - s.day_start_min) % s.meeting_minutes = 0)
    and (o.day + make_interval(mins => o.minute)) at time zone s.time_zone > now()
    and (select count(*) from public.open_times f
         where f.schedule_id = s.id and f.day = o.day and f.minute >= o.minute and f.minute < o.minute + s.meeting_minutes)
        = s.meeting_minutes / s.slot_minutes
$$;

-- The visitor's own zone (from their browser), so their booking page and emails can show the time on their clock too.
alter table public.bookings add column visitor_zone text check (char_length(visitor_zone) <= 64);

drop function public.book_time(text, date, smallint, text, text);
create function public.book_time(p_share_id text, p_day date, p_start_min smallint, p_name text, p_email text, p_zone text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare s public.schedules; v_token text := public.random_token(24);
begin
  select * into s from public.schedules where share_id = p_share_id and kind = 'booking' for update;
  if s.id is null then raise exception 'not found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.booking_starts(s.id) b where b.day = p_day and b.start_min = p_start_min and b.places > 0) then
    raise exception 'time not available' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.bookings b where b.schedule_id = s.id and b.cancelled_at is null
             and lower(b.email) = lower(btrim(p_email)) and b.day = p_day
             and b.start_min < p_start_min + s.meeting_minutes and b.end_min > p_start_min) then
    raise exception 'already booked' using errcode = 'P0001';
  end if;
  insert into public.bookings (schedule_id, day, start_min, end_min, name, email, token_hash, visitor_zone)
  values (s.id, p_day, p_start_min, p_start_min + s.meeting_minutes, btrim(p_name), btrim(p_email), extensions.digest(v_token, 'sha256'),
    -- An unknown zone is dropped, not an error: it only adds a line.
    (select z.name from pg_catalog.pg_timezone_names z where z.name = p_zone));
  return v_token;
end $$;
revoke execute on function public.book_time from public, anon, authenticated;
grant execute on function public.book_time to service_role;

create or replace function public.get_booking(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', b.id, 'shareId', s.share_id, 'title', s.title, 'timeZone', s.time_zone,
    'day', b.day, 'startMin', b.start_min, 'endMin', b.end_min, 'name', b.name, 'email', b.email,
    'cancelled', b.cancelled_at is not null, 'cancelledBy', b.cancelled_by, 'hostName', s.host_name, 'location', s.location,
    'visitorZone', b.visitor_zone)
  from public.bookings b join public.schedules s on s.id = b.schedule_id
  where p_token is not null and b.token_hash = extensions.digest(p_token, 'sha256')
$$;

create or replace function public.booking_notice(p_booking uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('shareId', s.share_id, 'title', s.title, 'timeZone', s.time_zone,
    'day', b.day, 'startMin', b.start_min, 'endMin', b.end_min, 'name', b.name, 'email', b.email,
    'hostName', s.host_name, 'location', s.location, 'visitorZone', b.visitor_zone,
    'hostEmails', coalesce((
      select jsonb_agg(u.email order by o.role desc, o.added_at)
      from public.schedule_organizers o join auth.users u on u.id = o.user_id
      where o.schedule_id = s.id and u.email is not null), '[]'::jsonb))
  from public.bookings b join public.schedules s on s.id = b.schedule_id
  where b.id = p_booking
$$;
