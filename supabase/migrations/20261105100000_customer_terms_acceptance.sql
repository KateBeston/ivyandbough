-- Applied to production. Records which account terms a customer accepted at sign-up.
alter table public.customers add column terms_version text, add column terms_accepted_at timestamptz;
-- link_customer was replaced at the same time. It copies terms_version from sign-up
-- data and uses the account creation time as terms_accepted_at.
