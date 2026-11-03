alter table public.posts add column sections jsonb not null default '[]'::jsonb;

-- Sections are objects of heading, text, image, alt and position. Existing posts were converted
-- and Ten Ways to Bring Christmas Home was added to the live project with this migration.
