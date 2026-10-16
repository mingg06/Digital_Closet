# Local testing checkpoint

Phases 1–3 are implemented and tested locally. Work stops before Phase 4
(Supabase client/authentication) at the developer's request. No external service
has been provisioned, authenticated, or deployed.

## Repeatable checks

- `npm run build`: strict TypeScript validation and production bundle.
- `npm test`: 25 unit/component tests.
- `npm run test:e2e`: production build and 18 Playwright tests, using a local preview
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

Google OAuth, persisted cloud sessions, protected owner routes, SQL/RLS ownership,
private Storage, authorized signed image URLs, server-validated share links,
restricted guest submissions, rate limits, and token revocation require the next
integration phases. Their server/API security acceptance tests have not run.
The local repository and browser tests do not establish any hosted authorization
guarantees.

PWA manifest/service worker, home-screen icons, Vercel SPA rewrites, hosted deep
links/OAuth redirects, HTTPS installability, and iPhone home-screen installation
remain later plan work. Blank `.env.example` entries reserve the frontend
Supabase URL and public key names. No credentials are needed for current tests.
