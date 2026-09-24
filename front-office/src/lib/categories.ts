import {
  Music,
  Mic2,
  Drama,
  Trophy,
  PartyPopper,
  Presentation,
  Palette,
  Church,
  Baby,
  UtensilsCrossed,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

/** Associe une icône à une catégorie d'après son nom (les catégories sont libres côté back-office). */
const REGLES: [RegExp, LucideIcon][] = [
  [/concert|musique|music|live/i, Music],
  [/cabaret|karaok|chant|slam/i, Mic2],
  [/th[eé][aâ]tre|spectacle|humour|danse|com[eé]die/i, Drama],
  [/sport|foot|match|basket|tournoi|course/i, Trophy],
  [/soir[eé]e|f[eê]te|festival|night|bal/i, PartyPopper],
  [/conf[eé]rence|atelier|formation|salon|forum/i, Presentation],
  [/expo|art|cin[eé]ma|culture/i, Palette],
  [/culte|religi|gospel|[eé]glise/i, Church],
  [/enfant|famille|kids/i, Baby],
  [/gastro|cuisine|food|d[eé]gustation/i, UtensilsCrossed],
]

export function iconeCategorie(nom: string | null | undefined): LucideIcon {
  if (!nom) return Sparkles
  return REGLES.find(([re]) => re.test(nom))?.[1] ?? Sparkles
}
