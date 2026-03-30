"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import {
  getNotifications as fetchNotificationsApi,
  markAllNotificationsRead,
  deleteNotification as deleteNotificationApi,
  type NotificationItem,
} from "@/lib/api"

export type NotificationType = "info" | "success" | "error"

export interface Notification {
  id: number | string
  type: NotificationType
  message: string
  timestamp: Date
  read: boolean
}

const COLOR_MAP: Record<NotificationType, string> = {
  info: "bg-sky-500",
  success: "bg-emerald-500",
  error: "bg-red-500",
}

interface NotificationContextType {
  notifications: Notification[]
  hasUnread: boolean
  addNotification: (type: NotificationType, message: string) => void
  removeNotification: (id: number | string) => void
  markAsRead: () => void
  deleteAll: () => void
  refreshNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await fetchNotificationsApi()
      setNotifications(
        data.map((n: NotificationItem) => ({
          id: n.id,
          type: n.type as NotificationType,
          message: n.message,
          timestamp: new Date(n.created_at),
          read: n.is_read,
        }))
      )
    } catch {
      // 로그인 전이면 무시
    }
  }, [])

  // 30초마다 서버에서 알림 가져오기
  useEffect(() => {
    refreshNotifications()
    const interval = setInterval(refreshNotifications, 30000)
    return () => clearInterval(interval)
  }, [refreshNotifications])

  // 프론트에서 즉시 생성하는 로컬 알림 (DB에는 저장 안 됨)
  const addNotification = useCallback((type: NotificationType, message: string) => {
    const newNotif: Notification = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      message,
      timestamp: new Date(),
      read: false,
    }
    setNotifications((prev) => [newNotif, ...prev])
  }, [])

  const removeNotification = useCallback(async (id: number | string) => {
    // DB 알림이면 서버에서도 삭제
    if (typeof id === "number") {
      try {
        await deleteNotificationApi(id)
      } catch { /* ignore */ }
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // 빨간점만 제거 (팝오버 열 때)
  const markAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  // 서버에서 전체 삭제 + 클라이언트 비움 ("모두 읽음" 버튼)
  const deleteAll = useCallback(async () => {
    try {
      await markAllNotificationsRead()
    } catch { /* ignore */ }
    setNotifications([])
  }, [])

  const hasUnread = notifications.some((n) => !n.read)

  return (
    <NotificationContext.Provider value={{ notifications, hasUnread, addNotification, removeNotification, markAsRead, deleteAll, refreshNotifications }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider")
  return ctx
}

export function getNotificationColor(type: NotificationType) {
  return COLOR_MAP[type]
}
