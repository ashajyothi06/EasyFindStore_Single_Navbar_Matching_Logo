# EasyFindStore — Complete theme refresh

The existing React/TypeScript application was updated in place. This is not a static mockup.

## Changes

- Shared **navy / gold / white** design tokens and typography via `src/styles/easyfindstore-all-pages.css`, imported after existing base styles.
- Main storefront (navigation, catalogue, item detail, cart, checkout, orders, address book, profile and support) and admin UI use matching surface, heading, border and action colors. Existing page-specific warning/error colors are retained.
- Login and registration remain **email OTP** forms with existing API integrations. Rudraamshika labels were replaced with EasyFindStore, and their photo panels use `signin-retail.jpg` / `register-retail.jpg`, assembled from standalone fashion, technology and lifestyle photos already in the project (not screenshots of a webpage).
- About and Contact pages use retail/lifestyle imagery rather than devotional artwork.
- Footer now also appears on customer catalogue, cart, checkout, order, profile, and support pages; admin and login remain dedicated screens.
- Product catalogue, category filtering, and prices are still driven by the backend API. No fake purchasable inventory or synthetic prices have been introduced.

## Running locally

```powershell
npm install --include=optional
npm run dev
```

If Windows reports a Rolldown native-binding installation issue, delete `node_modules` and `package-lock.json`, then reinstall with `npm install --include=optional`.

## Notes

- Retail images are local to `src/assets/easyfind/`; all are distinct imagery, not full website mockup screenshots.
- Backend items that still belong to an old pooja catalogue need to be updated using the admin catalogue; this code does not mutate user inventory or records.
- Review each role-specific screen with your actual API and user permissions before deployment.
