-- Booking pages (slice B5): bookings stay when the host edits dates, hours or free times; the host's list flags any
-- that no longer sit inside the current free times ("outside").
create or replace function public.get_bookings(p_share_id text, p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'day', b.day, 'startMin', b.start_min, 'endMin', b.end_min,
      'name', b.name, 'email', b.email, 'createdAt', b.created_at, 'cancelled', b.cancelled_at is not null,
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
