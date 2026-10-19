import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createShareHandler, hashToken } from './handler.ts'

const origin = 'https://closet.example'
const token = 'a'.repeat(64)
const top = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const bottom = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
function fixture() {
  const calls = []
  let revoked = false
  let afterDownload = false
  const backend = {
    async user(jwt) {
      return jwt === 'owner-jwt' ? 'verified-owner' : null
    },
    async rpc(name, args) {
      calls.push({ name, args })
      if (name === 'closet_rotate_share')
        return { id: 'link', expiresAt: '2026-12-01T00:00:00Z', scope: 'all' }
      if (revoked) throw new Error('share_unavailable')
      if (args.p_action === 'image') return { path: 'verified-owner/piece.jpg' }
      if (args.p_action === 'suggest') return { ok: true }
      return {
        items: [{ id: top, name: 'Shared top' }],
        expiresAt: '2026-12-01T00:00:00Z',
      }
    },
    async download(path) {
      assert.equal(path, 'verified-owner/piece.jpg')
      if (afterDownload) revoked = true
      return new Blob([new Uint8Array([255, 216, 255, 217])])
    },
  }
  const handle = createShareHandler(backend, origin)
  const request = (body, headers = {}, method = 'POST') =>
    handle(
      new Request('https://edge.example/closet-share', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
          ...headers,
        },
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
      }),
    )
  return {
    request,
    calls,
    backend,
    revokeDuringDownload() {
      afterDownload = true
    },
  }
}

test('owner actions require server-verified identity and never accept owner IDs from JSON', async () => {
  const f = fixture()
  assert.equal((await f.request({ action: 'create' })).status, 401)
  assert.equal(
    (await f.request({ action: 'revoke' }, { Authorization: 'Bearer forged' }))
      .status,
    401,
  )
  assert.equal(
    (
      await f.request(
        { action: 'create', ownerId: 'victim' },
        { Authorization: 'Bearer owner-jwt' },
      )
    ).status,
    400,
  )
  assert.equal(f.calls.length, 0)
  const response = await f.request(
    { action: 'create' },
    { Authorization: 'Bearer owner-jwt' },
  )
  const body = await response.json()
  assert.equal(body.scope, 'all')
  assert.match(body.token, /^[0-9a-f]{64}$/)
  assert.equal(f.calls[0].args.p_owner, 'verified-owner')
  assert.equal(f.calls[0].args.p_hash, await hashToken(body.token))
  assert.notEqual(f.calls[0].args.p_hash, body.token)
})

test('anonymous requests expose only the allowlisted operations and validate input before RPC', async () => {
  const f = fixture()
  for (const action of ['upload', 'update', 'delete', 'createSuggestion'])
    assert.equal((await f.request({ action, token })).status, 400)
  assert.equal((await f.request({ action: 'list', token: 'bad' })).status, 404)
  assert.equal(
    (await f.request({ action: 'image', token, itemId: '../../private' }))
      .status,
    400,
  )
  assert.equal(
    (
      await f.request({
        action: 'suggest',
        token,
        topId: top,
        bottomId: bottom,
        message: 'x'.repeat(501),
      })
    ).status,
    400,
  )
  assert.equal(
    (
      await f.request({
        action: 'suggest',
        token,
        topId: top,
        bottomId: bottom,
        owner_id: 'victim',
      })
    ).status,
    400,
  )
  assert.equal(f.calls.length, 0)
  assert.equal(
    (
      await f.request({
        action: 'suggest',
        token,
        topId: top,
        bottomId: bottom,
        nickname: 'A friend',
      })
    ).status,
    200,
  )
  assert.equal(f.calls[0].args.p_hash, await hashToken(token))
  assert.equal(f.calls[0].args.p_top, top)
})

test('image requests validate access again after downloading and return non-cacheable binary data', async () => {
  const f = fixture()
  const response = await f.request({ action: 'image', token, itemId: top })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control'), /no-store/)
  assert.equal(response.headers.get('content-type'), 'application/octet-stream')
  assert.equal((await response.arrayBuffer()).byteLength, 4)
  assert.equal(f.calls.length, 2)
  f.revokeDuringDownload()
  const revoked = await f.request({ action: 'image', token, itemId: top })
  assert.equal(revoked.status, 404)
  assert.equal((await revoked.json()).path, undefined)
})

test('CORS and request-size checks run before protected operations', async () => {
  const f = fixture()
  assert.equal(
    (await f.request({}, { Origin: 'https://untrusted.example' })).status,
    403,
  )
  assert.equal((await f.request({}, {}, 'GET')).status, 405)
  const preflight = await f.request({}, {}, 'OPTIONS')
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin)
  assert.equal(
    (await f.request({ action: 'list', token, padding: 'x'.repeat(9000) }))
      .status,
    413,
  )
  assert.equal(f.calls.length, 0)
})

test('database denials and rate limits produce stable errors without leaking internal details', async () => {
  const f = fixture()
  for (const [error, status] of [
    ['share_unavailable', 404],
    ['share_rate_limited', 429],
    ['SQL includes private path', 503],
  ]) {
    f.backend.rpc = async () => {
      throw new Error(error)
    }
    const response = await f.request({ action: 'list', token })
    assert.equal(response.status, status)
    assert.match(response.headers.get('cache-control'), /no-store/)
    assert.equal(JSON.stringify(await response.json()).includes('SQL'), false)
  }
})
