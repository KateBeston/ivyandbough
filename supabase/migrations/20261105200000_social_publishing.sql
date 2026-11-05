-- Applied to production.
-- Social posts for Facebook, Instagram and Pinterest. Connected account tokens can only be read by the server.
create table public.social_tokens (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('meta', 'pinterest')),
  account_kind text not null check (account_kind in ('facebook_page', 'instagram_business', 'pinterest')),
  external_id text not null,
  display_name text not null default '',
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text not null default '',
  is_active boolean not null default true,
  last_error text,
  connected_at timestamptz not null default now(),
  unique (platform, account_kind, external_id)
);
alter table public.social_tokens enable row level security;
revoke all on public.social_tokens from anon, authenticated;

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null default '',
  image_url text not null default '',
  link_url text not null default '',
  product_id uuid references public.products(id) on delete set null,
  channels text[] not null default '{}',
  pin_title text not null default '',
  pin_description text not null default '',
  pinterest_board_id text not null default '',
  status text not null default 'Draft' check (status in ('Draft', 'Scheduled', 'Publishing', 'Published', 'Partly published', 'Failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index social_posts_due_idx on public.social_posts(scheduled_at) where status = 'Scheduled';
create index social_posts_product_idx on public.social_posts(product_id);

create table public.social_publishes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  channel text not null,
  outcome text not null check (outcome in ('Published', 'Failed')),
  external_post_id text,
  permalink text,
  error text,
  attempted_at timestamptz not null default now()
);
create index social_publishes_post_idx on public.social_publishes(post_id);

alter table public.social_posts enable row level security;
alter table public.social_publishes enable row level security;
create policy "Portal admin manages social posts" on public.social_posts for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
create policy "Portal admin reads social publishes" on public.social_publishes for select to authenticated using (public.is_portal_admin());
grant select, insert, update, delete on public.social_posts to authenticated;
grant select on public.social_publishes to authenticated;
