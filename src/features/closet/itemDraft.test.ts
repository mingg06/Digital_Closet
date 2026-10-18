import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearItemDraft, readItemDraft, writeItemDraft } from './itemDraft'

const draft = {
  baseline: 'original',
  name: 'Unfinished top',
  category: 'tops' as const,
  color: '',
  subcategory: '',
  tags: '',
  preview: 'data:image/jpeg;base64,/9j/2Q==',
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const key of ['owner-a', 'owner-b']) clearItemDraft(key)
})

describe('item draft recovery', () => {
  it('keeps drafts separate by owner and refuses a draft based on an older saved piece', () => {
    writeItemDraft('owner-a', draft)
    expect(readItemDraft('owner-b', 'original')).toBeNull()
    expect(readItemDraft('owner-a', 'changed-in-another-tab')).toBeNull()
    expect(readItemDraft('owner-a', 'original')?.name).toBe('Unfinished top')
  })

  it('keeps navigation recovery available when browser storage rejects writes', () => {
    writeItemDraft('owner-a', { ...draft, name: 'Earlier draft' })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    expect(writeItemDraft('owner-a', draft)).toBe(false)
    expect(readItemDraft('owner-a', 'original')?.preview).toBe(draft.preview)
    clearItemDraft('owner-a')
    expect(readItemDraft('owner-a', 'original')).toBeNull()
  })

  it('ignores malformed stored draft data', () => {
    sessionStorage.setItem('owner-a', '{broken')
    expect(readItemDraft('owner-a', 'original')).toBeNull()
    sessionStorage.setItem(
      'owner-a',
      JSON.stringify({
        ...draft,
        preview: 'https://private-photo.example/signed',
      }),
    )
    expect(readItemDraft('owner-a', 'original')).toBeNull()
  })
})
