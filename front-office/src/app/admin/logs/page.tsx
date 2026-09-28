import { redirect } from "next/navigation"

// ancien journal (texte d'exemple) : l'activité récente est dans la vue d'ensemble
export default function AncienJournal() {
  redirect("/admin")
}
