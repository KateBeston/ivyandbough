-- Applied to production. The supplier records were loaded in the same step.
alter table public.suppliers
  add column kind text not null default 'Wholesaler',
  add column location text not null default '';

create table public.supplier_items (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  name text not null default '',
  url text not null default '',
  theme_id uuid references public.themes(id) on delete set null,
  wholesale_cost numeric(10,2) not null default 0,
  retail_price numeric(10,2) not null default 0,
  status text not null default 'Interested',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index supplier_items_supplier_id_idx on public.supplier_items(supplier_id);
create index supplier_items_theme_id_idx on public.supplier_items(theme_id);
alter table public.supplier_items enable row level security;
create policy "Portal admin full access" on public.supplier_items for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
grant select, insert, update, delete on public.supplier_items to authenticated;
