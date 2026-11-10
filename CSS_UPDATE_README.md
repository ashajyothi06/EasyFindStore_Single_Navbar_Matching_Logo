# CSS & admin form update — 25 October 2026

The uploaded `static (2).zip` was integrated into `backend/static/css/`. All CSS links referenced by backend HTML templates now resolve to stylesheet files in this package.

## Backend styles
- `static/css/catalog_admin.css` (new): responsive product/category forms, delivery timeline input, photo/video/document uploader, saved media list, admin allow/block area table and form.
- `static/css/style.css` and the other 11 supplied CSS files remain in place, preserving existing page styles.
- `static/css/admin_manager_booking_notifications.css` and `static/css/admin_order_updates_addon.css` provide compatibility styling for two references missing from the supplied CSS archive.
- `templates/base.html`: loads `catalog_admin.css`.
- `templates/admin_item_form.html`: uses external styles rather than inline media-editor CSS.
- `templates/admin_category_form.html`: adds catalogue form class.
- `templates/admin_service_areas.html`: responsive layout for the allow/block rules.

## Frontend styles
- `src/styles/catalog-extras.css` (new): public category hierarchy browser, item delivery-day badges, service-area admin.
- `src/styles/core-admin.css`: better product upload, file list, delivery-day styling.
- Category browser + admin service-area pages import `catalog-extras.css`. React admin product form uses new component classes.

## Deployment
1. Take a backup of your current project and PostgreSQL data before replacing code.
2. Deploy the whole updated `backend` folder (especially `static/css`, `templates`, and Python code) and restart your backend service.
3. Deploy the updated `frontend` folder, `npm ci` then `npm run build`.
4. Force-refresh your browser to clear cached styles.
5. Test HTML admin product create/edit, media uploads, nested categories, location restrictions, and the React category menu on desktop and mobile.

Backend Jinja parsing, CSS parsing, TSX syntax transpilation, and linked CSS path checks passed locally. Full React build and live-browser review were not completed in this environment.
