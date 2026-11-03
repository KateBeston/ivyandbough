-- Article format: section label, author, opening paragraphs and photo credit.
alter table public.posts
  add column category text not null default 'Decorating',
  add column author text not null default 'Ivy & Bough',
  add column intro text not null default '',
  add column image_credit text not null default '';

update public.posts set intro = split_part(body, E'\n\n## ', 1) where body <> '';
update public.posts set intro = 'Christmas does not have to start and end with the tree. A few considered touches, from the front door to the smallest shelf, can make the whole house feel ready for the season.'
  where slug = 'ten-ways-to-bring-christmas-home';
update public.posts set category = 'The Table' where slug = 'set-the-christmas-table';
update public.posts set image_credit = 'Pexels';
update public.posts p set sections = (
  select coalesce(jsonb_agg(s || jsonb_build_object('credit', 'Pexels', 'note', '', 'products', '[]'::jsonb) order by o), '[]'::jsonb)
  from jsonb_array_elements(p.sections) with ordinality as t(s, o)
);
update public.posts set sections = jsonb_set(sections, '{0,products}', '[{"slug":"sample-wreath"},{"slug":"sample-centrepiece"}]') where slug = 'dress-a-christmas-mantel';
update public.posts set sections = jsonb_set(sections, '{1,products}', '[{"slug":"sample-centrepiece"},{"slug":"sample-decoration"}]') where slug = 'set-the-christmas-table';

-- Collections.
update public.themes set slug = 'silent-night', name = 'Silent Night' where slug = 'modern';
insert into public.themes (slug, name, note, line, image_url, image_alt, hero_position, card_position, hero_shade, sort_order) values
  ('christmas-past', 'Christmas Past', 'Antique glass and old-world charm', 'Antique glass, faded golds and old-world charm for a Christmas that feels handed down.', '/images/theme-christmas-past.jpg', 'Old-fashioned glass ornaments glowing on a softly lit tree', 'center', 'center', 0.82, 2),
  ('silver-and-gold', 'Silver & Gold', 'Gleaming metallics and candlelight', 'Gleaming golds and silvers that catch every bit of candlelight.', '/images/theme-silver-gold.jpg', 'Gold metallic Christmas baubles gathered together', 'center 62%', 'center', 0.8, 3),
  ('merry-and-bright', 'Merry & Bright', 'Every colour, all at once', 'Every colour, all at once, for a joyful Christmas with nothing held back.', '/images/theme-merry-bright.jpg', 'Colourful Christmas lights around a glass ball reflecting a tree', 'center', 'center', 0.76, 4);
update public.themes t set sort_order = o.n from (values
  ('traditional',1),('christmas-past',2),('bordeaux-glamour',3),('winter-wonderland',4),('midnight-silver',5),('silver-and-gold',6),('sugar-plum',7),('merry-and-bright',8),('silent-night',9),('modern-luxe',10),('rustic-homestead',11),('boho',12),('woodland',13),('australian-native',14)
) as o(slug, n) where t.slug = o.slug;
