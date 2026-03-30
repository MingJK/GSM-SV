"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  Terminal,
  MoreHorizontal,
  Server,
  Trash2,
  Loader2,
  CalendarPlus,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { controlVm, deleteVm, extendVm } from "@/lib/api"
import { useNotifications } from "@/lib/notification-context"
import type { Instance, InstanceStatus } from "@/lib/types"

const statusConfig: Record<
  InstanceStatus,
  { label: string; className: string; dotClassName: string }
> = {
  running: {
    label: "실행 중",
    className: "bg-[var(--status-active-bg)] text-[var(--status-active-fg)]",
    dotClassName: "bg-[var(--status-active-dot)]",
  },
  stopped: {
    label: "중지됨",
    className: "bg-[var(--status-stopped-bg)] text-[var(--status-stopped-fg)]",
    dotClassName: "bg-[var(--status-stopped-dot)]",
  },
  pending: {
    label: "대기 중",
    className: "bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]",
    dotClassName: "bg-[var(--status-pending-dot)]",
  },
  error: {
    label: "오류",
    className: "bg-[var(--status-error-bg)] text-[var(--status-error-fg)]",
    dotClassName: "bg-[var(--status-error-dot)]",
  },
}

export function InstanceHeader({ instance }: { instance: Instance }) {
  const router = useRouter()
  const config = statusConfig[instance.status] || statusConfig.stopped
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState("")
  const { addNotification } = useNotifications()

  const isProvisioning = !!instance.provisioning

  // 만료일 관련 계산
  const expiresAt = instance.expires_at ? new Date(instance.expires_at) : null
  const daysUntilExpiry = expiresAt
    ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const canExtend = daysUntilExpiry !== null && daysUntilExpiry <= 15

  const handleExtend = async () => {
    setActionLoading(true)
    try {
      const res = await extendVm(instance.node, instance.vmid)
      addNotification("success", res.message)
      setTimeout(() => window.location.reload(), 1000)
    } catch (e: any) {
      addNotification("error", e.message || "연장 실패")
    } finally {
      setActionLoading(false)
    }
  }

  const handleAction = async (action: string) => {
    setActionLoading(true)
    try {
      await controlVm(instance.node, instance.vmid, action)
      // 페이지 새로고침으로 상태 갱신
      setTimeout(() => window.location.reload(), 2000)
    } catch {
      // 에러 처리
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    setDeleteOpen(false)
    try {
      await deleteVm(instance.node, instance.vmid)
      router.push("/instances")
    } catch {
      setActionLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/instances"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        인스턴스 목록으로 돌아가기
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
            <Server className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {instance.name}
              </h1>
              <Badge
                variant="secondary"
                className={cn(
                  "gap-1.5 border-0 font-semibold uppercase tracking-wide",
                  config.className
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    config.dotClassName,
                    instance.status === "running" && "animate-pulse"
                  )}
                />
                {config.label}
              </Badge>
              {instance.provisioning && (
                <Badge variant="outline" className="gap-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  설정 중...
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              VMID: {instance.vmid} &middot; {instance.node} &middot; {instance.os}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {expiresAt && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={actionLoading || !canExtend || isProvisioning}
              onClick={handleExtend}
              title={isProvisioning ? "초기 설정 중에는 사용할 수 없습니다" : canExtend ? "30일 연장" : `만료 15일 전부터 연장 가능 (${daysUntilExpiry}일 남음)`}
            >
              <CalendarPlus className="h-4 w-4" />
              연장
            </Button>
          )}
          {instance.status === "stopped" ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={actionLoading || isProvisioning}
              onClick={() => handleAction("start")}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              시작
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={actionLoading || isProvisioning}
              onClick={() => handleAction("shutdown")}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              중지
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={actionLoading || isProvisioning}
            onClick={() => handleAction("reboot")}
          >
            <RotateCcw className="h-4 w-4" />
            재시작
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9" disabled={isProvisioning}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>스냅샷 생성</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive"
                onClick={(e) => { e.preventDefault(); setDeleteOpen(true) }}
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteConfirmName("") }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>인스턴스 삭제</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    <span><strong>{instance.name}</strong> (VMID {instance.vmid})을(를) 삭제하시겠습니까?</span>
                    <br />
                    <span className="text-destructive font-medium">⚠ 이 작업은 되돌릴 수 없으며, 모든 데이터가 영구 삭제됩니다.</span>
                    <div className="mt-4">
                      <p className="text-sm font-bold text-foreground">삭제하려면 인스턴스 이름을 입력해주세요.</p>
                      <input
                        type="text"
                        value={deleteConfirmName}
                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                        placeholder={instance.name}
                        className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmName("")}>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteConfirmName !== instance.name}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none"
                >
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
