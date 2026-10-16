# Digital Closet

A mobile-first wardrobe app using React, TypeScript, Vite, and Tailwind CSS.
See [plan.md](plan.md) for the product requirements and implementation order.

## Local development

Use Node.js 22.12+ or a newer supported LTS release.

- `npm install` — install dependencies.
- `npm run dev` — start Vite locally.
- `npm run build` — validate TypeScript and build into `dist/`.
- `npm run preview` — preview the production build locally.
- `npm test` — run unit/component tests once.
- `npm run lint` — check React and TypeScript conventions.
- `npm run format` / `npm run format:check` — apply / check formatting.

## Local app progress

Phase 1 is complete: app scaffold, Tailwind, routing, sample illustrations,
responsive shell, and bottom navigation.

Phase 2 is complete: photo picker and camera input, fit/center-crop preview,
JPEG compression, mandatory category selection, optional subcategory/color/tags,
search, category filtering, pagination, editing, deletion, and a vertical mixer
with independent arrows, swipe gestures, and piece selection. Tops can also use
outerwear; bottoms always remain below the top panel. Shoes are in the closet;
an additional shoe mixer panel is optional and not implemented.

Wardrobe changes persist in IndexedDB on this browser. Original photos are
re-encoded to remove metadata, at most 1000 × 1000 pixels and approximately
525 KB each. JPEG, PNG, and WebP inputs up to 15 MB are supported. HEIC requires
conversion before selecting. This local storage is not an authenticated vault,
does not sync across devices, and is lost when site data is cleared. Do not rely
on it as your only copy of a wardrobe.

Phase 3 is complete: save named outfits with stable top/bottom references, view
the gallery, reopen a combination in the mixer, and delete a saved outfit without
deleting clothing. Deleting a piece also deletes dependent outfits after explicit
confirmation. Changing the category of a referenced piece requires removing those
saved outfits first. Saves are transactional; a stale tab cannot overwrite newer
changes from another tab. Reload that tab before trying to save again.

## Integration boundary

Work stops before Supabase integration and deployment, which the developer is
handling. No Supabase client, schema, RLS policies, external project, or deployment
is configured. Login and guest sharing show explanatory states; guest URLs cannot
read the local wardrobe. The app currently uses public sample fixtures and local
browser data, so owner authentication is not claimed.

`.env.example` reserves blank `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
entries for the future integration. Never expose service-role keys or Google
client secrets in browser code or commit populated environment files.

PWA installability and Vercel SPA routing configuration remain later plan steps.
There is no service worker or supported offline launch yet. Hosted authentication,
permissions, private storage, sharing, and iPhone installability remain untested.
