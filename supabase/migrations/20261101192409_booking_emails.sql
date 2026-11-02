-- Booking pages (slice B4): what the server needs to email a booking's visitor and host. Includes the organizers'
-- account emails, so only the secret key may call it.
create function public.booking_notice(p_booking uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('shareId', s.share_id, 'title', s.title, 'timeZone', s.time_zone,
    'day', b.day, 'startMin', b.start_min, 'endMin', b.end_min, 'name', b.name, 'email', b.email,
    'hostEmails', coalesce((
      select jsonb_agg(u.email order by o.role desc, o.added_at)
      from public.schedule_organizers o join auth.users u on u.id = o.user_id
      where o.schedule_id = s.id and u.email is not null), '[]'::jsonb))
  from public.bookings b join public.schedules s on s.id = b.schedule_id
  where b.id = p_booking
$$;
revoke execute on function public.booking_notice from public, anon, authenticated;
grant execute on function public.booking_notice to service_role;
