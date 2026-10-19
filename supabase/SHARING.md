# Secure-sharing manual checkpoint

The user reports that hosted sharing works. Whole-closet sharing is the next
local update; the agent has not applied or verified its new hosted migration.

## Required integration

- Apply `migrations/20261018082324_secure_sharing.sql` after the owner-wardrobe
  migration. Keep the existing bucket private and existing owner policies intact.
- If secure sharing is already installed, apply only the new
  `migrations/20261019033444_whole_closet_sharing.sql` migration. It updates the
  existing RPCs and adds link scope. Existing links remain selected-piece links;
  create or replace a link in Settings to share the whole closet. The deployed
  Edge Function can be reused without redeployment for this change.
- Deploy the `functions/closet-share` function manually, using the function
  configuration in `config.toml`. `verify_jwt = false` is intentional: guests do
  not have accounts. The function validates share capabilities, and separately
  verifies owner JWTs through Auth `getUser` for link creation/revocation.
- Set the server-only `APP_ORIGIN` to the app's exact origin, without a trailing
  slash (for local development, `http://localhost:5173`). CORS accepts only this
  browser origin. CORS is not the authorization boundary.
- The function requires the platform-provided `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`. These stay in the function environment, never in
  frontend variables or committed files. The frontend uses only its existing
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The CLI-created migration is a local file only. No hosted schema changes,
authentication, secrets configuration, or deployments were performed.

## Access contract

Settings creates or replaces a seven-day link, showing the full token only in
that page session. Replacement atomically revokes earlier links. Revocation
does not delete earlier suggestions. New links share all current clothing and
future additions from that owner, without per-piece selection. Older links keep
their selected-piece scope until replaced, so applying the migration alone does
not broaden an existing capability. The legacy `is_shareable` flag is retained
for those older links. Local browser wardrobes cannot be shared.

`POST /functions/v1/closet-share` accepts these exact JSON shapes:

| Action    | Fields besides `action`                                      | Authorization                                                       |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `create`  | none                                                         | Verified owner Bearer JWT                                           |
| `revoke`  | none                                                         | Verified owner Bearer JWT                                           |
| `list`    | `token`                                                      | Valid, unexpired, unrevoked capability                              |
| `image`   | `token`, `itemId`                                            | Capability and currently shared item belonging to that link's owner |
| `suggest` | `token`, `topId`, `bottomId`, optional `nickname`, `message` | Capability plus current sharing, owner, and category checks         |

Unknown fields and operations are rejected. Requests are limited to 8 KiB.
Tokens contain 256 random bits; only SHA-256 hashes are stored. Neither guest
metadata nor responses expose owner IDs, storage paths, or signed Storage URLs.
The privileged RPCs are `SECURITY INVOKER` and executable only by `service_role`;
their public-schema location does not give `anon` or `authenticated` execution.
Direct guest access to owner tables and Storage remains denied.

Images are downloaded by the function after token validation and revalidated
after download. They are returned as non-cacheable binary responses, converted
to temporary JPEG Blob URLs in the browser, and discarded on unmount. Revoking,
expiring, or deleting a piece blocks new reads and submissions for that access. Content already received,
displayed, or saved cannot be taken back. The guest rechecks on refresh and when
returning to the tab; it also hides content at the link's known expiry.

Database row locks serialize revocation with guest requests and make suggestion
validation/insertion atomic. Persistent counters limit each link to 240 access
checks per minute and 10 suggestions per hour. Image downloads use two checks.
These limits are shared across visitors and function instances, not per IP.
The handler returns 429 when a limit is reached. Suggestion names are limited to
40 characters and messages to 500; user text is rendered as text, never HTML.

The owner reads and dismisses suggestions through RLS-protected queries at
`/suggestions`, linked from Settings. “Try this outfit” opens its exact item IDs
in the existing mixer. Deleting referenced clothing cascades to dependent
suggestions. Revocation alone does not remove the owner's received suggestions.

## Validation and hosted checks

`npm run check:functions` typechecks the portable HTTP handler. Automated
database, HTTP, and browser tests have been removed. The Deno runtime adapter,
hosted authorization, Storage, CORS, and function deployment require manual
integration checks.

After your manual integration, verify:

1. Create or replace a link in Settings, without selecting individual pieces.
2. Open the link in a signed-out browser. All the owner's pieces/photos appear,
   including those whose legacy sharing flag is false. Add another piece and
   refresh the guest page to verify that it appears automatically;
   independently change each panel and send a nickname/message with a pairing.
3. In the owner account, open Settings → View friend suggestions and try that
   pairing. A second owner must not read or dismiss the first owner's suggestions.
4. Direct anonymous table/Storage requests and authenticated calls to service-only
   RPCs remain denied. Guest upload/update/delete requests must fail.
5. Delete a piece: new image reads and suggestions referencing it must fail.
   Revoke, replace, and expire links: old tokens must stop all new guest
   operations, including image requests. Do not test only an already loaded page.
6. Verify rate-limit responses and that new function errors do not expose tokens,
   private paths, or server credentials. Keep credentials and share URLs out of
   public test reports.

References: [function authentication](https://supabase.com/docs/guides/functions/auth),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[private Storage downloads](https://supabase.com/docs/reference/javascript/storage-from-download).
