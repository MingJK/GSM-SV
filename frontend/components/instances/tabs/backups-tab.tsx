"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HardDrive, MoreHorizontal, Plus, RotateCcw, Trash2, Download, DatabaseBackup } from "lucide-react"

import type { Instance } from "@/lib/types"

interface Backup {
  id: string
  name: string
  type: "manual" | "automatic"
  size: string
  status: "completed" | "in-progress" | "failed"
  createdAt: string
}

const statusConfig = {
  completed: {
    label: "완료",
    className: "bg-[var(--status-active-bg)] text-[var(--status-active-fg)]",
  },
  "in-progress": {
    label: "진행 중",
    className: "bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]",
  },
  failed: {
    label: "실패",
    className: "bg-[var(--status-error-bg)] text-[var(--status-error-fg)]",
  },
}

export function BackupsTab({ instance }: { instance: Instance }) {
  const [backups] = useState<Backup[]>([])
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Auto Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">자동 백업</CardTitle>
          <CardDescription>
            이 인스턴스에 대한 정기적인 자동 백업을 활성화합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">주간 백업</p>
              <p className="text-sm text-muted-foreground">
                매주 일요일 오전 2:00(KST)에 자동으로 백업을 생성합니다.
              </p>
            </div>
            <Switch
              checked={autoBackupEnabled}
              onCheckedChange={setAutoBackupEnabled}
              disabled
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            백업 기능은 추후 지원될 예정입니다.
          </p>
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <HardDrive className="h-4 w-4" />
                백업 기록
              </CardTitle>
              <CardDescription>
                인스턴스의 스냅샷을 확인하고 관리합니다.
              </CardDescription>
            </div>
            <Button className="gap-2" disabled>
              <Plus className="h-4 w-4" />
              백업 생성
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DatabaseBackup className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                백업 기록이 없습니다
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                백업 기능이 활성화되면 여기에 기록이 표시됩니다.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>크기</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => {
                  const config = statusConfig[backup.status]
                  return (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">{backup.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {backup.type === "manual" ? "수동" : "자동"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{backup.size}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={config.className}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(backup.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                              <RotateCcw className="h-4 w-4" />
                              복원
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Download className="h-4 w-4" />
                              다운로드
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-destructive">
                              <Trash2 className="h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
