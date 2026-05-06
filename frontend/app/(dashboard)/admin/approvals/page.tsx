"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  getPendingApprovals,
  approveProjectOwner,
  rejectProjectOwner,
  type PendingApproval,
} from "@/lib/api"
import {
  Loader2,
  UserCheck,
  UserX,
  FolderKanban,
  Inbox,
} from "lucide-react"

export default function ApprovalsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [requests, setRequests] = useState<PendingApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    try {
      const data = await getPendingApprovals()
      setRequests(data)
    } catch {
      // 권한 없으면 리다이렉트
      router.push("/instances")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/instances")
      return
    }
    fetchRequests()
  }, [user, router, fetchRequests])

  const handleApprove = async (userId: number) => {
    if (actionLoading) return
    setActionLoading(userId)
    setActionError(null)
    try {
      await approveProjectOwner(userId)
      setRequests((prev) => prev.filter((r) => r.id !== userId))
    } catch {
      setActionError("승인 처리 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (userId: number) => {
    if (actionLoading) return
    if (!confirm("정말 거절하시겠습니까? 해당 계정이 삭제됩니다.")) return
    setActionLoading(userId)
    setActionError(null)
    try {
      await rejectProjectOwner(userId)
      setRequests((prev) => prev.filter((r) => r.id !== userId))
    } catch {
      setActionError("거절 처리 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">가입 승인 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          프로젝트 오너 가입 요청을 승인하거나 거절합니다.
        </p>
      </div>

      {actionError && (
        <p className="text-sm text-destructive">{actionError}</p>
      )}

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
            <Inbox className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">대기 중인 요청이 없습니다</p>
          <p className="text-sm text-muted-foreground mt-1">
            새로운 프로젝트 오너 가입 요청이 들어오면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="rounded-xl border border-border bg-card p-5 space-y-4"
            >
              {/* 헤더 */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {req.name || req.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{req.email}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  대기 중
                </span>
              </div>

              {/* 학생 정보 */}
              {(req.grade || req.major) && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {req.grade && req.class_num && req.number && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                      {req.grade}학년 {req.class_num}반 {req.number}번
                    </span>
                  )}
                  {req.major && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                      {req.major}
                    </span>
                  )}
                </div>
              )}

              {/* 프로젝트 정보 */}
              {req.project_name && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {req.project_name}
                  </div>
                  {req.project_reason && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {req.project_reason}
                    </p>
                  )}
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={actionLoading === req.id}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === req.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  승인
                </button>
                <button
                  onClick={() => handleReject(req.id)}
                  disabled={actionLoading === req.id}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors"
                >
                  <UserX className="h-3.5 w-3.5" />
                  거절
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
