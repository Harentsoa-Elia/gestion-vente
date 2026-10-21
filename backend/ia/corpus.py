"""Construction du corpus de commentaires étiquetés (positif, neutre, négatif) pour le module d'analyse des sentiments.

Aucun jeu de commentaires d'événements malgaches étiqueté n'étant disponible, le corpus a été construit pour le projet :
- commentaires.csv : corpus d'entraînement (colonne modele : modèle de phrase d'origine), obtenu en combinant des modèles de phrases rédigés à la main (français et
  malgache) avec le vocabulaire de la plateforme (artistes, lieux, types d'événement) ;
- test_independant.csv : commentaires rédigés séparément, sans ces modèles, pour mesurer la performance sur des phrases
  que le modèle n'a jamais vues sous aucune forme.

Lancement : python ia/corpus.py  (depuis le dossier backend)
"""
import csv
import random
from itertools import product
from pathlib import Path

DOSSIER = Path(__file__).resolve().parent / "donnees"
GRAINE = 2026

ARTISTES = ["Mahaleo", "Rajery", "Erick Manana", "Justin Vali", "Samoëla", "Ambondrona", "Jaojoby", "Tence Mena",
            "Shyn", "Wawa", "Dama", "Bodo", "Lola", "Arione Joy", "Nanie", "Rossy"]
LIEUX = ["le Stade de Fianarantsoa", "la Table du Rova", "Zomatel", "Bateravola", "la Chaudière", "l'Alliance française",
         "la Résidence Matsiatra", "le Tsara Guest House", "la place de l'Indépendance", "l'Espace Royal"]
TYPES = ["concert", "festival", "soirée", "gala", "spectacle", "hira gasy", "stand-up", "match", "salon", "cabaret"]
LIEUX_MG = ["Stade", "Rova", "Bateravola", "Zomatel", "Antsororokavo", "Tanana Ambony", "Isada", "Ampasambazaha"]

# --- modèles de phrases : {a} artiste, {l} lieu, {t} type d'événement, {lm} lieu en malgache
POSITIF = [
    "Trop hâte de voir {a} !", "{a} en live, ça va être magnifique", "Excellent choix, {a} est parfait pour ce {t}",
    "Je vote pour {a} sans hésiter", "Super idée de faire le {t} à {l}", "{l} est idéal, il y a de la place pour tout le monde",
    "Enfin un vrai {t} à Fianar !", "On sera là avec toute la famille", "Bravo aux organisateurs, très belle initiative",
    "J'adore {a}, je viendrai c'est sûr", "Génial, j'ai déjà réservé ma place", "Le meilleur choix possible pour un {t}",
    "Ce sera la soirée de l'année", "Très bonne idée, on attendait ça depuis longtemps", "{a} au {t}, c'est un rêve",
    "Parfait pour l'ambiance, {l} est top", "Je recommande vivement, {a} est incroyable sur scène",
    "Merci pour ce {t}, vivement le jour J", "Magnifique programme, bravo", "Quelle belle affiche !",
    "Ça va être génial, on vient à cinq", "{l}, c'est le lieu parfait", "Un {t} avec {a}, je ne raterai ça pour rien au monde",
    "Top, enfin du bon son à Fianarantsoa", "Belle organisation, comme l'an dernier", "Super, mes amis sont déjà motivés",
    "Tsara be ity {t} ity !", "Mahafinaritra ! Ho avy izahay", "Tena tiako {a}", "Mankasitraka ny mpikarakara",
    "Faly be aho fa ho avy {a}", "Andrasana fatratra ity {t} ity", "Tsara indrindra ny any {lm}", "Ho avy miaraka amin'ny fianakaviana izahay",
    "Tsy hivily aho, ho eo aho", "Tena mendrika {a}", "Misaotra betsaka ny mpikarakara", "Mahafinaritra ny hevitra",
    "Tsara be, ho avy daholo ny namako", "{a} no tiako indrindra",
    "C'est une très belle surprise", "Nous serons au rendez-vous", "Une affiche pareille, on ne la voit pas souvent",
    "Ça me rappelle de très bons souvenirs", "On a passé un moment formidable l'an dernier", "Rien que pour {a}, je viens",
    "Les enfants sont ravis", "Je partage avec tous mes amis", "Bonne continuation à toute l'équipe", "Je suis conquis",
    "C'est le genre d'événement qui manquait à la ville", "Ça donne envie", "Belle façon de soutenir les artistes locaux",
    "J'ai pris mes billets dès l'ouverture", "Le cadre de {l} est superbe", "Je suis très content de ce choix",
    "Ambiance assurée avec {a}", "Le prix est raisonnable pour un tel {t}", "Organisation sérieuse, on peut faire confiance",
    "Merci d'avoir écouté le public", "Hâte d'y être avec ma bande", "Un plaisir de voir ça à Fianarantsoa",
    "C'est une réussite à chaque édition", "Vous avez fait le bon choix", "Je reviendrai l'année prochaine aussi",
    "Le meilleur {t} de la région", "Tout est réuni pour une super soirée", "Quel talent, {a} mérite cette scène",
    "Mahafaly ahy be ity vaovao ity", "Tena hevitra tsara", "Ho tonga tokoa aho", "Tiako be ny toerana any {lm}",
    "Mendrika ny hotohanana ity", "Tena andrasako ity", "Ho tsara be ny hetsika", "Misaotra nihaino ny vahoaka",
]
NEGATIF = [
    "{l} est beaucoup trop loin pour nous", "Trop cher pour un {t}", "Je n'aime pas du tout cet artiste",
    "Mauvais choix, {l} est trop petit", "Déçu, l'an dernier l'organisation était catastrophique", "Les billets sont hors de prix",
    "Cet artiste ? Non merci, c'est toujours la même chose", "Il n'y a jamais de place pour se garer à {l}",
    "Encore un {t} raté, je ne viendrai pas", "Le son était horrible la dernière fois", "Trop de monde et pas assez de sécurité",
    "C'est nul, proposez autre chose", "{l} est sale et mal éclairé", "Pas intéressé, ça ne vaut pas le prix",
    "Ennuyeux, toujours les mêmes artistes", "Franchement décevant comme programme", "On a attendu deux heures à l'entrée la dernière fois",
    "Mauvaise idée, il va pleuvoir à cette période", "Je déconseille {l}, l'accueil y est désagréable",
    "Le {t} est trop tard le soir, ce n'est pas sûr pour rentrer", "Prix abusif pour un seul artiste", "Non, pas encore le même groupe",
    "Organisation lamentable, aucune information", "Ça ne m'intéresse pas du tout", "Pire choix possible pour un {t}",
    "Lafo loatra ny tapakila", "Lavitra loatra ny any {lm}", "Tsy tiako io mpihira io", "Mankaleo ity {t} ity",
    "Tsy mety ny toerana", "Diso fanantenana aho tamin'ny farany", "Ratsy ny feo tamin'ny taon-dasa", "Tsy ho avy aho, lafo loatra",
    "Be loatra ny olona, tsy misy filaminana", "Tsy mendrika ny vidiny", "Ratsy fikarakarana", "Tsy tiako mihitsy ity hevitra ity",
    "Je ne viendrai pas cette fois", "C'est toujours mal organisé", "On n'entend rien au fond de la salle",
    "Les toilettes étaient dans un état lamentable", "L'accueil a été désagréable", "Personne ne répond aux messages",
    "Vraiment pas terrible", "Le son saturait tout le temps", "On s'est fait bousculer à l'entrée", "Aucun intérêt pour moi",
    "Le spectacle a commencé avec trois heures de retard", "C'était mieux avant", "Je suis très déçu de ce choix",
    "Ce lieu ne convient pas du tout", "On paie cher pour pas grand-chose", "Une perte de temps",
    "L'éclairage était nul et la scène trop petite", "Je ne referai pas l'erreur d'y aller", "Ça manque cruellement de sécurité",
    "Mauvais rapport qualité-prix", "Votre programme est vraiment faible", "Je n'ai pas apprécié du tout la dernière édition",
    "Trop d'attente et aucune explication", "Le {t} est encore à {l}, quelle mauvaise idée", "Nul, tout simplement",
    "Les boissons étaient hors de prix", "Impossible de trouver un taxi pour rentrer", "Le public était irrespectueux",
    "Ratsy loatra ny fikarakarana", "Tsy nahafinaritra mihitsy", "Tsy mety amiko izany", "Very fotoana fotsiny",
    "Maloto ny toerana", "Tsy nisy filaminana", "Tara be no nanomboka", "Tsy mendrika ny vola naloa",
]
NEUTRE = [
    "Quel est le prix des billets pour le {t} ?", "À quelle heure commence le {t} ?", "Est-ce que {a} sera là le premier jour ?",
    "Il y aura un parking à {l} ?", "On peut payer avec Orange Money ?", "Les enfants paient combien ?",
    "C'est à quelle date exactement ?", "Est-ce qu'il y aura des places assises ?", "On peut acheter les billets sur place ?",
    "Le {t} est ouvert à tous les âges ?", "Combien de temps dure le {t} ?", "Je verrai selon mon emploi du temps",
    "Peut-être, ça dépend de la date", "Il faut réserver à l'avance pour {l} ?", "Qui d'autre est prévu à part {a} ?",
    "Y a-t-il une buvette sur place ?", "Est-ce que le {t} sera filmé ?", "Je ne connais pas encore {a}",
    "J'attends de voir le programme complet", "Où se trouve {l} exactement ?", "Il y a un bus depuis le centre-ville ?",
    "Le billet VIP comprend quoi ?", "Je viendrai si je suis à Fianarantsoa ce jour-là", "On peut venir avec un appareil photo ?",
    "Ohatrinona ny tapakila ?", "Amin'ny firy no manomboka ?", "Aiza no hanaovana azy ?", "Rahoviana no hivarotra tapakila ?",
    "Mbola hiandry ny fandaharana aho", "Misy fiara mitondra any {lm} ve ?", "Afaka mandoa amin'ny MVola ve ?",
    "Ho hitako eo ihany", "Ankizy afaka miditra ve ?", "Hafiriana no haharetany ?", "Mbola tsy fantatro {a}",
    "Merci pour l'information, je regarde", "Je vais en parler à mes amis avant de décider", "Pas encore décidé",
    "On verra le moment venu", "Je ne sais pas encore si je serai libre", "Le lieu sera confirmé quand ?",
    "Les détails seront publiés sur le site ?", "Je prendrai peut-être un billet", "Il faut une tenue particulière ?",
    "Ça commence le matin ou le soir ?", "Je suis curieux de voir le programme", "Les mineurs doivent être accompagnés ?",
    "Est-ce qu'on reçoit le billet par e-mail ?", "J'ai une question sur le remboursement", "Le {t} a lieu chaque année ?",
    "On peut réserver pour un groupe ?", "Il y a une réduction pour les étudiants ?", "Je regarde mon planning",
    "C'est le même prix sur place ?", "La date peut encore changer ?", "Je demande à mon frère s'il vient",
    "Quels sont les moyens de paiement acceptés ?", "On aura le nom des artistes bientôt ?", "Le lieu est accessible en taxi-be ?",
    "Mbola hieritreritra aho", "Hojereko aloha ny fotoana", "Misy fihenam-bidy ho an'ny mpianatra ve ?",
    "Mila manao akanjo manokana ve ?", "Hotononinareo ve ny anaran'ny mpanakanto ?", "Mbola hiresaka amin'ny namako aho",
    "Rahoviana no ho fantatra ny toerana ?", "Alefa amin'ny mailaka ve ny tapakila ?",
]
COMPLEMENTS = ["", "", "", " !", " !!", " :)", " :D", " ;)", " haha", " vraiment", " franchement", " sérieusement"]
COMPLEMENTS_NEG = ["", "", "", " !", " :(", " :-(", " franchement", " vraiment", " dommage"]
COMPLEMENTS_NEU = ["", "", "", " ?", " merci", " svp", " merci d'avance", " misaotra"]


def remplir(modele, rnd):
    return modele.format(a=rnd.choice(ARTISTES), l=rnd.choice(LIEUX), t=rnd.choice(TYPES), lm=rnd.choice(LIEUX_MG))


def variante(texte, rnd, complements):
    t = texte.rstrip(" !?.") if rnd.random() < 0.3 else texte
    t = t + rnd.choice(complements)
    r = rnd.random()
    if r < 0.15:
        t = t.lower()
    elif r < 0.2:
        t = t.upper()
    if rnd.random() < 0.15:  # fautes de frappe courantes : accents oubliés
        t = t.replace("é", "e").replace("è", "e").replace("à", "a").replace("ç", "c")
    return " ".join(t.split())


def generer(modeles, etiquette, n, rnd, complements):
    vus, lignes = set(), []
    essais = 0
    while len(lignes) < n and essais < n * 50:
        essais += 1
        i = rnd.randrange(len(modeles))
        t = variante(remplir(modeles[i], rnd), rnd, complements)
        if t not in vus:
            vus.add(t); lignes.append((t, etiquette, f"{etiquette[:3]}{i:02d}"))
    return lignes


# --- commentaires rédigés séparément, pour le test indépendant (aucun ne vient des modèles ci-dessus)
TEST_INDEPENDANT = [
    ("Vivement samedi, on a hâte de danser !", "positif"), ("Quelle bonne nouvelle pour la ville", "positif"),
    ("Le plateau est magnifique cette année", "positif"), ("Je suis fan, merci de l'avoir invité", "positif"),
    ("Une soirée comme ça, ça fait du bien", "positif"), ("Les jeunes de Fianar vont adorer", "positif"),
    ("C'est exactement ce qu'il nous fallait", "positif"), ("Ambiance garantie, je prends trois billets", "positif"),
    ("Superbe affiche, bravo l'équipe", "positif"), ("Il était temps ! Merci", "positif"),
    ("Formidable, je ramène mes collègues", "positif"), ("Je l'ai vu à Tana, c'était grandiose", "positif"),
    ("Rien de mieux pour finir l'année", "positif"), ("On compte les jours", "positif"),
    ("Un grand merci pour cette belle surprise", "positif"), ("Ce lieu est vraiment agréable le soir", "positif"),
    ("Mahafinaritra be ilay hira", "positif"), ("Tena faly izahay", "positif"), ("Tsara ny fandaharana", "positif"),
    ("Hanatrika aho tsy misy fisalasalana", "positif"), ("Hevitra tsara tokoa", "positif"),
    ("Mankasitraka anareo izahay", "positif"), ("Tsara tarehy ilay toerana", "positif"),
    ("Je suis impatient d'y être", "positif"), ("Excellente programmation", "positif"),
    ("Le choix du public est le bon", "positif"), ("Tout le quartier en parle déjà", "positif"),
    ("Ça promet d'être inoubliable", "positif"), ("Merci de penser aux provinces", "positif"),
    ("Mon artiste préféré, quelle joie", "positif"),
    ("Franchement trop cher pour des étudiants", "negatif"), ("La salle est minuscule, on va étouffer", "negatif"),
    ("Encore lui ? On en a marre", "negatif"), ("L'entrée était un vrai chaos l'année passée", "negatif"),
    ("Aucune envie d'y aller", "negatif"), ("Ce lieu est impossible d'accès quand il pleut", "negatif"),
    ("Le dernier concert était une arnaque", "negatif"), ("Je trouve ce choix vraiment mauvais", "negatif"),
    ("Les organisateurs ne respectent jamais les horaires", "negatif"), ("Sono pourrie et lumière nulle", "negatif"),
    ("C'est beaucoup trop loin du centre", "negatif"), ("Je regrette d'avoir payé la dernière fois", "negatif"),
    ("Mauvaise ambiance, des bagarres à chaque fois", "negatif"), ("Programme sans intérêt", "negatif"),
    ("Tsy misy dikany", "negatif"), ("Lafo be ilay izy", "negatif"), ("Tsy mahaliana ahy", "negatif"),
    ("Ratsy be ny toerana", "negatif"), ("Sosotra aho tamin'ny farany", "negatif"), ("Tsy hanatrika aho", "negatif"),
    ("Toerana maloto sady maizina", "negatif"), ("Je ne recommande pas du tout", "negatif"),
    ("Encore une organisation bâclée", "negatif"), ("Ça ne vaut vraiment pas le déplacement", "negatif"),
    ("Le parking est un cauchemar là-bas", "negatif"), ("Prix scandaleux", "negatif"),
    ("Trop de bruit, les voisins vont se plaindre", "negatif"), ("Ils annulent toujours au dernier moment", "negatif"),
    ("Déception totale", "negatif"), ("Je préfère rester chez moi", "negatif"),
    ("Les portes ouvrent à quelle heure ?", "neutre"), ("Faut-il imprimer le billet ?", "neutre"),
    ("Y aura-t-il une deuxième date ?", "neutre"), ("Le paiement par Airtel Money marche ?", "neutre"),
    ("Combien de places restent-il ?", "neutre"), ("On peut entrer avec de la nourriture ?", "neutre"),
    ("C'est en plein air ou en salle ?", "neutre"), ("Je verrai plus tard", "neutre"),
    ("Le programme sort quand ?", "neutre"), ("Qui assure la première partie ?", "neutre"),
    ("Je dois d'abord demander à ma femme", "neutre"), ("Il y a une limite d'âge ?", "neutre"),
    ("Les billets se vendent où en ville ?", "neutre"), ("On peut changer la date du billet ?", "neutre"),
    ("Mbola tsy azoko antoka", "neutre"), ("Firy ny sarany ho an'ny ankizy ?", "neutre"),
    ("Aiza no ahazoana tapakila ?", "neutre"), ("Misy toerana fipetrahana ve ?", "neutre"),
    ("Rahoviana no hifarana ?", "neutre"), ("Afaka miditra amin'ny tapakila an-telefaona ve ?", "neutre"),
    ("Hijery aloha aho", "neutre"), ("Est-ce accessible en fauteuil roulant ?", "neutre"),
    ("Le concert sera retransmis à la radio ?", "neutre"), ("Peut-on acheter pour quelqu'un d'autre ?", "neutre"),
    ("J'attends la confirmation du lieu", "neutre"), ("Il y a un vestiaire ?", "neutre"),
    ("Quel est le dress code ?", "neutre"), ("Les billets sont nominatifs ?", "neutre"),
    ("On sera fixé la semaine prochaine", "neutre"), ("À voir selon la météo", "neutre"),
]


def main():
    rnd = random.Random(GRAINE)
    lignes = (generer(POSITIF, "positif", 700, rnd, COMPLEMENTS) + generer(NEGATIF, "negatif", 700, rnd, COMPLEMENTS_NEG)
              + generer(NEUTRE, "neutre", 700, rnd, COMPLEMENTS_NEU))
    textes_test = {t for t, _ in TEST_INDEPENDANT}
    lignes = [l for l in lignes if l[0] not in textes_test]
    rnd.shuffle(lignes)
    DOSSIER.mkdir(exist_ok=True)
    for nom, entete, contenu in (("commentaires.csv", ["texte", "sentiment", "modele"], lignes),
                                 ("test_independant.csv", ["texte", "sentiment"], TEST_INDEPENDANT)):
        with open(DOSSIER / nom, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(entete)
            w.writerows(contenu)
        print(f"{nom} : {len(contenu)} commentaires")


if __name__ == "__main__":
    main()
