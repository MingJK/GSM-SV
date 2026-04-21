"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Error Boundary]", error.message)
  }, [error])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">오류가 발생했습니다</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          예상치 못한 문제가 발생했습니다. 다시 시도해주세요.
        </p>
        <Button onClick={reset} variant="outline">
          다시 시도
        </Button>
      </div>
    </div>
  )
}
