-- Applied to production, with a starting list of colours.
alter table public.products add column colours text not null default '';

create table public.colour_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.colour_options enable row level security;
create policy "Portal admin full access" on public.colour_options for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
grant select, insert, update, delete on public.colour_options to authenticated;
