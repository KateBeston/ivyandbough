-- Applied to production.
alter table public.products
  add column seo_title text not null default '',
  add column seo_description text not null default '',
  add column social_caption text not null default '',
  add column pinterest_description text not null default '';
