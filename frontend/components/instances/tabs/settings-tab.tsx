"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
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
import { Settings, Cpu, MemoryStick, Loader2, DatabaseBackup, Camera, RotateCcw, Trash2, Plus } from "lucide-react"
import { resizeVm, getSnapshots, createSnapshot, rollbackSnapshot, deleteSnapshot, getAutoSnapshot, toggleAutoSnapshot, type SnapshotInfo } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useNotifications } from "@/lib/notification-context"
import type { Instance } from "@/lib/types"

export function SettingsTab({ instance }: { instance: Instance }) {
  const { user } = useAuth()
  const isPrivileged = user?.role === "admin" || user?.role === "project_owner"

  // 프리셋 값
  const corePresets = [2, 4, 6, 8]
  const memoryPresets = [2048, 4096, 8192, 12288, 16384, 20480, 24576, 28672, 32768] // 2~32 GB

  // 현재 값 파싱
  const currentCores = parseInt(instance.cpu?.split("코어")?.[0]) || parseInt(instance.cpu) || 2
  const currentMemoryMb = instance.maxmem ? Math.round(instance.maxmem / 1024 / 1024) : 2048

  // 프리셋 인덱스로 변환
  const findClosestIndex = (val: number, presets: number[]) =>
    presets.reduce((best, v, i) => (Math.abs(v - val) < Math.abs(presets[best] - val) ? i : best), 0)

  const [coreIdx, setCoreIdx] = useState(findClosestIndex(currentCores, corePresets))
  const [memIdx, setMemIdx] = useState(findClosestIndex(currentMemoryMb, memoryPresets))

  const cores = corePresets[coreIdx]
  const memoryMb = memoryPresets[memIdx]
  const [loading, setLoading] = useState(false)
  const [applied, setApplied] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const hasChanges = !applied && (corePresets[coreIdx] !== currentCores || memoryPresets[memIdx] !== currentMemoryMb)

  const handleResize = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const params: { cores?: number; memory?: number } = {}
      if (cores !== currentCores) params.cores = cores
      if (memoryMb !== currentMemoryMb) params.memory = memoryMb

      await resizeVm(instance.node, instance.vmid, params)
      setApplied(true)
      setMessage({ type: "success", text: "사양이 변경되었습니다." })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "사양 변경에 실패했습니다."
      setMessage({ type: "error", text: msg })
    } finally {
      setLoading(false)
    }
  }

  const memoryGb = (memoryMb / 1024).toFixed(1)

  // ── 자동 스냅샷 ────────────────────────────────────────
  const [autoSnapEnabled, setAutoSnapEnabled] = useState(false)
  const [autoSnapLoading, setAutoSnapLoading] = useState(false)

  useEffect(() => {
    getAutoSnapshot(instance.node, instance.vmid)
      .then((res) => setAutoSnapEnabled(res.enabled))
      .catch(() => {})
  }, [instance.node, instance.vmid])

  const handleAutoSnapToggle = async () => {
    setAutoSnapLoading(true)
    try {
      const res = await toggleAutoSnapshot(instance.node, instance.vmid)
      setAutoSnapEnabled(res.enabled)
    } catch { /* ignore */ }
    finally { setAutoSnapLoading(false) }
  }

  // ── 스냅샷 ──────────────────────────────────────────────
  const { addNotification } = useNotifications()
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const [snapLoading, setSnapLoading] = useState(true)
  const [snapActionLoading, setSnapActionLoading] = useState(false)
  const [newSnapName, setNewSnapName] = useState("")
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null)
  const [deleteSnapTarget, setDeleteSnapTarget] = useState<string | null>(null)

  const fetchSnapshots = useCallback(async () => {
    try {
      const data = await getSnapshots(instance.node, instance.vmid)
      setSnapshots(data)
    } catch {
      // ignore
    } finally {
      setSnapLoading(false)
    }
  }, [instance.node, instance.vmid])

  useEffect(() => {
    fetchSnapshots()
  }, [fetchSnapshots])

  const handleCreateSnap = async () => {
    if (!newSnapName.trim()) return
    setSnapActionLoading(true)
    try {
      await createSnapshot(instance.node, instance.vmid, newSnapName.trim())
      addNotification("success", `스냅샷 '${newSnapName.trim()}'이(가) 생성되었습니다.`)
      setNewSnapName("")
      setShowCreateInput(false)
      setTimeout(fetchSnapshots, 2000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "스냅샷 생성에 실패했습니다."
      addNotification("error", msg)
    } finally {
      setSnapActionLoading(false)
    }
  }

  const handleRollback = async (snapname: string) => {
    setRollbackTarget(null)
    setSnapActionLoading(true)
    try {
      await rollbackSnapshot(instance.node, instance.vmid, snapname)
      addNotification("success", `스냅샷 '${snapname}'으로 복원되었습니다.`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "복원에 실패했습니다."
      addNotification("error", msg)
    } finally {
      setSnapActionLoading(false)
    }
  }

  const handleDeleteSnap = async (snapname: string) => {
    setDeleteSnapTarget(null)
    setSnapActionLoading(true)
    try {
      await deleteSnapshot(instance.node, instance.vmid, snapname)
      addNotification("success", `스냅샷 '${snapname}'이(가) 삭제되었습니다.`)
      setTimeout(fetchSnapshots, 2000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "스냅샷 삭제에 실패했습니다."
      addNotification("error", msg)
    } finally {
      setSnapActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 스냅샷 관리 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Camera className="h-4 w-4" />
                스냅샷
              </CardTitle>
              <CardDescription className="mt-1.5">
                현재 상태를 저장하고 필요할 때 복원할 수 있습니다. (최대 3개)
              </CardDescription>
            </div>
            {(() => {
              const manualSnaps = snapshots.filter((s) => !s.name.startsWith("auto-daily"))
              return (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={snapActionLoading || manualSnaps.length >= 2}
                  onClick={() => setShowCreateInput(true)}
                >
                  <Plus className="h-4 w-4" />
                  생성 ({manualSnaps.length}/2)
                </Button>
              )
            })()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 자동 스냅샷 토글 */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-secondary/30">
            <div className="space-y-0.5">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <DatabaseBackup className="h-3.5 w-3.5" />
                매일 자동 스냅샷
              </p>
              <p className="text-xs text-muted-foreground">
                매일 00:10(KST) 자동 생성 · 00:00 이전 자동 스냅샷 삭제
              </p>
            </div>
            <Switch
              checked={autoSnapEnabled}
              onCheckedChange={handleAutoSnapToggle}
              disabled={autoSnapLoading}
            />
          </div>

          {/* 생성 입력 */}
          {showCreateInput && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30">
              <input
                type="text"
                value={newSnapName}
                onChange={(e) => setNewSnapName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateSnap(); if (e.key === "Escape") { setShowCreateInput(false); setNewSnapName("") } }}
                placeholder="스냅샷 이름 입력..."
                maxLength={40}
                autoFocus
                className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button size="sm" onClick={handleCreateSnap} disabled={!newSnapName.trim() || snapActionLoading}>
                {snapActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "저장"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowCreateInput(false); setNewSnapName("") }}>
                취소
              </Button>
            </div>
          )}

          {/* 스냅샷 목록 */}
          {snapLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              생성된 스냅샷이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map((snap) => {
                const isAuto = snap.name.startsWith("auto-daily")
                return (
                  <div
                    key={snap.name}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{snap.name}</p>
                        {isAuto && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            자동
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {snap.snaptime
                          ? new Date(snap.snaptime * 1000).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="이 스냅샷으로 복원"
                        disabled={snapActionLoading}
                        onClick={() => setRollbackTarget(snap.name)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="스냅샷 삭제"
                        disabled={snapActionLoading}
                        onClick={() => setDeleteSnapTarget(snap.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 스냅샷 복원 확인 */}
      <AlertDialog open={!!rollbackTarget} onOpenChange={(open) => !open && setRollbackTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>스냅샷 복원</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{rollbackTarget}</strong> 스냅샷으로 복원하시겠습니까?
              <br />
              <span className="text-destructive font-medium">⚠ 현재 상태의 저장되지 않은 데이터가 유실될 수 있습니다.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => rollbackTarget && handleRollback(rollbackTarget)}>
              복원
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 스냅샷 삭제 확인 */}
      <AlertDialog open={!!deleteSnapTarget} onOpenChange={(open) => !open && setDeleteSnapTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>스냅샷 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteSnapTarget}</strong> 스냅샷을 삭제하시겠습니까?
              <br />
              <span className="text-destructive font-medium">⚠ 삭제된 스냅샷은 복구할 수 없습니다.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSnapTarget && handleDeleteSnap(deleteSnapTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 리소스 핫플러그 — 프로젝트 오너/관리자만 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Settings className="h-4 w-4" />
            리소스 설정
          </CardTitle>
          <CardDescription>
            {isPrivileged
              ? "VM의 CPU와 메모리를 실시간으로 변경합니다. (핫플러그)"
              : "리소스 변경은 프로젝트 오너 또는 관리자만 가능합니다."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CPU */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">vCPU</span>
              </div>
              <span className="text-sm font-mono">{cores}코어</span>
            </div>
            <Slider
              value={[coreIdx]}
              onValueChange={(v) => setCoreIdx(v[0])}
              min={0}
              max={corePresets.length - 1}
              step={1}
              disabled={!isPrivileged || applied}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {corePresets.map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
          </div>

          {/* Memory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">메모리</span>
              </div>
              <span className="text-sm font-mono">{memoryGb} GB</span>
            </div>
            <Slider
              value={[memIdx]}
              onValueChange={(v) => setMemIdx(v[0])}
              min={0}
              max={memoryPresets.length - 1}
              step={1}
              disabled={!isPrivileged || applied}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground items-center">
              {memoryPresets.map((v) => {
                const gb = v / 1024
                const showLabel = [2, 8, 16, 24, 32].includes(gb)
                return showLabel
                  ? <span key={v}>{gb}</span>
                  : <span key={v} className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              })}
            </div>
          </div>

          {/* 적용 버튼 */}
          {isPrivileged && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleResize}
                disabled={!hasChanges || loading}
                className="gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                적용
              </Button>
              {message && (
                <p className={`text-sm ${message.type === "success" ? "text-green-500" : "text-red-500"}`}>
                  {message.text}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
