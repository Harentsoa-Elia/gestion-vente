"use client"

import { useEffect, useState, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  fetchNotificationCount,
  fetchNotifications,
  marquerNotificationsLues,
} from "@/services/notificationService"
import type { Notification } from "@/types"

const POLL_INTERVAL_MS = 30_000

export function NotificationBell() {
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const refreshCount = async () => {
    try {
      const data = await fetchNotificationCount()
      setCount(data.non_lues)
    } catch {
      // Silencieux : le polling ne doit jamais afficher d'erreur intrusive
    }
  }

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleToggle = async () => {
    const nextOpen = !open
    setOpen(nextOpen)
    if (nextOpen) {
      try {
        const data = await fetchNotifications()
        setNotifications(data)
        if (count > 0) {
          await marquerNotificationsLues()
          setCount(0)
        }
      } catch {
        // idem, on n'affiche pas d'erreur pour un simple echec de chargement
      }
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="relative text-white hover:bg-blue-700"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white text-gray-900 rounded-lg shadow-xl border z-50">
          <div className="px-4 py-3 border-b font-semibold text-sm">Notifications</div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              Aucune notification pour le moment.
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id} className="px-4 py-3 text-sm hover:bg-gray-50">
                  <p className={n.lu ? "text-gray-600" : "text-gray-900 font-medium"}>{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.date_creation).toLocaleString("fr-FR")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}