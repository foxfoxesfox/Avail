-- Slice 3: members mark Free / If needed per slot, optionally protected by a PIN.
-- Same rule as slice 2: tables locked, access only through the functions below.

alter table public.participants add column pin_hash text; -- bcrypt of an optional 4–8 digit PIN

create table public.responses (
  participant_id uuid not null references public.participants (id) on delete cascade,
  day date not null,                    -- calendar date in the schedule's time zone
  minute smallint not null check (minute between 0 and 1439),
  state smallint not null check (state in (1, 2)), -- 1 = if needed, 2 = free; busy = no row
  primary key (participant_id, day, minute)
);
alter table public.responses enable row level security;
revoke all on public.responses from anon, authenticated;

-- True when the participant belongs to the schedule and the PIN matches (or none is set).
create function public.member_ok(p_share_id text, p_participant uuid, p_pin text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.participants p join public.schedules s on s.id = p.schedule_id
    where s.share_id = p_share_id and p.id = p_participant
      and (p.pin_hash is null or (p_pin is not null and p.pin_hash = extensions.crypt(p_pin, p.pin_hash))))
$$;
revoke execute on function public.member_ok(text, uuid, text) from public, anon, authenticated;

create function public.get_my_availability(p_share_id text, p_participant uuid, p_pin text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.member_ok(p_share_id, p_participant, p_pin) then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_array(r.day, r.minute, r.state) order by r.day, r.minute)
    from public.responses r where r.participant_id = p_participant), '[]'::jsonb);
end $$;

-- Sets a PIN once; changing or removing it is for a later slice (organizer or account).
create function public.set_pin(p_share_id text, p_participant uuid, p_pin text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_pin !~ '^\d{4,8}$' then raise exception 'PIN must be 4 to 8 digits' using errcode = '22023'; end if;
  update public.participants p set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  from public.schedules s
  where s.id = p.schedule_id and s.share_id = p_share_id and p.id = p_participant and p.pin_hash is null;
  return found;
end $$;

-- Replaces all of a participant's answers. Every slot must lie inside the schedule, or nothing is saved.
create function public.save_availability(
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
  return n;
end $$;

-- Public schedule view now says which names are PIN-protected (never the hash).
create or replace function public.get_schedule(p_share_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'shareId', s.share_id, 'title', s.title, 'kind', s.kind,
    'startDate', s.start_date, 'endDate', s.end_date, 'weekdays', s.weekdays,
    'dayStartMin', s.day_start_min, 'dayEndMin', s.day_end_min, 'slotMinutes', s.slot_minutes,
    'timeZone', s.time_zone, 'deadline', s.deadline, 'showNames', s.show_names, 'createdAt', s.created_at,
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'hasPin', p.pin_hash is not null) order by p.position)
      from public.participants p where p.schedule_id = s.id), '[]'::jsonb))
  from public.schedules s where s.share_id = p_share_id
$$;

revoke execute on function public.get_my_availability, public.set_pin, public.save_availability from public;
grant execute on function public.get_my_availability, public.set_pin, public.save_availability to anon, authenticated;
