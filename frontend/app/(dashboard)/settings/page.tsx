"use client"

import { useState, useRef } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Moon, Sun, Monitor, Lock, Check, Camera, Trash2, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { changePassword, uploadAvatar, deleteAvatar } from "@/lib/api"
import { useNotifications } from "@/lib/notification-context"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, refreshUser } = useAuth()
  const { addNotification } = useNotifications()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 아바타
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 클라이언트 검증
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("jpg, png, webp 이미지만 업로드 가능합니다.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("파일 크기는 2MB 이하여야 합니다.")
      return
    }

    setAvatarLoading(true)
    setAvatarError(null)
    try {
      await uploadAvatar(file)
      await refreshUser()
      addNotification("success", "프로필 사진이 변경되었습니다.")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "업로드에 실패했습니다."
      setAvatarError(msg)
    } finally {
      setAvatarLoading(false)
      // input 초기화
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleAvatarDelete = async () => {
    setAvatarLoading(true)
    setAvatarError(null)
    try {
      await deleteAvatar()
      await refreshUser()
      addNotification("info", "프로필 사진이 삭제되었습니다.")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "삭제에 실패했습니다."
      setAvatarError(msg)
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setError(null)
    setSuccess(false)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("모든 항목을 입력해주세요.")
      return
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~`]/.test(newPassword)) {
      setError("비밀번호는 8자 이상, 영문+숫자+특수문자를 포함해야 합니다.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.")
      return
    }

    setLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      addNotification("info", "비밀번호가 변경되었습니다.")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "비밀번호 변경에 실패했습니다."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const themes = [
    { value: "light", label: "라이트", icon: Sun },
    { value: "dark", label: "다크", icon: Moon },
    { value: "system", label: "시스템", icon: Monitor },
  ]

  const initials = user?.email?.charAt(0).toUpperCase() || "?"

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
        <p className="text-muted-foreground mt-1">계정 및 환경 설정을 관리합니다.</p>
      </div>

      {/* 계정 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">계정 정보</CardTitle>
          <CardDescription>현재 로그인한 계정의 기본 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 프로필 사진 */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              <Avatar className="h-20 w-20 text-2xl">
                {user?.avatar_url && (
                  <AvatarImage
                    src={user.avatar_url}
                    alt="프로필 사진"
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* hover 오버레이 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {avatarLoading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                >
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                  사진 변경
                </Button>
                {user?.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAvatarDelete}
                    disabled={avatarLoading}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    삭제
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP (최대 2MB)
              </p>
              {avatarError && (
                <p className="text-xs text-destructive">{avatarError}</p>
              )}
            </div>
          </div>

          {/* 이메일 / 역할 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">이메일</Label>
              <p className="text-sm font-medium mt-1">{user?.email || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">역할</Label>
              <p className="text-sm font-medium mt-1">
                {user?.role === "admin" ? "관리자" : user?.role === "project_owner" ? "프로젝트 오너" : "일반 사용자"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 테마 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">테마</CardTitle>
          <CardDescription>화면 테마를 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  theme === t.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {theme === t.value && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Lock className="h-4 w-4" />
            비밀번호 변경
          </CardTitle>
          <CardDescription>계정 비밀번호를 변경합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">현재 비밀번호</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호 입력"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력 (8자 이상, 영문+숫자+특수문자)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 다시 입력"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-500">비밀번호가 변경되었습니다.</p>}

            <Button onClick={handleChangePassword} disabled={loading}>
              {loading ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
