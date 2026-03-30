"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  MoreHorizontal,
  Play,
  Square,
  RotateCcw,
  ExternalLink,
  Trash2,
  Server,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getMyVms, controlVm, deleteVm, type VmInfo } from "@/lib/api"
import { useNotifications } from "@/lib/notification-context"

type InstanceStatus = "running" | "stopped" | "pending" | "error"

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

function StatusBadge({ status }: { status: InstanceStatus }) {
  const config = statusConfig[status] || statusConfig.stopped
  return (
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
          status === "running" && "animate-pulse"
        )}
      />
      {config.label}
    </Badge>
  )
}

function formatUptime(seconds?: number): string {
  if (!seconds || seconds <= 0) return "-"
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "-"
  const gb = bytes / (1024 * 1024 * 1024)
  return gb >= 1 ? `${gb.toFixed(0)} GB` : `${(gb * 1024).toFixed(0)} MB`
}

export function InstancesTable() {
  const [vms, setVms] = useState<VmInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VmInfo | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState("")
  const { addNotification } = useNotifications()

  const [expireAlerted, setExpireAlerted] = useState<Set<number>>(new Set())

  const fetchVms = useCallback(async () => {
    try {
      const data = await getMyVms()
      setVms(data)

      // 만료 15일 이내 VM 알림
      for (const vm of data) {
        if (vm.expires_at && !expireAlerted.has(vm.vmid)) {
          const days = Math.ceil(
            (new Date(vm.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
          if (days <= 15 && days > 0) {
            addNotification("error", `${vm.name}: 만료까지 ${days}일 남았습니다. 연장해주세요.`)
            setExpireAlerted((prev) => new Set(prev).add(vm.vmid))
          }
        }
      }
    } catch {
      // 에러는 api.ts에서 처리 (401 → 리다이렉트)
    } finally {
      setLoading(false)
    }
  }, [expireAlerted, addNotification])

  useEffect(() => {
    fetchVms()
    // 15초마다 갱신
    const interval = setInterval(fetchVms, 15000)
    return () => clearInterval(interval)
  }, [fetchVms])

  const handleAction = async (vm: VmInfo, action: string) => {
    const key = `${vm.node}-${vm.vmid}`
    setActionLoading(key)
    try {
      await controlVm(vm.node, vm.vmid, action)
      // 약간의 딜레이 후 갱신
      setTimeout(fetchVms, 1500)
    } catch {
      // toast 등으로 에러 표시 가능
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (vm: VmInfo) => {
    setDeleteTarget(null)
    setActionLoading(`${vm.node}-${vm.vmid}`)
    try {
      await deleteVm(vm.node, vm.vmid)
      setVms((prev) => prev.filter((v) => v.vmid !== vm.vmid))
      addNotification("success", `VM ${vm.name}이(가) 삭제되었습니다.`)
    } catch {
      addNotification("error", `VM ${vm.name} 삭제에 실패했습니다.`)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (vms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Server className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">인스턴스가 없습니다</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          새 인스턴스를 생성해보세요.
        </p>
        <Button asChild>
          <Link href="/deploy">인스턴스 생성</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {vms.map((vm) => {
        const status = (vm.status || "stopped") as InstanceStatus
        const key = `${vm.node}-${vm.vmid}`
        const isActioning = actionLoading === key

        return (
          <Card key={key} className="group overflow-hidden border-border bg-card hover:border-primary/50 transition-none">
            <CardHeader className="p-6 pb-0">
              <div className="flex items-start justify-between">
                <Link
                  href={`/instances/${vm.vmid}?node=${vm.node}`}
                  className="flex items-center gap-4 group/link"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary group-hover:bg-primary/10 transition-colors">
                    <Server className="h-7 w-7 text-muted-foreground group-hover/link:text-primary transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight group-hover/link:text-primary transition-colors">
                      {vm.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      VMID: {vm.vmid} &middot; {vm.node}
                    </p>
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10" disabled={isActioning}>
                      {isActioning ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-5 w-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={`/instances/${vm.vmid}?node=${vm.node}`} className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        상세 보기
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {status === "stopped" ? (
                      <DropdownMenuItem className="gap-2" onClick={() => handleAction(vm, "start")}>
                        <Play className="h-4 w-4" />
                        시작
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="gap-2" onClick={() => handleAction(vm, "shutdown")}>
                        <Square className="h-4 w-4" />
                        중지
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="gap-2" onClick={() => handleAction(vm, "reboot")}>
                      <RotateCcw className="h-4 w-4" />
                      재시작
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 text-destructive" onClick={(e) => { e.preventDefault(); setDeleteTarget(vm) }}>
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="p-6 py-8">
              <div className="mb-8 flex items-center gap-2">
                <StatusBadge status={status} />
                {vm.provisioning && (
                  <Badge variant="outline" className="gap-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    설정 중
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground">CPU</p>
                  <p className="text-lg font-mono font-medium">
                    {vm.cpu_usage !== undefined ? `${(vm.cpu_usage * 100).toFixed(1)}%` : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground">메모리</p>
                  <p className="text-lg font-mono font-medium">
                    {vm.mem_usage !== undefined && vm.maxmem ? `${((vm.mem_usage / vm.maxmem) * 100).toFixed(1)}%` : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground">디스크</p>
                  <p className="text-lg font-mono font-medium">{formatBytes(vm.maxdisk)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground">가동 시간</p>
                  <p className="text-sm font-medium">{formatUptime(vm.uptime)}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-end">
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                  <Link href={`/instances/${vm.vmid}?node=${vm.node}`}>관리</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmName("") } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>인스턴스 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span><strong>{deleteTarget?.name}</strong> (VMID {deleteTarget?.vmid})을(를) 삭제하시겠습니까?</span>
                <br />
                <span className="text-destructive font-medium">⚠ 이 작업은 되돌릴 수 없으며, 모든 데이터가 영구 삭제됩니다.</span>
                <div className="mt-4">
                  <p className="text-sm font-bold text-foreground">삭제하려면 인스턴스 이름을 입력해주세요.</p>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={deleteTarget?.name}
                    className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmName("")}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={deleteConfirmName !== deleteTarget?.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
