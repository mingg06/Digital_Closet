import { createClient, type Session } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createCloudRepository } from './cloudWardrobe'
import { addOutfit, removeItem, upsertItem, type Wardrobe } from './wardrobe'

const ownerId = '11111111-1111-4111-8111-111111111111'
const topId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const bottomId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const createdAt = '2026-10-16T00:00:00Z'
const photo = 'data:image/jpeg;base64,/9j/2Q=='
const itemRow = (id = topId, category = 'tops') => ({
  id,
  owner_id: ownerId,
  name: category === 'tops' ? 'Shirt' : 'Jeans',
  category,
  color: 'Blue',
  subcategory: null,
  tags: [],
  storage_path: `${ownerId}/${id}.jpg`,
  created_at: createdAt,
  updated_at: createdAt,
})

// Use the actual Supabase SDK with a local fetch adapter. These tests verify
// REST request shape and failure handling; database RLS is tested separately.
function server(seed = [itemRow()]) {
  const tables: Record<string, Record<string, unknown>[]> = {
    clothing_items: structuredClone(seed),
    outfits: [],
  }
  const requests: {
    url: URL
    method: string
    body: unknown
    headers: Headers
  }[] = []
  let failWrite = false
  let failRemove = false
  let failUpload = false
  let failRead = false
  let failSign = false
  let missingPhoto = false
  let serial = 0
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    )
    const method = init?.method ?? 'GET'
    const headers = new Headers(init?.headers)
    let body: unknown = init?.body
    if (typeof body === 'string') body = JSON.parse(body)
    requests.push({ url, method, body, headers })
    if (url.pathname.startsWith('/storage/v1/object/sign/')) {
      if (failSign) return respond({ message: 'signing unavailable' }, 500)
      return respond(
        (body as { paths: string[] }).paths.map((path) =>
          missingPhoto
            ? { path, error: 'Object not found', signedURL: null }
            : {
                path,
                signedURL: `/object/sign/closet-images/${path}?token=${++serial}`,
              },
        ),
      )
    }
    if (url.pathname.startsWith('/storage/v1/object/')) {
      if (method === 'DELETE')
        return failRemove
          ? respond({ message: 'cleanup unavailable' }, 500)
          : respond([])
      return failUpload
        ? respond({ message: 'upload unavailable' }, 400)
        : respond({ Key: url.pathname })
    }
    const table = url.pathname.split('/').at(-1)!
    const matches = (row: Record<string, unknown>) =>
      [...url.searchParams].every(
        ([key, value]) =>
          !value.startsWith('eq.') || String(row[key]) === value.slice(3),
      )
    if (method === 'GET') {
      if (failRead)
        return respond({ message: 'table missing', code: 'PGRST205' }, 404)
      const offset = Number(url.searchParams.get('offset') ?? 0)
      const limit = Number(url.searchParams.get('limit') ?? 100)
      return respond(
        tables[table].filter(matches).slice(offset, offset + limit),
      )
    }
    if (failWrite)
      return respond({ message: 'write rejected', code: '42501' }, 403)
    if (method === 'POST') {
      const row = {
        ...(body as object),
        created_at: createdAt,
        updated_at: `version-${++serial}`,
      }
      tables[table].push(row)
      return respond(row, 201)
    }
    const row = tables[table].find(matches)
    if (!row) return respond({ message: 'no rows', code: 'PGRST116' }, 406)
    if (method === 'PATCH')
      Object.assign(row, body, { updated_at: `version-${++serial}` })
    if (method === 'DELETE') {
      tables[table] = tables[table].filter((entry) => entry !== row)
      if (table === 'clothing_items')
        tables.outfits = tables.outfits.filter(
          (outfit) =>
            outfit.top_item_id !== row.id && outfit.bottom_item_id !== row.id,
        )
    }
    return respond(row)
  }
  const client = createClient(
    'https://closet.example',
    'test-publishable-key',
    {
      global: { fetch: fetcher },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
  const session = vi.spyOn(client.auth, 'getSession').mockResolvedValue({
    data: { session: { user: { id: ownerId } } as Session },
    error: null,
  })
  const repository = createCloudRepository(client, ownerId)
  return {
    repository,
    requests,
    tables,
    session,
    failWrite: () => {
      failWrite = true
    },
    failRemove: () => {
      failRemove = true
    },
    recoverRemove: () => {
      failRemove = false
    },
    failUpload: () => {
      failUpload = true
    },
    failRead: () => {
      failRead = true
    },
    failSign: () => {
      failSign = true
    },
    missingPhoto: () => {
      missingPhoto = true
    },
  }
}

const nextRevision = (value: Wardrobe) => ({
  ...value,
  revision: value.revision + 1,
})

describe('cloud wardrobe REST integration', () => {
  it('starts with an empty cloud closet without sample data or photo requests', async () => {
    const remote = server([])
    expect((await remote.repository.load()).items).toEqual([])
    expect(remote.requests).toHaveLength(2)
    for (const request of remote.requests)
      expect(request.url.searchParams.get('owner_id')).toBe(`eq.${ownerId}`)
  })

  it('loads all pages and batches private signed URLs without persisting URLs', async () => {
    const remote = server(
      Array.from({ length: 101 }, (_, index) => itemRow(`id-${index}`)),
    )
    const value = await remote.repository.load()
    expect(value.items).toHaveLength(101)
    expect(value.items[0].image).toContain(
      '/storage/v1/object/sign/closet-images/',
    )
    const signing = remote.requests.filter((request) =>
      request.url.pathname.includes('/sign/'),
    )
    expect(signing).toHaveLength(2)
    expect(signing[0].body).toMatchObject({ expiresIn: 3600 })
    expect(remote.tables.clothing_items[0]).not.toHaveProperty('image')
  })

  it('uploads a compressed photo before inserting its row and does not reupload on a metadata edit', async () => {
    const remote = server([])
    const value = await remote.repository.load()
    const item = {
      id: topId,
      name: 'New shirt',
      category: 'tops' as const,
      color: 'White',
      image: photo,
    }
    const saved = (await remote.repository.save(
      nextRevision(upsertItem(value, item)),
    ))!
    const write = remote.requests.find(
      (request) =>
        request.url.pathname === '/rest/v1/clothing_items' &&
        request.method === 'POST',
    )!
    expect(write.body).toMatchObject({ owner_id: ownerId, name: 'New shirt' })
    expect(write.body).not.toHaveProperty('image')
    expect(saved.items[0].storagePath).toMatch(
      new RegExp(`^${ownerId}/.+\\.jpg$`),
    )
    await remote.repository.save(
      nextRevision(upsertItem(saved, { ...saved.items[0], name: 'Renamed' })),
    )
    expect(
      remote.requests.filter(
        (request) =>
          request.method === 'POST' &&
          request.url.pathname.startsWith('/storage/v1/object/'),
      ),
    ).toHaveLength(1)
    expect(remote.tables.clothing_items[0].name).toBe('Renamed')
  })

  it('edits just one row using its original server version', async () => {
    const remote = server([itemRow(), itemRow(bottomId, 'bottoms')])
    const value = await remote.repository.load()
    await remote.repository.save(
      nextRevision(
        upsertItem(value, { ...value.items[0], name: 'Renamed shirt' }),
      ),
    )
    const writes = remote.requests.filter(
      (request) => request.method === 'PATCH',
    )
    expect(writes).toHaveLength(1)
    expect(writes[0].url.searchParams.get('updated_at')).toBe(`eq.${createdAt}`)
    expect(remote.tables.clothing_items[1].name).toBe('Jeans')
  })

  it('refuses stale edits and requires reload before another write', async () => {
    const remote = server()
    const value = await remote.repository.load()
    remote.tables.clothing_items[0].updated_at = 'newer-server-version'
    const change = nextRevision(
      upsertItem(value, { ...value.items[0], name: 'Stale edit' }),
    )
    await expect(remote.repository.save(change)).rejects.toThrow('Reload')
    expect(remote.tables.clothing_items[0].name).toBe('Shirt')
    const count = remote.requests.length
    await expect(remote.repository.save(change)).rejects.toThrow('Reload')
    expect(remote.requests).toHaveLength(count)
  })

  it('does not write data or remove an uploaded photo after an uncertain database failure', async () => {
    const remote = server([])
    const value = await remote.repository.load()
    remote.failWrite()
    await expect(
      remote.repository.save(
        nextRevision(
          upsertItem(value, {
            id: topId,
            name: 'Shirt',
            category: 'tops',
            color: '',
            image: photo,
          }),
        ),
      ),
    ).rejects.toThrow('Reload before retrying')
    expect(remote.requests.some((request) => request.method === 'DELETE')).toBe(
      false,
    )
    expect(remote.repository.getWarning?.()).toContain(
      'uploaded photo may be unused',
    )
  })

  it('keeps the old photo until a replacement row has saved', async () => {
    const remote = server()
    const value = await remote.repository.load()
    await remote.repository.save(
      nextRevision(upsertItem(value, { ...value.items[0], image: photo })),
    )
    const methods = remote.requests
      .filter(
        (request) =>
          request.method !== 'GET' && !request.url.pathname.includes('/sign/'),
      )
      .map((request) => request.method)
    expect(methods).toEqual(['POST', 'PATCH', 'DELETE'])
  })

  it('reports cleanup failure after a successful delete and can retry cleanup', async () => {
    const remote = server()
    const value = await remote.repository.load()
    remote.failRemove()
    const saved = (await remote.repository.save(
      nextRevision(removeItem(value, topId)),
    ))!
    expect(saved.items).toEqual([])
    expect(remote.tables.clothing_items).toEqual([])
    expect(remote.repository.getWarning?.()).toContain('wardrobe was saved')
    remote.recoverRemove()
    await remote.repository.refreshPhotos!(saved)
    expect(remote.repository.getWarning?.()).toBe('')
    expect(
      remote.requests.filter(
        (request) =>
          request.method === 'DELETE' &&
          request.url.pathname.startsWith('/storage/'),
      ),
    ).toHaveLength(2)
  })

  it('saves stable outfit references including an outerwear top, then deletes only the outfit', async () => {
    const remote = server([
      itemRow(topId, 'outerwear'),
      itemRow(bottomId, 'bottoms'),
    ])
    const value = await remote.repository.load()
    const outfit = {
      id: crypto.randomUUID(),
      name: 'Weekend',
      topItemId: topId,
      bottomItemId: bottomId,
      createdAt,
    }
    const saved = (await remote.repository.save(
      nextRevision(addOutfit(value, outfit)),
    ))!
    expect(remote.tables.outfits[0]).toMatchObject({
      top_item_id: topId,
      top_category: 'outerwear',
      bottom_item_id: bottomId,
    })
    await remote.repository.save(nextRevision({ ...saved, outfits: [] }))
    expect(remote.tables.clothing_items).toHaveLength(2)
    expect(remote.tables.outfits).toEqual([])
  })

  it('rejects operations after the signed-in account changes', async () => {
    const remote = server()
    const value = await remote.repository.load()
    remote.session.mockResolvedValue({ data: { session: null }, error: null })
    const count = remote.requests.length
    await expect(
      remote.repository.save(nextRevision(removeItem(value, topId))),
    ).rejects.toThrow('account changed')
    await expect(remote.repository.load()).rejects.toThrow('account changed')
    expect(remote.requests).toHaveLength(count)
  })

  it('explains missing schema and does not fall back to local data', async () => {
    const remote = server()
    remote.failRead()
    await expect(remote.repository.load()).rejects.toThrow(
      'Apply the wardrobe SQL migration',
    )
  })

  it('keeps metadata when a private photo is missing and renews signed URLs', async () => {
    const remote = server()
    const value = await remote.repository.load()
    const refreshed = await remote.repository.refreshPhotos!(value)
    expect(refreshed.items[0].image).not.toBe(value.items[0].image)
    expect(refreshed.items[0].id).toBe(topId)
    // An editor may still hold the previous signed URL during renewal.
    const saved = (await remote.repository.save(
      nextRevision(
        upsertItem(value, {
          ...value.items[0],
          name: 'Edited while photos renewed',
        }),
      ),
    ))!
    expect(saved.items[0].image).toBe(refreshed.items[0].image)
    remote.missingPhoto()
    expect((await remote.repository.refreshPhotos!(saved)).items[0].image).toBe(
      '',
    )
  })

  it('does not write metadata when uploading a photo fails', async () => {
    const remote = server([])
    const value = await remote.repository.load()
    remote.failUpload()
    await expect(
      remote.repository.save(
        nextRevision(
          upsertItem(value, {
            id: topId,
            name: 'Shirt',
            category: 'tops',
            color: '',
            image: photo,
          }),
        ),
      ),
    ).rejects.toThrow('Uploading your photo')
    expect(remote.tables.clothing_items).toHaveLength(0)
  })
})
