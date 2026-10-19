import { chromium } from '@playwright/test'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import process from 'node:process'

const svg = await readFile(
  new URL('../public/favicon.svg', import.meta.url),
  'utf8',
)
const directory = new URL('../public/icons/', import.meta.url)
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({
  channel: process.platform === 'win32' ? 'msedge' : undefined,
})
try {
  const page = await browser.newPage()
  for (const [name, size, inset] of [
    ['icon-192', 192, 0],
    ['icon-512', 512, 0],
    ['apple-touch-icon', 180, 0],
    ['maskable-512', 512, 0.1],
  ]) {
    const png = await page.evaluate(
      async ({ svg, size, inset }) => {
        const source = new Image()
        source.src = `data:image/svg+xml;base64,${btoa(svg)}`
        await source.decode()
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        const context = canvas.getContext('2d')
        context.fillStyle = '#242424'
        context.fillRect(0, 0, size, size)
        context.drawImage(
          source,
          size * inset,
          size * inset,
          size * (1 - 2 * inset),
          size * (1 - 2 * inset),
        )
        return canvas.toDataURL('image/png').split(',')[1]
      },
      { svg, size, inset },
    )
    await writeFile(
      new URL(`${name}.png`, directory),
      Buffer.from(png, 'base64'),
    )
  }
} finally {
  await browser.close()
}
