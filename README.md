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
- `npm run test:db` — test the migration and ownership policies in embedded PostgreSQL.
- `npm run test:e2e` — build and run browser tests against a local preview.
- `npm run test:sharing` — test guest sharing against a local handler and dummy backend.
- `npm run test:functions` / `npm run check:functions` — test / typecheck the sharing HTTP handler.
- `npm run lint` — check React and TypeScript conventions.
- `npm run format` / `npm run format:check` — apply / check formatting.

## Local app progress

Phase 1 is complete: app scaffold, Tailwind, routing, empty wardrobe states,
responsive shell, and bottom navigation.

Phase 2 is complete: photo picker and camera input, fit/center-crop preview,
JPEG compression, mandatory category selection, optional subcategory/color/tags,
search, category filtering, pagination, editing, deletion, and a vertical mixer
with independent arrows, swipe gestures, and piece selection. Tops can also use
outerwear; bottoms always remain below the top panel. Shoes are in the closet;
an additional shoe mixer panel is optional and not implemented.

The mixer keeps the pairing and Save action together. Outfit names are optional;
unnamed combinations receive a default name. An empty mixer guides the owner
through adding a top and bottom. Direct piece selection is under “Choose piece.”
The bottom navigation includes Closet, Mixer, Outfits, and Settings; forthcoming
sharing and suggestions are managed through Settings when cloud integration is available.
New share links include the whole closet and future additions. Older selected-piece
links keep their scope until replaced. Apply the whole-closet migration described
in [the sharing checkpoint](supabase/SHARING.md) before creating a new link.

Clothing entry keeps optional metadata under “More details” and supports
“Save and add another.” Unfinished entries, including processed photos, are kept
in the current tab's session storage, scoped to the owner and piece. They survive
navigation and reload, but are not a backup and do not sync. Save or “Discard
draft” clears the draft; drafts for a piece changed in another tab are ignored.
If session storage is full or blocked, an in-memory draft supports navigation
only and the form warns before reload. Closing the tab ends draft retention.

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
the local mode remains accessible and login explains the missing setup.
The client uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.local`;
the latter accepts a publishable key. Restart Vite after changing these values.

Run `npm run dev` and open `http://localhost:5173/login`. The development server
requires port 5173 so it cannot silently switch away from the configured OAuth
redirect. Supabase must allow `http://localhost:5173/auth/callback` and have Google
enabled with its server-side OAuth credentials. Configure these dashboards manually.
After signing in, reload to check session restoration, then sign out in Settings.
Check that signed-out navigation to `/closet` returns to login.

An owner wardrobe migration now prepares profiles, clothing, outfits, RLS, and a
private photo bucket. See [the manual database checkpoint](supabase/README.md) to
apply it yourself. When configured and signed in, the app uses the cloud
repository for clothing CRUD, private compressed photo uploads, and saved outfits.
New accounts and fresh local closets start empty; the earlier browser wardrobe is
never automatically uploaded. Earlier bundled sample records are removed from
IndexedDB on load, along with outfits that reference them. Uploaded photos and
real outfits are preserved. Synthetic records are confined to test fixtures and
are never bundled with the app. Without configuration, local mode uses browser
storage; cloud failures never fall back to it.
Switching accounts remounts wardrobe state, and sign-out hides the cloud wardrobe.

Reads are paged in batches of 100. Changes write only the affected row; updates
and deletes match the server's original `updated_at` value to reject stale edits.
Database writes and Storage requests are separate operations. Old photos are
removed only after a successful database change. Failed cleanup warns and can be
retried in Settings while the page remains open. A failed database response after
an upload requires reload before retrying: the write may have committed. Its
uploaded photo is deliberately retained; manual orphan cleanup may be needed.
There is no atomic transaction spanning the database and Storage.

Photo URLs expire after an hour. The app renews them after 40 minutes while
visible or on returning to the tab; Settings also offers manual renewal. Missing
photos show a fallback. Reload to see other tabs' changes; realtime sync is not
implemented. Private sharing and suggestions have local implementation;
see [the sharing checkpoint](supabase/SHARING.md) for the migration, function, and
manual configuration still required. Hosted login and permissions
require manual verification; local tests do not establish hosted security.

`.env.example` reserves blank `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
entries for the integration. Never expose service-role keys or Google
client secrets in browser code or commit populated environment files.

PWA installability and Vercel SPA routing configuration remain later plan steps.
There is no service worker or supported offline launch yet. Hosted authentication,
permissions, private storage, sharing, and iPhone installability remain untested.

## Testing checkpoint

The local implementation has unit/component tests, PostgreSQL policy tests,
HTTP-handler tests, and browser tests across
375, 768, and 1280 pixel viewports. Browser tests build in `e2e` mode with Supabase
configuration blanked to avoid using developer credentials or real accounts.
Run `npm run build` afterward to restore a build using your normal configuration.
See [TESTING.md](TESTING.md) for coverage and the deferred integration checks.
