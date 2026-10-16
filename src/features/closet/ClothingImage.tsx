import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import type { ClothingItem } from './sampleItems'

export function ClothingImage({ item }: { item: ClothingItem }) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <div
        className="image-fallback"
        role="img"
        aria-label={`${item.name}: illustration unavailable`}
      >
        <ImageOff aria-hidden="true" />
        <span>Illustration unavailable</span>
      </div>
    )
  return (
    <img
      src={item.image}
      alt={`${item.color} ${item.name.toLowerCase()}, sample illustration`}
      width={240}
      height={260}
      onError={() => setFailed(true)}
      draggable={false}
    />
  )
}
