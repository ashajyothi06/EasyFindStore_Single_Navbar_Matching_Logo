# Fruveto React frontend — JWT authentication update

## Backend compatibility

This frontend is designed for the accompanying FastAPI **JWT migration** (`live_update_oct_22_JWT_updated.zip`). Deploy the JWT-enabled backend **first**. The old session-based backend does not implement `/react/api/auth/me` or issue an access JWT, so mixing frontend and old backend will prevent login.

The appearance, six-digit OTP workflow, navigation, dashboards, cart, seller and delivery functions are preserved.

### Browser authentication flow

1. `GET /react/api/auth/session` retrieves the CSRF token and any pending OTP metadata. Despite the legacy URL name, **this is not a login session**.
2. `POST /react/api/auth/request-otp` sends an OTP; request supplies existing CSRF header.
3. `POST /react/api/auth/verify-otp` verifies OTP, returns an `access_token` with `token_type=bearer`, and issues the **same JWT in a Secure/HttpOnly/SameSite access cookie**.
4. The frontend verifies login with `GET /react/api/auth/me` before showing success. On page load, headers, account-dependent navigation and other authentication checks use this JWT validation route (and do not depend on `sessionStorage` for the login identity).
5. Credentialed API requests automatically send the HttpOnly access cookie with `credentials: "include"`; CSRF headers/forms remain in place when needed.
6. `POST /react/api/auth/logout` clears the browser's access cookie, and the React app clears auth-related UI caches. Protected requests stop succeeding. JWT expiry or server-side account blocking is enforced by the backend and confirmed by `/react/api/auth/me`.

**Why no localStorage JWT?** The backend supports `Authorization: Bearer` for native/CLI clients, but for browser security this frontend uses the HttpOnly JWT cookie. JavaScript cannot read it; page reloads retain login. We check that OTP login returned a token, but never persist or transmit that JSON token from JavaScript. CSRF security remains necessary for cookie-based APIs.

## Setup

```bash
npm ci
npm run build
npm run dev
```

`.env` (Vite):

```dotenv
# For local development, Vite proxies /react/api requests to this backend.
VITE_DEV_BACKEND_URL=https://backendfruits.com
# Normally leave this unset, so API requests go through same-origin Vite/Nginx proxy.
# VITE_API_BASE_URL=
```

FastAPI `.env` must include a persistent random `JWT_SECRET_KEY` (min. 32 chars). In production over HTTPS: `JWT_COOKIE_SECURE=true`. For **localhost HTTP-only development**, use `JWT_COOKIE_SECURE=false`. See the backend's `JWT_MIGRATION_README.md` for the other JWT settings.

**Important domain caveat:** For `SameSite=Lax` JWT cookies, serve `/react/api/` on the **same website origin** as the React app, using the provided Vite proxy in development and an Nginx reverse proxy in production. Cross-site direct API URLs may require changes to cookie SameSite/Secure, CORS and CSRF policies and are not enabled by this update. Never disable CSRF merely to fix cross-site requests.

## Deployment checklist

- [ ] Install and restart JWT FastAPI backend before deploying this frontend.
- [ ] Deploy the new React `dist/` after `npm ci && npm run build`.
- [ ] Confirm browser DevTools > Network shows the OTP verify response containing `Set-Cookie: commerce_access=...; HttpOnly; Secure` (HTTPS deployment).
- [ ] Confirm `/react/api/auth/me` returns HTTP 200 after login and HTTP 401 after logout/expiry.
- [ ] Confirm customer, seller, manager, admin and delivery pages as relevant.
- [ ] Test OTP resend, logout (both normal header and mobile subscriptions header), CSRF-protected writes, cart and checkout.
- [ ] Old session-auth users must log in again after migration.

## Testing note

The frontend changes have been syntax-checked with the TypeScript parser and the JWT browser authentication helper exercised with mocked API responses. A full `npm run build` requires the npm packages; they could not be installed in the artifact generation environment because the npm registry was unavailable. Run it on the deployment system before release.

No backend application file is modified by this frontend-only archive. You can also deploy the corresponding previously provided JWT backend ZIP unchanged.
