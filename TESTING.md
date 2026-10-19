# Local testing checkpoint

The owner wardrobe, authentication, and secure-sharing code are implemented locally.
The developer configures hosted services manually. No external service has been
provisioned, authenticated, or deployed by the agent.

## Repeatable checks

- `npm run build`: strict TypeScript validation and production bundle.
- `npm test`: 59 unit/component tests, including auth, drafts, sharing UI, and cloud REST adapter checks.
- `npm run test:db`: migration and RLS tests in embedded PostgreSQL, without hosted access.
- `npm run test:e2e`: isolated e2e-mode build and 27 Playwright tests, using a local preview
  server on `127.0.0.1:4175` which the runner starts and stops.
- `npm run test:sharing`: 6 mobile/desktop guest tests using the actual HTTP handler,
  intercepted requests, a dummy Supabase host, and an in-memory backend. No real
  authentication or cloud project is used.
- `npm run test:functions`: 5 portable HTTP-handler tests under Node's experimental
  TypeScript stripping support (Node 22.12+).
- `npm run check:functions`: strict TypeScript check of the portable handler.
- `npm run lint`: ESLint checks.
- `npm run format:check`: shared formatting checks.

Browser tests default to installed Microsoft Edge on Windows. Other systems use
Playwright Chromium, which must be installed locally. `PLAYWRIGHT_CHANNEL` can
select another installed Chromium browser channel. Browser tests use isolated
contexts and do not modify a real user's browser wardrobe. Reports, traces, and
screenshots are written to ignored `playwright-report/` and `test-results/` folders.

## Verified locally

The first-outfit journey covers category-prefilled capture, photo/metadata draft
restoration after navigation and reload, repeated capture, and saving an outfit
with a default name. Draft tests cover owner scoping, stale baselines, malformed
storage, and recovery from session-storage write failure. Layout checks require
the bottom garment and Save action to fit above navigation at all three sizes.

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

The user reports that the earlier hosted owner sign-in, photo persistence, and
second-account isolation checks passed. The agent has not independently verified
those hosted results. Secure-sharing migration/function deployment and hosted
sharing acceptance checks remain manual; see [SHARING.md](supabase/SHARING.md).

The database suite now has 20 tests. It applies all migrations and checks that
anonymous/authenticated roles cannot invoke privileged sharing RPCs, guest
responses follow each link's scope and exclude cross-owner items, suggestions require accessible items
and valid categories, and revoked/expired links fail metadata/image/submission
requests. Database counters enforce per-link request/submission limits. The
whole-closet tests include previously unselected items, additions after link
creation, image access, suggestion submission, and legacy-link scope retention. The
HTTP suite separately checks validated owner identity, unknown-field rejection,
request-size limits, CORS, image revalidation after download, and error redaction.
The guest browser suite verifies actual SDK Blob decoding and guest interaction;
its fake backend is not used as evidence that RLS works.

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

Hosted SQL/RLS ownership, private Storage, and the new share function still need
hosted acceptance checks. Server-side share validation, restricted submissions,
limits, and revocation have local database/HTTP tests; their hosted counterparts
have not been tested by the agent. The Deno adapter has not run in a Deno runtime.
The local repository and browser tests do not establish any hosted authorization
guarantees.

PWA manifest/service worker, home-screen icons, Vercel SPA rewrites, hosted deep
links/OAuth redirects, HTTPS installability, and iPhone home-screen installation
remain later plan work. Blank `.env.example` entries reserve the frontend
Supabase URL and public key names. No credentials are needed for current tests.
