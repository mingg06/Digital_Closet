import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClothingItem, Category } from '../features/closet/clothing'
import {
  validateItem,
  type Wardrobe,
  type WardrobeRepository,
} from './wardrobe'

const bucket = 'closet-images'
const photoLifetime = 3600
const pageSize = 100
const staleMessage =
  'This record changed or access ended. Reload the page before trying again.'

interface ItemRow {
  id: string
  owner_id: string
  name: string
  category: Category
  color: string
  subcategory: string | null
  tags: string[]
  storage_path: string
  is_shareable: boolean
  created_at: string
  updated_at: string
}
interface OutfitRow {
  id: string
  owner_id: string
  name: string
  top_item_id: string
  bottom_item_id: string
  created_at: string
  updated_at: string
}

function cloudError(
  operation: string,
  error: { message: string; code?: string },
) {
  if (error.code === 'PGRST116') return new Error(staleMessage)
  if (error.code === '42P01' || error.code === 'PGRST205')
    return new Error(
      'The wardrobe tables are missing. Apply the wardrobe SQL migration to this Supabase project.',
    )
  if (error.code === '42501')
    return new Error(
      'Supabase denied access. Check your session and the migration’s grants and ownership policies.',
    )
  return new Error(`${operation} failed. ${error.message}`)
}

export function createCloudRepository(
  client: SupabaseClient,
  ownerId: string,
): WardrobeRepository {
  let snapshot: Wardrobe | null = null
  const itemVersions = new Map<string, string>()
  const outfitVersions = new Map<string, string>()
  let reloadRequired = false
  let warning = ''
  const pendingCleanup = new Set<string>()
  const storage = client.storage.from(bucket)

  async function assertOwner() {
    const { data, error } = await client.auth.getSession()
    if (error || data.session?.user.id !== ownerId)
      throw new Error(
        'Your account changed. Reload and sign in again before saving.',
      )
  }

  async function readRows<T>(table: string): Promise<T[]> {
    const result: T[] = []
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client
        .from(table)
        .select('*')
        .eq('owner_id', ownerId)
        .order('id')
        .range(offset, offset + pageSize - 1)
      if (error) throw cloudError('Loading your wardrobe', error)
      result.push(...(data as T[]))
      if (data.length < pageSize) return result
    }
  }

  async function signPhotos(value: Wardrobe): Promise<Wardrobe> {
    if (!value.items.length) return value
    const images = new Map<string, string>()
    // Batch signed URLs to keep requests bounded for a larger closet.
    for (let offset = 0; offset < value.items.length; offset += pageSize) {
      const paths = value.items
        .slice(offset, offset + pageSize)
        .map((item) => item.storagePath!)
      const { data, error } = await storage.createSignedUrls(
        paths,
        photoLifetime,
      )
      if (error) throw cloudError('Opening private photos', error)
      for (const photo of data ?? []) {
        if (photo.path && photo.signedUrl && !photo.error)
          images.set(photo.path, photo.signedUrl)
      }
    }
    // Missing photos do not hide otherwise usable wardrobe records.
    return {
      ...value,
      items: value.items.map((item) => ({
        ...item,
        image: images.get(item.storagePath!) ?? '',
      })),
    }
  }

  async function cleanPhotos(paths: string[]) {
    if (!paths.length) return
    for (const path of paths) pendingCleanup.add(path)
    try {
      const { error } = await storage.remove(paths)
      if (error) throw error
      for (const path of paths) pendingCleanup.delete(path)
    } catch {
      warning =
        'Your wardrobe was saved, but an unused photo could not be removed. Retry photo cleanup in Settings before closing this page.'
    }
  }

  function itemFromRow(row: ItemRow, image = ''): ClothingItem {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      color: row.color,
      subcategory: row.subcategory ?? undefined,
      tags: row.tags,
      image,
      storagePath: row.storage_path,
      isShareable: row.is_shareable ?? false,
      createdAt: row.created_at,
    }
  }

  return {
    mode: 'cloud',
    getWarning: () => warning,
    async load() {
      await assertOwner()
      const [items, outfits] = await Promise.all([
        readRows<ItemRow>('clothing_items'),
        readRows<OutfitRow>('outfits'),
      ])
      const value = await signPhotos({
        version: 1,
        revision: 0,
        items: items.map((row) => itemFromRow(row)),
        outfits: outfits.map((row) => ({
          id: row.id,
          name: row.name,
          topItemId: row.top_item_id,
          bottomItemId: row.bottom_item_id,
          createdAt: row.created_at,
        })),
      })
      itemVersions.clear()
      outfitVersions.clear()
      items.forEach((row) => itemVersions.set(row.id, row.updated_at))
      outfits.forEach((row) => outfitVersions.set(row.id, row.updated_at))
      snapshot = value
      reloadRequired = false
      return value
    },
    async refreshPhotos(value) {
      await assertOwner()
      warning = ''
      await cleanPhotos([...pendingCleanup])
      const refreshed = await signPhotos(value)
      if (snapshot)
        snapshot = {
          ...snapshot,
          items: snapshot.items.map((item) => ({
            ...item,
            image:
              refreshed.items.find((entry) => entry.id === item.id)?.image ??
              item.image,
          })),
        }
      return refreshed
    },
    async save(value) {
      await assertOwner()
      if (!snapshot || reloadRequired) throw new Error(staleMessage)
      const previous = snapshot
      if (value.revision !== previous.revision + 1)
        throw new Error(staleMessage)
      const changedItems = value.items.filter(
        (item) =>
          JSON.stringify(item) !==
          JSON.stringify(previous.items.find((entry) => entry.id === item.id)),
      )
      const deletedItems = previous.items.filter(
        (item) => !value.items.some((entry) => entry.id === item.id),
      )
      const changedOutfits = value.outfits.filter(
        (outfit) =>
          JSON.stringify(outfit) !==
          JSON.stringify(
            previous.outfits.find((entry) => entry.id === outfit.id),
          ),
      )
      const deletedOutfits = previous.outfits.filter(
        (outfit) => !value.outfits.some((entry) => entry.id === outfit.id),
      )
      const item = changedItems[0]
      const deleted = deletedItems[0]
      const outfit = changedOutfits[0]
      const removedOutfit = deletedOutfits[0]
      const deletingPiece =
        deletedItems.length === 1 &&
        !changedItems.length &&
        !changedOutfits.length &&
        deletedOutfits.every(
          (entry) =>
            entry.topItemId === deleted.id || entry.bottomItemId === deleted.id,
        )
      const writingPiece =
        changedItems.length === 1 &&
        !deletedItems.length &&
        !changedOutfits.length &&
        !deletedOutfits.length
      const writingOutfit =
        changedOutfits.length === 1 &&
        !changedItems.length &&
        !deletedItems.length &&
        !deletedOutfits.length
      const deletingOutfit =
        deletedOutfits.length === 1 &&
        !changedItems.length &&
        !deletedItems.length &&
        !changedOutfits.length
      if (!(deletingPiece || writingPiece || writingOutfit || deletingOutfit))
        throw new Error('Save one change at a time.')

      warning = ''
      let saved = value
      let uploadedPath: string | undefined
      // Once a database request starts, a transport failure can leave an
      // uncertain result. Require a reload instead of blindly retrying a write.
      let databaseStarted = false
      try {
        if (writingPiece) {
          const old = previous.items.find((entry) => entry.id === item.id)
          validateItem(item)
          let path = old?.storagePath
          if (
            item.image.startsWith('data:image/jpeg;base64,') &&
            (!old?.storagePath || item.image !== old.image)
          ) {
            const bytes = Uint8Array.from(
              atob(item.image.split(',')[1]),
              (char) => char.charCodeAt(0),
            )
            if (bytes.length > 600000)
              throw new Error(
                'The compressed photo is too large. Choose a smaller image.',
              )
            uploadedPath = `${ownerId}/${crypto.randomUUID()}.jpg`
            const { error } = await storage.upload(
              uploadedPath,
              new Blob([bytes], { type: 'image/jpeg' }),
              { contentType: 'image/jpeg', cacheControl: '0', upsert: false },
            )
            if (error) throw cloudError('Uploading your photo', error)
            path = uploadedPath
          } else if (!old || item.storagePath !== old.storagePath) {
            throw new Error('Choose a photo before saving this piece.')
          }
          const row = {
            id: item.id,
            owner_id: ownerId,
            name: item.name,
            category: item.category,
            subcategory: item.subcategory ?? null,
            color: item.color,
            tags: item.tags ?? [],
            storage_path: path,
            is_shareable: item.isShareable ?? false,
          }
          databaseStarted = true
          const query = old
            ? client
                .from('clothing_items')
                .update(row)
                .eq('id', item.id)
                .eq('owner_id', ownerId)
                .eq('updated_at', itemVersions.get(item.id)!)
            : client.from('clothing_items').insert(row)
          const { data, error } = await query.select().single<ItemRow>()
          if (error) throw cloudError('Saving this piece', error)
          itemVersions.set(item.id, data.updated_at)
          // Use the data URL immediately; refreshPhotos replaces it with a signed URL.
          saved = {
            ...value,
            items: value.items.map((entry) =>
              entry.id === item.id
                ? itemFromRow(data, uploadedPath ? item.image : old!.image)
                : entry,
            ),
          }
          if (old?.storagePath && uploadedPath)
            await cleanPhotos([old.storagePath])
        } else if (deletingPiece) {
          databaseStarted = true
          const { error } = await client
            .from('clothing_items')
            .delete()
            .eq('id', deleted.id)
            .eq('owner_id', ownerId)
            .eq('updated_at', itemVersions.get(deleted.id)!)
            .select('id')
            .single()
          if (error) throw cloudError('Deleting this piece', error)
          itemVersions.delete(deleted.id)
          if (deleted.storagePath) await cleanPhotos([deleted.storagePath])
        } else if (writingOutfit) {
          if (previous.outfits.some((entry) => entry.id === outfit.id))
            throw new Error('Outfit editing is not supported yet.')
          const top = value.items.find((entry) => entry.id === outfit.topItemId)
          databaseStarted = true
          const { data, error } = await client
            .from('outfits')
            .insert({
              id: outfit.id,
              owner_id: ownerId,
              name: outfit.name,
              top_item_id: outfit.topItemId,
              top_category: top?.category,
              bottom_item_id: outfit.bottomItemId,
            })
            .select()
            .single<OutfitRow>()
          if (error) throw cloudError('Saving this outfit', error)
          outfitVersions.set(data.id, data.updated_at)
        } else {
          databaseStarted = true
          const { error } = await client
            .from('outfits')
            .delete()
            .eq('id', removedOutfit.id)
            .eq('owner_id', ownerId)
            .eq('updated_at', outfitVersions.get(removedOutfit.id)!)
            .select('id')
            .single()
          if (error) throw cloudError('Deleting this outfit', error)
          outfitVersions.delete(removedOutfit.id)
        }
        snapshot = saved
        return saved
      } catch (error) {
        if (databaseStarted) reloadRequired = true
        // Never delete the newly uploaded file after an uncertain database write:
        // its row may have committed even if the response was lost.
        if (uploadedPath)
          warning =
            'An uploaded photo may be unused. Check Storage before removing files; a failed response can still mean the database saved.'
        const message =
          error instanceof Error ? error.message : 'Cloud save failed.'
        throw new Error(
          databaseStarted
            ? `${message} Reload before retrying so the app can confirm what was saved.`
            : message,
          { cause: error },
        )
      }
    },
  }
}
