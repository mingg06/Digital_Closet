import { useEffect, useRef, useState } from 'react'

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  title: string
  description: string
  confirmLabel: string
  busy: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement as HTMLElement | null
    element?.showModal()
    return () => {
      element?.close()
      trigger?.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirm-title"
      className="confirm-dialog"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <p>{description}</p>
      {error && <p role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3 mt-6">
        <button
          autoFocus
          type="button"
          className="button-secondary"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="button-danger"
          disabled={busy}
          aria-busy={busy}
          onClick={async () => {
            try {
              setError('')
              await onConfirm()
              onClose()
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : 'Could not save. Try again.',
              )
            }
          }}
        >
          {busy ? 'Saving…' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
