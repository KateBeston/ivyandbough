create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  intro text not null default '',
  image_url text not null,
  image_alt text not null default '',
  image_position text not null default 'center',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products add column category_id uuid references public.categories(id) on delete set null;
create index products_category_id_idx on public.products(category_id);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.contact_messages enable row level security;

create policy "Active categories are public" on public.categories for select to anon, authenticated using (is_active);
create policy "Anyone can send a message" on public.contact_messages for insert to anon, authenticated
  with check (
    char_length(name) between 1 and 120
    and char_length(email) <= 254
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(message) between 1 and 4000
  );

-- The ten starter categories were added to the live project with this migration.
