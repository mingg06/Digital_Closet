# Local testing checkpoint

Phases 1–3 and the Phase 4 Supabase authentication code are implemented locally.
The developer configures hosted services manually. No external service has been
provisioned, authenticated, or deployed by the agent.

## Repeatable checks

- `npm run build`: strict TypeScript validation and production bundle.
- `npm test`: 49 unit/component tests, including auth and cloud REST adapter checks.
- `npm run test:db`: migration and RLS tests in embedded PostgreSQL, without hosted access.
- `npm run test:e2e`: isolated e2e-mode build and 24 Playwright tests, using a local preview
  server on `127.0.0.1:4175` which the runner starts and stops.
- `npm run lint`: ESLint checks.
- `npm run format:check`: shared formatting checks.

Browser tests default to installed Microsoft Edge on Windows. Other systems use
Playwright Chromium, which must be installed locally. `PLAYWRIGHT_CHANNEL` can
select another installed Chromium browser channel. Browser tests use isolated
contexts and do not modify a real user's browser wardrobe. Reports, traces, and
screenshots are written to ignored `playwright-report/` and `test-results/` folders.

## Verified locally

| Area                  | Evidence                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Photo flow            | Real browser canvas decoding, fit/center-crop preview, JPEG compression, metadata fields, edit, save, and reload                                           |
| Closet                | Category selection, category/search filters, tag and subcategory search, pagination, deletion with confirmation                                            |
| Mixer                 | Independent top/bottom navigation, pointer swipe, direct piece selection, top/outerwear category selection, stable query parameters on reload              |
| Saved outfits         | Exact selected item IDs, gallery rendering after reload, reopen in mixer, delete outfit while retaining clothing                                           |
| References            | Referenced category edits are rejected; deleting a piece removes its dependent outfits only                                                                |
| Browser storage       | IndexedDB persistence, transactional revision checks, stale-tab rejection, recoverable unavailable-storage state, failed-save rollback with input retained |
| Navigation/layout     | Ten routes at 375, 768, and 1280 pixels; no horizontal overflow; top panel remains above bottom panel                                                      |
| Keyboard              | Native confirmation dialog, Escape dismissal, safe initial focus, focus returned to trigger on cancellation                                                |
| Unconfigured features | Login explains missing integration; guest share routes reveal no local clothing or owner navigation                                                        |

Unit/component tests inject a repository through `AppRoutes`. Browser tests
exercise actual IndexedDB and image processing through the UI. Gallery/mixer
screenshots are captured for review. Tests run in headless Edge, not on a physical
iPhone; native camera permissions, touch scrolling, and Safari behavior still need
device testing.

## Deferred to Supabase and deployment integration

Real Google OAuth and persisted hosted sessions still need manual verification.
Mocked auth tests cover route guards, session restoration, OAuth initiation,
denied callbacks, missing configuration, errors, sign-out, and StrictMode cleanup.
Browser regression tests explicitly seed synthetic records only in isolated test contexts. Separate tests verify fresh empty wardrobes and persistent cleanup of earlier samples without losing real photos. Tests blank Supabase configuration so local credentials are
never used. Run `npm run build` to restore the normal build afterward.

Cloud repository tests use the real Supabase SDK with a local fetch adapter to
verify pagination, signed URL batches, photo/metadata ordering, exact outfit IDs,
conditional row updates, account changes, stale writes, failure recovery, and
cleanup warnings. They do not make requests to hosted Supabase.

The owner schema and Storage row policies have local SQL tests using two user IDs
and an anonymous role. Supabase-managed Auth/Storage schemas are represented by
minimal test fixtures. These tests do not exercise hosted HTTP services or a real
project. See `supabase/README.md` for the manual setup checkpoint.

Hosted SQL/RLS ownership, private Storage, authorized signed image URLs, server-validated share links,
restricted guest submissions, rate limits, and token revocation require the next
integration phases. Their server/API security acceptance tests have not run.
The local repository and browser tests do not establish any hosted authorization
guarantees.

PWA manifest/service worker, home-screen icons, Vercel SPA rewrites, hosted deep
links/OAuth redirects, HTTPS installability, and iPhone home-screen installation
remain later plan work. Blank `.env.example` entries reserve the frontend
Supabase URL and public key names. No credentials are needed for current tests.
