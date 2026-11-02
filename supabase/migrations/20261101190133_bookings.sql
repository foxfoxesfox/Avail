-- Booking pages (slice B2): visitors book a meeting inside the host's free times. No account; name and email kept for
-- the host, plus a private link (hashed here) that shows and cancels the booking.

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  day date not null,
  start_min smallint not null check (start_min between 0 and 1439),
  end_min smallint not null check (end_min > start_min and end_min <= 1440),
  name text not null check (char_length(name) between 1 and 60),
  email text not null check (char_length(email) between 3 and 254),
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index bookings_active on public.bookings (schedule_id, day) where cancelled_at is null;
alter table public.bookings enable row level security;
revoke all on public.bookings from anon, authenticated;

-- Every start a visitor can book right now, with places left: the whole meeting sits inside the host's free times and
-- the current dates and hours, starts in the future, answers aren't closed, and no slot of it is full.
-- Capacity counts per slot, so overlapping bookings at different starts share the places.
create function public.booking_starts(p_schedule_id uuid) returns table (day date, start_min smallint, places int)
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
    and (o.day + make_interval(mins => o.minute)) at time zone s.time_zone > now()
    and (select count(*) from public.open_times f
         where f.schedule_id = s.id and f.day = o.day and f.minute >= o.minute and f.minute < o.minute + s.meeting_minutes)
        = s.meeting_minutes / s.slot_minutes
$$;
revoke execute on function public.booking_starts(uuid) from public, anon, authenticated;

-- Public: the open starts for the share link, as [day, minute, places left]. Full starts are left out.
create function public.get_booking_starts(p_share_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_array(b.day, b.start_min, b.places) order by b.day, b.start_min), '[]'::jsonb)
  from public.schedules s cross join lateral public.booking_starts(s.id) b
  where s.share_id = p_share_id and b.places > 0
$$;

-- Book one start. Server-only (secret key) so the bot check in front can't be skipped. Locking the schedule row makes
-- bookings on one page take turns, so two people can never both take the last place.
create function public.book_time(p_share_id text, p_day date, p_start_min smallint, p_name text, p_email text)
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
  insert into public.bookings (schedule_id, day, start_min, end_min, name, email, token_hash)
  values (s.id, p_day, p_start_min, p_start_min + s.meeting_minutes, btrim(p_name), btrim(p_email), extensions.digest(v_token, 'sha256'));
  return v_token;
end $$;
revoke execute on function public.book_time from public, anon, authenticated;
grant execute on function public.book_time to service_role;

-- The visitor's own booking, by its private link.
create function public.get_booking(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', b.id, 'shareId', s.share_id, 'title', s.title, 'timeZone', s.time_zone,
    'day', b.day, 'startMin', b.start_min, 'endMin', b.end_min, 'name', b.name, 'email', b.email,
    'cancelled', b.cancelled_at is not null)
  from public.bookings b join public.schedules s on s.id = b.schedule_id
  where p_token is not null and b.token_hash = extensions.digest(p_token, 'sha256')
$$;

-- Cancel by the private link; the place opens again. True if this call cancelled it.
create function public.cancel_booking(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.bookings set cancelled_at = now()
  where p_token is not null and token_hash = extensions.digest(p_token, 'sha256') and cancelled_at is null;
  return found;
end $$;

revoke execute on function public.get_booking_starts, public.get_booking, public.cancel_booking from public;
grant execute on function public.get_booking_starts, public.get_booking, public.cancel_booking to anon, authenticated;
