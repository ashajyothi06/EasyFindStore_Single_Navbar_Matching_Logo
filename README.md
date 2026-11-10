# React TypeScript Storefront

This project is the React replacement for the current Jinja storefront home page. The existing FastAPI/Jinja `/shop` routes remain available, while the React page reads nearby products from `/react/api/...`.

## 1. Backend

Replace the current storefront add-on file with `storefront_react_updated.py`, keeping the import name expected by your main FastAPI application. Restart FastAPI after replacing the file.

New endpoints:

- `GET /react/api/home?q=&category=`
- `GET /react/api/catalog?q=&category=`
- `GET /react/api/session`
- `POST /react/api/location`
- `POST /react/api/location/clear`
- `GET /react/api/category/{category_slug}`
- `GET /react/api/item/{category_slug}/{item_slug}`

Existing `/shop`, `/user/shop`, `/api/user/catalog`, and item routes are unchanged.

## 2. Start React locally

```bash
cd react-storefront
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

The Vite development server proxies `/react/api`, `/shop`, `/login`, `/register`, and `/static` to `http://127.0.0.1:5044`. Change `VITE_DEV_BACKEND_URL` in `.env` when your FastAPI server uses another port.

## 3. Create a fresh latest Vite project instead

To regenerate the framework files with the current Vite React TypeScript template:

```bash
npm create vite@latest fruzely-react -- --template react-ts
cd fruzely-react
npm install
npm install react-router-dom
```

Then copy this package's `src/` folder and `vite.config.ts` into that project.

## 4. Location requirements

Browser geolocation works on HTTPS, `localhost`, or `127.0.0.1`. The home page requests location once automatically when no saved shop location exists. The user can also press **Use My Current Location**.

The API passes delivery-location state to `build_nearby_catalog`, so only seller inventory inside the configured radius is returned. Authentication uses an HttpOnly JWT access cookie; temporary location preferences are independent of the login identity.

## 5. JWT login and registration

This build connects to the JWT-enabled FastAPI backend and retains OTP login at `/react/login`. On successful OTP verification the backend issues an HttpOnly JWT cookie; account validity is checked using `GET /react/api/auth/me`. The frontend does not persist access tokens in browser storage. See [JWT_FRONTEND_MIGRATION.md](JWT_FRONTEND_MIGRATION.md) for setup, deployment requirements and verification steps.

Registration routes remain `/register/user`, `/register/seller`, and `/register/delivery`.

## 6. Production build

```bash
npm run build
```

The production files are created in `dist/`. Configure Nginx to serve `dist/index.html` for `/` and proxy `/react/api/` plus your existing backend routes to FastAPI.

Example structure:

```nginx
root /var/www/fruzely-react/dist;

location /react/api/ {
    proxy_pass http://127.0.0.1:5044;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ~ ^/(login|register|shop|user|api|static)(/|$) {
    proxy_pass http://127.0.0.1:5044;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    try_files $uri $uri/ /index.html;
}
```
