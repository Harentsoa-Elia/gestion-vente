"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import type { Categorie, Evenement, Lieu } from "@/types"
import type { EvenementSaisie } from "@/services/evenementService"
import { createLieu } from "@/services/referentielService"
import { Bouton, Champ, Modale, classeChamp, isoVersSaisie, saisieVersIso } from "./ui"

/*
 * Formulaire d'un événement, utilisé pour la création (modale de « Mes événements »)
 * et la modification (onglet « Informations » de la fiche).
 * Le lieu et la catégorie sont facultatifs tant que l'événement est en préparation :
 * ils seront souvent choisis grâce aux votes du public.
 */

export function FormulaireEvenement({
  initial,
  lieux,
  categories,
  onLieuCree,
  onEnregistrer,
  libelleBouton,
  onAnnuler,
}: {
  initial?: Evenement
  lieux: Lieu[]
  categories: Categorie[]
  onLieuCree: (lieu: Lieu) => void
  onEnregistrer: (saisie: EvenementSaisie) => Promise<void>
  libelleBouton: string
  onAnnuler?: () => void
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
      })
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
                {lieux.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.ville ? `${l.nom} (${l.ville})` : l.nom}
                  </option>
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

/** Création rapide d'un lieu (référentiel partagé : nom, ville, capacité). */
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
  const [capacite, setCapacite] = useState("")
  const [envoi, setEnvoi] = useState(false)

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
        adresse: null,
        capacite: capacite ? Number(capacite) : null,
      })
      toast.success(`Lieu « ${lieu.nom} » créé.`)
      setNom("")
      setVille("")
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
          {(id) => <input id={id} value={ville} onChange={(e) => setVille(e.target.value)} className={classeChamp} placeholder="Ex. Antananarivo" />}
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
