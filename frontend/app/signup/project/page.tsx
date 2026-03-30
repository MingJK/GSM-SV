"use client"

import { useState, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { checkProjectEligibility, ApiError, type ProjectInfo, type ProjectCheckResponse } from "@/lib/api"
import Link from "next/link"
import {
  LayoutDashboard, ArrowRight, ArrowLeft, Loader2, Check, Sun, Moon,
  FolderKanban, Lock, Eye, EyeOff,
} from "lucide-react"
import { useTheme } from "next-themes"

type Step = "email" | "details"

export default function ProjectSignupPage() {
  const { signupProject } = useAuth()
  const { theme, setTheme } = useTheme()
  const themeToggling = useRef(false)

  const toggleTheme = () => {
    if (themeToggling.current) return
    themeToggling.current = true
    setTheme(theme === "dark" ? "light" : "dark")
    setTimeout(() => { themeToggling.current = false }, 400)
  }

  const [step, setStep] = useState<Step>("email")

  // Step 1
  const [email, setEmail] = useState("")
  const [checkLoading, setCheckLoading] = useState(false)
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [studentName, setStudentName] = useState("")

  // Step 2
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [reason, setReason] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)

  const [error, setError] = useState("")

  const passwordChecks = [
    { label: "6자 이상", pass: password.length >= 6 },
    { label: "영문 포함", pass: /[a-zA-Z]/.test(password) },
    { label: "숫자 포함", pass: /\d/.test(password) },
  ]
  const passwordStrength = passwordChecks.filter((c) => c.pass).length

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setCheckLoading(true)
    try {
      const data: ProjectCheckResponse = await checkProjectEligibility(email)
      setProjects(data.projects)
      setStudentName(data.student.name || "")
      const available = data.projects.filter((p) => !p.taken)
      if (available.length > 0) {
        setSelectedProject(available[0].name)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail)
      } else {
        setError("프로젝트 조회 중 오류가 발생했습니다.")
      }
    } finally {
      setCheckLoading(false)
    }
  }

  const handleNextStep = () => {
    if (!selectedProject) {
      setError("프로젝트를 선택해주세요.")
      return
    }
    setError("")
    setStep("details")
  }

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
    if (!reason.trim()) {
      setError("신청 사유를 입력해주세요.")
      return
    }
    setSubmitLoading(true)
    try {
      await signupProject(email, password, selectedProject, reason)
      sessionStorage.setItem("notif:signup", "true")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail)
      } else {
        setError("회원가입 중 오류가 발생했습니다.")
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  const availableProjects = projects.filter((p) => !p.taken)

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
          {/* 스텝 인디케이터 */}
          <div className="flex items-center gap-3 w-full max-w-[200px]">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              step === "email" ? "bg-foreground text-background" : "bg-foreground/20 text-foreground"
            }`}>
              1
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              step === "details" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}>
              2
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {step === "email" ? "프로젝트 확인" : "계정 설정"}
              </h1>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                Project
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {step === "email"
                ? "DataGSM에서 조회되는 프로젝트 참여자만 가입할 수 있습니다."
                : `${selectedProject} 프로젝트 오너로 가입합니다.`
              }
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

        {/* ── Step 1: 이메일 + 프로젝트 선택 ── */}
        {step === "email" && (
          <div className="space-y-5">
            <form onSubmit={handleCheckEmail} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setProjects([]); setSelectedProject(""); }}
                  placeholder="your@gsm.hs.kr"
                  autoComplete="email"
                  className="flex h-12 w-full rounded-xl border border-input bg-card px-4 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
                />
              </div>

              {projects.length === 0 && (
                <button
                  type="submit"
                  disabled={checkLoading || !email}
                  className="relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group fast-theme"
                >
                  {checkLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      조회 중...
                    </>
                  ) : (
                    <>
                      프로젝트 조회
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              )}
            </form>

            {/* 프로젝트 목록 */}
            {projects.length > 0 && (
              <div className="space-y-4">
                {studentName && (
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{studentName}</span>님의 참여 프로젝트
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">프로젝트 선택</label>
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <button
                        key={project.name}
                        type="button"
                        disabled={project.taken}
                        onClick={() => { setSelectedProject(project.name); setError(""); }}
                        className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                          project.taken
                            ? "border-border bg-muted/50 opacity-60 cursor-not-allowed"
                            : selectedProject === project.name
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selectedProject === project.name && !project.taken
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        }`}>
                          {selectedProject === project.name && !project.taken && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {project.name}
                          </p>
                          {project.club && (
                            <p className="text-xs text-muted-foreground">{project.club}</p>
                          )}
                        </div>
                        {project.taken && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            오너 등록됨
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {availableProjects.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground">
                    선택 가능한 프로젝트가 없습니다. 모든 프로젝트에 이미 오너가 등록되어 있습니다.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!selectedProject}
                    className="relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group fast-theme"
                  >
                    다음
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>
            )}

            {/* 하단 링크 */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                일반 계정으로 가입하시겠어요?{" "}
                <Link href="/signup" className="font-semibold text-foreground hover:underline underline-offset-4 transition-colors">
                  일반 회원가입
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                이미 계정이 있으신가요?{" "}
                <Link href="/login" className="font-semibold text-foreground hover:underline underline-offset-4 transition-colors">
                  로그인
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: 비밀번호 + 신청사유 ── */}
        {step === "details" && (
          <div className="space-y-5">
            {/* 선택된 프로젝트 표시 */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{selectedProject}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                            color: check.pass ? "var(--status-active-fg)" : "var(--muted-foreground)",
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

              <div className="space-y-2">
                <label htmlFor="reason" className="text-sm font-medium text-foreground">
                  신청 사유
                </label>
                <textarea
                  id="reason"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="프로젝트 오너 권한이 필요한 이유를 작성해주세요. (예: 프로젝트 서버 운영, CI/CD 환경 구축 등)"
                  rows={4}
                  className="flex w-full rounded-xl border border-input bg-card px-4 py-3 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  관리자가 검토 후 승인합니다.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setError(""); }}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  이전
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="relative flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group fast-theme"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      검증 중...
                    </>
                  ) : (
                    <>
                      신청하기
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
