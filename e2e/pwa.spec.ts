import { expect, test } from '@playwright/test'

test('installs a static-only cache and shows an offline page without caching private URLs', async ({
  page,
  context,
}) => {
  await page.goto('/settings')
  await expect(
    page.getByRole('heading', { name: 'Keep your closet close.' }),
  ).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true },
        )
      })
  })
  const manifest = await page.evaluate(async () =>
    (await fetch('/manifest.webmanifest')).json(),
  )
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('/')
  for (const icon of manifest.icons) {
    const dimensions = await page.evaluate(async (src: string) => {
      const image = new Image()
      image.src = src
      await image.decode()
      return `${image.naturalWidth}x${image.naturalHeight}`
    }, icon.src)
    expect(dimensions).toBe(icon.sizes)
  }
  await page.evaluate(async () => {
    await fetch('/rest/v1/clothing_items', {
      headers: { Authorization: 'Bearer test-private' },
    })
    await fetch('/storage/v1/object/sign/private/photo.jpg?token=test-private')
    await fetch('/functions/v1/closet-share', {
      method: 'POST',
      body: 'test-private',
    })
  })
  await context.setOffline(true)
  for (const path of [
    '/mixer',
    '/share/test-private',
    '/auth/callback?code=test-private',
  ]) {
    await page.goto(path)
    await expect(
      page.getByRole('heading', { name: 'You’re offline.' }),
    ).toBeVisible()
  }
  const keys = await page.evaluate(async () => {
    const names = await caches.keys()
    return (
      await Promise.all(
        names.map(async (name) =>
          (await (await caches.open(name)).keys()).map((key) => key.url),
        ),
      )
    ).flat()
  })
  expect(keys.length).toBeGreaterThan(4)
  for (const key of keys) {
    const url = new URL(key)
    expect(url.pathname).toMatch(
      /^\/(assets\/[^/]+\.(js|css)|icons\/[^/]+\.png|favicon\.svg|manifest\.webmanifest|offline\.html)$/,
    )
    expect(key).not.toContain('test-private')
  }
  await context.setOffline(false)
  await page.getByRole('link', { name: 'Try again' }).click()
  await expect(
    page.getByRole('heading', { name: 'Make your first outfit' }),
  ).toBeVisible()
})

test('connection changes preserve an open draft', async ({ page, context }) => {
  await page.goto('/closet/new')
  await page.getByLabel('Name (required)').fill('Unfinished top')
  await context.setOffline(true)
  await expect(
    page.getByRole('status').filter({ hasText: 'You’re offline' }),
  ).toBeVisible()
  await expect(page.getByLabel('Name (required)')).toHaveValue('Unfinished top')
  await context.setOffline(false)
  await expect(
    page.getByText('Reconnect before making cloud changes'),
  ).toBeHidden()
  await expect(page.getByLabel('Name (required)')).toHaveValue('Unfinished top')
})
