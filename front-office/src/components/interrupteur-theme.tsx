"use client"

import { Moon, Sun } from "lucide-react"
import { cn } from "@/utils"

/**
 * Interrupteur jour / nuit : un soleil et une lune qui glissent dans une piste.
 * En mode nuit, la piste devient sombre et quelques étoiles apparaissent.
 */
export function InterrupteurTheme({
  nuit,
  onBasculer,
  className,
}: {
  nuit: boolean
  onBasculer: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={nuit}
      aria-label={nuit ? "Passer en mode jour" : "Passer en mode nuit"}
      title={nuit ? "Mode jour" : "Mode nuit"}
      onClick={onBasculer}
      className={cn(
        "relative inline-flex h-8 w-[3.75rem] shrink-0 items-center rounded-full p-1 transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet",
        nuit ? "bg-gw-nuit ring-1 ring-white/15" : "bg-gw-lavande/70 ring-1 ring-gw-lavande",
        className,
      )}
    >
      {/* étoiles du mode nuit */}
      <span aria-hidden className={cn("absolute inset-0 transition-opacity duration-500", nuit ? "opacity-100" : "opacity-0")}>
        <span className="absolute top-2 left-2.5 h-0.5 w-0.5 rounded-full bg-white" />
        <span className="absolute top-4 left-4 h-1 w-1 rounded-full bg-white/80" />
        <span className="absolute top-1.5 left-6 h-0.5 w-0.5 rounded-full bg-white/70" />
      </span>
      <span
        aria-hidden
        className={cn(
          "relative z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          nuit ? "translate-x-7 rotate-[360deg] bg-gw-violet text-white" : "translate-x-0 rotate-0 bg-white text-gw-rose-action",
        )}
      >
        {nuit ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
    </button>
  )
}
