import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Buffer } from 'node:buffer'

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
})

async function navigate(page: Page, label: string) {
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: label, exact: true })
    .click()
}

test('uploads, crops, edits, mixes, saves, reloads, and deletes a photo piece', async ({
  page,
}, info) => {
  await page.goto('/closet/new')
  await page.getByLabel('Name (required)').fill('Test linen shirt')
  // An asymmetric raster fixture verifies real canvas decode and JPEG conversion.
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 800
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#e4decb'
    ctx.fillRect(0, 0, 1200, 800)
    ctx.fillStyle = '#536d87'
    ctx.fillRect(0, 0, 300, 800)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.locator('#item-photo').setInputFiles({
    name: 'shirt.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  })
  const preview = page.getByRole('img', { name: 'Clothing preview' })
  await expect(preview).toBeVisible()
  const fitted = await preview.getAttribute('src')
  expect(fitted).toMatch(/^data:image\/jpeg;base64,/)
  expect(fitted!.length).toBeLessThanOrEqual(700_000)
  await page.getByLabel('Photo framing').selectOption('cover')
  await expect(preview).not.toHaveAttribute('src', fitted!)
  await page
    .getByLabel('Category (required)', { exact: true })
    .selectOption('tops')
  await page.getByLabel('Color (optional)').fill('Oat')
  await page.getByLabel('Subcategory (optional)').fill('Shirt')
  await page.getByLabel('Tags (optional)').fill('linen, summer')
  await page.getByRole('button', { name: 'Save piece', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Test linen shirt', exact: true }),
  ).toBeVisible()
  const editLink = page.getByRole('link', {
    name: 'Edit Test linen shirt',
    exact: true,
  })
  const id = (await editLink.getAttribute('href'))!.split('/')[2]
  await page.reload()
  await expect(editLink).toBeVisible()
  await editLink.click()
  await expect(page.getByLabel('Tags (optional)')).toHaveValue('linen, summer')
  await page.getByLabel('Name (required)').fill('Edited linen shirt')
  await page.getByRole('button', { name: 'Save piece', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Edited linen shirt', exact: true }),
  ).toBeVisible()
  await navigate(page, 'Mixer')
  await page
    .getByRole('region', { name: 'Tops selector' })
    .getByRole('combobox', { name: 'Piece', exact: true })
    .selectOption(id)
  await page.getByRole('button', { name: 'Next bottoms', exact: true }).click()
  await page.getByLabel('Name this outfit').fill('Sunny afternoon')
  await page.getByRole('button', { name: 'Save outfit', exact: true }).click()
  await page
    .getByRole('link', { name: 'View saved outfits', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Sunny afternoon' }),
  ).toBeVisible()
  await expect(
    page.getByText('Edited linen shirt + Relaxed trousers', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Sunny afternoon' }),
  ).toBeVisible()
  await page.screenshot({
    path: info.outputPath('saved-outfit.png'),
    fullPage: true,
  })
  await page.getByRole('link', { name: 'Mix Sunny afternoon' }).click()
  await expect(
    page.getByRole('heading', { name: 'Edited linen shirt' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Relaxed trousers' }),
  ).toBeVisible()
  await navigate(page, 'Closet')
  await page
    .getByRole('button', { name: 'Delete Edited linen shirt', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('and 1 saved outfit')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(
    page.getByRole('button', {
      name: 'Delete Edited linen shirt',
      exact: true,
    }),
  ).toBeFocused()
  await expect(
    page.getByRole('heading', { name: 'Edited linen shirt' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Delete Edited linen shirt', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: 'Delete piece', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Edited linen shirt' }),
  ).toHaveCount(0)
  await navigate(page, 'Outfits')
  await expect(
    page.getByRole('heading', { name: 'A home for your favorite pairings' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Sunny afternoon' }),
  ).toHaveCount(0)
})

test('supports independent swipe, arrows, category, and direct piece selection', async ({
  page,
}) => {
  await page.goto('/mixer')
  const top = page.getByRole('region', { name: 'Tops selector' })
  const bottom = page.getByRole('region', { name: 'Bottoms selector' })
  const surface = top.locator('.swipe-surface')
  await surface.scrollIntoViewIfNeeded()
  const box = (await surface.boundingBox())!
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 10, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(top.getByRole('heading', { name: 'Weekend tee' })).toBeVisible()
  await expect(
    bottom.getByRole('heading', { name: 'Straight-leg denim' }),
  ).toHaveCount(1)
  await bottom.getByRole('button', { name: 'Previous bottoms' }).click()
  await expect(
    bottom.getByRole('heading', { name: 'Everyday trousers' }),
  ).toBeVisible()
  await expect(top.getByRole('heading', { name: 'Weekend tee' })).toHaveCount(1)
  await top.getByLabel('Category').selectOption('outerwear')
  await expect(top.getByRole('heading', { name: 'Chore jacket' })).toBeVisible()
  await expect(top.getByRole('button', { name: 'Next tops' })).toBeDisabled()
  await expect(
    bottom.getByRole('heading', { name: 'Everyday trousers' }),
  ).toHaveCount(1)
  await top.getByLabel('Category').selectOption('tops')
  await top.getByLabel('Piece').selectOption('top-ink')
  await page.reload()
  await expect(
    top.getByRole('heading', { name: 'Essential tee' }),
  ).toBeVisible()
  await expect(
    bottom.getByRole('heading', { name: 'Everyday trousers' }),
  ).toHaveCount(1)
})

test('deletes a saved outfit without deleting clothing and dismisses dialog with Escape', async ({
  page,
}) => {
  await page.goto('/mixer')
  await page.getByLabel('Name this outfit').fill('Weekend uniform')
  await page.getByRole('button', { name: 'Save outfit', exact: true }).click()
  await page.getByRole('link', { name: 'View saved outfits' }).click()
  const trigger = page.getByRole('button', {
    name: 'Delete outfit Weekend uniform',
  })
  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete outfit', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'A home for your favorite pairings' }),
  ).toBeVisible()
  await navigate(page, 'Closet')
  await expect(
    page.getByRole('heading', { name: 'Everyday tee', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Straight-leg denim', exact: true }),
  ).toBeVisible()
})

test('keeps routes within the viewport and panels stacked, including deep-link reloads', async ({
  page,
}, info) => {
  for (const route of [
    '/mixer',
    '/closet',
    '/closet/new',
    '/closet/top-cream/edit',
    '/outfits',
    '/suggestions',
    '/settings',
    '/login',
    '/share/example',
    '/missing',
  ]) {
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    if (route === '/mixer') {
      const top = (await page
        .getByRole('region', { name: 'Tops selector' })
        .boundingBox())!
      const bottom = (await page
        .getByRole('region', { name: 'Bottoms selector' })
        .boundingBox())!
      expect(bottom.y).toBeGreaterThanOrEqual(top.y + top.height)
      await page.screenshot({
        path: info.outputPath('mixer.png'),
        fullPage: true,
      })
    }
    if (route.startsWith('/share/')) {
      await expect(page.getByRole('img')).toHaveCount(0)
      await expect(page.getByRole('navigation')).toHaveCount(0)
      await expect(
        page.getByRole('heading', { name: "Sharing isn't available yet" }),
      ).toBeVisible()
    }
  }
})

test('reports unavailable storage without crashing or seeding over it', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined })
  })
  await page.goto('/mixer')
  await expect(page.getByRole('alert')).toContainText(
    'Browser storage is unavailable',
  )
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Browser storage is unavailable',
  )
  await page.goto('/share/anything')
  await expect(
    page.getByRole('heading', { name: "Sharing isn't available yet" }),
  ).toBeVisible()
})

test('rejects stale-tab saves instead of losing another tab’s changes', async ({
  page,
  context,
}) => {
  await page.goto('/closet/top-cream/edit')
  await expect(page.getByLabel('Name (required)')).toHaveValue('Everyday tee')
  const second = await context.newPage()
  await second.goto('/closet/top-cream/edit')
  await expect(second.getByLabel('Name (required)')).toHaveValue('Everyday tee')
  await page.getByLabel('Name (required)').fill('First tab tee')
  await page.getByRole('button', { name: 'Save piece', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'First tab tee', exact: true }),
  ).toBeVisible()
  await second.getByLabel('Name (required)').fill('Stale tab tee')
  await second.getByRole('button', { name: 'Save piece', exact: true }).click()
  await expect(second.getByRole('alert')).toContainText(
    'changed in another tab',
  )
  await expect(second.getByLabel('Name (required)')).toHaveValue(
    'Stale tab tee',
  )
  await second.reload()
  await expect(second.getByLabel('Name (required)')).toHaveValue(
    'First tab tee',
  )
  await second.close()
})
