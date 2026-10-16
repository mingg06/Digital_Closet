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
        aria-label={`${item.name}: image unavailable`}
      >
        <ImageOff aria-hidden="true" />
        <span>Image unavailable</span>
      </div>
    )
  return (
    <img
      src={item.image}
      alt={`${item.color} ${item.name.toLowerCase()}${item.isSample ? ', sample illustration' : ''}`.trim()}
      width={240}
      height={260}
      onError={() => setFailed(true)}
      draggable={false}
    />
  )
}
