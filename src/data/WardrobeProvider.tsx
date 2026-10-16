import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { WardrobeContext } from './WardrobeContext'
import { indexedDbRepository } from './indexedDb'
import type { Wardrobe, WardrobeRepository } from './wardrobe'

export function WardrobeProvider({
  children,
  repository = indexedDbRepository,
}: {
  children: ReactNode
  repository?: WardrobeRepository
}) {
  const [wardrobe, setWardrobe] = useState<Wardrobe | null>(null)
  const current = useRef<Wardrobe | null>(null)
  const saving = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    repository
      .load()
      .then((value) => {
        if (active) {
          current.current = value
          setWardrobe(value)
          setError('')
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not read browser storage.',
          )
      })
    return () => {
      active = false
    }
  }, [repository, attempt])

  const update = useCallback(
    async (change: (value: Wardrobe) => Wardrobe) => {
      if (!current.current || saving.current)
        throw new Error('Wait for the current save to finish, then try again.')
      saving.current = true
      setBusy(true)
      try {
        const next = {
          ...change(current.current),
          revision: current.current.revision + 1,
        }
        await repository.save(next)
        current.current = next
        setWardrobe(next)
      } finally {
        saving.current = false
        setBusy(false)
      }
    },
    [repository],
  )

  if (error)
    return (
      <div className="notice" role="alert">
        <h2>Could not open your local closet</h2>
        <p>{error}</p>
        <button
          className="button-secondary mt-4"
          onClick={() => {
            setError('')
            setAttempt((value) => value + 1)
          }}
        >
          Try again
        </button>
      </div>
    )
  if (!wardrobe)
    return (
      <div className="loading-state" role="status" aria-busy="true">
        <p>Opening your local closet…</p>
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    )
  return (
    <WardrobeContext.Provider value={{ wardrobe, update, busy }}>
      {children}
    </WardrobeContext.Provider>
  )
}
