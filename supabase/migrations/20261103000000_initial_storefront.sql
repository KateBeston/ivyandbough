create table public.themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  note text not null default '',
  line text not null default '',
  image_url text not null,
  image_alt text not null default '',
  hero_position text not null default 'center',
  card_position text not null default 'center',
  hero_shade numeric(3,2) not null default 0.70,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default '',
  description text not null default '',
  price_cents int check (price_cents is null or price_cents >= 0),
  theme_id uuid references public.themes(id) on delete set null,
  materials text not null default '',
  dimensions text not null default '',
  weight text not null default '',
  dispatch_days int check (dispatch_days is null or dispatch_days >= 0),
  care text not null default '',
  status text not null default 'draft' check (status in ('draft','active','archived')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_theme_id_idx on public.products(theme_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text not null default '',
  position text not null default 'center',
  sort_order int not null default 0
);
create index product_images_product_id_idx on public.product_images(product_id);

create table public.delivery_dates (
  id uuid primary key default gen_random_uuid(),
  region text not null unique,
  last_order_date date,
  sort_order int not null default 0
);

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'website',
  created_at timestamptz not null default now()
);
create unique index subscribers_email_lower_idx on public.subscribers (lower(email));

alter table public.themes enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.delivery_dates enable row level security;
alter table public.subscribers enable row level security;

create policy "Active themes are public" on public.themes for select to anon, authenticated using (is_active);
create policy "Active products are public" on public.products for select to anon, authenticated using (status = 'active');
create policy "Images of active products are public" on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "Delivery dates are public" on public.delivery_dates for select to anon, authenticated using (true);
create policy "Anyone can subscribe" on public.subscribers for insert to anon, authenticated
  with check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and source = 'website');

-- Starter themes, sample products and delivery regions were added to the live project with this migration.
