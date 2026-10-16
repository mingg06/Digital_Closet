export type ImageFit = 'contain' | 'cover'
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

export function validateImageFile(file: File) {
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

export async function processImage(file: File, fit: ImageFit): Promise<string> {
  validateImageFile(file)
  const source = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = source
    await image.decode().catch(() => {
      throw new Error(
        'This photo could not be opened. Try a different JPEG, PNG, or WebP file.',
      )
    })
    if (image.naturalWidth * image.naturalHeight > 40_000_000)
      throw new Error(
        'This photo is too large to process. Resize it below 40 megapixels first.',
      )
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1000
    const context = canvas.getContext('2d')
    if (!context)
      throw new Error('Photo processing is unavailable in this browser.')
    context.fillStyle = '#f0f0ed'
    context.fillRect(0, 0, 1000, 1000)
    const rect = fitImage(image.naturalWidth, image.naturalHeight, fit)
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height)
    // Re-encoding strips original metadata and caps the local storage footprint.
    for (const quality of [0.82, 0.65, 0.45]) {
      const data = canvas.toDataURL('image/jpeg', quality)
      if (data.startsWith('data:image/jpeg;base64,') && data.length <= 700_000)
        return data
    }
    throw new Error(
      'This photo could not be compressed enough. Try a simpler or smaller photo.',
    )
  } finally {
    URL.revokeObjectURL(source)
  }
}
