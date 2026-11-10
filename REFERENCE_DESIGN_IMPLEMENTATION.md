# EasyFindStore — Selected Serif-Heading Homepage

The existing React/TypeScript store has been updated to follow the selected navy-and-gold reference layout.

## Updated source

- `src/components/SiteHeader.tsx`: customer storefront now has a gold announcement bar, separate logo/search/account/cart header, a full department navigation row, and responsive menu. Admin navigation continues to use the pre-existing layout.
- `src/components/HomeHero.tsx`: three rotating, clickable promotional slides, keyboard-accessible arrow/dot buttons, and reduced-motion support.
- `src/pages/HomePage.tsx`: three promotional feature tiles, trust information, ten visual categories, functioning department filters, and featured catalogue product cards; otherwise displays clearly labeled *collection previews*.
- `src/styles/easyfindstore-reference.css`: selected serif headings (Playfair Display with Georgia fallback), DM Sans for smaller UI text, exact navy/gold visual direction, and mobile/tablet layouts.
- `src/assets/easyfind/reference-hero-art.jpg`: hero photography extracted from the supplied reference mockup (user-provided visual).

## Existing functionality retained

- Product-search submission navigates to `/store?search=...`.
- Header categories navigate to matching live catalogue category URLs when available; otherwise to the store search.
- Cart counter, account/login links, order navigation, catalogue fetching and existing administrative routes remain connected to their existing services.
- Featured products use actual backend product names/images/prices; no dummy prices or misleading add-to-cart controls have been added.
- Product filters select live catalogue records by matching retail departments. When a department has no eligible live items, category previews are shown with a clear message.

## Before production

- The reference artwork is illustrative; the header advertises no unverified discounts. Promo card percentage headings reproduce the **approved visual reference** and should be changed to live, verified offers before launch.
- The backend's older pooja inventory is not altered by these frontend changes. Add or import retail products in your admin catalogue.
- Custom web fonts are requested from Google Fonts, with local system fallbacks if unavailable.
- Node.js 20.19+ or 22.12+ recommended for modern Vite; dependencies are not bundled in the archive.

## Local run

```powershell
npm install --include=optional
npm run dev
```

If native Rolldown optional bindings were installed incorrectly on Windows, remove the project `node_modules` folder and `package-lock.json`, then run `npm install --include=optional` again.
