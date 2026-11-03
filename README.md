# Ivy & Bough

Next.js storefront, deployed on Vercel, with content in Supabase.

- `app/` pages and the newsletter API route
- `components/` page sections
- `lib/` Supabase client and catalogue queries
- `supabase/migrations/` database schema and starter content
- `public/images/` mockup photography (see IMAGE-CREDITS.md)

Search engines are blocked in `public/robots.txt` and `app/layout.tsx`. Remove both blocks at launch.

Not built yet: basket, Stripe checkout, orders, search and an admin area.

Run locally with `npm install` and `npm run dev`.
