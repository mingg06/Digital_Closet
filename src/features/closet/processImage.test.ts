import { describe, expect, it } from 'vitest'
import { fitImage, validateImageFile } from './processImage'

describe('photo preparation', () => {
  it('fits the whole image without stretching it', () => {
    expect(fitImage(2000, 1000, 'contain')).toEqual({
      x: 0,
      y: 250,
      width: 1000,
      height: 500,
    })
    expect(fitImage(1000, 2000, 'contain')).toEqual({
      x: 250,
      y: 0,
      width: 500,
      height: 1000,
    })
  })
  it('crops the center to fill a square without stretching it', () => {
    expect(fitImage(2000, 1000, 'cover')).toEqual({
      x: -500,
      y: 0,
      width: 2000,
      height: 1000,
    })
    expect(fitImage(1000, 2000, 'cover')).toEqual({
      x: 0,
      y: -500,
      width: 1000,
      height: 2000,
    })
  })
  it('rejects empty, oversized, or unsupported uploads', () => {
    expect(() =>
      validateImageFile(
        new File(['svg'], 'item.svg', { type: 'image/svg+xml' }),
      ),
    ).toThrow('JPEG')
    expect(() =>
      validateImageFile(new File([], 'empty.jpg', { type: 'image/jpeg' })),
    ).toThrow('empty')
    const large = new File(['image'], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(large, 'size', { value: 16 * 1024 * 1024 })
    expect(() => validateImageFile(large)).toThrow('15 MB')
  })
  it('rejects invalid dimensions', () => {
    expect(() => fitImage(0, 100, 'contain')).toThrow('dimensions')
    expect(() => fitImage(Infinity, 100, 'contain')).toThrow('dimensions')
  })
})
