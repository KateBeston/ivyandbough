-- Applied to production.
alter table public.supplier_items
  add column sku text not null default '',
  add column product_id uuid references public.products(id) on delete set null,
  add column freight_cost numeric(10,2) not null default 0,
  add column packaging_cost numeric(10,2) not null default 0,
  add column min_order_qty integer not null default 0,
  add column pack_size text not null default '',
  add column gst_treatment text not null default 'Excludes GST',
  add column ships_from text not null default '',
  add column lead_time text not null default '',
  add column dropship_available boolean not null default false,
  add column delivery_notes text not null default '',
  add column availability text not null default 'To confirm',
  add column stock_on_hand integer not null default 0,
  add column available_from date,
  add column last_checked date,
  add column availability_notes text not null default '';
create index supplier_items_product_id_idx on public.supplier_items(product_id);

create table public.supplier_agreements (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  title text not null,
  kind text not null default 'Wholesale application',
  status text not null default 'Not started',
  applied_on date,
  starts_on date,
  ends_on date,
  link text not null default '',
  file_path text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index supplier_agreements_supplier_id_idx on public.supplier_agreements(supplier_id);
alter table public.supplier_agreements enable row level security;
create policy "Portal admin full access" on public.supplier_agreements for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
grant select, insert, update, delete on public.supplier_agreements to authenticated;

alter table public.order_items
  add column shipping_status text not null default 'Not shipped',
  add column carrier text not null default '',
  add column tracking_number text not null default '',
  add column shipped_on date;
create index if not exists order_items_product_id_idx on public.order_items(product_id);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1,
  status text not null default 'In cart',
  session_id text not null default '',
  customer_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cart_items_product_id_idx on public.cart_items(product_id);
alter table public.cart_items enable row level security;
create policy "Portal admin full access" on public.cart_items for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
grant select, insert, update, delete on public.cart_items to authenticated;
