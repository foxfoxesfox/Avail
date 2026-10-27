-- Slice 9: only Avail's server (secret key, service_role) may create schedules, so the Turnstile bot check in front
-- of it can't be skipped by calling the database with the public key. Applied after the code using the secret key
-- was live. To undo: grant execute on function public.create_schedule to anon, authenticated;
revoke execute on function public.create_schedule from anon, authenticated;
grant execute on function public.create_schedule to service_role;
