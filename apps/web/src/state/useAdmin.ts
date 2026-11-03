import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AdminData, AdminMetrics, AdminReport, PhotoRequest } from '../lib/admin'
import type { AdminApi } from './context'

function errorMessage(error: { message?: string } | null): string {
  return error?.message || 'Something went wrong. Please try again.'
}

/** Admin tools. The database only answers these calls for people listed in app_admins (supabase/admin.sql). */
export function useAdmin(uid: string | undefined): AdminApi {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true
    if (!uid) {
      setIsAdmin(false)
      return
    }
    void supabase.rpc('is_admin').then(({ data, error }) => {
      if (active) setIsAdmin(!error && data === true)
    })
    return () => {
      active = false
    }
  }, [uid])

  const loadAdmin = useCallback(async (): Promise<AdminData> => {
    const [metricsRes, reportsRes, photoRes] = await Promise.all([
      supabase.rpc('admin_metrics'),
      supabase.rpc('admin_reports'),
      supabase.rpc('admin_photo_requests'),
    ])
    const failed = metricsRes.error ?? reportsRes.error ?? photoRes.error
    if (failed) {
      const missing = /could not find the function|does not exist/i.test(failed.message ?? '')
      return {
        metrics: null,
        reports: [],
        photoRequests: [],
        error: missing
          ? 'The admin page needs a one-time database setup. Run supabase/admin.sql in the Supabase SQL Editor.'
          : errorMessage(failed),
      }
    }
    return {
      metrics: (metricsRes.data ?? null) as AdminMetrics | null,
      reports: (reportsRes.data ?? []) as AdminReport[],
      photoRequests: (photoRes.data ?? []) as PhotoRequest[],
      error: '',
    }
  }, [])

  const setReportStatus = useCallback(async (reportId: string, status: AdminReport['status']) => {
    const { error } = await supabase.rpc('admin_set_report_status', { report_id: reportId, new_status: status })
    return error ? errorMessage(error) : null
  }, [])

  const reviewPhoto = useCallback(async (targetId: string, approved: boolean) => {
    const { error } = await supabase.rpc('admin_review_photo', { target: targetId, approved })
    return error ? errorMessage(error) : null
  }, [])

  return { isAdmin, loadAdmin, setReportStatus, reviewPhoto }
}
