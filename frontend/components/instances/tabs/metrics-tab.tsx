"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

import type { Instance } from "@/lib/types"
import { getVmMetrics, type VmMetricPoint } from "@/lib/api"
import { useNotifications } from "@/lib/notification-context"

const POLL_INTERVAL = 10000

// 시간 범위 → Proxmox timeframe 매핑
const TIMEFRAME_MAP: Record<string, string> = {
  "1h": "hour",
  "6h": "day",
  "24h": "day",
}

// 시간 범위에 따른 필터 (초 단위)
const TIMERANGE_SECONDS: Record<string, number> = {
  "1h": 3600,
  "6h": 21600,
  "24h": 86400,
}

function formatTime(timestamp: number, range: string): string {
  const date = new Date(timestamp * 1000)
  if (range === "1h") {
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
  }
  return date.toLocaleTimeString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface ChartDataPoint {
  label: string
  value: number
}

function MetricChart({
  data,
  color,
  unit,
  label,
}: {
  data: ChartDataPoint[]
  color: string
  unit: string
  label: string
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        데이터를 불러오는 중...
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickMargin={8}
          domain={[0, "auto"]}
          tickFormatter={(v) => `${v}${unit}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "var(--foreground)" }}
          formatter={(value: number) => [`${value}${unit}`, label]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${label})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function MetricsTab({ instance }: { instance: Instance }) {
  const isRunning = instance.status === "running"
  const [range, setRange] = useState("1h")
  const [metrics, setMetrics] = useState<VmMetricPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const { addNotification } = useNotifications()
  const [alertSent, setAlertSent] = useState<{ cpu: boolean; mem: boolean }>({ cpu: false, mem: false })

  const fetchMetrics = useCallback(async () => {
    if (!instance.node || !instance.vmid) return
    try {
      const timeframe = TIMEFRAME_MAP[range] || "hour"
      const res = await getVmMetrics(instance.node, instance.vmid, timeframe)

      // 시간 범위로 필터
      const now = Math.floor(Date.now() / 1000)
      const cutoff = now - TIMERANGE_SECONDS[range]
      const filtered = res.data.filter((p) => p.time >= cutoff)

      setMetrics(filtered)
      setError(null)

      // 리소스 90% 초과 경고
      const latest = filtered.length > 0 ? filtered[filtered.length - 1] : null
      if (latest) {
        if (latest.cpu > 90 && !alertSent.cpu) {
          addNotification("error", `${instance.name}: CPU 사용량이 ${latest.cpu}%에 도달했습니다.`)
          setAlertSent((prev) => ({ ...prev, cpu: true }))
        } else if (latest.cpu <= 90) {
          setAlertSent((prev) => ({ ...prev, cpu: false }))
        }
        if (latest.mem_percent > 90 && !alertSent.mem) {
          addNotification("error", `${instance.name}: 메모리 사용량이 ${latest.mem_percent}%에 도달했습니다.`)
          setAlertSent((prev) => ({ ...prev, mem: true }))
        } else if (latest.mem_percent <= 90) {
          setAlertSent((prev) => ({ ...prev, mem: false }))
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "메트릭 조회 실패"
      setError(msg)
    }
  }, [instance.node, instance.vmid, range, alertSent, addNotification, instance.name])

  useEffect(() => {
    if (!isRunning) return

    fetchMetrics()
    const interval = setInterval(fetchMetrics, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [isRunning, fetchMetrics])

  if (!isRunning) {
    return (
      <Card>
        <CardContent className="flex h-[400px] items-center justify-center">
          <p className="text-muted-foreground">
            모니터링은 실행 중인 인스턴스에서만 사용할 수 있습니다
          </p>
        </CardContent>
      </Card>
    )
  }

  // 차트 데이터 변환
  const cpuData: ChartDataPoint[] = metrics.map((p) => ({
    label: formatTime(p.time, range),
    value: p.cpu,
  }))

  const memData: ChartDataPoint[] = metrics.map((p) => ({
    label: formatTime(p.time, range),
    value: p.mem_percent,
  }))

  const netData: ChartDataPoint[] = metrics.map((p) => ({
    label: formatTime(p.time, range),
    value: Math.round((p.netin + p.netout) * 10) / 10,
  }))

  const diskData: ChartDataPoint[] = metrics.map((p) => ({
    label: formatTime(p.time, range),
    value: Math.round((p.diskread + p.diskwrite) * 10) / 10,
  }))

  // 현재 값 (마지막 데이터 포인트)
  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {latest && (
            <div className="flex gap-6 text-sm">
              <span className="text-muted-foreground">
                CPU <span className="font-mono font-semibold text-foreground">{latest.cpu}%</span>
              </span>
              <span className="text-muted-foreground">
                메모리 <span className="font-mono font-semibold text-foreground">{latest.mem_percent}%</span>
              </span>
            </div>
          )}
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="기간 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">최근 1시간</SelectItem>
            <SelectItem value="6h">최근 6시간</SelectItem>
            <SelectItem value="24h">최근 24시간</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Card>
          <CardContent className="flex h-[100px] items-center justify-center">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">CPU 사용률</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricChart data={cpuData} color="var(--chart-1)" unit="%" label="CPU" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">메모리 사용률</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricChart data={memData} color="var(--chart-2)" unit="%" label="메모리" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">네트워크 I/O</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricChart data={netData} color="var(--chart-3)" unit=" KB/s" label="네트워크" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">디스크 I/O</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricChart data={diskData} color="var(--chart-4)" unit=" KB/s" label="디스크" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
