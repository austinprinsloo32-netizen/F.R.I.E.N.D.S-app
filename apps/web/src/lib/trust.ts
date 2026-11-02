import { isMissingTable } from './feed'
import type { Member } from './types'

export const GALLERY_LIMIT = 6
export const GALLERY_BUCKET = 'profile-gallery'
export const GALLERY_TTL = 3600
export const GALLERY_MAX_BYTES = 5 * 1024 * 1024

export const PROMPT_SLOTS = 3
export const PROMPT_ANSWER_MAX = 140
export const PROMPT_QUESTIONS = [
  'Ask me about…',
  'A perfect weekend looks like…',
  'I’m looking for friends who…',
  'Something I’m proud of…',
  'My go-to way to unwind…',
  'I could talk for hours about…',
  'A place I’d love to visit…',
  'The best advice I’ve had…',
]

export type PromptAnswer = { q: string; a: string }

export type ProfileExtras = {
  user_id: string
  prompts: PromptAnswer[]
  photo_checked: boolean
  photo_checked_at: string | null
  photo_check_requested_at: string | null
}

export type GalleryPhoto = { id: string; path: string; url: string }

/** True when name, photo, bio, location and at least 3 interests are filled in. */
export function isProfileComplete(member: Member): boolean {
  return (
    member.hasName &&
    Boolean(member.avatarUrl) &&
    member.bio.trim().length > 0 &&
    member.location.trim().length > 0 &&
    member.interests.length >= 3
  )
}

const SETUP_MESSAGE =
  'Photos and badges need a one-time database setup. Run supabase/trust_gallery.sql in the Supabase SQL Editor.'

export function trustErrorText(error: { code?: string; message?: string }): string {
  const message = error.message ?? ''
  if (
    isMissingTable(error) ||
    error.code === 'PGRST202' ||
    /bucket not found|could not find the function/i.test(message)
  ) {
    return SETUP_MESSAGE
  }
  return message || 'Something went wrong. Please try again.'
}

/**
 * Shrinks a photo to at most `maxSide` pixels and re-saves it as JPEG.
 * Besides saving space, this drops hidden metadata such as GPS location from the original.
 */
export async function toJpeg(file: File, maxSide = 1600, quality = 0.86): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    return blob ?? file
  } catch {
    return file
  }
}
