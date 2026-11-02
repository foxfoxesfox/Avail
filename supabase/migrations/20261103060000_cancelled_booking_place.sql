-- A cancelled booking no longer shows the meeting place: a visitor the host cancelled shouldn't keep the call link.
create or replace function public.get_booking(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', b.id, 'shareId', s.share_id, 'title', s.title, 'timeZone', s.time_zone,
    'day', b.day, 'startMin', b.start_min, 'endMin', b.end_min, 'name', b.name, 'email', b.email,
    'cancelled', b.cancelled_at is not null, 'cancelledBy', b.cancelled_by, 'hostName', s.host_name,
    'location', case when b.cancelled_at is null then s.location end,
    'visitorZone', b.visitor_zone)
  from public.bookings b join public.schedules s on s.id = b.schedule_id
  where p_token is not null and b.token_hash = extensions.digest(p_token, 'sha256')
$$;
