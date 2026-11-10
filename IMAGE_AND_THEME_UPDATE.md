# EasyFindStore — image, footer and category update

- Removed the former `reference-hero-art.jpg` website screenshot from the carousel.
- Added `src/assets/easyfind/hero-fashion-original.jpg`, `hero-electronics-original.jpg`, and `hero-home-original.jpg`. These are image-only retail compositions; headings, arrows, dots and buttons remain live HTML.
- Updated `src/components/HomeHero.tsx` to display these images, auto-rotate slides and route CTA links.
- Updated `src/pages/HomePage.tsx` so all ten image-backed category buttons select the corresponding Featured Deals filter, scrolling to it. Selected categories filter real eligible catalogue entries; when none exist, relevant image-backed collection previews display. Existing legacy pooja items remain excluded on this homepage, without altering the server data.
- Applied the same serif-heading navy-and-gold treatment to the footer in `src/styles/easyfindstore-footer-theme.css`.
- Homepage category photography is stored in `src/assets/easyfind/`.
- All purchase prices and product photos come from API data. Collection previews are navigation, not fake purchase listings.

## Validation
`node --test tests/productRouting.test.cjs` passes. Full `npm run build` not completed in this environment (npm dependencies unavailable).
