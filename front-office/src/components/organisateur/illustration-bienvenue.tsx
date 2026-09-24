import { cn } from "@/utils"

/*
 * Visuel du bandeau de bienvenue du tableau de bord : une photo de concert qui occupe
 * la droite du bandeau et se fond dans la carte par un dégradé (clair et sombre).
 * Remplace le personnage du modèle uTask.
 *
 * Photo : public/images/organisateur/bandeau-concert.jpg (recadrée, ~50 Ko).
 * Pour changer d'image, remplacer ce fichier et mettre à jour CREDIT_PHOTO.
 */

/**
 * Crédit du photographe, affiché sur la photo (obligatoire pour une image libre de droits
 * de type Unsplash ou Pexels). null = aucun crédit affiché.
 */
const CREDIT_PHOTO: { auteur: string; source: string; lien: string } | null = null

export function IllustrationBienvenue({ className }: { className?: string }) {
  return (
    <div
      // le bandeau place ce visuel en bas (self-end) : la photo, elle, occupe toute la hauteur
      className={cn(className, "relative self-stretch overflow-hidden")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/organisateur/bandeau-concert.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-[55%_60%]"
      />
      {/* légère teinte guichetweb, sous le fondu pour que le bord gauche reste de la couleur exacte de la carte */}
      <div aria-hidden className="absolute inset-0 bg-gw-violet/10 mix-blend-multiply" />
      {/* fondu vers la couleur de la carte, pour que la photo prolonge le texte sans cassure */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(90deg,#FFFFFF_0%,rgba(255,255,255,0.8)_22%,rgba(255,255,255,0)_62%)] dark:bg-[linear-gradient(90deg,#221D40_0%,rgba(34,29,64,0.8)_22%,rgba(34,29,64,0)_62%)]"
      />

      {CREDIT_PHOTO && (
        <a
          href={CREDIT_PHOTO.lien}
          target="_blank"
          rel="noreferrer"
          className="absolute right-2 bottom-1.5 rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white/85 backdrop-blur-sm hover:text-white"
        >
          Photo : {CREDIT_PHOTO.auteur} / {CREDIT_PHOTO.source}
        </a>
      )}
    </div>
  )
}
