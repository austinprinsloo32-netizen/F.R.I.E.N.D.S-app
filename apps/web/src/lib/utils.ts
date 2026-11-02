import type { Member, MyProfile } from './types'

export function normalizeInterest(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return letters || 'F'
}

export function parseInterests(raw: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const part of raw.split(',')) {
    const clean = part.trim()
    const key = normalizeInterest(clean)
    if (clean && !seen.has(key)) {
      seen.add(key)
      result.push(clean)
    }
  }
  return result.slice(0, 20)
}

export function sharedInterests(mine: string[], theirs: string[]): string[] {
  const mySet = new Set(mine.map(normalizeInterest).filter(Boolean))
  const out: string[] = []
  const seen = new Set<string>()
  for (const interest of theirs) {
    const key = normalizeInterest(interest)
    if (key && mySet.has(key) && !seen.has(key)) {
      seen.add(key)
      out.push(interest.trim())
    }
  }
  return out
}

export function describeShared(shared: string[]): string {
  if (shared.length === 0) return ''
  if (shared.length === 1) return `You both like ${shared[0]}`
  if (shared.length === 2) return `You both like ${shared[0]} and ${shared[1]}`
  return `You both like ${shared[0]}, ${shared[1]} and ${shared.length - 2} more`
}

export function toMember(
  row: {
    id: string
    display_name: string | null
    bio: string | null
    location: string | null
    interests: string[] | null
  },
  avatarUrl?: string,
): Member {
  const name = row.display_name?.trim() ?? ''
  return {
    id: row.id,
    name: name || 'FRIENDS member',
    hasName: Boolean(name),
    location: row.location?.trim() ?? '',
    bio: row.bio?.trim() ?? '',
    interests: row.interests ?? [],
    initials: initialsOf(name || 'F'),
    avatarUrl,
  }
}

export function shortTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function dayLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Hello'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function hashHue(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360
  return h
}

export function profileChecks(profile: MyProfile): { label: string; done: boolean }[] {
  return [
    { label: 'Add your name', done: Boolean(profile.displayName.trim()) },
    { label: 'Upload a photo', done: Boolean(profile.avatarUrl) },
    { label: 'Write a short bio', done: Boolean(profile.bio.trim()) },
    { label: 'Set your location', done: Boolean(profile.location.trim()) },
    { label: 'Add at least 3 interests', done: profile.interests.length >= 3 },
  ]
}
