"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Globe, Copy, Check, Shield, Plus, Trash2, Loader2, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { Instance } from "@/lib/types"
import { type PortInfo, type VmPort, getCustomPorts, addCustomPort, deleteCustomPort } from "@/lib/api"

export function FirewallTab({
  instance,
  ports: _ports = [],
}: {
  instance: Instance
  ports?: PortInfo[]
}) {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [customPorts, setCustomPorts] = useState<VmPort[]>([])
  const [loading, setLoading] = useState(true)
  const [portsOpen, setPortsOpen] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [form, setForm] = useState({
    internal_port: "",
    protocol: "tcp",
    action: "ACCEPT",
    source: "",
    description: "",
  })

  const fetchPorts = useCallback(async () => {
    try {
      const data = await getCustomPorts(instance.vmid)
      setCustomPorts(data)
    } catch {
      // 조용히 실패
    } finally {
      setLoading(false)
    }
  }, [instance.vmid])

  useEffect(() => {
    fetchPorts()
  }, [fetchPorts])

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text)
    setTimeout(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    }, 100)
  }

  const handleAdd = async () => {
    const port = parseInt(form.internal_port)
    if (!port || port < 1 || port > 65535) return
    setSubmitting(true)
    try {
      await addCustomPort(instance.vmid, {
        internal_port: port,
        protocol: form.protocol,
        action: form.action,
        source: form.source || undefined,
        description: form.description || undefined,
      })
      setForm({ internal_port: "", protocol: "tcp", action: "ACCEPT", source: "", description: "" })
      setDialogOpen(false)
      await fetchPorts()
    } catch {
      // 에러는 조용히 처리 (추후 toast 연동 가능)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCustom = async (portId: number) => {
    setDeletingId(portId)
    try {
      await deleteCustomPort(instance.vmid, portId)
      await fetchPorts()
    } catch {
      // 조용히 실패
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 외부 접속 포트 — DB 기반으로 삭제/추가 즉시 반영 */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none flex flex-row items-center justify-between space-y-0"
          onClick={() => setPortsOpen((o) => !o)}
        >
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Globe className="h-4 w-4" />
              외부 접속 포트
            </CardTitle>
            <CardDescription className="mt-1">포트포워딩이 설정된 서비스 목록입니다.</CardDescription>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${portsOpen ? "rotate-180" : ""}`}
          />
        </CardHeader>

        {portsOpen && (
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : customPorts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                포트포워딩 정보가 없습니다.
              </p>
            ) : (
              customPorts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs text-muted-foreground font-medium">
                      {p.description || `포트 ${p.internal_port}`}
                    </p>
                    <p className="font-mono text-sm font-bold break-all">
                      ssh.gsmsv.site:{p.external_port}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopy(`ssh.gsmsv.site:${p.external_port}`, p.id)
                    }}
                  >
                    {copiedId === p.id
                      ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                      : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        )}
      </Card>

      {/* 방화벽 규칙 */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Shield className="h-4 w-4" />
              방화벽 규칙
            </CardTitle>
            <CardDescription className="mt-1">
              기본 포트는 0.0.0.0/0으로 허용됩니다. 추가 포트는 30000~39999에서 외부 포트가 랜덤 할당됩니다.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                <Plus className="h-3.5 w-3.5" />
                포트 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>포트 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>내부 포트 <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    placeholder="예: 443, 8080"
                    min={1}
                    max={65535}
                    value={form.internal_port}
                    onChange={(e) => setForm((f) => ({ ...f, internal_port: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>프로토콜</Label>
                    <Select
                      value={form.protocol}
                      onValueChange={(v) => setForm((f) => ({ ...f, protocol: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="udp">UDP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>액션</Label>
                    <Select
                      value={form.action}
                      onValueChange={(v) => setForm((f) => ({ ...f, action: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACCEPT">ACCEPT</SelectItem>
                        <SelectItem value="DROP">DROP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>출발지 IP <span className="text-muted-foreground text-xs">(선택, 기본 0.0.0.0/0)</span></Label>
                  <Input
                    placeholder="예: 192.168.1.0/24"
                    value={form.source}
                    onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>설명 <span className="text-muted-foreground text-xs">(선택)</span></Label>
                  <Input
                    placeholder="예: HTTPS, API 서버"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAdd}
                  disabled={submitting || !form.internal_port}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  추가
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : customPorts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              포트 규칙이 없습니다.
            </p>
          ) : (
            customPorts.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${
                  p.is_default
                    ? "bg-muted/30 border-border/40"
                    : "bg-muted/50 border-border/50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex items-center rounded-md text-xs font-medium px-2 py-0.5 ring-1 ring-inset ${
                    p.action === "DROP"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20"
                  }`}>
                    {p.action ?? "ACCEPT"}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase">{p.protocol}</span>
                  <span className="font-mono text-sm font-semibold">{p.internal_port}</span>
                  {p.source && p.source !== "0.0.0.0/0" && (
                    <span className="text-xs text-muted-foreground font-mono truncate">{p.source}</span>
                  )}
                  {p.description && (
                    <span className="text-xs text-muted-foreground truncate">{p.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground font-mono">:{p.external_port}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === p.id}
                    onClick={() => handleDeleteCustom(p.id)}
                  >
                    {deletingId === p.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
