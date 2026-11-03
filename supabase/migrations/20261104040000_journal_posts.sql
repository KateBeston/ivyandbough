create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  image_url text not null,
  image_alt text not null default '',
  image_position text not null default 'center',
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_published_idx on public.posts (status, published_at desc);

alter table public.posts enable row level security;
create policy "Published posts are public" on public.posts for select to anon, authenticated using (status = 'published');

-- Three starter posts were added to the live project with this migration.
