import {
  Baby,
  Church,
  Clapperboard,
  Disc3,
  Drama,
  Drum,
  Gamepad2,
  GraduationCap,
  Goal,
  Handshake,
  HeartHandshake,
  Laugh,
  Medal,
  Mic,
  Mic2,
  Mountain,
  Music,
  Palette,
  PartyPopper,
  Rocket,
  Shirt,
  Store,
  Swords,
  Ticket,
  UtensilsCrossed,
  Volleyball,
  Wine,
  type LucideIcon,
} from "lucide-react"

/**
 * Associe une icône à une catégorie d'après son nom (les catégories sont libres côté back-office).
 * L'ordre compte : la première règle qui correspond l'emporte, d'où les cas précis avant les cas généraux
 * ("Arts martiaux" avant "art", "Rencontre professionnelle" avant "conférence"...).
 */
const REGLES: [RegExp, LucideIcon][] = [
  [/humour|stand[- ]?up|com[eé]die/i, Laugh],
  [/d[eé]fil[eé]|mode|fashion/i, Shirt],
  [/cin[eé]ma|projection|film/i, Clapperboard],
  [/e-?sport|jeux? vid[eé]o|gaming/i, Gamepad2],
  [/foot/i, Goal],
  [/basket|volley|hand/i, Volleyball],
  [/martia|boxe|combat|lutte|karat|judo/i, Swords],
  [/sport|match|tournoi|course|marathon|rugby|athl/i, Medal],
  [/caritati|solidari|humanitaire|charit/i, HeartHandshake],
  [/excursion|randonn|trek|nature|plein air/i, Mountain],
  [/rencontre|networking|affaires|b2b/i, Handshake],
  [/lancement|produit|launch/i, Rocket],
  [/salon|foire|march[eé]|expo-?vente/i, Store],
  [/s[eé]minaire|formation|atelier|workshop/i, GraduationCap],
  [/conf[eé]rence|forum|d[eé]bat|talk/i, Mic],
  [/hira gasy|traditionnel|folklor|tambour/i, Drum],
  [/gala|d[iî]ner|cocktail|r[eé]ception/i, Wine],
  [/clubbing|club|dj|night/i, Disc3],
  [/concert|musique|music|live/i, Music],
  [/cabaret|karaok|chant|slam/i, Mic2],
  [/th[eé][aâ]tre|spectacle|danse/i, Drama],
  [/soir[eé]e|f[eê]te|festival|bal/i, PartyPopper],
  [/culte|religi|gospel|[eé]glise/i, Church],
  [/enfant|famille|kids/i, Baby],
  [/gastro|cuisine|food|d[eé]gustation/i, UtensilsCrossed],
  [/expo|art|culture|peinture/i, Palette],
]

export function iconeCategorie(nom: string | null | undefined): LucideIcon {
  if (!nom) return Ticket
  return REGLES.find(([re]) => re.test(nom))?.[1] ?? Ticket
}
