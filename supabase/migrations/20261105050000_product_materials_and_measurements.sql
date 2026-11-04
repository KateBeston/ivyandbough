-- Applied to production, along with the starting list of materials.
alter table public.products
  add column height_cm numeric(8,1),
  add column width_cm numeric(8,1),
  add column depth_cm numeric(8,1),
  add column weight_g numeric(10,0);

create table public.material_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.material_options enable row level security;
create policy "Portal admin full access" on public.material_options for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
grant select, insert, update, delete on public.material_options to authenticated;
