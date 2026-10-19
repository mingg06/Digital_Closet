import { useEffect, useState } from 'react'
import type { ClothingItem } from '../closet/clothing'
import { shareRequest } from './api'

export function SharedImage({
  token,
  item,
}: {
  token: string
  item: ClothingItem
}) {
  const [image, setImage] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let url = ''
    shareRequest<Blob>(
      { action: 'image', token, itemId: item.id },
      controller.signal,
    )
      .then((blob) => {
        if (controller.signal.aborted) return
        url = URL.createObjectURL(new Blob([blob], { type: 'image/jpeg' }))
        setImage(url)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [token, item.id])
  if (!image || failed)
    return (
      <div
        className="image-fallback"
        role="img"
        aria-label={`${item.name}: ${failed ? 'image unavailable' : 'loading image'}`}
      >
        {failed
          ? 'Photo unavailable. Refresh to check access.'
          : 'Loading photo…'}
      </div>
    )
  return (
    <img
      src={image}
      alt={item.name}
      width={240}
      height={260}
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
