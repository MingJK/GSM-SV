"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, Copy } from "lucide-react"

import type { Instance } from "@/lib/types"
import { type PortInfo } from "@/lib/api"

export function FirewallTab({
  instance,
  ports = [],
}: {
  instance: Instance
  ports?: PortInfo[]
}) {
  return (
    <div className="space-y-6">
      {ports.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Globe className="h-4 w-4" />
              외부 접속 포트
            </CardTitle>
            <CardDescription>
              포트포워딩이 설정된 서비스 목록입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ports.map((port, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium">{port.service}</p>
                  <p className="font-mono text-sm font-bold">ssh.gsmsv.site:{port.public_port}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigator.clipboard.writeText(`ssh.gsmsv.site:${port.public_port}`)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              포트포워딩 정보가 없습니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
