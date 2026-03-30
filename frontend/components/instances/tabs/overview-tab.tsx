"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cpu, HardDrive, MemoryStick, Clock, Monitor, Calendar, User, Lock, Copy, Check, Key, Timer, Eye, EyeOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Instance } from "@/lib/types"
import type { PortInfo } from "@/lib/api"

export function OverviewTab({
  instance,
  ports = [],
}: {
  instance: Instance
  ports?: PortInfo[]
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setTimeout(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    }, 100)
  }
  const createdDate = instance.created
    ? new Date(instance.created).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-"

  const expiresDate = instance.expires_at
    ? new Date(instance.expires_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  const daysUntilExpiry = instance.expires_at
    ? Math.ceil((new Date(instance.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
      {/* Resources Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">리소스</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Cpu className="h-4 w-4" />
              <span className="text-sm">CPU</span>
            </div>
            <span className="font-mono text-sm font-medium">{instance.cpu}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <MemoryStick className="h-4 w-4" />
              <span className="text-sm">메모리</span>
            </div>
            <span className="font-mono text-sm font-medium">{instance.ram}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm">디스크</span>
            </div>
            <span className="font-mono text-sm font-medium">{instance.disk}</span>
          </div>
        </CardContent>
      </Card>

      {/* Access Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">접속 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm">SSH 계정</span>
            </div>
            <span className="font-mono text-sm font-medium">ubuntu</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Key className="h-4 w-4" />
              <span className="text-sm">SSH 비밀번호</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-sm font-medium">
                {instance.vm_password
                  ? showPassword ? instance.vm_password : "••••••••"
                  : "-"}
              </span>
              {instance.vm_password && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 transition-all duration-150 active:scale-75 active:opacity-60"
                    onClick={() => handleCopy(instance.vm_password!, "password")}
                  >
                    {copiedField === "password" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-sm">내부 IP</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-sm font-medium">
                {instance.internal_ip || "-"}
              </span>
              {instance.internal_ip && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 transition-all duration-150 active:scale-75 active:opacity-60"
                  onClick={() => handleCopy(instance.internal_ip!, "ip")}
                >
                  {copiedField === "ip" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">시스템</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Monitor className="h-4 w-4" />
              <span className="text-sm">운영체제</span>
            </div>
            <span className="text-sm font-medium">{instance.os}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">가동 시간</span>
            </div>
            <span className="font-mono text-sm font-medium">{instance.uptime}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">생성일</span>
            </div>
            <span className="text-sm font-medium">{createdDate}</span>
          </div>
          {expiresDate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span className="text-sm">만료일</span>
              </div>
              <span className={`text-sm font-medium ${daysUntilExpiry !== null && daysUntilExpiry <= 15 ? "text-destructive" : ""}`}>
                {expiresDate} ({daysUntilExpiry}일 남음)
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Port Forwarding Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">포트 포워딩</CardTitle>
            {ports.length > 0 && (
              <Badge variant="outline" className="font-mono text-[10px]">활성</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {ports.length === 0 ? (
            <p className="text-sm text-muted-foreground">포트포워딩 정보 없음</p>
          ) : (
            ports.map((port, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50">
                <div className="space-y-0.5">
                  <p className="text-[10px] tracking-wider text-muted-foreground font-semibold">공인 포트</p>
                  <p className="font-mono text-sm font-bold text-primary">{port.public_port}</p>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="space-y-0.5 text-right">
                  <p className="text-[10px] tracking-wider text-muted-foreground font-semibold">서비스</p>
                  <p className="font-mono text-sm font-bold">{port.service}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
