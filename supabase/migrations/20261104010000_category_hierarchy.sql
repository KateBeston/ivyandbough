alter table public.categories add column parent_id uuid references public.categories(id) on delete set null;
create index categories_parent_id_idx on public.categories(parent_id);

-- The live project also gained eight main categories with subcategories in this migration,
-- with the earlier categories and sample products moved into them.
