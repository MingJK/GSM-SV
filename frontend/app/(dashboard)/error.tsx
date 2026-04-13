"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error.message)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <h2 className="text-lg font-semibold">페이지 로딩 중 오류가 발생했습니다</h2>
      <p className="text-sm text-muted-foreground">
        문제가 지속되면 관리자에게 문의해주세요.
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        다시 시도
      </Button>
    </div>
  )
}
