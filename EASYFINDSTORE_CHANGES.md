# EasyFindStore by Sklassics

Updated the supplied React/Vite storefront **in place**. Existing routes, customer cart, checkout, catalogue fetching, seller/delivery and admin flows are retained.

## What changed
- `src/components/HomeHero.tsx`: lightweight fashion-forward hero, no autoplay video.
- `src/pages/HomePage.tsx`: new hero integration and updated merchandising copy; existing real API catalogue, categories, filtering and product links retained.
- `src/styles/easyfindstore-home.css`: responsive storefront homepage, based on the blue/white sample.
- `src/styles/royal-theme.css`: blue/white overall theme overrides for shopping pages and controls.
- `src/components/SiteHeader.tsx`, `Footer.tsx`, `index.html`: EasyFindStore branding.

## Run
`npm install` then `npm run dev` (or `npm run build`). Keep the existing backend/API configuration in `.env`.

## Important
The homepage shows the **actual catalogue returned by the existing backend**; to show clothing products, add fashion categories and products in Admin > Catalog. No artificial/demo product prices were added. The hero fashion photo is served from Unsplash; replace the URL in `src/styles/easyfindstore-home.css` with your licensed local photo if you need an offline-only build.
