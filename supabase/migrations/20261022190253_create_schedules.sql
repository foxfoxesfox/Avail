-- Slice 2: schedules and their members.
-- Tables are locked (RLS on, no policies, no grants); the app only reaches them
-- through the security-definer functions below, called with the publishable key.

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  share_id text not null unique,                -- public link id
  admin_token_hash bytea not null,              -- sha256 of the organizer link secret
  title text not null check (char_length(title) between 1 and 100),
  kind text not null default 'dates' check (kind in ('dates')),
  start_date date not null,
  end_date date not null,
  weekdays smallint[] not null,                 -- 0 = Sunday … 6 = Saturday
  day_start_min smallint not null check (day_start_min between 0 and 1439),
  day_end_min smallint not null check (day_end_min between 1 and 1440),
  slot_minutes smallint not null check (slot_minutes in (15, 30, 60)),
  time_zone text not null,
  deadline timestamptz,
  show_names boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date <= 183),
  check (day_end_min > day_start_min),
  check (day_start_min % slot_minutes = 0 and day_end_min % slot_minutes = 0),
  check (cardinality(weekdays) between 1 and 7 and weekdays <@ array[0,1,2,3,4,5,6]::smallint[])
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  position smallint not null,
  created_at timestamptz not null default now()
);
create unique index participants_schedule_name_key on public.participants (schedule_id, lower(btrim(name)));

alter table public.schedules enable row level security;
alter table public.participants enable row level security;
revoke all on public.schedules, public.participants from anon, authenticated;

-- URL-safe random string from n random bytes.
create function public.random_token(n int) returns text
language sql volatile set search_path = '' as $$
  select translate(rtrim(encode(extensions.gen_random_bytes(n), 'base64'), '='), '+/', '-_')
$$;
revoke execute on function public.random_token(int) from public, anon, authenticated;

create function public.create_schedule(
  p_title text,
  p_start_date date,
  p_end_date date,
  p_weekdays smallint[],
  p_day_start_min smallint,
  p_day_end_min smallint,
  p_slot_minutes smallint,
  p_time_zone text,
  p_deadline timestamptz,
  p_show_names boolean,
  p_members text[]
) returns table (share_id text, admin_token text)
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_share text;
  v_token text := public.random_token(24);
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception 'invalid time zone' using errcode = '22023';
  end if;
  if cardinality(p_members) not between 1 and 50 then
    raise exception 'between 1 and 50 members' using errcode = '22023';
  end if;

  loop
    v_share := public.random_token(8);
    exit when not exists (select 1 from public.schedules s where s.share_id = v_share);
  end loop;

  insert into public.schedules (share_id, admin_token_hash, title, start_date, end_date, weekdays,
    day_start_min, day_end_min, slot_minutes, time_zone, deadline, show_names)
  values (v_share, extensions.digest(v_token, 'sha256'), btrim(p_title), p_start_date, p_end_date, p_weekdays,
    p_day_start_min, p_day_end_min, p_slot_minutes, p_time_zone, p_deadline, p_show_names)
  returning id into v_id;

  insert into public.participants (schedule_id, name, position)
  select v_id, btrim(m.name), m.ord - 1
  from unnest(p_members) with ordinality as m(name, ord);

  return query select v_share, v_token;
end $$;

-- Public view of a schedule: never includes the token hash.
create function public.get_schedule(p_share_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'shareId', s.share_id, 'title', s.title, 'kind', s.kind,
    'startDate', s.start_date, 'endDate', s.end_date, 'weekdays', s.weekdays,
    'dayStartMin', s.day_start_min, 'dayEndMin', s.day_end_min, 'slotMinutes', s.slot_minutes,
    'timeZone', s.time_zone, 'deadline', s.deadline, 'showNames', s.show_names, 'createdAt', s.created_at,
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.position)
      from public.participants p where p.schedule_id = s.id), '[]'::jsonb))
  from public.schedules s where s.share_id = p_share_id
$$;

-- Organizer view: same data, only when the link secret matches.
create function public.get_schedule_admin(p_share_id text, p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.get_schedule(s.share_id)
  from public.schedules s
  where s.share_id = p_share_id and s.admin_token_hash = extensions.digest(p_token, 'sha256')
$$;

revoke execute on function public.create_schedule, public.get_schedule, public.get_schedule_admin from public;
grant execute on function public.create_schedule, public.get_schedule, public.get_schedule_admin to anon, authenticated;
