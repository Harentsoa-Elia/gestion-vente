# Déploiement de guichetweb sur un serveur Ubuntu 24.04 (sans Docker)

Ce guide met guichetweb en production sur le serveur Contabo, **à côté de l'application déjà installée**, sans la perturber.

## Vue d'ensemble

```
Internet ──► Nginx (ports 80 / 443, HTTPS)
               ├── /api/, /media/, /docs ──► API FastAPI   (127.0.0.1:8888, service guichetweb-api)
               └── tout le reste         ──► site Next.js (127.0.0.1:4000, service guichetweb-web)
                                                    │
                                     PostgreSQL (127.0.0.1:5432, base guichetweb)
```

- Le code est récupéré depuis GitHub dans `/opt/guichetweb`.
- L'API et le site tournent comme **services systemd** : ils démarrent avec le serveur et redémarrent seuls en cas d'arrêt.
- Ils n'écoutent que sur `127.0.0.1` : seul **Nginx** est accessible depuis Internet.
- Les secrets (mots de passe, clés) sont dans `/opt/guichetweb/backend/.env`, **jamais dans Git**.

| Fichier de ce dossier | Rôle |
|---|---|
| `backend.env.exemple` | Modèle du fichier `.env` de l'API en production |
| `front-office.env.exemple` | Modèle du fichier `.env.production` du site |
| `systemd/guichetweb-api.service` | Service qui lance l'API |
| `systemd/guichetweb-web.service` | Service qui lance le site |
| `nginx/guichetweb.conf` | Site Nginx (relais vers l'API et le site, HTTPS) |
| `scripts/mettre_a_jour.sh` | Met en ligne une nouvelle version poussée sur GitHub |
| `scripts/sauvegarder_base.sh` | Sauvegarde la base de données |

Dans tout le guide, les commandes se tapent **sur le serveur**, après connexion en SSH, et `VOTRE_DOMAINE` désigne votre nom de domaine (par exemple `guichetweb.mg`).

---

## Étape 1. Se connecter et faire l'inventaire

```bash
ssh root@ADRESSE_IP_DU_SERVEUR
```

Vérifier ce qui tourne déjà (ces commandes ne modifient rien) :

```bash
sudo ss -tlnp                                   # ports occupés
systemctl list-units --type=service --state=running | grep -E -i "nginx|apache|postgres|node|pm2"
node -v; python3 --version; psql --version      # versions déjà installées
```

À vérifier avant de continuer :

- **Les ports 8888 et 4000 doivent être libres.** S'ils sont pris par l'autre application, choisissez-en d'autres. Il faudra alors changer le port partout : dans les deux fichiers `.service`, dans `nginx/guichetweb.conf` et dans `front-office.env.exemple`.
- **Si Apache occupe les ports 80 et 443** au lieu de Nginx, ne continuez pas : signalez-le d'abord.

## Étape 2. Installer les logiciels nécessaires

```bash
sudo apt update
sudo apt install -y git nginx postgresql postgresql-contrib python3-venv python3-dev build-essential libpq-dev
```

- Si Nginx ou PostgreSQL sont déjà installés pour l'autre application, `apt` le signale et ne casse rien : on les **partage**.
- Pour **Node.js**, Next.js 15 demande la version 18.18 ou plus. Si `node -v` affiche une version plus récente, ne changez rien. Sinon, installez la version 22 :

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

## Étape 3. Créer l'utilisateur et récupérer le code

Un utilisateur système dédié, `guichetweb`, fait tourner l'application. Ce n'est pas `root` : si le site était attaqué, l'attaquant n'aurait pas tous les droits sur le serveur.

```bash
sudo adduser --system --group --home /opt/guichetweb guichetweb
sudo -u guichetweb git clone -b feature/site-public https://github.com/Harentsoa-Elia/gestion-vente.git /tmp/gw
sudo -u guichetweb bash -c 'shopt -s dotglob; mv /tmp/gw/* /opt/guichetweb/' && sudo rm -rf /tmp/gw
ls /opt/guichetweb     # doit afficher : backend  deploiement  front-office ...
```

> **Si le dépôt GitHub est privé**, `git clone` demande un identifiant. Dans ce cas, créez une « deploy key » : lancez `sudo -u guichetweb ssh-keygen -t ed25519`, copiez la clé publique affichée par `sudo cat /opt/guichetweb/.ssh/id_ed25519.pub` dans GitHub (dépôt → Settings → Deploy keys), puis clonez avec `git@github.com:Harentsoa-Elia/gestion-vente.git`.

## Étape 4. Créer la base de données

Générez d'abord un mot de passe composé uniquement de lettres et de chiffres, et notez-le. Les caractères `@ : / % #` casseraient l'adresse de connexion à la base.

```bash
openssl rand -hex 16
sudo -u postgres psql
```

Puis, dans PostgreSQL, avec ce mot de passe :

```sql
CREATE USER guichetweb WITH PASSWORD 'UN_MOT_DE_PASSE_SOLIDE';
CREATE DATABASE guichetweb OWNER guichetweb;
\q
```

L'utilisateur et la base sont propres à guichetweb : les données de l'autre application ne sont pas touchées.

## Étape 5. Installer et configurer l'API

```bash
cd /opt/guichetweb/backend
sudo -u guichetweb python3 -m venv venv
sudo -u guichetweb venv/bin/pip install -r requirements.txt
```

Créer le fichier des secrets à partir du modèle :

```bash
sudo -u guichetweb cp /opt/guichetweb/deploiement/backend.env.exemple /opt/guichetweb/backend/.env
sudo chmod 600 /opt/guichetweb/backend/.env
openssl rand -hex 32                                                               # → valeur de "secret"
venv/bin/python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"   # → QR_SECRET_KEY
sudo -u guichetweb nano /opt/guichetweb/backend/.env
```

Dans `nano`, remplacez chaque `METTRE_ICI_...` et `VOTRE_DOMAINE`, puis enregistrez avec `Ctrl+O`, `Entrée` et `Ctrl+X`.

> `QR_SECRET_KEY` chiffre les QR codes des billets. **Notez-la en lieu sûr et ne la changez plus jamais** après la première vente : sinon, les billets déjà vendus deviennent illisibles à l'entrée.

Créer les tables, puis le premier administrateur :

```bash
cd /opt/guichetweb/backend
sudo -u guichetweb venv/bin/alembic upgrade head        # crée les 20 tables
sudo -u guichetweb venv/bin/python -m scripts.creer_admin
```

Faire un essai à la main, puis l'arrêter avec `Ctrl+C` :

```bash
sudo -u guichetweb venv/bin/uvicorn main:app --host 127.0.0.1 --port 8888
# dans un second terminal SSH :  curl -I http://127.0.0.1:8888/docs   → "HTTP/1.1 200 OK"
```

## Étape 6. Construire le site

```bash
cd /opt/guichetweb/front-office
sudo -u guichetweb cp /opt/guichetweb/deploiement/front-office.env.exemple .env.production
sudo -u guichetweb npm ci
sudo -u guichetweb npm run build
sudo -u guichetweb cp -r public .next/standalone/
sudo -u guichetweb cp -r .next/static .next/standalone/.next/
```

`npm run build` prend quelques minutes. Il produit une version optimisée du site dans `.next/standalone`.

## Étape 7. Installer les deux services

```bash
sudo cp /opt/guichetweb/deploiement/systemd/guichetweb-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now guichetweb-api guichetweb-web
systemctl status guichetweb-api guichetweb-web      # les deux doivent être "active (running)"
```

En cas de problème, lire les journaux :

```bash
sudo journalctl -u guichetweb-api -n 50 --no-pager
sudo journalctl -u guichetweb-web -n 50 --no-pager
```

## Étape 8. Brancher le nom de domaine et Nginx

1. Chez votre fournisseur de domaine, créez un **enregistrement A** : `VOTRE_DOMAINE` → adresse IP du serveur. La propagation prend de quelques minutes à quelques heures. Vérifiez-la avec `ping VOTRE_DOMAINE`.
2. Installez le site Nginx :

```bash
sudo cp /opt/guichetweb/deploiement/nginx/guichetweb.conf /etc/nginx/sites-available/guichetweb
sudo sed -i 's/VOTRE_DOMAINE/votre-domaine-reel.mg/g' /etc/nginx/sites-available/guichetweb
sudo ln -s /etc/nginx/sites-available/guichetweb /etc/nginx/sites-enabled/
sudo nginx -t                  # doit afficher "syntax is ok" et "test is successful"
sudo systemctl reload nginx    # reload, pas restart : l'autre application n'est pas coupée
```

`nginx -t` vérifie la configuration **avant** de l'appliquer : si elle contient une erreur, l'autre application continue de tourner normalement.

## Étape 9. Activer le HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d VOTRE_DOMAINE
```

Certbot obtient un certificat gratuit Let's Encrypt, modifie le site Nginx pour le HTTPS et programme le renouvellement automatique. Vérifiez ensuite que `https://VOTRE_DOMAINE` s'ouvre.

## Étape 10. Pare-feu

**D'abord**, regardez l'état actuel, car l'autre application a peut-être déjà ses règles :

```bash
sudo ufw status
```

S'il est inactif, autorisez SSH **avant** de l'activer, sinon vous vous enfermez dehors :

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

S'il est déjà actif, ajoutez seulement `sudo ufw allow 'Nginx Full'`. Les ports 8888, 4000 et 5432 restent fermés depuis Internet.

## Étape 11. Sauvegardes automatiques

```bash
sudo crontab -e
```

Ajoutez cette ligne pour une sauvegarde chaque nuit à 2 h :

```
0 2 * * * bash /opt/guichetweb/deploiement/scripts/sauvegarder_base.sh >> /var/log/guichetweb-sauvegarde.log 2>&1
```

## Mettre en ligne une nouvelle version

Sur votre PC : modifiez le code, faites `git commit`, puis `git push`. Ensuite, sur le serveur :

```bash
sudo bash /opt/guichetweb/deploiement/scripts/mettre_a_jour.sh
```

Le script fait, dans l'ordre :
1. une sauvegarde de la base ;
2. un `git pull` ;
3. l'installation des dépendances ;
4. les migrations Alembic ;
5. la reconstruction du site ;
6. le redémarrage des services ;
7. une vérification.

## Aide-mémoire

| Besoin | Commande |
|---|---|
| État des services | `systemctl status guichetweb-api guichetweb-web` |
| Journaux en direct | `sudo journalctl -u guichetweb-api -f` |
| Redémarrer | `sudo systemctl restart guichetweb-api guichetweb-web` |
| Tester Nginx | `sudo nginx -t` |
| Restaurer une sauvegarde | `sudo -u postgres pg_restore --clean -d guichetweb /var/backups/guichetweb/FICHIER.dump` |
