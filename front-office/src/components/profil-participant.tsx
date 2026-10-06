"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertCircle, BadgeCheck, CalendarDays, Loader2, Mail, MailWarning, Phone, User } from "lucide-react"
import type { Genre, Participant } from "@/types"
import { fetchParticipantMe, updateParticipantMe } from "@/services/participantService"
import { formaterTelephone, normaliserTelephone } from "@/lib/billetterie"
import { BoutonAuth, ChampAuth, ChoixSegmente, MessageErreur } from "@/components/auth/cadre-auth"

/*
 * « Mon profil » (participant) : compléter ou corriger son téléphone, son genre et sa date de naissance.
 * Les comptes créés avant que ces champs soient demandés à l'inscription peuvent ainsi être complétés.
 * Le téléphone est aussi retenu automatiquement au premier paiement Mobile Money.
 */

const GENRES: { valeur: Genre; libelle: string }[] = [
  { valeur: "Feminin", libelle: "Femme" },
  { valeur: "Masculin", libelle: "Homme" },
  { valeur: "Autre", libelle: "Autre" },
]

export function ProfilParticipant() {
  const [profil, setProfil] = useState<Participant | null>(null)
  const [prenom, setPrenom] = useState("")
  const [nom, setNom] = useState("")
  const [telephone, setTelephone] = useState("")
  const [genre, setGenre] = useState<Genre | "">("")
  const [naissance, setNaissance] = useState("")
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState("")

  const remplir = (p: Participant) => {
    setProfil(p)
    setPrenom(p.prenom)
    setNom(p.nom)
    setTelephone(p.telephone ?? "")
    setGenre(p.genre ?? "")
    setNaissance(p.date_naissance ?? "")
  }

  useEffect(() => {
    fetchParticipantMe()
      .then(remplir)
      .catch((e) => setErreur(e instanceof Error ? e.message : "Chargement impossible."))
  }, [])

  if (!profil) {
    return erreur ? (
      <MessageErreur>{erreur}</MessageErreur>
    ) : (
      <p className="flex items-center gap-2 text-gw-texte-doux">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
      </p>
    )
  }

  const manquants = [!profil.telephone && "téléphone", !profil.genre && "genre", !profil.date_naissance && "date de naissance"].filter(Boolean)
  const aujourdhui = new Date().toISOString().slice(0, 10)

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    setErreur("")
    const numero = normaliserTelephone(telephone)
    if (numero && !/^03[2-8]\d{7}$/.test(numero)) return setErreur("Numéro invalide : 10 chiffres, ex. 034 12 345 67.")
    if (!prenom.trim() || !nom.trim()) return setErreur("Le prénom et le nom sont obligatoires.")
    setEnvoi(true)
    try {
      const p = await updateParticipantMe({
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: numero || null,
        genre: genre || null,
        date_naissance: naissance || null,
      })
      remplir(p)
      toast.success("Profil enregistré.")
      // l'en-tête relit la session au retour sur l'onglet : on le prévient tout de suite
      window.dispatchEvent(new Event("focus"))
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Le profil n'a pas été enregistré.")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="space-y-6">
      {manquants.length > 0 && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Complétez votre profil : il manque <strong>{manquants.join(", ")}</strong>.
          </p>
        </div>
      )}

      <form onSubmit={enregistrer} className="space-y-7 rounded-3xl bg-white p-6 ring-1 ring-gw-bordure sm:p-8">
        {/* e-mail : identifiant de connexion, non modifiable ici */}
        <div>
          <p className="mb-1 text-xs font-semibold text-gw-texte-doux">Adresse e-mail</p>
          <p className="flex items-center gap-2 text-[15px] text-gw-nuit">
            <Mail className="h-[18px] w-[18px] text-gw-texte-doux/70" aria-hidden />
            {profil.email}
          </p>
          {profil.email_verifie ? (
            <p className="mt-1 inline-flex items-center gap-1 pl-7 text-xs font-semibold text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Adresse confirmée
            </p>
          ) : (
            <Link href="/participants/verifier-email?redirect=/participants/profil" className="mt-1 inline-flex items-center gap-1 pl-7 text-xs font-semibold text-amber-700 hover:underline">
              <MailWarning className="h-3.5 w-3.5" aria-hidden /> Confirmer mon adresse
            </Link>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <ChampAuth libelle="Prénom" icone={User} value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" required />
          <ChampAuth libelle="Nom" icone={User} value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" required />
        </div>
        <ChampAuth
          libelle="Téléphone"
          icone={Phone}
          type="tel"
          inputMode="tel"
          value={formaterTelephone(telephone)}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="034 12 345 67"
          autoComplete="tel-national"
        />
        <ChampAuth
          libelle="Date de naissance"
          icone={CalendarDays}
          type="date"
          value={naissance}
          onChange={(e) => setNaissance(e.target.value)}
          max={aujourdhui}
          autoComplete="bday"
        />
        <ChoixSegmente libelle="Genre" options={GENRES} valeur={genre} onChange={(g) => setGenre(g)} />

        <MessageErreur>{erreur}</MessageErreur>

        <div className="flex justify-end border-t border-gw-bordure pt-6">
          <BoutonAuth type="submit" chargement={envoi}>
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </BoutonAuth>
        </div>
      </form>
    </div>
  )
}
