-- Slice 4: group totals per slot, and who has replied (so "busy" and "hasn't answered" differ).

alter table public.participants add column responded_at timestamptz;
-- Anyone who already saved answers has replied.
update public.participants p set responded_at = now()
where exists (select 1 from public.responses r where r.participant_id = p.id);

-- Same as slice 3, plus: saving (even an empty grid) marks the member as replied.
create or replace function public.save_availability(
  p_share_id text, p_participant uuid, p_pin text,
  p_days date[], p_minutes smallint[], p_states smallint[]
) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.member_ok(p_share_id, p_participant, p_pin) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if cardinality(p_days) is distinct from cardinality(p_minutes) or cardinality(p_days) is distinct from cardinality(p_states)
     or cardinality(p_days) > 20000 then
    raise exception 'bad slots' using errcode = '22023';
  end if;

  delete from public.responses where participant_id = p_participant;
  insert into public.responses (participant_id, day, minute, state)
  select p_participant, u.d, u.m, u.st
  from unnest(p_days, p_minutes, p_states) as u(d, m, st)
  join public.schedules s on s.share_id = p_share_id
  where u.d between s.start_date and s.end_date
    and extract(dow from u.d)::smallint = any (s.weekdays)
    and u.m >= s.day_start_min and u.m < s.day_end_min and u.m % s.slot_minutes = 0
    and u.st in (1, 2)
  on conflict do nothing;
  get diagnostics n = row_count;
  if n <> coalesce(cardinality(p_days), 0) then
    raise exception 'slot outside the schedule' using errcode = '22023';
  end if;
  update public.participants set responded_at = now() where id = p_participant;
  return n;
end $$;

-- Totals per slot. Names are included only when the schedule shows names,
-- or when the organizer's link secret is passed.
create function public.get_totals(p_share_id text, p_token text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  with s as (
    select id, show_names or (p_token is not null and admin_token_hash = extensions.digest(p_token, 'sha256')) as names
    from public.schedules where share_id = p_share_id
  ),
  p as (select p.* from public.participants p join s on s.id = p.schedule_id),
  r as (select r.day, r.minute, r.state, p.name, p.position from public.responses r join p on p.id = r.participant_id)
  select jsonb_build_object(
    'people', (select count(*) from p),
    'replied', (select count(*) from p where responded_at is not null),
    'pending', case when (select names from s) then
      (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from p where responded_at is null) end,
    'slots', coalesce((
      select jsonb_agg(jsonb_build_array(day, minute, free, ifn, fnames, inames) order by day, minute)
      from (
        select day, minute,
          count(*) filter (where state = 2) as free,
          count(*) filter (where state = 1) as ifn,
          case when (select names from s) then jsonb_agg(name order by position) filter (where state = 2) end as fnames,
          case when (select names from s) then jsonb_agg(name order by position) filter (where state = 1) end as inames
        from r group by day, minute
      ) t), '[]'::jsonb))
  where exists (select 1 from s)
$$;

revoke execute on function public.get_totals(text, text) from public;
grant execute on function public.get_totals(text, text) to anon, authenticated;
