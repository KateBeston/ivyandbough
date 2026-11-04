-- Applied to production, with starter copy loaded for each collection.
alter table public.themes
  add column is_featured boolean not null default false,
  add column feature_order integer not null default 0,
  add column seo_title text not null default '',
  add column seo_description text not null default '',
  add column page_intro text not null default '',
  add column page_content text not null default '';
