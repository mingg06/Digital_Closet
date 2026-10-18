import { categories } from './clothing'
import type { Category } from './clothing'

export interface ItemDraft {
  baseline: string
  name: string
  category: Category | ''
  color: string
  subcategory: string
  tags: string
  preview: string
}

// Per-tab fallback keeps navigation safe even when session storage is full.
const drafts = new Map<string, ItemDraft>()
const storageStatus = new Map<string, 'persistent' | 'memory'>()

export function subscribeDraftStatus(notify: () => void) {
  window.addEventListener('item-draft-status', notify)
  return () => window.removeEventListener('item-draft-status', notify)
}

export function getDraftStatus(key: string) {
  return storageStatus.get(key) ?? ''
}

function publishStatus(key: string, status: 'persistent' | 'memory') {
  if (storageStatus.get(key) === status) return
  storageStatus.set(key, status)
  window.dispatchEvent(new Event('item-draft-status'))
}

export function readItemDraft(key: string, baseline: string): ItemDraft | null {
  let candidate: unknown = drafts.get(key)
  try {
    const stored = candidate ? null : sessionStorage.getItem(key)
    if (stored) candidate = JSON.parse(stored)
  } catch {
    /* Use the in-memory draft if browser storage is unavailable. */
  }
  if (!candidate || typeof candidate !== 'object') return null
  const value = candidate as ItemDraft
  if (
    value.baseline !== baseline ||
    !['name', 'color', 'subcategory', 'tags', 'preview'].every(
      (field) => typeof value[field as keyof ItemDraft] === 'string',
    ) ||
    (value.category !== '' && !categories.includes(value.category)) ||
    (value.preview !== '' &&
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value.preview))
  )
    return null
  return value
}

export function writeItemDraft(key: string, draft: ItemDraft): boolean {
  drafts.set(key, draft)
  try {
    sessionStorage.setItem(key, JSON.stringify(draft))
    publishStatus(key, 'persistent')
    return true
  } catch {
    publishStatus(key, 'memory')
    return false
  }
}

export function clearItemDraft(key: string) {
  drafts.delete(key)
  storageStatus.delete(key)
  window.dispatchEvent(new Event('item-draft-status'))
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* No persisted draft to clear. */
  }
}
