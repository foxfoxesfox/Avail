-- Booking pages (slice B3): the host's list of bookings, host cancel, and a host calendar feed of bookings.

-- The host's feed token, like a member's: stored as-is so organizers can see it again, resettable if it leaks.
-- It reveals visitors' names and emails, so only organizers can read it (get_host_feed_token).
alter table public.schedules add column host_feed_token text unique;

-- Every booking on the page, cancelled ones included, for the organizer (link or account). "past" once the meeting has ended.
create function public.get_bookings(p_share_id text, p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'day', b.day, 'startMin', b.start_min, 'endMin', b.end_min,
      'name', b.name, 'email', b.email, 'createdAt', b.created_at, 'cancelled', b.cancelled_at is not null,
      'past', (b.day + make_interval(mins => b.end_min)) at time zone s.time_zone <= now())
    order by b.day, b.start_min, b.created_at), '[]'::jsonb)
  from public.bookings b join public.schedules s on s.id = b.schedule_id
  where b.schedule_id = public.organizer_schedule(p_share_id, p_token)
$$;

-- The host cancels a booking; the place opens again. True if this call cancelled it.
create function public.host_cancel_booking(p_share_id text, p_token text, p_booking uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.bookings set cancelled_at = now()
  where id = p_booking and schedule_id = public.organizer_schedule(p_share_id, p_token) and cancelled_at is null;
  return found;
end $$;

-- The host's feed token, created on first use; p_reset issues a new one so the old link stops working.
create function public.get_host_feed_token(p_share_id text, p_token text, p_reset boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token); v text;
begin
  if v_id is null then return null; end if;
  update public.schedules
  set host_feed_token = case when p_reset or host_feed_token is null then public.random_token(18) else host_feed_token end
  where id = v_id
  returning host_feed_token into v;
  return v;
end $$;

-- What a calendar app sees when it polls a feed: a member's confirmed sessions, or the host's active bookings
-- (each titled with who booked, email in the notes).
create or replace function public.get_feed(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'title', s.title, 'timeZone', s.time_zone, 'name', p.name,
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'day', x.day, 'startMin', x.start_min, 'endMin', x.end_min,
        'location', x.location, 'link', x.link, 'notes', x.notes) order by x.day, x.start_min)
      from public.sessions x where x.schedule_id = s.id), '[]'::jsonb))
  from public.participants p join public.schedules s on s.id = p.schedule_id
  where p_token is not null and p.feed_token = p_token
  union all
  select jsonb_build_object(
    'title', s.title, 'timeZone', s.time_zone, 'name', null,
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'day', b.day, 'startMin', b.start_min, 'endMin', b.end_min,
        'location', null, 'link', null, 'notes', b.email, 'title', b.name || ' · ' || s.title) order by b.day, b.start_min)
      from public.bookings b where b.schedule_id = s.id and b.cancelled_at is null), '[]'::jsonb))
  from public.schedules s
  where p_token is not null and s.host_feed_token = p_token
$$;

-- Your schedules: adds the kind, so booking pages are labelled.
create or replace function public.my_schedules() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x ->> 'createdAt' desc), '[]'::jsonb) from (
    select jsonb_build_object('shareId', s.share_id, 'title', s.title, 'kind', s.kind, 'startDate', s.start_date, 'endDate', s.end_date,
      'createdAt', s.created_at, 'role', o.role, 'name', p.name) as x
    from public.schedules s
    left join public.schedule_organizers o on o.schedule_id = s.id and o.user_id = auth.uid()
    left join public.participants p on p.schedule_id = s.id and p.user_id = auth.uid()
    where auth.uid() is not null and (o.user_id is not null or p.user_id is not null)
  ) t
$$;

revoke execute on function public.get_bookings, public.host_cancel_booking, public.get_host_feed_token from public;
grant execute on function public.get_bookings, public.host_cancel_booking, public.get_host_feed_token to anon, authenticated;
