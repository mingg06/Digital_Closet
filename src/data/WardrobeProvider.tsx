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
  const lastPhotoRefresh = useRef(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [warning, setWarning] = useState('')
  const mode = repository.mode ?? 'local'
  useEffect(() => {
    let active = true
    repository
      .load()
      .then((value) => {
        if (active) {
          current.current = value
          setWardrobe(value)
          setError('')
          lastPhotoRefresh.current = Date.now()
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
        const saved = (await repository.save(next)) ?? next
        current.current = saved
        setWardrobe(saved)
      } finally {
        setWarning(repository.getWarning?.() ?? '')
        saving.current = false
        setBusy(false)
      }
    },
    [repository],
  )

  const refreshPhotos = useCallback(async () => {
    if (!repository.refreshPhotos || !current.current || saving.current) return
    saving.current = true
    setBusy(true)
    try {
      const refreshed = await repository.refreshPhotos(current.current)
      current.current = refreshed
      setWardrobe(refreshed)
      lastPhotoRefresh.current = Date.now()
      setWarning(repository.getWarning?.() ?? '')
    } catch {
      setWarning(
        'Private photos could not be refreshed. Check your connection and try again.',
      )
    } finally {
      saving.current = false
      setBusy(false)
    }
  }, [repository])

  useEffect(() => {
    if (!repository.refreshPhotos) return
    function refresh() {
      if (Date.now() - lastPhotoRefresh.current < 40 * 60 * 1000) return
      if (document.visibilityState !== 'visible' || saving.current) return
      void refreshPhotos()
    }
    const timer = window.setInterval(refresh, 60 * 1000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [repository, refreshPhotos])

  if (error)
    return (
      <div className="notice" role="alert">
        <h2>
          Could not open your {mode === 'cloud' ? 'cloud' : 'local'} closet
        </h2>
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
        <p>Opening your {mode === 'cloud' ? 'cloud' : 'local'} closet…</p>
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    )
  return (
    <WardrobeContext.Provider
      value={{ wardrobe, update, busy, mode, refreshPhotos }}
    >
      {warning && (
        <div className="notice mx-4 mt-4" role="alert">
          <p>{warning}</p>
        </div>
      )}
      {children}
    </WardrobeContext.Provider>
  )
}
