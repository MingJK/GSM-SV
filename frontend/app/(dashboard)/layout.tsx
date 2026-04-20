"use client"

import { Suspense, useEffect, useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TopNavbar } from "@/components/dashboard/top-navbar"
import { NotificationProvider, useNotifications } from "@/lib/notification-context"

function SessionNotificationHandler() {
  const { addNotification } = useNotifications()

  useEffect(() => {
    if (sessionStorage.getItem("notif:login")) {
      sessionStorage.removeItem("notif:login")
      addNotification("info", "로그인되었습니다. 환영합니다!")
    }
    if (sessionStorage.getItem("notif:signup")) {
      sessionStorage.removeItem("notif:signup")
      addNotification("info", "회원가입이 완료되었습니다.")
    }
  }, [addNotification])

  return null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <NotificationProvider>
      <SessionNotificationHandler />
      <div className="min-h-screen bg-sidebar">
        <Suspense fallback={<aside className="fixed left-0 top-0 z-40 h-screen w-52 bg-sidebar hidden md:block" />}>
          <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
        </Suspense>
        <div className="md:pl-52">
          <div className="min-h-screen bg-background md:rounded-tl-2xl">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            <main className="p-4 md:p-6">{children}</main>
          </div>
        </div>
      </div>
    </NotificationProvider>
  )
}
