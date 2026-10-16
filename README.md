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
- `npm run test:e2e` — build and run browser tests against a local preview.
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

Google authentication is implemented with Supabase, including PKCE callback
handling at `/auth/callback`, session restoration, protected application routes
when configured, and sign-out for this browser. Without valid Supabase configuration,
the local demo remains accessible and login explains the missing setup.
The client uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.local`;
the latter accepts a publishable key. Restart Vite after changing these values.

Run `npm run dev` and open `http://localhost:5173/login`. The development server
requires port 5173 so it cannot silently switch away from the configured OAuth
redirect. Supabase must allow `http://localhost:5173/auth/callback` and have Google
enabled with its server-side OAuth credentials. Configure these dashboards manually.
After signing in, reload to check session restoration, then sign out in Settings.
Check that signed-out navigation to `/closet` returns to login.

No database schema, RLS policies, private Storage integration, or guest sharing
backend is implemented yet. Wardrobe data remains in browser IndexedDB and is
shared across accounts using this browser. Sign-out does not delete it. Route
guards do not turn this local data into an authenticated vault. Guest URLs still
cannot read the local wardrobe. Hosted login requires manual verification;
automated auth tests use mocks and do not verify Google or hosted permissions.

`.env.example` reserves blank `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
entries for the future integration. Never expose service-role keys or Google
client secrets in browser code or commit populated environment files.

PWA installability and Vercel SPA routing configuration remain later plan steps.
There is no service worker or supported offline launch yet. Hosted authentication,
permissions, private storage, sharing, and iPhone installability remain untested.

## Testing checkpoint

The local implementation has 33 unit/component tests and 18 browser tests across
375, 768, and 1280 pixel viewports. Browser tests build in `e2e` mode with Supabase
configuration blanked to avoid using developer credentials or real accounts.
Run `npm run build` afterward to restore a build using your normal configuration.
See [TESTING.md](TESTING.md) for coverage and the deferred integration checks.
