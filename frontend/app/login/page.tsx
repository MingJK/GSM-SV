"use client"

import { useState, useRef, Suspense } from "react"
import { useAuth } from "@/lib/auth-context"
import { ApiError } from "@/lib/api"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { LayoutDashboard, Eye, EyeOff, Loader2, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const { login } = useAuth()
  const { theme, setTheme } = useTheme()
  const themeToggling = useRef(false)

  const toggleTheme = () => {
    if (themeToggling.current) return
    themeToggling.current = true
    setTheme(theme === "dark" ? "light" : "dark")
    setTimeout(() => { themeToggling.current = false }, 400)
  }

  const searchParams = useSearchParams()
  const isPending = searchParams.get("pending") === "true"

  const [loginRole, setLoginRole] = useState<"user" | "project_owner">("user")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password, loginRole)
      sessionStorage.setItem("notif:login", "true")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail)
      } else {
        setError("로그인 중 오류가 발생했습니다.")
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">로그인</h1>
            <p className="text-sm text-muted-foreground">
              DataGSM 계정으로 로그인하세요
            </p>
          </div>
        </div>

        {/* 역할 선택 탭 */}
        <div className="relative flex rounded-xl border border-border bg-muted/50 p-1">
          {/* 슬라이딩 인디케이터 */}
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-background shadow-sm transition-all duration-300 ease-in-out"
            style={{
              width: "calc(50% - 4px)",
              left: loginRole === "user" ? "4px" : "calc(50% + 0px)",
            }}
          />
          <button
            type="button"
            onClick={() => { setLoginRole("user"); setError(""); }}
            className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-colors duration-200 ${
              loginRole === "user"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            일반
          </button>
          <button
            type="button"
            onClick={() => { setLoginRole("project_owner"); setError(""); }}
            className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-colors duration-200 ${
              loginRole === "project_owner"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            프로젝트 오너
          </button>
        </div>

        {/* 승인 대기 알림 */}
        {isPending && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <div className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
            이메일 인증이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <div className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
            {error}
          </div>
        )}

        {/* 폼 + OAuth */}
        <div className="space-y-4">
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
                autoComplete="current-password"
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden fast-theme"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                로그인 중...
              </>
            ) : (
              "로그인"
            )}
          </button>
        </form>

        {/* 구분선 + DataGSM OAuth 버튼 */}
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">또는</span>
            </div>
          </div>

          <a
            href="/api/v1/oauth/authorize"
            className="flex h-12 w-full items-center justify-center gap-4 rounded-xl border border-[#E5E5E5] bg-[#EFEFEF] text-black text-sm font-medium hover:bg-[#E5E5E5] transition-all duration-200 dark:bg-[#2A2A2A] dark:text-white dark:border-[#3A3A3A] dark:hover:bg-[#333]"
          >
            <svg className="h-[0.92rem] dark:hidden" viewBox="0 0 38 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.0137 0.00292969C14.8268 0.0772199 17.8954 3.18059 17.8955 7C17.8955 10.8195 14.8269 13.9218 11.0137 13.9961V14H0V10.1572H11.0127V10.1533C12.6967 10.0805 14.0399 8.69776 14.04 7.00098C14.04 5.30405 12.6968 3.91948 11.0127 3.84668V3.84375H4.60742L4.6084 3.84277H0V0H11.0137V0.00292969Z" fill="currentColor"/>
              <path d="M26.9863 0.00292969C23.1723 0.0761944 20.1026 3.17993 20.1025 7C20.1025 10.8201 23.1722 13.9228 26.9863 13.9961V14H38V10.1572H26.9854V10.1533C25.3004 10.0815 23.9562 8.69842 23.9561 7.00098C23.9561 5.30339 25.3003 3.91848 26.9854 3.84668V3.84375H33.3906L33.3896 3.84277H38V0H26.9863V0.00292969Z" fill="currentColor"/>
              <path d="M33.5931 5.07861H37.9987V8.92185H29.7383L31.6657 7.00023L33.5931 5.07861Z" fill="currentColor"/>
              <path d="M0 5.07861H4.40554V8.92185H0V5.07861Z" fill="currentColor"/>
            </svg>
            <svg className="h-[0.92rem] hidden dark:block" viewBox="0 0 38 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.0137 0.00292969C14.8268 0.0772199 17.8954 3.18059 17.8955 7C17.8955 10.8195 14.8269 13.9218 11.0137 13.9961V14H0V10.1572H11.0127V10.1533C12.6967 10.0805 14.0399 8.69776 14.04 7.00098C14.04 5.30405 12.6968 3.91948 11.0127 3.84668V3.84375H4.60742L4.6084 3.84277H0V0H11.0137V0.00292969Z" fill="currentColor"/>
              <path d="M26.9863 0.00292969C23.1723 0.0761944 20.1026 3.17993 20.1025 7C20.1025 10.8201 23.1722 13.9228 26.9863 13.9961V14H38V10.1572H26.9854V10.1533C25.3004 10.0815 23.9562 8.69842 23.9561 7.00098C23.9561 5.30339 25.3003 3.91848 26.9854 3.84668V3.84375H33.3906L33.3896 3.84277H38V0H26.9863V0.00292969Z" fill="currentColor"/>
              <path d="M33.5931 5.07861H37.9987V8.92185H29.7383L31.6657 7.00023L33.5931 5.07861Z" fill="currentColor"/>
              <path d="M0 5.07861H4.40554V8.92185H0V5.07861Z" fill="currentColor"/>
            </svg>
            DataGSM으로 로그인
          </a>
        </div>
        </div>

        {/* 하단 링크 */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            계정이 없으신가요?{" "}
            <Link
              href="/signup"
              className="font-semibold text-foreground hover:underline underline-offset-4 transition-colors"
            >
              회원가입
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/reset-password"
              className="font-semibold text-foreground hover:underline underline-offset-4 transition-colors"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
