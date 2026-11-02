-- Booking pages: a meeting place with a web link (a video call) stays off the public page until someone books, so the
-- share link alone can't join a call. Visitors get "online" instead; the booking page, emails and the organizer get the place.
create or replace function public.get_schedule(p_share_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'shareId', s.share_id, 'title', s.title, 'kind', s.kind,
    'startDate', s.start_date, 'endDate', s.end_date, 'weekdays', s.weekdays,
    'dayStartMin', s.day_start_min, 'dayEndMin', s.day_end_min, 'slotMinutes', s.slot_minutes,
    'timeZone', s.time_zone, 'deadline', s.deadline, 'closed', s.deadline is not null and s.deadline <= now(),
    'showNames', s.show_names, 'createdAt', s.created_at,
    'meetingMinutes', s.meeting_minutes, 'capacity', s.capacity, 'hostName', s.host_name,
    'location', case when s.location ~* 'https?://' then null else s.location end,
    'online', coalesce(s.location ~* 'https?://', false),
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

-- The organizer sees and edits the place as typed.
create or replace function public.get_schedule_admin(p_share_id text, p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.get_schedule(s.share_id) || jsonb_build_object('location', s.location)
  from public.schedules s where s.id = public.organizer_schedule(p_share_id, p_token)
$$;
