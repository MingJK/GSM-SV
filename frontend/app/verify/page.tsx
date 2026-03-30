"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useAuth } from "@/lib/auth-context"
import { resendCode, ApiError } from "@/lib/api"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Loader2, Mail, RotateCw, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}

function VerifyContent() {
  const { verifyEmail } = useAuth()
  const { theme, setTheme } = useTheme()
  const themeToggling = useRef(false)
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""

  const toggleTheme = () => {
    if (themeToggling.current) return
    themeToggling.current = true
    setTheme(theme === "dark" ? "light" : "dark")
    setTimeout(() => { themeToggling.current = false }, 400)
  }

  const [code, setCode] = useState(["", "", "", "", "", ""])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setError("")
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const newCode = [...code]
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || ""
    }
    setCode(newCode)
    setError("")
    const focusIndex = Math.min(pasted.length, 5)
    inputRefs.current[focusIndex]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const fullCode = code.join("")
    if (fullCode.length !== 6) {
      setError("6자리 인증 코드를 모두 입력해주세요.")
      return
    }
    setLoading(true)
    try {
      await verifyEmail(email, fullCode)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail)
      } else {
        setError("인증 중 오류가 발생했습니다.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resending || resendCooldown > 0) return
    setResending(true)
    setError("")
    try {
      await resendCode(email)
      setResendCooldown(60)
      setCode(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail)
      } else {
        setError("코드 재발송에 실패했습니다.")
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* 테마 토글 */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" style={{ transition: "transform 0.35s ease, opacity 0.35s ease" }} />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100" style={{ transition: "transform 0.35s ease, opacity 0.35s ease" }} />
      </button>

      <div className="w-full max-w-[420px] space-y-8">
        {/* 로고 + 헤더 */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Mail className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">이메일 인증</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{email}</span>
              {email ? "으로" : ""} 발송된 6자리 코드를 입력해주세요
            </p>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <div className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
            {error}
          </div>
        )}

        {/* 코드 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="flex h-14 w-12 items-center justify-center rounded-xl border border-input bg-card text-center text-xl font-bold transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.join("").length !== 6}
            className="relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden fast-theme"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                인증 중...
              </>
            ) : (
              "인증 완료"
            )}
          </button>
        </form>

        {/* 재발송 */}
        <div className="text-center space-y-3">
          <button
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
            {resendCooldown > 0
              ? `${resendCooldown}초 후 재발송 가능`
              : resending
              ? "발송 중..."
              : "인증 코드 재발송"
            }
          </button>
        </div>

        {/* 하단 링크 */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            다른 이메일로 가입하시겠어요?{" "}
            <Link
              href="/signup"
              className="font-semibold text-foreground hover:underline underline-offset-4 transition-colors"
            >
              회원가입으로 돌아가기
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
