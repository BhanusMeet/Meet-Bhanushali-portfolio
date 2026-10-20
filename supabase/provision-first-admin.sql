-- FIRST-ADMIN PROVISIONING (run once, in the Supabase SQL editor)
--
-- Prerequisites:
--   1. Auth → Providers → Email: ensure "Allow new users to sign up" is DISABLED
--      (there is intentionally no public sign-up page in this app).
--   2. Auth → Users → "Add user": create YOUR account with a strong, unique password
--      (tick "Auto Confirm User"). Enable MFA on this account if available.
--
-- Then replace the e-mail below with the address you just created and run:

insert into public.admin_users (user_id)
select id from auth.users where email = 'REPLACE_WITH_YOUR_ADMIN_EMAIL'
on conflict do nothing;

-- Verify (should return exactly one row):
select u.email, a.created_at from public.admin_users a join auth.users u on u.id = a.user_id;

-- To revoke admin access later:
--   delete from public.admin_users where user_id = (select id from auth.users where email = '...');
