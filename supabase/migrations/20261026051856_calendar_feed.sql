-- Slice 6: a private calendar feed per person. The feed token only unlocks the schedule's title and
-- confirmed sessions, which the share link already shows, so it is stored as-is (the member can see
-- it again on any device) and the member can reset it if it leaks.
alter table public.participants add column feed_token text unique;

-- The member's feed token, created on first use; p_reset issues a new one so the old link stops working.
create function public.get_feed_token(p_share_id text, p_participant uuid, p_pin text, p_reset boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if not public.member_ok(p_share_id, p_participant, p_pin) then return null; end if;
  update public.participants
  set feed_token = case when p_reset or feed_token is null then public.random_token(18) else feed_token end
  where id = p_participant
  returning feed_token into v;
  return v;
end $$;

-- What a calendar app sees when it polls the feed.
create function public.get_feed(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'title', s.title, 'timeZone', s.time_zone, 'name', p.name,
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'day', x.day, 'startMin', x.start_min, 'endMin', x.end_min,
        'location', x.location, 'link', x.link, 'notes', x.notes) order by x.day, x.start_min)
      from public.sessions x where x.schedule_id = s.id), '[]'::jsonb))
  from public.participants p join public.schedules s on s.id = p.schedule_id
  where p_token is not null and p.feed_token = p_token
$$;

revoke execute on function public.get_feed_token, public.get_feed from public;
grant execute on function public.get_feed_token, public.get_feed to anon, authenticated;
