"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Bell, Moon, Sun, Search, User, ChevronDown, LogOut, Inbox, Trash2, Settings, Monitor } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useNotifications, getNotificationColor } from "@/lib/notification-context"
import { getMyVms, getAllVms, type VmInfo, type AdminNodeVms } from "@/lib/api"

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return "방금 전"
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export function TopNavbar() {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const { notifications, hasUnread, removeNotification, markAsRead, deleteAll } = useNotifications()
  const router = useRouter()

  const displayName = user?.name || user?.email?.split("@")[0] || "User"

  const studentNumber =
    user?.grade != null && user?.class_num != null && user?.number != null
      ? `${user.grade}${user.class_num}${String(user.number).padStart(2, "0")}`
      : null

  const initials = user?.email?.charAt(0).toUpperCase() || "?"

  // ── VM 검색 ──────────────────────────────────────────────
  const [query, setQuery] = useState("")
  const [allVms, setAllVms] = useState<(VmInfo & { owner_email?: string })[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const isAdmin = user?.role === "admin"

  // VM 목록 캐시 (포커스 시 로드)
  const loadVms = useCallback(async () => {
    try {
      if (isAdmin) {
        const nodes = await getAllVms()
        setAllVms(nodes.flatMap((n) => n.vms.map((v) => ({ ...v, node: n.name }))))
      } else {
        const vms = await getMyVms()
        setAllVms(vms)
      }
    } catch { /* ignore */ }
  }, [isAdmin])

  const filtered = query.trim()
    ? allVms.filter(
        (vm) =>
          vm.name.toLowerCase().includes(query.toLowerCase()) ||
          String(vm.vmid).includes(query)
      )
    : allVms

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Search */}
      <div ref={searchRef} className="relative w-[24rem]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="인스턴스, VM 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { loadVms(); setShowResults(true) }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowResults(false)
            if (e.key === "Enter" && filtered.length === 1) {
              router.push(`/instances/${filtered[0].vmid}?node=${filtered[0].node}`)
              setShowResults(false)
              setQuery("")
            }
          }}
          className="flex h-9 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
        />
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg z-50">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다
              </div>
            ) : (
              filtered.slice(0, 10).map((vm) => (
                <button
                  key={`${vm.node}-${vm.vmid}`}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    router.push(`/instances/${vm.vmid}?node=${vm.node}`)
                    setShowResults(false)
                    setQuery("")
                  }}
                >
                  <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{vm.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">VMID {vm.vmid}</span>
                  </div>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${
                    vm.status === "running" ? "bg-green-500" : vm.status === "stopped" ? "bg-red-400" : "bg-yellow-400"
                  }`} />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 rounded-lg"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Popover onOpenChange={(open) => { if (open) markAsRead() }}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
              <Bell className="h-4 w-4" />
              {hasUnread && (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500" />
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[26rem] p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h4 className="text-base font-semibold">알림</h4>
              {notifications.length > 0 && (
                <button
                  onClick={deleteAll}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  모두 읽음
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">새로운 알림이 없습니다</p>
              </div>
            ) : (
              <div className="max-h-[26rem] overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3.5 px-5 py-4 border-b border-border/50 last:border-0"
                  >
                    <span className={`mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ${getNotificationColor(n.type)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(n.timestamp)}</p>
                    </div>
                    <button
                      onClick={() => removeNotification(n.id)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3 h-9 rounded-lg">
              <Avatar className="h-7 w-7 text-xs">
                {user?.avatar_url && <AvatarImage src={user.avatar_url} alt="프로필" />}
                <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline-block">
                {displayName}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="py-2.5">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-10 w-10 shrink-0">
                  {user?.avatar_url && <AvatarImage src={user.avatar_url} alt="프로필" />}
                  <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-foreground text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                    {studentNumber && (
                      <span className="shrink-0 text-xs font-normal text-muted-foreground">
                        {studentNumber}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 py-2 text-sm" onClick={() => router.push("/settings")}>
              <Settings className="h-3.5 w-3.5" />
              설정
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 py-2 text-sm text-destructive" onClick={() => logout()}>
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
