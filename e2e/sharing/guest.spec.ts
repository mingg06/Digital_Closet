import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Buffer } from 'node:buffer'
import {
  createShareHandler,
  hashToken,
} from '../../supabase/functions/closet-share/handler.ts'

const token = 'a'.repeat(64)
const top = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const nextTop = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const bottom = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

async function server(page: Page) {
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 32
    const context = canvas.getContext('2d')!
    context.fillStyle = '#536d87'
    context.fillRect(0, 0, 32, 32)
    return canvas.toDataURL('image/jpeg').split(',')[1]
  })
  let revoked = false
  const suggestions: Record<string, unknown>[] = []
  const expectedHash = await hashToken(token)
  const handle = createShareHandler(
    {
      async user() {
        return null
      },
      async rpc(name, args) {
        if (name !== 'closet_share_access')
          throw new Error('Owner operation forbidden')
        if (revoked || args.p_hash !== expectedHash)
          throw new Error('share_unavailable')
        if (args.p_action === 'image') {
          if (![top, nextTop, bottom].includes(String(args.p_item)))
            throw new Error('share_unavailable')
          return { path: 'owner/photo.jpg' }
        }
        if (args.p_action === 'suggest') {
          suggestions.push(args)
          return { ok: true }
        }
        return {
          scope: 'all',
          items: [
            {
              id: top,
              name: 'Shared shirt',
              category: 'tops',
              color: 'Blue',
              tags: [],
            },
            {
              id: nextTop,
              name: 'Shared tee',
              category: 'tops',
              color: 'Cream',
              tags: [],
            },
            {
              id: bottom,
              name: 'Shared jeans',
              category: 'bottoms',
              color: 'Indigo',
              tags: [],
            },
          ],
          expiresAt: new Date(Date.now() + 86400_000).toISOString(),
        }
      },
      async download() {
        return new Blob([Buffer.from(image, 'base64')])
      },
    },
    'http://127.0.0.1:4176',
  )
  await page.route('https://sharing.invalid/**', async (route) => {
    const source = route.request()
    if (!source.url().endsWith('/functions/v1/closet-share')) {
      await route.abort()
      return
    }
    const response = await handle(
      new Request(source.url(), {
        method: source.method(),
        headers: source.headers(),
        ...(source.method() === 'POST' ? { body: source.postData() } : {}),
      }),
    )
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: Buffer.from(await response.arrayBuffer()),
    })
  })
  return {
    suggestions,
    revoke() {
      revoked = true
    },
  }
}

test('guest browses, independently mixes and submits without owner controls', async ({
  page,
}, info) => {
  await page.goto('/')
  const api = await server(page)
  await page.goto(`/share/${token}`)
  await expect(
    page.getByRole('heading', { name: 'A closet shared with you' }),
  ).toBeVisible()
  const tops = page.getByRole('region', { name: 'Tops selector' })
  const bottoms = page.getByRole('region', { name: 'Bottoms selector' })
  await expect(tops.locator('img')).toBeVisible()
  expect(
    await tops
      .locator('img')
      .evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0)
  await tops.getByRole('button', { name: 'Next tops' }).click()
  await expect(tops.getByRole('heading', { name: 'Shared tee' })).toBeVisible()
  await expect(
    bottoms.getByRole('heading', { name: 'Shared jeans' }),
  ).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Add a piece' })).toHaveCount(0)
  await page.screenshot({
    path: info.outputPath('guest-mixer.png'),
    fullPage: true,
  })
  await page.getByText('Browse shared pieces').click()
  await expect(
    page.getByRole('button', { name: 'Try this piece: Shared shirt' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Try this piece: Shared shirt' })
    .click()
  await expect(
    tops.getByRole('heading', { name: 'Shared shirt' }),
  ).toBeVisible()
  await page.getByText('Add your name or a note (optional)').click()
  await page.getByLabel('Your name (optional)').fill('A friend')
  await page.getByLabel('A note (optional)').fill('For the weekend')
  await page.getByRole('button', { name: 'Send suggestion' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Your pairing is in the owner’s suggestions.',
  )
  expect(api.suggestions).toHaveLength(1)
  expect(api.suggestions[0]).toMatchObject({
    p_top: top,
    p_bottom: bottom,
    p_nickname: 'A friend',
    p_message: 'For the weekend',
  })
  expect(api.suggestions[0].p_hash).toBe(await hashToken(token))
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('revocation clears the guest page on refresh and blocks subsequent API access', async ({
  page,
}) => {
  await page.goto('/')
  const api = await server(page)
  await page.goto(`/share/${token}`)
  await expect(
    page.getByRole('heading', { name: 'Shared shirt' }),
  ).toBeVisible()
  api.revoke()
  await page.getByRole('button', { name: 'Refresh shared closet' }).click()
  await expect(
    page.getByRole('heading', { name: 'Shared closet unavailable' }),
  ).toBeVisible()
  await expect(page.getByRole('img')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Send suggestion' }),
  ).toHaveCount(0)
  expect(api.suggestions).toHaveLength(0)
})

test('unknown capabilities never render wardrobe images or editing controls', async ({
  page,
}) => {
  await page.goto('/')
  await server(page)
  await page.goto(`/share/${'b'.repeat(64)}`)
  await expect(
    page.getByRole('heading', { name: 'Shared closet unavailable' }),
  ).toBeVisible()
  await expect(page.getByRole('img')).toHaveCount(0)
  await expect(page.getByRole('navigation')).toHaveCount(0)
})
