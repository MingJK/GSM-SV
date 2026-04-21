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
import { Globe, Copy, Check, Shield, Plus, Trash2, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { Instance } from "@/lib/types"
import { type PortInfo, type VmPort, getCustomPorts, addCustomPort, deleteCustomPort } from "@/lib/api"

const DEFAULT_RULES = [
  { port: 22, label: "SSH" },
  { port: 80, label: "HTTP" },
  { port: 10000, label: "SVC" },
]

export function FirewallTab({
  instance,
  ports = [],
}: {
  instance: Instance
  ports?: PortInfo[]
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [customPorts, setCustomPorts] = useState<VmPort[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [form, setForm] = useState({
    internal_port: "",
    protocol: "tcp",
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

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setTimeout(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1500)
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
        description: form.description || undefined,
      })
      setForm({ internal_port: "", protocol: "tcp", description: "" })
      setDialogOpen(false)
      await fetchPorts()
    } catch {
      // 에러는 조용히 처리 (추후 toast 연동 가능)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (portId: number) => {
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
      {/* 외부 접속 포트 (포트포워딩) */}
      {ports.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Globe className="h-4 w-4" />
              외부 접속 포트
            </CardTitle>
            <CardDescription>포트포워딩이 설정된 서비스 목록입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ports.map((port, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium">{port.service}</p>
                  <p className="font-mono text-sm font-bold break-all">ssh.gsmsv.site:{port.public_port}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleCopy(`ssh.gsmsv.site:${port.public_port}`, i)}
                >
                  {copiedIndex === i
                    ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                    : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">포트포워딩 정보가 없습니다.</p>
          </CardContent>
        </Card>
      )}

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
                  <Label>설명 <span className="text-muted-foreground text-xs">(선택)</span></Label>
                  <Input
                    placeholder="예: HTTPS, 게임 서버"
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
          {/* 기본 규칙 (읽기 전용) */}
          {DEFAULT_RULES.map(({ port, label }) => (
            <div
              key={port}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30 border border-border/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium px-2 py-0.5 ring-1 ring-inset ring-emerald-500/20">
                  ACCEPT
                </span>
                <span className="text-xs text-muted-foreground uppercase">TCP</span>
                <span className="font-mono text-sm font-semibold">{port}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">기본</span>
            </div>
          ))}

          {/* 커스텀 포트 */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : customPorts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              추가 포트가 없습니다.
            </p>
          ) : (
            customPorts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium px-2 py-0.5 ring-1 ring-inset ring-emerald-500/20">
                    ACCEPT
                  </span>
                  <span className="text-xs text-muted-foreground uppercase">{p.protocol}</span>
                  <span className="font-mono text-sm font-semibold">{p.internal_port}</span>
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
                    onClick={() => handleDelete(p.id)}
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
