# Digital Closet

A mobile-first wardrobe app built with React, TypeScript, Vite, and Tailwind CSS.
See [plan.md](plan.md) for requirements and implementation order.

## Local development

Use Node.js 22.12+ (or a newer supported LTS release).

- `npm install` — install dependencies.
- `npm run dev` — start the Vite development server.
- `npm run build` — validate TypeScript and build into `dist/`.
- `npm run preview` — preview the production build locally.
- `npm test` — run automated tests once.
- `npm run lint` — check TypeScript and React conventions.
- `npm run format` / `npm run format:check` — apply / check shared formatting.

## Phase 1

Complete: strict TypeScript scaffold, Tailwind, React Router, mobile UI shell with
bottom navigation, local sample wardrobe, category filters, and a vertically
stacked mixer preview with independent arrow controls. The sample images are
original local SVG illustrations, not user photographs. Refresh resets selections;
nothing is uploaded or persisted. No configuration is needed to explore the demo.

Routes: `/mixer` (default), `/closet`, `/outfits`, `/suggestions`, `/settings`,
`/login`, and `/share/:token`. Unfinished features have explanatory states.
Guest links never display wardrobe records until server token validation exists.
Owner route protection will be added alongside authentication in Phase 4; current
routes contain public demo fixtures only.

Next: Phase 2 adds the upload form and swipe/category controls. Saved outfit
management, authentication, storage, secure sharing, PWA installability, and
hosting configuration remain later phases. No service worker exists yet; offline
loading and private API integrations are not supported by this scaffold.

Validation: build, lint, formatting, and 8 automated tests pass. A local headless
Edge check covered all eight routes at 375, 768, and 1280 pixels, independent
mixer controls, illustration loading, and visible keyboard focus. This does not
replace device testing on iPhone Safari.

## Configuration boundary

`.env.example` lists `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are
reserved for later integration and are unused in Phase 1. Future checkpoints
require manual Supabase/Google provider and hosting configuration. Never put
service-role keys or Google client secrets in the frontend or commit populated
environment files.

No cloud services have been provisioned, no external accounts authenticated, and
nothing deployed. Hosted authentication, permissions, storage, sharing, and iPhone
installability have not been verified.
