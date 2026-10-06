"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { Loader2, LogOut } from "lucide-react"

/*
 * Confirmation avant de se déconnecter, comme sur Facebook :
 * « Se déconnecter ? » avec deux boutons, « Annuler » et « Se déconnecter ».
 * Utilisée partout où il y a un bouton Déconnexion : site public (participant),
 * espace organisateur et administration.
 */

export function ConfirmationDeconnexion({
  ouverte,
  onAnnuler,
  onConfirmer,
  nom,
}: {
  ouverte: boolean
  onAnnuler: () => void
  /** déconnexion réelle (révocation du jeton, redirection) */
  onConfirmer: () => Promise<void> | void
  /** prénom ou nom du compte, affiché dans la question (facultatif) */
  nom?: string | null
}) {
  const [envoi, setEnvoi] = useState(false)
  const annuler = useRef<HTMLButtonElement>(null)
  const idTitre = useId()
  const idTexte = useId()

  useEffect(() => {
    if (!ouverte) return
    setEnvoi(false)
    const precedent = document.activeElement as HTMLElement | null
    // le focus va sur « Annuler » : un appui sur Entrée par erreur ne déconnecte pas
    annuler.current?.focus()
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onAnnuler()
    window.addEventListener("keydown", echap)
    return () => {
      window.removeEventListener("keydown", echap)
      precedent?.focus?.()
    }
  }, [ouverte, onAnnuler])

  if (!ouverte) return null

  const confirmer = async () => {
    setEnvoi(true)
    try {
      await onConfirmer()
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Annuler"
        tabIndex={-1}
        className="absolute inset-0 bg-gw-nuit/60 backdrop-blur-[2px]"
        onClick={() => !envoi && onAnnuler()}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        aria-describedby={idTexte}
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center text-gw-nuit shadow-2xl dark:bg-gw-carte-sombre dark:text-white"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gw-rose-pale text-gw-rose-action dark:bg-gw-rose/20 dark:text-pink-200">
          <LogOut className="h-5 w-5" aria-hidden />
        </span>
        <h2 id={idTitre} className="font-titre mt-4 text-xl font-semibold">
          Se déconnecter ?
        </h2>
        <p id={idTexte} className="mt-2 text-sm text-gw-texte-doux dark:text-white/65">
          {nom && (
            <>
              Vous êtes connecté en tant que <span className="font-semibold text-gw-nuit dark:text-white">{nom}</span>.{" "}
            </>
          )}
          Voulez-vous vraiment vous déconnecter ? Pour revenir, il faudra saisir à nouveau votre e-mail et votre mot de passe.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            ref={annuler}
            type="button"
            onClick={onAnnuler}
            disabled={envoi}
            className="h-11 flex-1 rounded-full bg-gw-fond px-5 text-sm font-semibold text-gw-nuit transition-colors hover:bg-gw-lavande/50 focus-visible:outline-2 focus-visible:outline-gw-violet disabled:opacity-50 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={confirmer}
            disabled={envoi}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-gw-rose-action px-5 text-sm font-semibold text-white transition-colors hover:bg-gw-rose-action-fonce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-rose disabled:opacity-70"
          >
            {envoi && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Raccourci : `demander()` ouvre la confirmation, `fenetre` est l'élément à afficher.
 * L'action n'est lancée que si l'utilisateur clique « Se déconnecter ».
 */
export function useConfirmationDeconnexion(action: () => Promise<void> | void, nom?: string | null) {
  const [ouverte, setOuverte] = useState(false)
  const demander = useCallback(() => setOuverte(true), [])
  const fermer = useCallback(() => setOuverte(false), [])
  const fenetre = (
    <ConfirmationDeconnexion
      ouverte={ouverte}
      nom={nom}
      onAnnuler={fermer}
      onConfirmer={async () => {
        await action()
        setOuverte(false)
      }}
    />
  )
  return { demander, fenetre }
}
