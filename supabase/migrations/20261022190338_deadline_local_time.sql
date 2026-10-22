-- The form sends the deadline as wall-clock time ("2026-10-30T18:00"); read it in the
-- schedule's own time zone, and refuse one that has already passed.

drop function public.create_schedule(text, date, date, smallint[], smallint, smallint, smallint, text, timestamptz, boolean, text[]);

create function public.create_schedule(
  p_title text,
  p_start_date date,
  p_end_date date,
  p_weekdays smallint[],
  p_day_start_min smallint,
  p_day_end_min smallint,
  p_slot_minutes smallint,
  p_time_zone text,
  p_deadline_local timestamp,
  p_show_names boolean,
  p_members text[]
) returns table (share_id text, admin_token text)
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_share text;
  v_token text := public.random_token(24);
  v_deadline timestamptz;
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception 'invalid time zone' using errcode = '22023';
  end if;
  if cardinality(p_members) not between 1 and 50 then
    raise exception 'between 1 and 50 members' using errcode = '22023';
  end if;
  v_deadline := p_deadline_local at time zone p_time_zone;
  if v_deadline <= now() then
    raise exception 'deadline has passed' using errcode = '22023';
  end if;

  loop
    v_share := public.random_token(8);
    exit when not exists (select 1 from public.schedules s where s.share_id = v_share);
  end loop;

  insert into public.schedules (share_id, admin_token_hash, title, start_date, end_date, weekdays,
    day_start_min, day_end_min, slot_minutes, time_zone, deadline, show_names)
  values (v_share, extensions.digest(v_token, 'sha256'), btrim(p_title), p_start_date, p_end_date, p_weekdays,
    p_day_start_min, p_day_end_min, p_slot_minutes, p_time_zone, v_deadline, p_show_names)
  returning id into v_id;

  insert into public.participants (schedule_id, name, position)
  select v_id, btrim(m.name), m.ord - 1
  from unnest(p_members) with ordinality as m(name, ord);

  return query select v_share, v_token;
end $$;

revoke execute on function public.create_schedule from public;
grant execute on function public.create_schedule to anon, authenticated;
