import { Outfit, Yellowtail } from "next/font/google"

// Titres : géométrique, gras et serré, dans l'esprit de HelloAsso.
export const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

// Écriture manuscrite, réservée au mot mis en avant dans le hero (comme le modèle).
export const yellowtail = Yellowtail({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
})

export const variablesPolices = `${outfit.variable} ${yellowtail.variable}`
