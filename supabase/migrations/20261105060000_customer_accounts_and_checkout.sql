-- Applied to production.
create sequence public.order_number_seq start 1001;
alter table public.orders alter column order_number set default 'IB-' || nextval('public.order_number_seq')::text;
alter table public.orders
  add column customer_email text not null default '',
  add column auth_user_id uuid references auth.users(id) on delete set null,
  add column stripe_session_id text unique,
  add column subtotal numeric(10,2) not null default 0,
  add column shipping_total numeric(10,2) not null default 0,
  add column gst_total numeric(10,2) not null default 0,
  add column shipping_name text not null default '',
  add column shipping_address text not null default '';
create index orders_auth_user_id_idx on public.orders(auth_user_id);
create index orders_customer_email_idx on public.orders(lower(customer_email));

alter table public.customers add column auth_user_id uuid unique references auth.users(id) on delete set null;
create unique index customers_email_idx on public.customers(lower(email)) where email <> '';

alter table public.cart_items add column auth_user_id uuid references auth.users(id) on delete cascade;
create index cart_items_auth_user_id_idx on public.cart_items(auth_user_id);
create index cart_items_session_id_idx on public.cart_items(session_id);
create policy "Customers read their own cart" on public.cart_items for select to authenticated using (auth_user_id = (select auth.uid()));

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default '',
  name text not null default '',
  line1 text not null default '',
  line2 text not null default '',
  suburb text not null default '',
  state text not null default '',
  postcode text not null default '',
  created_at timestamptz not null default now()
);
create index customer_addresses_user_idx on public.customer_addresses(auth_user_id);
alter table public.customer_addresses enable row level security;
create policy "Customers manage their own addresses" on public.customer_addresses for all to authenticated using (auth_user_id = (select auth.uid())) with check (auth_user_id = (select auth.uid()));
create policy "Portal admins read addresses" on public.customer_addresses for select to authenticated using (public.is_portal_admin());
grant select, insert, update, delete on public.customer_addresses to authenticated;

create function public.link_customer(full_name text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text;
begin
  if uid is null then return; end if;
  select lower(u.email) into mail from auth.users u where u.id = uid and u.email_confirmed_at is not null;
  if mail is null then return; end if;
  insert into public.customers (name, email, auth_user_id) values (coalesce(full_name, ''), mail, uid)
  on conflict (lower(email)) where email <> '' do update
    set auth_user_id = excluded.auth_user_id,
        name = case when public.customers.name = '' then excluded.name else public.customers.name end;
  update public.orders set auth_user_id = uid where auth_user_id is null and lower(customer_email) = mail;
end $$;

create function public.my_details()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', c.name, 'email', c.email, 'phone', c.phone) from public.customers c where c.auth_user_id = auth.uid();
$$;

create function public.update_my_details(full_name text, phone_number text)
returns void language sql security definer set search_path = '' as $$
  update public.customers set name = left(full_name, 200), phone = left(phone_number, 50) where auth_user_id = auth.uid();
$$;

create function public.my_orders()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id, 'order_number', o.order_number, 'status', o.status, 'placed_on', o.placed_on,
    'total', o.total, 'subtotal', o.subtotal, 'shipping_total', o.shipping_total, 'gst_total', o.gst_total,
    'shipping_name', o.shipping_name, 'shipping_address', o.shipping_address,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i.name, 'quantity', i.quantity, 'unit_price', i.unit_price, 'shipping_status', i.shipping_status, 'carrier', i.carrier, 'tracking_number', i.tracking_number)), '[]'::jsonb) from public.order_items i where i.order_id = o.id)
  ) order by o.created_at desc), '[]'::jsonb)
  from public.orders o where auth.uid() is not null and o.auth_user_id = auth.uid();
$$;

revoke all on function public.link_customer(text), public.my_details(), public.update_my_details(text, text), public.my_orders() from public, anon;
grant execute on function public.link_customer(text), public.my_details(), public.update_my_details(text, text), public.my_orders() to authenticated;
