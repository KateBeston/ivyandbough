-- Applied to production.
-- Sale and clearance pricing on products, and welcome offers issued as single-use codes.
alter table public.products
  add column sale_kind text not null default '' check (sale_kind in ('', 'Sale', 'Clearance')),
  add column discount_type text not null default 'Percent' check (discount_type in ('Percent', 'Amount')),
  add column discount_value numeric(10,2) check (discount_value is null or discount_value > 0),
  add column sale_starts_at timestamptz,
  add column sale_ends_at timestamptz;

alter table public.orders
  add column promo_code text not null default '',
  add column discount_total numeric(10,2) not null default 0;

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger text not null check (trigger in ('Account sign-up', 'Newsletter sign-up')),
  discount_type text not null default 'Amount' check (discount_type in ('Amount', 'Percent')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order numeric(10,2) not null default 0 check (min_order >= 0),
  valid_days integer not null default 30 check (valid_days > 0),
  applies_to_sale boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint percent_in_range check (discount_type = 'Amount' or discount_value <= 100)
);

-- A code keeps the terms it was issued with, even if the promotion is changed later.
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid references public.promotions(id) on delete set null,
  code text not null unique,
  email text not null,
  email_key text not null unique,
  source text not null,
  discount_type text not null,
  discount_value numeric(10,2) not null,
  min_order numeric(10,2) not null,
  applies_to_sale boolean not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  order_id uuid references public.orders(id) on delete set null,
  reserved_until timestamptz,
  reserved_cart text,
  reserved_session text
);
create index promo_codes_promotion_idx on public.promo_codes(promotion_id);
create index promo_codes_order_idx on public.promo_codes(order_id);

alter table public.promotions enable row level security;
alter table public.promo_codes enable row level security;
create policy "Active promotions are public" on public.promotions for select to anon, authenticated using (is_active);
create policy "Portal admin manages promotions" on public.promotions for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
create policy "Portal admin reads promo codes" on public.promo_codes for select to authenticated using (public.is_portal_admin());
grant select on public.promotions to anon;
grant select, insert, update, delete on public.promotions to authenticated;
grant select on public.promo_codes to authenticated;

insert into public.promotions (name, trigger, discount_type, discount_value, min_order, valid_days)
values ('Account welcome offer', 'Account sign-up', 'Amount', 10, 50, 30),
       ('Newsletter welcome offer', 'Newsletter sign-up', 'Amount', 10, 50, 30);

insert into public.message_templates (slug, name, channel, message_class, sends_when, subject, preheader, body, is_active)
values ('welcome-offer', 'Welcome offer', 'Email', 'Marketing', 'When someone confirms their account or newsletter sign-up and a welcome offer is switched on',
  'Your Ivy & Bough welcome offer', 'Here is {{offer}}.',
  E'Thank you for joining Ivy & Bough. Here is {{offer}}.\n\n## Your code\n\n# {{promo_code}}\n\nEnter it in your basket before you check out. {{offer_terms}}\n\n[Shop now]({{site_url}}/shop)\n\nWith thanks,\nThe Ivy & Bough team', true);
