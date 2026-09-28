import { redirect } from "next/navigation"

// ancienne page du module concerts : remplacée par /admin/utilisateurs
export default function AncienneGestionUtilisateurs() {
  redirect("/admin/utilisateurs")
}
