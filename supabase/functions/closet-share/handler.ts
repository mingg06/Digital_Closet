export interface ShareBackend {
  user: (jwt: string) => Promise<string | null>
  rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>
  download: (path: string) => Promise<Blob | null>
}

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function hashToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  )
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new HttpError(415, 'Send JSON.')
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError(400, 'A request body is required.')
  let size = 0
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > 8192) {
      await reader.cancel()
      throw new HttpError(413, 'Request is too large.')
    }
    chunks.push(value)
  }
  const buffer = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.length
  }
  try {
    const body: unknown = JSON.parse(new TextDecoder().decode(buffer))
    if (body && typeof body === 'object' && !Array.isArray(body))
      return body as Record<string, unknown>
  } catch {
    /* Report a stable client error without echoing user data. */
  }
  throw new HttpError(400, 'Invalid JSON request.')
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const validId = (value: unknown) =>
  typeof value === 'string' && uuid.test(value)

export function createShareHandler(backend: ShareBackend, appOrigin: string) {
  return async (request: Request): Promise<Response> => {
    const headers = new Headers({
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin',
    })
    const json = (body: unknown, status = 200) =>
      Response.json(body, { status, headers })
    try {
      if (!appOrigin || new URL(appOrigin).origin !== appOrigin)
        throw new HttpError(503, 'Sharing is not configured yet.')
      const origin = request.headers.get('origin')
      if (origin && origin !== appOrigin)
        throw new HttpError(403, 'This origin is not allowed.')
      headers.set('Access-Control-Allow-Origin', appOrigin)
      headers.set(
        'Access-Control-Allow-Headers',
        'authorization, apikey, content-type, x-client-info',
      )
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      if (request.method === 'OPTIONS')
        return new Response(null, { status: 204, headers })
      if (request.method !== 'POST') throw new HttpError(405, 'Use POST.')
      const body = await readBody(request)
      const action = body.action
      if (
        !['create', 'revoke', 'list', 'image', 'suggest'].includes(
          String(action),
        )
      )
        throw new HttpError(400, 'Unknown sharing action.')
      const allowed =
        action === 'suggest'
          ? ['action', 'token', 'topId', 'bottomId', 'nickname', 'message']
          : action === 'image'
            ? ['action', 'token', 'itemId']
            : action === 'list'
              ? ['action', 'token']
              : ['action']
      if (Object.keys(body).some((key) => !allowed.includes(key)))
        throw new HttpError(400, 'Unexpected request fields.')
      if (action === 'create' || action === 'revoke') {
        const bearer = request.headers
          .get('authorization')
          ?.match(/^Bearer (.+)$/i)?.[1]
        const owner = bearer ? await backend.user(bearer) : null
        if (!owner) throw new HttpError(401, 'Sign in again to manage sharing.')
        const token =
          action === 'create'
            ? Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
                byte.toString(16).padStart(2, '0'),
              ).join('')
            : null
        const result = await backend.rpc('closet_rotate_share', {
          p_owner: owner,
          p_hash: token ? await hashToken(token) : null,
        })
        return json({
          ...(result as object),
          ...(token ? { token } : { ok: true }),
        })
      }
      if (typeof body.token !== 'string' || !/^[0-9a-f]{64}$/.test(body.token))
        throw new HttpError(
          404,
          'This shared closet is unavailable. Ask its owner for a new link.',
        )
      const args: Record<string, unknown> = {
        p_hash: await hashToken(body.token),
        p_action: action,
      }
      if (action === 'image') {
        if (!validId(body.itemId))
          throw new HttpError(400, 'Choose a valid piece.')
        args.p_item = body.itemId
      }
      if (action === 'suggest') {
        if (
          !validId(body.topId) ||
          !validId(body.bottomId) ||
          (body.nickname !== undefined &&
            (typeof body.nickname !== 'string' || body.nickname.length > 40)) ||
          (body.message !== undefined &&
            (typeof body.message !== 'string' || body.message.length > 500))
        )
          throw new HttpError(
            400,
            'Choose a top and bottom. Keep your name to 40 characters and message to 500.',
          )
        Object.assign(args, {
          p_top: body.topId,
          p_bottom: body.bottomId,
          p_nickname: body.nickname ?? '',
          p_message: body.message ?? '',
        })
      }
      const result = await backend.rpc('closet_share_access', args)
      if (action !== 'image') return json(result)
      const path = (result as { path: string }).path
      const photo = await backend.download(path)
      if (!photo) throw new HttpError(404, 'This photo is unavailable.')
      // Recheck after Storage I/O so revocation/unsharing during download wins.
      const check = (await backend.rpc('closet_share_access', args)) as {
        path: string
      }
      if (check.path !== path)
        throw new HttpError(
          404,
          'This photo changed. Refresh the shared closet.',
        )
      // functions-js decodes octet-stream as Blob; it treats image/jpeg as text.
      headers.set('Content-Type', 'application/octet-stream')
      headers.set('Content-Disposition', 'attachment; filename="piece.jpg"')
      return new Response(photo, { headers })
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status)
      const message = error instanceof Error ? error.message : ''
      if (message.includes('share_rate_limited')) {
        headers.set('Retry-After', '60')
        return json(
          {
            error: 'This link has received too many requests. Try again later.',
          },
          429,
        )
      }
      if (message.includes('share_unavailable'))
        return json(
          {
            error:
              'This shared closet is unavailable. Ask its owner for a new link.',
          },
          404,
        )
      if (message.includes('share_invalid_input'))
        return json({ error: 'Check your selected pieces and message.' }, 400)
      return json(
        {
          error:
            'Sharing could not complete. Check your connection and try again.',
        },
        503,
      )
    }
  }
}
