import { supabase } from '../../auth/supabase'
import type { ClothingItem } from '../closet/clothing'

export interface SharedCloset {
  scope?: 'all' | 'selected'
  items: Pick<
    ClothingItem,
    'id' | 'name' | 'category' | 'color' | 'subcategory' | 'tags'
  >[]
  expiresAt: string
}
export interface ShareLink {
  share_scope: 'all' | 'selected'
  id: string
  expires_at: string
  created_at: string
}
export interface Suggestion {
  id: string
  top_item_id: string
  bottom_item_id: string
  nickname: string
  message: string
  created_at: string
}

export async function shareRequest<T>(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  if (!supabase)
    throw new Error('Private sharing needs a configured cloud wardrobe.')
  const { data, error } = await supabase.functions.invoke('closet-share', {
    body,
    signal,
  })
  if (error) {
    let message =
      'Sharing is not available. Ask the owner to check its server setup, or try again later.'
    if ('context' in error && error.context instanceof Response) {
      try {
        const result = await error.context.json()
        if (typeof result.error === 'string') message = result.error
      } catch {
        /* Keep a safe fallback. */
      }
    }
    throw new Error(message)
  }
  return data as T
}

export async function activeShare(ownerId: string): Promise<ShareLink | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('share_links')
    .select('id, expires_at, created_at, share_scope')
    .eq('owner_id', ownerId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (error)
    throw new Error(
      'Apply the whole-closet sharing migration, then reload Settings to enable sharing.',
    )
  return data
}

export async function readSuggestions(
  ownerId: string,
  page: number,
): Promise<Suggestion[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('outfit_suggestions')
    .select('id, top_item_id, bottom_item_id, nickname, message, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .order('id')
    .range(page * 24, page * 24 + 23)
  if (error)
    throw new Error(
      'Could not load suggestions. Check the sharing migration and your connection, then retry.',
    )
  return data
}

export async function deleteSuggestion(ownerId: string, id: string) {
  if (!supabase) throw new Error('Sign in to manage suggestions.')
  const { data, error } = await supabase
    .from('outfit_suggestions')
    .delete()
    .eq('owner_id', ownerId)
    .eq('id', id)
    .select('id')
    .single()
  if (error || !data)
    throw new Error('Could not dismiss this suggestion. Reload and try again.')
}
