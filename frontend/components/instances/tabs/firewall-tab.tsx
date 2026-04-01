"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Globe, Copy, Loader2 } from "lucide-react"

import type { Instance } from "@/lib/types"
import { type PortInfo, type FirewallRule, getFirewallRules, addFirewallRule, deleteFirewallRule } from "@/lib/api"

export function FirewallTab({
  instance,
  ports = [],
}: {
  instance: Instance
  ports?: PortInfo[]
}) {
  const [rules, setRules] = useState<FirewallRule[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deletingPos, setDeletingPos] = useState<number | null>(null)

  // 새 규칙 폼 상태
  const [newProtocol, setNewProtocol] = useState("tcp")
  const [newPort, setNewPort] = useState("")
  const [newSource, setNewSource] = useState("")
  const [newAction, setNewAction] = useState("ACCEPT")

  const vmid = instance.vmid

  const fetchRules = useCallback(async () => {
    try {
      const data = await getFirewallRules(vmid)
      setRules(data)
    } catch {
      // 조회 실패 시 빈 배열
      setRules([])
    } finally {
      setLoading(false)
    }
  }, [vmid])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleAdd = async () => {
    if (!newPort) return
    setAdding(true)
    try {
      await addFirewallRule(vmid, {
        action: newAction,
        type: "in",
        proto: newProtocol,
        dport: newPort,
        source: newSource || undefined,
        enable: 1,
      })
      await fetchRules()
      setNewProtocol("tcp")
      setNewPort("")
      setNewSource("")
      setNewAction("ACCEPT")
      setIsDialogOpen(false)
    } catch {
      // 에러 처리
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (pos: number) => {
    setDeletingPos(pos)
    try {
      await deleteFirewallRule(vmid, pos)
      await fetchRules()
    } catch {
      // 에러 처리
    } finally {
      setDeletingPos(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 접속 안내 */}
      {ports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Globe className="h-4 w-4" />
              외부 접속 포트
            </CardTitle>
            <CardDescription>
              포트포워딩이 설정된 서비스 목록입니다. 도메인은 추후 설정됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ports.map((port, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium">{port.service}</p>
                  <p className="font-mono text-sm font-bold">:{port.public_port}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigator.clipboard.writeText(String(port.public_port))}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">인바운드 규칙</h3>
          <p className="text-sm text-muted-foreground">
            이 인스턴스로 들어오는 트래픽을 제어하는 규칙입니다.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setNewProtocol("tcp")
            setNewPort("")
            setNewSource("")
            setNewAction("ACCEPT")
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              규칙 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>인바운드 규칙 추가</DialogTitle>
              <DialogDescription>
                이 인스턴스에 대한 새로운 인바운드 방화벽 규칙을 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Source (출발지)</label>
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="0.0.0.0/0 (미입력 시 전체 허용)"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">예: 192.168.1.0/24, 10.0.0.1</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">프로토콜</label>
                  <Select value={newProtocol} onValueChange={setNewProtocol}>
                    <SelectTrigger>
                      <SelectValue placeholder="프로토콜 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tcp">TCP</SelectItem>
                      <SelectItem value="udp">UDP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">포트</label>
                  <Select value={newPort} onValueChange={setNewPort}>
                    <SelectTrigger>
                      <SelectValue placeholder="포트 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="22">22 (SSH)</SelectItem>
                      <SelectItem value="80">80 (HTTP)</SelectItem>
                      <SelectItem value="10000">10000 (SVC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">동작</label>
                <Select value={newAction} onValueChange={setNewAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="동작 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACCEPT">허용 (ACCEPT)</SelectItem>
                    <SelectItem value="DROP">차단 (DROP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleAdd} disabled={adding || !newPort}>
                {adding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    추가 중...
                  </>
                ) : (
                  "규칙 추가"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inbound Rules */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>프로토콜</TableHead>
                  <TableHead>포트</TableHead>
                  <TableHead>동작</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      등록된 방화벽 규칙이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {rules.map((rule) => (
                  <TableRow key={rule.pos}>
                    <TableCell className="font-mono text-sm">{rule.source || "0.0.0.0/0"}</TableCell>
                    <TableCell className="font-mono text-sm">{(rule.proto || "").toUpperCase()}</TableCell>
                    <TableCell className="font-mono text-sm">{rule.dport || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          rule.action === "ACCEPT"
                            ? "bg-[var(--status-active-bg)] text-[var(--status-active-fg)]"
                            : "bg-[var(--status-error-bg)] text-[var(--status-error-fg)]"
                        }
                      >
                        {rule.action === "ACCEPT" ? "허용" : "차단"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(rule.pos)}
                        disabled={deletingPos === rule.pos}
                      >
                        {deletingPos === rule.pos ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
