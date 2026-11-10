# Rudraamshika React storefront updates

- Navbar has a **Categories** link to `/categories`. Root categories and optional subcategories are visible; `/categories/:slug` displays descendants and products.
- React product admin has **Delivery in days** (1–3650), **multiple image/video/document files**, and controls to retain/remove existing media.
- React category admin has **Parent category (optional)**.
- React admin has a **Delivery areas** manager at `/admin/service-areas` to allow/block pincodes or localities.
- Subscription screens, seller-KYC review links, and instant/one-day delivery choices have been removed from the active navigation/UI; historical source modules remain for order compatibility.
- Existing cart checkout supports regular products with different delivery-day settings in the same order.

## Installation

After updating the backend and running its PostgreSQL setup/migration:

```bash
npm ci
npm run build
```

Serve the generated `dist` with your existing deployment method. The source project uses `VITE_API_BASE_URL` for API calls and preserves the original assets folder.

## Testing note

Syntax was parsed for all TypeScript/TSX files. A full Vite build could not be completed in the provided environment because the project dependencies could not be installed. Test the admin uploads and the service-area checkout path in staging before production.
