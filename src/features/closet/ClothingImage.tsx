import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import type { ClothingItem } from './clothing'

export function ClothingImage({ item }: { item: ClothingItem }) {
  const [failed, setFailed] = useState(false)
  if (failed || !item.image)
    return (
      <div
        className="image-fallback"
        role="img"
        aria-label={`${item.name}: image unavailable`}
      >
        <ImageOff aria-hidden="true" />
        <span>Image unavailable</span>
      </div>
    )
  return (
    <img
      src={item.image}
      alt={`${item.color} ${item.name.toLowerCase()}`.trim()}
      width={240}
      height={260}
      onError={() => setFailed(true)}
      draggable={false}
      referrerPolicy="no-referrer"
    />
  )
}
