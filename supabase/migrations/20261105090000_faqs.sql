-- Applied to production, with starter questions loaded.
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Ordering',
  question text not null,
  answer text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.faqs enable row level security;
create policy "Published FAQs are public" on public.faqs for select to anon, authenticated using (is_published = true);
create policy "Portal admin full access" on public.faqs for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
grant select on public.faqs to anon, authenticated;
grant insert, update, delete on public.faqs to authenticated;
