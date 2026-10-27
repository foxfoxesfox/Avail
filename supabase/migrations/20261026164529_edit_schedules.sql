-- Slice 8: edit live schedules without losing answers; close and reopen answers; reset a leaked share link.
-- Answers are wall-clock (day, minute) rows, so a schedule can shrink and grow back: rows outside the current
-- range are kept, just not shown.

-- Saving replaces only the answers inside the current range (others survive a shrink), ignores out-of-range
-- input, and refuses once answers are closed.
create or replace function public.save_availability(
  p_share_id text, p_participant uuid, p_pin text,
  p_days date[], p_minutes smallint[], p_states smallint[]
) returns int
language plpgsql security definer set search_path = '' as $$
declare n int; s public.schedules;
begin
  if not public.member_ok(p_share_id, p_participant, p_pin) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if cardinality(p_days) is distinct from cardinality(p_minutes) or cardinality(p_days) is distinct from cardinality(p_states)
     or cardinality(p_days) > 20000 then
    raise exception 'bad slots' using errcode = '22023';
  end if;
  select * into s from public.schedules where share_id = p_share_id;
  if s.deadline is not null and s.deadline <= now() then
    raise exception 'answers are closed' using errcode = '22023';
  end if;

  delete from public.responses r
  where r.participant_id = p_participant
    and r.day between s.start_date and s.end_date and extract(dow from r.day)::smallint = any (s.weekdays)
    and r.minute >= s.day_start_min and r.minute < s.day_end_min;
  insert into public.responses (participant_id, day, minute, state)
  select p_participant, u.d, u.m, u.st
  from unnest(p_days, p_minutes, p_states) as u(d, m, st)
  where u.d between s.start_date and s.end_date
    and extract(dow from u.d)::smallint = any (s.weekdays)
    and u.m >= s.day_start_min and u.m < s.day_end_min and u.m % s.slot_minutes = 0
    and u.st in (1, 2)
  on conflict do nothing;
  get diagnostics n = row_count;
  update public.participants set responded_at = now() where id = p_participant;
  return n;
end $$;

-- Change the setup. Slots may get finer at any time (each answer fills the smaller slots inside it) but only
-- coarser before anyone has answered, and never so coarse that a confirmed session stops lining up.
create function public.update_schedule(
  p_share_id text, p_token text, p_title text, p_start_date date, p_end_date date, p_weekdays smallint[],
  p_day_start_min smallint, p_day_end_min smallint, p_slot_minutes smallint, p_deadline_local timestamp, p_show_names boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token); s public.schedules;
begin
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into s from public.schedules where id = v_id for update;
  if p_slot_minutes > s.slot_minutes and exists (
       select 1 from public.responses r join public.participants p on p.id = r.participant_id where p.schedule_id = v_id) then
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
  end if;
  update public.schedules set
    title = btrim(p_title), start_date = p_start_date, end_date = p_end_date, weekdays = p_weekdays,
    day_start_min = p_day_start_min, day_end_min = p_day_end_min, slot_minutes = p_slot_minutes,
    deadline = p_deadline_local at time zone s.time_zone, show_names = p_show_names
  where id = v_id;
end $$;

-- Close answers now (deadline = now) or reopen them (no deadline).
create function public.set_answers_open(p_share_id text, p_token text, p_open boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token);
begin
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.schedules set deadline = case when p_open then null else now() end where id = v_id;
end $$;

create function public.clean_name(p_name text) returns text
language sql immutable set search_path = '' as $$ select btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')) $$;
revoke execute on function public.clean_name(text) from public, anon, authenticated;

create function public.add_participant(p_share_id text, p_token text, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token); v_name text := public.clean_name(p_name); v_pid uuid;
begin
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if char_length(v_name) not between 1 and 40 then raise exception 'name must be 1 to 40 characters' using errcode = '22023'; end if;
  if (select count(*) from public.participants where schedule_id = v_id) >= 50 then
    raise exception 'up to 50 people' using errcode = '22023';
  end if;
  if exists (select 1 from public.participants where schedule_id = v_id and lower(name) = lower(v_name)) then
    raise exception 'name already on the schedule' using errcode = '22023';
  end if;
  insert into public.participants (schedule_id, name, position)
  values (v_id, v_name, coalesce((select max(position) + 1 from public.participants where schedule_id = v_id), 0))
  returning id into v_pid;
  return v_pid;
end $$;

create function public.rename_participant(p_share_id text, p_token text, p_participant uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token); v_name text := public.clean_name(p_name);
begin
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if char_length(v_name) not between 1 and 40 then raise exception 'name must be 1 to 40 characters' using errcode = '22023'; end if;
  if exists (select 1 from public.participants
             where schedule_id = v_id and id <> p_participant and lower(name) = lower(v_name)) then
    raise exception 'name already on the schedule' using errcode = '22023';
  end if;
  update public.participants set name = v_name where id = p_participant and schedule_id = v_id;
end $$;

-- Removes the person and their answers. Confirmed sessions stay.
create function public.remove_participant(p_share_id text, p_token text, p_participant uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token);
begin
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if (select count(*) from public.participants where schedule_id = v_id) <= 1 then
    raise exception 'a schedule needs at least one person' using errcode = '22023';
  end if;
  delete from public.participants where id = p_participant and schedule_id = v_id;
end $$;

-- A new share link; the old one stops working. Returns the new share id.
create function public.reset_share_link(p_share_id text, p_token text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.organizer_schedule(p_share_id, p_token); v_share text;
begin
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  loop
    v_share := public.random_token(8);
    exit when not exists (select 1 from public.schedules where share_id = v_share);
  end loop;
  update public.schedules set share_id = v_share where id = v_id;
  return v_share;
end $$;

-- Public view: adds whether answers are closed.
create or replace function public.get_schedule(p_share_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'shareId', s.share_id, 'title', s.title, 'kind', s.kind,
    'startDate', s.start_date, 'endDate', s.end_date, 'weekdays', s.weekdays,
    'dayStartMin', s.day_start_min, 'dayEndMin', s.day_end_min, 'slotMinutes', s.slot_minutes,
    'timeZone', s.time_zone, 'deadline', s.deadline, 'closed', s.deadline is not null and s.deadline <= now(),
    'showNames', s.show_names, 'createdAt', s.created_at,
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

revoke execute on function public.update_schedule, public.set_answers_open, public.add_participant, public.rename_participant,
  public.remove_participant, public.reset_share_link from public;
grant execute on function public.update_schedule, public.set_answers_open, public.add_participant, public.rename_participant,
  public.remove_participant, public.reset_share_link to anon, authenticated;
