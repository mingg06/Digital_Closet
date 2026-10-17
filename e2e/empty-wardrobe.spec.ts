import { expect, test } from '@playwright/test'
import { fixtureWardrobe } from '../src/test/fixtures'

test('starts with an empty closet and mixer, including after reload', async ({
  page,
}) => {
  await page.goto('/closet')
  await expect(page.getByRole('status')).toContainText('0 pieces')
  await expect(page.getByRole('img')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('status')).toContainText('0 pieces')
  await page.goto('/mixer')
  await expect(page.getByText('No tops in this closet yet.')).toBeVisible()
  await expect(page.getByText('No bottoms in this closet yet.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save outfit' })).toBeDisabled()
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
