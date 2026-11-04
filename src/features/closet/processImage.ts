import { removeBackground } from './removeBackground'

export type ImageFit = 'contain' | 'cover'
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxDataUrl = 700_000

export function validateImageFile(file: Blob) {
  if (!allowedTypes.includes(file.type))
    throw new Error(
      'Choose a JPEG, PNG, or WebP photo. Convert HEIC photos to JPEG first.',
    )
  if (file.size > 15 * 1024 * 1024)
    throw new Error('Choose a photo smaller than 15 MB.')
  if (!file.size) throw new Error('That file is empty. Choose another photo.')
}

export function fitImage(
  width: number,
  height: number,
  fit: ImageFit,
  size = 1000,
) {
  if (width <= 0 || height <= 0 || !Number.isFinite(width + height))
    throw new Error('The photo dimensions could not be read.')
  const scale =
    fit === 'contain'
      ? Math.min(size / width, size / height)
      : Math.max(size / width, size / height)
  return {
    x: (size - width * scale) / 2,
    y: (size - height * scale) / 2,
    width: width * scale,
    height: height * scale,
  }
}

async function decode(source: Blob) {
  const url = URL.createObjectURL(source)
  const image = new Image()
  image.src = url
  try {
    await image.decode().catch(() => {
      throw new Error(
        'This photo could not be opened. Try a different JPEG, PNG, or WebP file.',
      )
    })
    if (image.naturalWidth * image.naturalHeight > 40_000_000)
      throw new Error(
        'This photo is too large to process. Resize it below 40 megapixels first.',
      )
    return { image, release: () => URL.revokeObjectURL(url) }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

function canvas2d(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('Photo processing is unavailable in this browser.')
  return { canvas, context }
}

/** Bounding box of pixels that are not (almost) fully transparent. */
export function alphaBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 12,
) {
  let top = height
  let left = width
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }
  if (right < 0) return null
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

async function encodeJpeg(file: Blob, fit: ImageFit) {
  const { image, release } = await decode(file)
  try {
    const { canvas, context } = canvas2d(1000, 1000)
    context.fillStyle = '#f0f0ed'
    context.fillRect(0, 0, 1000, 1000)
    const rect = fitImage(image.naturalWidth, image.naturalHeight, fit)
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height)
    // Re-encoding strips original metadata and caps the local storage footprint.
    for (const quality of [0.82, 0.65, 0.45]) {
      const data = canvas.toDataURL('image/jpeg', quality)
      if (
        data.startsWith('data:image/jpeg;base64,') &&
        data.length <= maxDataUrl
      )
        return data
    }
    throw new Error(
      'This photo could not be compressed enough. Try a simpler or smaller photo.',
    )
  } finally {
    release()
  }
}

async function encodeCutout(file: Blob) {
  const cutout = await removeBackground(file)
  const { image, release } = await decode(cutout)
  try {
    const source = canvas2d(image.naturalWidth, image.naturalHeight)
    source.context.drawImage(image, 0, 0)
    const bounds = alphaBounds(
      source.context.getImageData(0, 0, image.naturalWidth, image.naturalHeight)
        .data,
      image.naturalWidth,
      image.naturalHeight,
    )
    if (!bounds)
      throw new Error(
        'No clothing was found in this photo. Try a clearer photo, or untick Remove background to keep the original.',
      )
    // Trim to the garment so pieces can sit flush against each other.
    for (const size of [1000, 800, 640]) {
      const scale = Math.min(size / bounds.width, size / bounds.height, 1)
      const width = Math.max(1, Math.round(bounds.width * scale))
      const height = Math.max(1, Math.round(bounds.height * scale))
      const { canvas, context } = canvas2d(width, height)
      context.drawImage(
        source.canvas,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        0,
        0,
        width,
        height,
      )
      for (const quality of [0.85, 0.7]) {
        const data = canvas.toDataURL('image/webp', quality)
        if (!data.startsWith('data:image/webp;base64,')) break
        if (data.length <= maxDataUrl) return data
      }
      // Browsers without WebP encoding (older Safari) fall back to PNG.
      const png = canvas.toDataURL('image/png')
      if (png.startsWith('data:image/png;base64,') && png.length <= maxDataUrl)
        return png
    }
    throw new Error(
      'This cutout could not be compressed enough. Try a simpler or smaller photo.',
    )
  } finally {
    release()
  }
}

export async function processImage(
  file: Blob,
  fit: ImageFit,
  options: { cutout?: boolean } = {},
): Promise<string> {
  validateImageFile(file)
  return options.cutout ? encodeCutout(file) : encodeJpeg(file, fit)
}
