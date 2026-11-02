import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  GALLERY_BUCKET,
  GALLERY_LIMIT,
  GALLERY_MAX_BYTES,
  GALLERY_TTL,
  PROMPT_ANSWER_MAX,
  PROMPT_SLOTS,
  toJpeg,
  trustErrorText,
  type GalleryPhoto,
  type ProfileExtras,
  type PromptAnswer,
} from '../lib/trust'
import type { TrustApi } from './context'

const EXTRAS_COLUMNS = 'user_id, prompts, photo_checked, photo_checked_at, photo_check_requested_at'

type GalleryRow = { id: string; path: string }

function cleanPrompts(prompts: PromptAnswer[]): PromptAnswer[] {
  return prompts
    .map((p) => ({ q: p.q, a: p.a.trim().slice(0, PROMPT_ANSWER_MAX) }))
    .filter((p) => p.a.length > 0)
    .slice(0, PROMPT_SLOTS)
}

/**
 * "Ask me about" prompts, the photo-check badge and the friends-only photo gallery.
 * Who can see what is decided by the database rules in supabase/trust_gallery.sql.
 */
export function useTrust(uid: string | undefined): TrustApi {
  const [extras, setExtras] = useState<ProfileExtras[]>([])

  const reloadExtras = useCallback(async () => {
    if (!uid) {
      setExtras([])
      return
    }
    // Everyone signed in can read these rows (like a bio), so one request covers all members.
    const { data, error } = await supabase.from('profile_extras').select(EXTRAS_COLUMNS).limit(1000)
    if (!error) setExtras((data ?? []) as ProfileExtras[])
  }, [uid])

  useEffect(() => {
    void reloadExtras()
  }, [reloadExtras])

  const extrasMap = useMemo(() => new Map(extras.map((e) => [e.user_id, e])), [extras])
  const extrasOf = useCallback((id: string) => extrasMap.get(id), [extrasMap])
  const myExtras = uid ? extrasMap.get(uid) : undefined

  const mergeMine = useCallback(
    (patch: Partial<ProfileExtras>) => {
      if (!uid) return
      setExtras((current) => {
        const existing = current.find((e) => e.user_id === uid)
        const next: ProfileExtras = {
          user_id: uid,
          prompts: [],
          photo_checked: false,
          photo_checked_at: null,
          photo_check_requested_at: null,
          ...existing,
          ...patch,
        }
        return [...current.filter((e) => e.user_id !== uid), next]
      })
    },
    [uid],
  )

  const savePrompts = useCallback(
    async (prompts: PromptAnswer[]) => {
      if (!uid) return 'Please sign in again.'
      const cleaned = cleanPrompts(prompts)
      const { error } = await supabase
        .from('profile_extras')
        .upsert(
          { user_id: uid, prompts: cleaned, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
      if (error) return trustErrorText(error)
      mergeMine({ prompts: cleaned })
      return null
    },
    [uid, mergeMine],
  )

  const requestPhotoCheck = useCallback(async () => {
    if (!uid) return 'Please sign in again.'
    const stamp = new Date().toISOString()
    const { error } = await supabase
      .from('profile_extras')
      .upsert({ user_id: uid, photo_check_requested_at: stamp, updated_at: stamp }, { onConflict: 'user_id' })
    if (error) return trustErrorText(error)
    mergeMine({ photo_check_requested_at: stamp })
    return null
  }, [uid, mergeMine])

  const loadGallery = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profile_photos')
      .select('id, path')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) return { photos: [] as GalleryPhoto[], error: trustErrorText(error) }

    const rows = (data ?? []) as GalleryRow[]
    if (rows.length === 0) return { photos: [] as GalleryPhoto[], error: '' }

    const { data: signed, error: signError } = await supabase.storage
      .from(GALLERY_BUCKET)
      .createSignedUrls(
        rows.map((r) => r.path),
        GALLERY_TTL,
      )
    if (signError) return { photos: [] as GalleryPhoto[], error: trustErrorText(signError) }

    const urls = new Map<string, string>()
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl)
    }
    const photos = rows.flatMap((r) => {
      const url = urls.get(r.path)
      return url ? [{ id: r.id, path: r.path, url }] : []
    })
    return { photos, error: '' }
  }, [])

  const addGalleryPhoto = useCallback(
    async (file: File) => {
      if (!uid) return 'Please sign in again.'
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return 'Please choose a JPG, PNG or WebP image.'
      }
      if (file.size > 25 * 1024 * 1024) return 'That photo is too large. Please choose one under 25 MB.'

      const { count, error: countError } = await supabase
        .from('profile_photos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
      if (countError) return trustErrorText(countError)
      if ((count ?? 0) >= GALLERY_LIMIT) return `You can have up to ${GALLERY_LIMIT} photos. Remove one to add another.`

      const blob = await toJpeg(file)
      if (blob.size > GALLERY_MAX_BYTES) return 'That photo is still over 5 MB. Please choose a smaller one.'

      const path = `${uid}/${crypto.randomUUID()}.jpg`
      const { error: uploadError } = await supabase.storage.from(GALLERY_BUCKET).upload(path, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: blob.type || 'image/jpeg',
      })
      if (uploadError) return trustErrorText(uploadError)

      const { error: insertError } = await supabase
        .from('profile_photos')
        .insert({ user_id: uid, path, position: count ?? 0 })
      if (insertError) {
        await supabase.storage.from(GALLERY_BUCKET).remove([path])
        return trustErrorText(insertError)
      }
      return null
    },
    [uid],
  )

  const removeGalleryPhoto = useCallback(async (photo: GalleryPhoto) => {
    const { error } = await supabase.from('profile_photos').delete().eq('id', photo.id)
    if (error) return trustErrorText(error)
    await supabase.storage.from(GALLERY_BUCKET).remove([photo.path])
    return null
  }, [])

  return {
    myExtras,
    extrasOf,
    savePrompts,
    requestPhotoCheck,
    loadGallery,
    addGalleryPhoto,
    removeGalleryPhoto,
  }
}
