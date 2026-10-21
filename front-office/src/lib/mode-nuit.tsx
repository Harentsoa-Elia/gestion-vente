"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

/**
 * Mode nuit du site public : enregistré dans le navigateur (localStorage).
 * La classe "dark" posée sur le conteneur .gw-public inverse les couleurs de la charte (voir globals.css).
 */
const CLE = "site_mode_nuit"

type ModeNuit = { nuit: boolean; basculer: () => void }
const Contexte = createContext<ModeNuit>({ nuit: false, basculer: () => {} })

export function ModeNuitProvider({ children }: { children: (nuit: boolean) => ReactNode }) {
  const [nuit, setNuit] = useState(false)
  useEffect(() => {
    try {
      setNuit(localStorage.getItem(CLE) === "true")
    } catch {
      /* stockage indisponible : mode jour */
    }
  }, [])
  const basculer = useCallback(() => {
    setNuit((v) => {
      try {
        localStorage.setItem(CLE, String(!v))
      } catch {
        /* rien */
      }
      return !v
    })
  }, [])
  return <Contexte.Provider value={{ nuit, basculer }}>{children(nuit)}</Contexte.Provider>
}

export const useModeNuit = () => useContext(Contexte)
