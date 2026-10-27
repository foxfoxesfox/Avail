-- Slice 9 launch check: indexes the advisor flagged, and a limit on PIN guessing.

create index on public.sessions (schedule_id);
create index on public.participants (user_id);
create index on public.organizer_invites (schedule_id);
create index on public.organizer_invites (created_by);
create index on public.organizer_invites (used_by);

-- A 4-digit PIN has 10,000 combinations, so wrong guesses are limited: 5 in a row lock the name for 15 minutes.
alter table public.participants
  add column pin_failures smallint not null default 0,
  add column pin_locked_until timestamptz;

-- Now volatile, because it records failed attempts. Only a wrong PIN that was actually typed counts.
create or replace function public.member_ok(p_share_id text, p_participant uuid, p_pin text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare p public.participants;
begin
  select q.* into p from public.participants q join public.schedules s on s.id = q.schedule_id
  where s.share_id = p_share_id and q.id = p_participant;
  if p.id is null then return false; end if;
  if p.user_id is not null then return p.user_id = auth.uid(); end if;
  if p.pin_hash is null then return true; end if;
  if p_pin is null then return false; end if;
  if p.pin_locked_until > now() then
    raise exception 'too many wrong PINs' using errcode = 'P0001';
  end if;
  if p.pin_hash = extensions.crypt(p_pin, p.pin_hash) then
    if p.pin_failures > 0 then update public.participants set pin_failures = 0 where id = p.id; end if;
    return true;
  end if;
  update public.participants set
    pin_failures = case when pin_failures >= 4 then 0 else pin_failures + 1 end,
    pin_locked_until = case when pin_failures >= 4 then now() + interval '15 minutes' else pin_locked_until end
  where id = p.id;
  return false;
end $$;

-- Was stable; it now calls member_ok, which writes.
create or replace function public.get_my_availability(p_share_id text, p_participant uuid, p_pin text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.member_ok(p_share_id, p_participant, p_pin) then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_array(r.day, r.minute, r.state) order by r.day, r.minute)
    from public.responses r where r.participant_id = p_participant), '[]'::jsonb);
end $$;

create or replace function public.save_availability(
  p_share_id text, p_participant uuid, p_pin text,
  p_days date[], p_minutes smallint[], p_states smallint[]
) returns int
language plpgsql security definer set search_path = '' as $$
declare n int; s public.schedules;
begin
  -- Returns null rather than raising, so the failed PIN attempt member_ok just counted isn't rolled back.
  if not public.member_ok(p_share_id, p_participant, p_pin) then return null; end if;
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
