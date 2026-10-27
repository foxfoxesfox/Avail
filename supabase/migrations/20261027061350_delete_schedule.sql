-- Delete a schedule for good (answers, sessions, organizers, invites and feeds go with it via on delete cascade).
-- Allowed for the organizer link or the owner account (not co-organizers), and only when the typed name matches.
create function public.delete_schedule(p_share_id text, p_token text, p_title text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_title text;
begin
  select s.id, s.title into v_id, v_title from public.schedules s
  where s.share_id = p_share_id and (
    (p_token is not null and s.admin_token_hash = extensions.digest(p_token, 'sha256'))
    or exists (select 1 from public.schedule_organizers o where o.schedule_id = s.id and o.user_id = auth.uid() and o.role = 'owner'));
  if v_id is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_title is distinct from v_title then raise exception 'name does not match' using errcode = '22023'; end if;
  delete from public.schedules where id = v_id;
  return true;
end $$;

revoke execute on function public.delete_schedule from public;
grant execute on function public.delete_schedule to anon, authenticated;
