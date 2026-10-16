# Digital Closet — Codex Implementation Plan

## Objective
Build a mobile-first, installable digital wardrobe PWA for personal use. The owner photographs and organizes clothing, visually matches tops and bottoms in a vertically stacked outfit mixer, saves combinations, and shares a private link so friends can browse a shared wardrobe and propose combinations.

## Tech stack
- React + TypeScript + Vite
- Tailwind CSS
- vite-plugin-pwa (manifest, icons, installability)
- React Router
- Supabase PostgreSQL, Supabase Auth with Google OAuth, Supabase Storage
- Vercel-compatible SPA build
- Free-tier-conscious design: compress images in browser, pagination, modest storage usage

## Responsibility boundary — IMPORTANT
**Write application code and local configuration templates only.** Do not perform external setup, create cloud projects, configure dashboards, provision services, authenticate with third-party accounts, run deployment commands, or deploy the app. The developer wants to learn to integrate Supabase and deploy to Vercel manually.

Allowed: create/edit source files, SQL migration files, `.env.example`, package scripts, and minimal README containing required variable names and setup checkpoints. Do not include step-by-step Supabase dashboard or deployment walkthroughs; the developer will ask for guided instructions separately.

Never commit secrets, service-role keys, Google client secrets, or populated `.env` files. Do not claim that hosted integration works without testing it.

## Product requirements
### 1. Authentication
- Owner signs in with Google through Supabase Auth using `signInWithOAuth`.
- Implement auth callback handling, session persistence, loading/error states, sign-out, and protected owner routes.
- No password-based login required.
- Restrict owner operations by authenticated user ID and database Row Level Security (RLS); never trust client-side checks alone.
- Friends do not need accounts: public share links are capability-based and read-only with respect to the wardrobe.

### 2. Closet
- Owner can upload/take a photo, preview, crop or fit, compress, and save each item.
- Categories: tops, bottoms, shoes, outerwear, accessories; optional subcategories such as T-shirt, shirt, shorts, trousers, sneakers.
- Each item has image, name, category, optional color/tags, and creation date.
- Grid listing, filtering, editing, deleting, and empty states.
- Manual category selection is mandatory; automatic image classification is out of scope.

### 3. Outfit mixer — PRIMARY EXPERIENCE
- Mobile-first screen with a **top clothing panel above a bottom clothing panel**, never side by side.
- Each panel has its own left/right navigation arrows and swipe gesture; changing one panel must not change the other.
- Display actual clothing cutouts/photos on neutral backgrounds, with `object-fit: contain` and consistent sizing.
- Choose/filter category and item independently for each panel.
- Optionally choose shoes in a third lower panel, but keep tops and bottoms visually dominant.
- Save selected outfit combinations; view and delete saved outfits.
- No mannequin, virtual try-on, or AI stylist in MVP.

### 4. Private sharing and friend suggestions
- Owner creates a random, high-entropy share token and can revoke/regenerate it.
- Friend opens `/share/:token` without signing in, views only items explicitly made available for sharing, uses the same vertical mixer, and submits a suggested combination.
- Friend cannot upload, edit, delete, or change owner wardrobe data.
- Owner sees submitted suggestions in a dashboard; optional nickname/message on suggestions.
- Token is not a security substitute for authentication for owner routes. Treat possession of a share URL as access; warn in UI that recipients may forward it.
- Ensure server-enforced authorization for shared access: do **not** expose all clothing rows or private Storage objects through permissive public SELECT policies. Implement share-token validation and narrowly scoped read/suggestion operations using Supabase Edge Functions or another secure server-side mechanism. Do not embed service-role credentials in browser code.
- Consider rate limiting and input validation for anonymous suggestion submissions.

## Data model (SQL migrations)
- `profiles`: id (references auth.users), display_name, timestamps.
- `clothing_items`: id, owner_id, name, category, subcategory, color, tags, storage_path, is_shareable, timestamps.
- `outfits`: id, owner_id, top_item_id, bottom_item_id, optional shoe_item_id, name, timestamps.
- `share_links`: id, owner_id, token_hash, revoked_at, created_at, optional expires_at.
- `outfit_suggestions`: id, owner_id, share_link_id, top_item_id, bottom_item_id, optional shoe_item_id, nickname, message, created_at.
- Add indexes, foreign keys, constraints, and RLS for all tables. Owners only manage their own rows; anonymous access must be limited to validated share operations.
- Use private Supabase Storage bucket and signed URLs issued through authorized flows; protect owner and shared image reads. Never store Google secrets in the client.

## UI / navigation
- `/login`: Google sign-in.
- `/closet`: wardrobe grid, upload, filters.
- `/mixer`: vertical outfit mixer with independent top/bottom carousels.
- `/outfits`: saved outfits.
- `/suggestions`: suggestions received from friends.
- `/settings`: share link generation/revocation, logout.
- `/share/:token`: guest shared closet and mixer, submit suggestion.
- Bottom navigation for owner screens; accessible controls, loading/skeleton states, responsive iPhone Safari layout.

## PWA requirements
- App manifest, home-screen icon placeholders, appropriate theme colors and standalone display mode.
- Register service worker; cache app shell/static assets, but avoid caching private/authenticated responses or sensitive images in shared caches.
- Offline shell optional; data operations require network. Explain unsupported offline states in UI.
- Vercel SPA rewrite configuration so deep links and OAuth redirects resolve correctly.

## Implementation order
1. Scaffold Vite React TS app, Tailwind, routing, mobile UI shell, sample local data.
2. Build closet grid/upload form and vertical outfit mixer with independent swipe controls.
3. Build saved outfits UI and responsive navigation.
4. Add Supabase client and auth integration; Google login and protected routes.
5. Add SQL schema, RLS, private storage integration, CRUD operations, image compression.
6. Add secure share-token endpoints/functions, guest view, and suggestions.
7. Add PWA setup, Vercel SPA config, error handling, accessibility, tests, and `.env.example`.

## Tests / acceptance criteria
- Changing tops never changes bottoms and vice versa.
- Owner can sign in with Google once provider configuration is supplied.
- Owner can upload, edit, delete, filter, and mix clothing.
- A saved outfit retains the correct item references.
- Anonymous visitors cannot read owner wardrobe data through direct Supabase APIs.
- Valid share token allows only explicitly shareable clothing and suggestion submission; revoked token immediately stops access.
- Friend cannot mutate wardrobe items, even by calling APIs directly.
- Missing Supabase environment variables show a helpful setup state instead of crashing.
- PWA can be added to iPhone home screen after HTTPS deployment.
- `npm run build` and available tests pass locally.

## Environment variables template
Create `.env.example` with:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
Use Supabase publishable/anon key only in frontend. Keep service-role secrets in server-side function secrets only, if required.

## Instructions for Codex
Implement the project code following this plan. **Only write code and supporting project files.** Do not set up Supabase, Google Cloud, or Vercel on my behalf. Do not deploy. Stop at checkpoints requiring my external credentials or manual dashboard actions and report exactly which configuration is needed, without completing it. Make reasonable UI choices and prioritize the vertical outfit mixer. If working in an existing repository, inspect it first and preserve existing work. Run local builds/tests where feasible; report what was and was not verified.
