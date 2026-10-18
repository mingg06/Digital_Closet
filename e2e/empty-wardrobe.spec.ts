import { expect, test } from '@playwright/test'
import { fixtureWardrobe } from '../src/test/fixtures'
import { Buffer } from 'node:buffer'

test('guides a first pairing, restores a photo draft, and supports repeated capture', async ({
  page,
}, info) => {
  await page.goto('/mixer')
  await expect(
    page.getByRole('heading', { name: 'Make your first outfit' }),
  ).toBeVisible()
  await page.screenshot({
    path: info.outputPath('first-outfit.png'),
    fullPage: true,
  })
  await page.getByRole('link', { name: 'Add a top', exact: true }).click()
  await expect(
    page.getByLabel('Category (required)', { exact: true }),
  ).toHaveValue('tops')
  const photo = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 80
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#536d87'
    ctx.fillRect(0, 0, 80, 80)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const upload = {
    name: 'piece.png',
    mimeType: 'image/png',
    buffer: Buffer.from(photo, 'base64'),
  }
  await page.locator('#item-photo').setInputFiles(upload)
  await expect(
    page.getByRole('img', { name: 'Clothing preview' }),
  ).toBeVisible()
  await page.getByLabel('Name (required)').fill('My first top')
  await page.screenshot({
    path: info.outputPath('photo-entry.png'),
    fullPage: true,
  })
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Closet', exact: true })
    .click()
  await page.getByRole('link', { name: 'Add a piece', exact: true }).click()
  await expect(page.getByLabel('Name (required)')).toHaveValue('My first top')
  await page.reload()
  await expect(page.getByLabel('Name (required)')).toHaveValue('My first top')
  await expect(
    page.getByRole('img', { name: 'Clothing preview' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save piece', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'My first top' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Add a bottom', exact: true }).click()
  await expect(
    page.getByLabel('Category (required)', { exact: true }),
  ).toHaveValue('bottoms')
  await expect(page.getByRole('img', { name: 'Clothing preview' })).toHaveCount(
    0,
  )
  await page.locator('#item-photo').setInputFiles(upload)
  await expect(
    page.getByRole('img', { name: 'Clothing preview' }),
  ).toBeVisible()
  await page.getByLabel('Name (required)').fill('My first bottom')
  await page.getByRole('button', { name: 'Save and add another' }).click()
  await expect(
    page.getByText('Piece saved. Add your next piece.'),
  ).toBeVisible()
  await expect(page.getByLabel('Name (required)')).toHaveValue('')
  await expect(page.getByRole('img', { name: 'Clothing preview' })).toHaveCount(
    0,
  )
  await page.getByLabel('Name (required)').fill('Discard this draft')
  await page.getByRole('button', { name: 'Discard draft' }).click()
  await page.getByRole('link', { name: 'Add a piece', exact: true }).click()
  await expect(page.getByLabel('Name (required)')).toHaveValue('')
  await expect(page.getByRole('img', { name: 'Clothing preview' })).toHaveCount(
    0,
  )
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Mixer', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'My first top' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'My first bottom' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save outfit', exact: true }).click()
  await page.getByRole('button', { name: 'Save outfit', exact: true }).click()
  await page.getByRole('link', { name: 'View saved outfits' }).click()
  await expect(page.getByRole('heading', { name: 'Outfit 1' })).toBeVisible()
  await expect(
    page.getByText('My first top + My first bottom', { exact: true }),
  ).toBeVisible()
})

test('starts with an empty closet and mixer, including after reload', async ({
  page,
}) => {
  await page.goto('/closet')
  await expect(page.getByRole('status')).toContainText('0 pieces')
  await expect(page.getByRole('img')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('status')).toContainText('0 pieces')
  await page.goto('/mixer')
  await expect(
    page.getByRole('heading', { name: 'Make your first outfit' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Add a top' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save outfit' })).toHaveCount(0)
})

test('persists legacy sample cleanup without losing uploaded clothes or real outfits', async ({
  page,
}) => {
  await page.goto('/login')
  const wardrobe = fixtureWardrobe()
  wardrobe.revision = 5
  wardrobe.items = wardrobe.items.filter((item) =>
    ['top-cream', 'top-sage', 'bottom-denim'].includes(item.id),
  )
  wardrobe.items[0].image = '/samples/cream-tee.svg'
  wardrobe.outfits = [
    {
      id: 'sample',
      name: 'Old sample outfit',
      topItemId: 'top-cream',
      bottomItemId: 'bottom-denim',
      createdAt: '2026-10-16T00:00:00Z',
    },
    {
      id: 'real',
      name: 'My real outfit',
      topItemId: 'top-sage',
      bottomItemId: 'bottom-denim',
      createdAt: '2026-10-16T00:00:00Z',
    },
  ]
  await page.evaluate(async (value) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 8
    value.items
      .filter((item) => !item.image.startsWith('/samples/'))
      .forEach((item) => {
        item.image = canvas.toDataURL('image/jpeg')
      })
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('digital-closet-local', 1)
      request.onupgradeneeded = () =>
        request.result.createObjectStore('wardrobe')
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction('wardrobe', 'readwrite')
        transaction.objectStore('wardrobe').put(value, 'current')
        transaction.oncomplete = () => {
          database.close()
          resolve()
        }
        transaction.onabort = () => {
          database.close()
          reject(transaction.error)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }, wardrobe)
  await page.goto('/closet')
  await expect(page.getByRole('status')).toContainText('2 pieces')
  await expect(
    page.getByRole('heading', { name: 'Everyday tee', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Weekend tee', exact: true }),
  ).toBeVisible()
  await page.goto('/outfits')
  await expect(
    page.getByRole('heading', { name: 'My real outfit' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Old sample outfit' }),
  ).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'My real outfit' }),
  ).toBeVisible()
  const stored = await page.evaluate(
    () =>
      new Promise<{ revision: number; items: unknown[] }>((resolve, reject) => {
        const request = indexedDB.open('digital-closet-local', 1)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction('wardrobe', 'readonly')
          const read = transaction.objectStore('wardrobe').get('current')
          transaction.oncomplete = () => {
            database.close()
            resolve(read.result)
          }
          transaction.onabort = () => {
            database.close()
            reject(transaction.error)
          }
        }
        request.onerror = () => reject(request.error)
      }),
  )
  expect(stored.revision).toBe(6)
  expect(stored.items).toHaveLength(2)
})
