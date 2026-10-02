"use client"

import { useEffect, useId, useRef, useState, type DragEvent } from "react"
import { ImagePlus, Plus, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Categorie, Evenement, Lieu } from "@/types"
import type { EvenementSaisie } from "@/services/evenementService"
import { createLieu } from "@/services/referentielService"
import { REGION_ENTREPRISE, REGIONS, estRegionEntreprise, regionDeLaVille, villeEtRegion } from "@/lib/regions"
import { TYPES_IMAGE_ACCEPTES, verifierFichierImage } from "@/lib/media"
import { cn } from "@/utils"
import { Bouton, Champ, Modale, classeChamp, isoVersSaisie, saisieVersIso } from "./ui"

/*
 * Formulaire d'un événement, utilisé pour la création (modale de 'Mes événements')
 * et la modification (onglet 'Informations' de la fiche).
 * Le lieu et la catégorie sont facultatifs tant que l'événement est en préparation :
 * ils seront souvent choisis grâce aux votes du public.
 */

/**
 * Choix de l'affiche dans la fenêtre de création : aperçu immédiat, glisser-déposer ou clic.
 * Le fichier est envoyé juste après la création de l'événement (voir organisateur-evenements.tsx).
 */
function ChoixAffiche({ fichier, onChange }: { fichier: File | null; onChange: (f: File | null) => void }) {
  const champ = useRef<HTMLInputElement>(null)
  const [apercu, setApercu] = useState<string | null>(null)
  const [survol, setSurvol] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (!fichier) return setApercu(null)
    const url = URL.createObjectURL(fichier)
    setApercu(url)
    return () => URL.revokeObjectURL(url)
  }, [fichier])

  const choisir = (f: File | undefined) => {
    if (!f) return
    const e = verifierFichierImage(f)
    setErreur(e)
    if (!e) onChange(f)
    if (champ.current) champ.current.value = ""
  }

  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <span className="block text-sm font-medium">
          Affiche <span className="font-normal text-gw-texte-doux dark:text-white/55">(facultatif, conseillé)</span>
        </span>
        {fichier && (
          <span className="flex gap-1">
            <button type="button" onClick={() => champ.current?.click()} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-gw-violet hover:bg-gw-fond dark:text-gw-lavande dark:hover:bg-white/10">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Changer
            </button>
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-gw-texte-doux hover:bg-gw-fond hover:text-red-600 dark:text-white/60 dark:hover:bg-white/10">
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Retirer
            </button>
          </span>
        )}
      </div>
      <input ref={champ} type="file" accept={TYPES_IMAGE_ACCEPTES.join(",")} className="sr-only" tabIndex={-1} onChange={(e) => choisir(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => champ.current?.click()}
        onDragOver={(e: DragEvent) => {
          e.preventDefault()
          setSurvol(true)
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault()
          setSurvol(false)
          choisir(e.dataTransfer.files?.[0])
        }}
        aria-label={fichier ? "Changer l'affiche" : "Ajouter une affiche"}
        className={cn(
          "group relative block aspect-[3/1] w-full overflow-hidden rounded-2xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet",
          apercu ? "bg-gw-nuit" : "border-2 border-dashed border-gw-lavande bg-gw-fond hover:border-gw-violet dark:border-white/20 dark:bg-white/5",
          survol && "border-gw-violet ring-4 ring-gw-violet/20",
        )}
      >
        {apercu ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={apercu} alt="Aperçu de l'affiche" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center gap-3 px-4 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] text-white">
              <ImagePlus className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-gw-nuit dark:text-white">Glissez l&apos;affiche ici ou cliquez pour la choisir</span>
              <span className="text-xs text-gw-texte-doux dark:text-white/55">JPEG, PNG ou WebP  8 Mo maximum  format paysage conseillé</span>
            </span>
          </span>
        )}
      </button>
      <p className={cn("mt-1 text-xs", erreur ? "text-gw-rose-action" : "text-gw-texte-doux dark:text-white/55")}>
        {erreur ?? "Elle illustre l'événement sur l'accueil, le catalogue et sa page publique. Modifiable ensuite dans 'Informations'."}
      </p>
    </div>
  )
}

export function FormulaireEvenement({
  initial,
  lieux,
  categories,
  onLieuCree,
  onEnregistrer,
  libelleBouton,
  onAnnuler,
  avecAffiche = false,
}: {
  initial?: Evenement
  lieux: Lieu[]
  categories: Categorie[]
  onLieuCree: (lieu: Lieu) => void
  onEnregistrer: (saisie: EvenementSaisie, affiche: File | null) => Promise<void>
  libelleBouton: string
  onAnnuler?: () => void
  /** Création : propose de choisir l'affiche, transmise à onEnregistrer */
  avecAffiche?: boolean
}) {
  const [titre, setTitre] = useState(initial?.titre ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [debut, setDebut] = useState(isoVersSaisie(initial?.date_debut))
  const [fin, setFin] = useState(isoVersSaisie(initial?.date_fin))
  const [capacite, setCapacite] = useState(initial?.capacite ? String(initial.capacite) : "")
  const [lieuId, setLieuId] = useState(initial?.lieu_id ? String(initial.lieu_id) : "")
  const [categorieId, setCategorieId] = useState(initial?.categorie_id ? String(initial.categorie_id) : "")
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [nouveauLieu, setNouveauLieu] = useState(false)
  const [affiche, setAffiche] = useState<File | null>(null)

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreur(null)
    if (fin && debut && new Date(fin) <= new Date(debut)) {
      setErreur("La date de fin doit être postérieure à la date de début.")
      return
    }
    setEnvoi(true)
    try {
      await onEnregistrer({
        titre: titre.trim(),
        description: description.trim(),
        date_debut: saisieVersIso(debut)!,
        date_fin: saisieVersIso(fin),
        capacite: capacite ? Number(capacite) : null,
        lieu_id: lieuId ? Number(lieuId) : null,
        categorie_id: categorieId ? Number(categorieId) : null,
      }, avecAffiche ? affiche : null)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "L'enregistrement a échoué.")
    } finally {
      setEnvoi(false)
    }
  }

  const lieuChoisi = lieux.find((l) => String(l.id) === lieuId)

  return (
    <>
    <form onSubmit={soumettre} className="space-y-4">
      {avecAffiche && <ChoixAffiche fichier={affiche} onChange={setAffiche} />}
      <Champ libelle="Titre" requis>
        {(id) => (
          <input id={id} required value={titre} onChange={(e) => setTitre(e.target.value)} className={classeChamp} placeholder="Ex. Mahaleo sy ny taranany" />
        )}
      </Champ>
      <Champ libelle="Description" requis>
        {(id) => (
          <textarea
            id={id}
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={classeChamp}
            placeholder="Présentez l'événement au public"
          />
        )}
      </Champ>
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ libelle="Début" requis>
          {(id) => <input id={id} type="datetime-local" required value={debut} onChange={(e) => setDebut(e.target.value)} className={classeChamp} />}
        </Champ>
        <Champ libelle="Fin">
          {(id) => <input id={id} type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} className={classeChamp} />}
        </Champ>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ libelle="Lieu" aide="Facultatif : vous pouvez le faire choisir par le public.">
          {(id) => (
            <div className="flex gap-2">
              <select id={id} value={lieuId} onChange={(e) => setLieuId(e.target.value)} className={classeChamp}>
                <option value="">À définir</option>
                {[
                  { libelle: `${REGION_ENTREPRISE} (votre région)`, liste: lieux.filter(estRegionEntreprise) },
                  { libelle: "Autres régions", liste: lieux.filter((l) => !estRegionEntreprise(l)) },
                ]
                  .filter((g) => g.liste.length > 0)
                  .map((g) => (
                    <optgroup key={g.libelle} label={g.libelle}>
                      {[...g.liste]
                        .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.ville ? `${l.nom} (${villeEtRegion(l)})` : l.nom}
                          </option>
                        ))}
                    </optgroup>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => setNouveauLieu(true)}
                aria-label="Créer un lieu"
                title="Créer un lieu"
                className="shrink-0 rounded-xl border border-gw-bordure px-3 text-gw-violet hover:bg-gw-fond dark:border-gw-bordure-sombre dark:text-white dark:hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </Champ>
        <Champ libelle="Catégorie">
          {(id) => (
            <select id={id} value={categorieId} onChange={(e) => setCategorieId(e.target.value)} className={classeChamp}>
              <option value="">À définir</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          )}
        </Champ>
      </div>
      <Champ
        libelle="Capacité"
        aide={lieuChoisi?.capacite ? `Le lieu choisi accueille ${lieuChoisi.capacite.toLocaleString("fr-FR")} personnes.` : undefined}
      >
        {(id) => (
          <input
            id={id}
            type="number"
            min={1}
            value={capacite}
            onChange={(e) => setCapacite(e.target.value)}
            className={classeChamp}
            placeholder="Nombre de places"
          />
        )}
      </Champ>

      {erreur && (
        <p role="alert" className="rounded-xl bg-gw-rose-pale px-4 py-3 text-sm text-gw-rose-action dark:bg-gw-rose/15 dark:text-pink-200">
          {erreur}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {onAnnuler && (
          <Bouton type="button" variante="discret" onClick={onAnnuler}>
            Annuler
          </Bouton>
        )}
        <Bouton type="submit" chargement={envoi}>
          {libelleBouton}
        </Bouton>
      </div>
    </form>

      {/* hors du <form> : Entrée dans la modale ne doit pas soumettre l'événement */}
      <ModaleNouveauLieu
        ouverte={nouveauLieu}
        onFermer={() => setNouveauLieu(false)}
        onCree={(lieu) => {
          onLieuCree(lieu)
          setLieuId(String(lieu.id))
          setNouveauLieu(false)
        }}
      />
    </>
  )
}

/** Création rapide d'un lieu (référentiel partagé : nom, ville, région, capacité). */
export function ModaleNouveauLieu({
  ouverte,
  onFermer,
  onCree,
  nomInitial,
}: {
  ouverte: boolean
  onFermer: () => void
  onCree: (lieu: Lieu) => void
  /** Nom déjà tapé dans la recherche, repris à l'ouverture */
  nomInitial?: string
}) {
  const [nom, setNom] = useState("")
  const [ville, setVille] = useState("")
  // région de l'entreprise par défaut ; préremplie d'après la ville quand elle est connue
  const [region, setRegion] = useState(REGION_ENTREPRISE)
  const [capacite, setCapacite] = useState("")
  const [envoi, setEnvoi] = useState(false)
  const idRegions = useId()

  useEffect(() => {
    if (ouverte && nomInitial) setNom(nomInitial)
  }, [ouverte, nomInitial])

  const creer = async () => {
    if (!nom.trim()) return
    setEnvoi(true)
    try {
      const lieu = await createLieu({
        nom: nom.trim(),
        ville: ville.trim() || null,
        region: region.trim() || null,
        adresse: null,
        capacite: capacite ? Number(capacite) : null,
      })
      toast.success(`Lieu '${lieu.nom}' créé.`)
      setNom("")
      setVille("")
      setRegion(REGION_ENTREPRISE)
      setCapacite("")
      onCree(lieu)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le lieu n'a pas été créé.")
    } finally {
      setEnvoi(false)
    }
  }

  // formulaire imbriqué : on n'utilise pas <form> pour ne pas soumettre le formulaire parent
  return (
    <Modale ouverte={ouverte} titre="Nouveau lieu" onFermer={onFermer}>
      <div className="space-y-4">
        <Champ libelle="Nom" requis>
          {(id) => <input id={id} value={nom} onChange={(e) => setNom(e.target.value)} className={classeChamp} placeholder="Ex. Salle des fêtes" />}
        </Champ>
        <Champ libelle="Ville">
          {(id) => (
            <input
              id={id}
              value={ville}
              onChange={(e) => {
                setVille(e.target.value)
                const r = regionDeLaVille(e.target.value)
                if (r) setRegion(r)
              }}
              className={classeChamp}
              placeholder="Ex. Fianarantsoa"
            />
          )}
        </Champ>
        <Champ libelle="Région" aide="Choisissez dans la liste ou tapez le nom de la région.">
          {(id) => (
            <>
              <input id={id} list={idRegions} value={region} onChange={(e) => setRegion(e.target.value)} className={classeChamp} placeholder="Ex. Haute Matsiatra" />
              <datalist id={idRegions}>
                {REGIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </>
          )}
        </Champ>
        <Champ libelle="Capacité" aide="Sert à estimer la participation dans les recommandations.">
          {(id) => (
            <input id={id} type="number" min={1} value={capacite} onChange={(e) => setCapacite(e.target.value)} className={classeChamp} />
          )}
        </Champ>
        <div className="flex justify-end gap-2 pt-2">
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="button" onClick={creer} chargement={envoi} disabled={!nom.trim()}>
            Créer le lieu
          </Bouton>
        </div>
      </div>
    </Modale>
  )
}
