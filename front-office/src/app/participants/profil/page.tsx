"use client"


import { t } from "@/lib/i18n"
import ParticipantAuthWrapper from "@/components/participant-auth-wrapper"
import { ProfilParticipant } from "@/components/profil-participant"

export default function ProfilPage() {
  return (
    <ParticipantAuthWrapper>
      <div className="min-h-screen bg-gw-fond px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-titre text-3xl font-bold tracking-[-0.02em] text-gw-encre sm:text-4xl">{t("Mon profil")}</h1>
          <p className="mt-2 mb-8 text-gw-texte-doux">{t("Ces informations aident les organisateurs à proposer des événements qui vous ressemblent.")}</p>
          <ProfilParticipant />
        </div>
      </div>
    </ParticipantAuthWrapper>
  )
}
