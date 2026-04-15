"use client"

import { Suspense, useEffect } from "react"
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
  return (
    <NotificationProvider>
      <SessionNotificationHandler />
      <div className="min-h-screen bg-sidebar">
        <Suspense fallback={<aside className="fixed left-0 top-0 z-40 h-screen w-52 bg-sidebar" />}>
          <Sidebar />
        </Suspense>
        <div className="pl-52">
          <div className="min-h-screen bg-background rounded-tl-2xl">
            <TopNavbar />
            <main className="p-6">{children}</main>
          </div>
        </div>
      </div>
    </NotificationProvider>
  )
}
