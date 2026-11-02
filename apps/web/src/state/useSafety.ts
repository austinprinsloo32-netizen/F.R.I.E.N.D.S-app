import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { safetyErrorText, type ReportInput } from '../lib/safety'
import type { SafetyApi } from './context'

/**
 * Blocking and reporting. The database does the real enforcement (see supabase/safety.sql);
 * this hook just calls it and keeps the list of people you've blocked.
 * `onChanged` reloads requests, inbox and feed after a block or unblock.
 */
export function useSafety(uid: string | undefined, onChanged: () => Promise<void>): SafetyApi {
  const [blockedIds, setBlockedIds] = useState<string[]>([])

  const reloadBlocks = useCallback(async () => {
    if (!uid) {
      setBlockedIds([])
      return
    }
    const { data, error } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', uid)
    if (!error) setBlockedIds((data ?? []).map((row: { blocked_id: string }) => row.blocked_id))
  }, [uid])

  useEffect(() => {
    void reloadBlocks()
  }, [reloadBlocks])

  const blockMember = useCallback(
    async (targetId: string) => {
      const { error } = await supabase.rpc('block_user', { target: targetId })
      if (error) return safetyErrorText(error)
      await reloadBlocks()
      await onChanged()
      return null
    },
    [reloadBlocks, onChanged],
  )

  const unblockMember = useCallback(
    async (targetId: string) => {
      if (!uid) return 'Please sign in again.'
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', uid)
        .eq('blocked_id', targetId)
      if (error) return safetyErrorText(error)
      await reloadBlocks()
      await onChanged()
      return null
    },
    [uid, reloadBlocks, onChanged],
  )

  const reportMember = useCallback(
    async (input: ReportInput) => {
      if (!uid) return 'Please sign in again.'
      const { error } = await supabase.from('reports').insert({
        reporter_id: uid,
        reported_id: input.reportedId,
        post_id: input.postId ?? null,
        reason: input.reason,
        details: input.details.trim(),
      })
      return error ? safetyErrorText(error) : null
    },
    [uid],
  )

  return { blockedIds, blockMember, unblockMember, reportMember }
}
