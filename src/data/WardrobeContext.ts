import { createContext, useContext } from 'react'
import type { Wardrobe } from './wardrobe'

export interface WardrobeContextValue {
  wardrobe: Wardrobe
  busy: boolean
  mode: 'local' | 'cloud'
  refreshPhotos: () => Promise<void>
  update: (change: (current: Wardrobe) => Wardrobe) => Promise<void>
}

export const WardrobeContext = createContext<WardrobeContextValue | null>(null)

export function useWardrobe() {
  const value = useContext(WardrobeContext)
  if (!value) throw new Error('Wardrobe provider is missing.')
  return value
}
