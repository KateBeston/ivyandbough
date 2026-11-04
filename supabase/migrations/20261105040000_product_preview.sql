-- Applied to production.
alter table public.products add column preview_token uuid not null default gen_random_uuid();
create unique index products_preview_token_idx on public.products(preview_token);

create function public.product_preview(token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(p) - 'social_caption' - 'pinterest_description' || jsonb_build_object(
    'themes', (select jsonb_build_object('name', t.name, 'slug', t.slug) from public.themes t where t.id = p.theme_id),
    'categories', (select jsonb_build_object('name', c.name, 'slug', c.slug) from public.categories c where c.id = p.category_id),
    'product_images', coalesce((select jsonb_agg(jsonb_build_object('url', i.url, 'alt', i.alt, 'position', i.position, 'sort_order', i.sort_order) order by i.sort_order) from public.product_images i where i.product_id = p.id), '[]'::jsonb)
  )
  from public.products p
  where p.preview_token = token;
$$;
revoke all on function public.product_preview(uuid) from public;
grant execute on function public.product_preview(uuid) to anon, authenticated;
