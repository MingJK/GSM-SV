"use client"

import { useState, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { ApiError } from "@/lib/api"
import Link from "next/link"
import { LayoutDashboard, Eye, EyeOff, Loader2, Check, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

export default function SignupPage() {
  const { signup } = useAuth()
  const { theme, setTheme } = useTheme()
  const themeToggling = useRef(false)

  const toggleTheme = () => {
    if (themeToggling.current) return
    themeToggling.current = true
    setTheme(theme === "dark" ? "light" : "dark")
    setTimeout(() => { themeToggling.current = false }, 400)
  }

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const passwordChecks = [
    { label: "6자 이상", pass: password.length >= 6 },
    { label: "영문 포함", pass: /[a-zA-Z]/.test(password) },
    { label: "숫자 포함", pass: /\d/.test(password) },
  ]
  const passwordStrength = passwordChecks.filter((c) => c.pass).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }
    if (passwordStrength < 3) {
      setError("비밀번호 조건을 모두 충족해주세요.")
      return
    }

    setLoading(true)
    try {
      await signup(email, password)
      sessionStorage.setItem("notif:signup", "true")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail)
      } else {
        setError("회원가입 중 오류가 발생했습니다.")
      }
    } finally {
      setLoading(false)
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
            <LayoutDashboard className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">회원가입</h1>
            <p className="text-sm text-muted-foreground">
              새 계정을 만들어 GSM SV를 시작하세요
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

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@gsm.hs.kr"
              autoComplete="email"
              className="flex h-12 w-full rounded-xl border border-input bg-card px-4 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              비밀번호
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoComplete="new-password"
                className="flex h-12 w-full rounded-xl border border-input bg-card px-4 pr-12 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* 비밀번호 강도 인디케이터 */}
            {password.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{
                        background:
                          passwordStrength >= level
                            ? passwordStrength === 3
                              ? "var(--status-active-dot)"
                              : passwordStrength === 2
                              ? "var(--status-pending-dot)"
                              : "var(--status-error-dot)"
                            : "var(--muted)",
                      }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {passwordChecks.map((check, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 text-xs"
                      style={{
                        color: check.pass
                          ? "var(--status-active-fg)"
                          : "var(--muted-foreground)",
                      }}
                    >
                      {check.pass ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-current" />
                      )}
                      {check.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className="text-sm font-medium text-foreground">
              비밀번호 확인
            </label>
            <input
              id="confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              className="flex h-12 w-full rounded-xl border border-input bg-card px-4 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs" style={{ color: "var(--status-error-fg)" }}>
                비밀번호가 일치하지 않습니다
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden fast-theme"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                가입 중...
              </>
            ) : (
              "계정 만들기"
            )}
          </button>
        </form>

        {/* 하단 링크 */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            프로젝트 참여자이신가요?{" "}
            <Link
              href="/signup/project"
              className="font-semibold text-foreground hover:underline underline-offset-4 transition-colors"
            >
              프로젝트 오너로 가입
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-semibold text-foreground hover:underline underline-offset-4 transition-colors"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
