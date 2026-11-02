import { supabase } from './supabase'

export const AVATAR_BUCKET = 'profile-photos'
export const AVATAR_TTL = 3600
const cache = new Map<string, { url: string; expires: number }>()

/** Resolve many private avatar paths to signed URLs in a single request. */
export async function resolveAvatars(
  paths: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const now = Date.now()
  const out: Record<string, string> = {}
  const missing: string[] = []

  for (const path of new Set(paths.filter((p): p is string => Boolean(p)))) {
    const hit = cache.get(path)
    if (hit && hit.expires > now) out[path] = hit.url
    else missing.push(path)
  }

  if (missing.length > 0) {
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrls(missing, AVATAR_TTL)

    if (!error && data) {
      for (const item of data) {
        if (item.path && item.signedUrl && !item.error) {
          cache.set(item.path, {
            url: item.signedUrl,
            expires: now + (AVATAR_TTL - 300) * 1000,
          })
          out[item.path] = item.signedUrl
        }
      }
    }
  }

  return out
}
