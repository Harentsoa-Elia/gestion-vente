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

interface NotificationBellProps {
  /** Classes du bouton : par défaut, cloche blanche pour l'en-tête bleu (app-header). */
  boutonClassName?: string
}

export function NotificationBell({ boutonClassName = "text-white hover:bg-gw-violet-fonce" }: NotificationBellProps = {}) {
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
        className={`relative ${boutonClassName}`}
        aria-label={count > 0 ? `Notifications, ${count} non lue${count > 1 ? "s" : ""}` : "Notifications"}
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-gw-rose-action text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-gw-bordure bg-gw-surface text-gw-encre shadow-[0_18px_40px_-20px_rgba(42,26,94,0.45)] dark:border-gw-bordure-sombre dark:bg-gw-carte-sombre dark:text-white">
          <div className="border-b border-gw-bordure px-4 py-3 text-sm font-semibold dark:border-gw-bordure-sombre">Notifications</div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gw-texte-doux dark:text-white/60">
              Aucune notification pour le moment.
            </div>
          ) : (
            <ul className="divide-y divide-gw-bordure dark:divide-gw-bordure-sombre">
              {notifications.map((n) => (
                <li key={n.id} className="px-4 py-3 text-sm hover:bg-gw-fond dark:hover:bg-white/5">
                  <p className={n.lu ? "text-gw-texte dark:text-white/70" : "font-medium text-gw-encre dark:text-white"}>{n.message}</p>
                  <p className="mt-1 text-xs text-gw-texte-pale dark:text-white/50">
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