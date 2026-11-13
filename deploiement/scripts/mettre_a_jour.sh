#!/usr/bin/env bash
# Met en ligne la dernière version poussée sur GitHub.
# Utilisation sur le serveur :  sudo bash /opt/guichetweb/deploiement/scripts/mettre_a_jour.sh
set -euo pipefail
APP=/opt/guichetweb
BRANCHE=${1:-$(sudo -u guichetweb git -C "$APP" rev-parse --abbrev-ref HEAD)}

echo "== 1/6 Sauvegarde de la base avant la mise à jour"
bash "$APP/deploiement/scripts/sauvegarder_base.sh"

echo "== 2/6 Récupération du code (branche $BRANCHE)"
sudo -u guichetweb git -C "$APP" fetch origin
sudo -u guichetweb git -C "$APP" checkout "$BRANCHE"
sudo -u guichetweb git -C "$APP" pull --ff-only origin "$BRANCHE"

echo "== 3/6 Dépendances Python et migrations de la base"
sudo -u guichetweb "$APP/backend/venv/bin/pip" install -q -r "$APP/backend/requirements.txt"
( cd "$APP/backend" && sudo -u guichetweb "$APP/backend/venv/bin/alembic" upgrade head )

echo "== 4/6 Construction du site"
( cd "$APP/front-office" && sudo -u guichetweb npm ci --no-audit --no-fund && sudo -u guichetweb npm run build )
sudo -u guichetweb cp -r "$APP/front-office/public" "$APP/front-office/.next/standalone/"
sudo -u guichetweb cp -r "$APP/front-office/.next/static" "$APP/front-office/.next/standalone/.next/"

echo "== 5/6 Redémarrage des services"
systemctl restart guichetweb-api guichetweb-web

echo "== 6/6 Vérification"
sleep 3
systemctl --no-pager --lines=0 status guichetweb-api guichetweb-web | grep -E "●|Active:"
curl -s -o /dev/null -w "API : HTTP %{http_code}\n" http://127.0.0.1:8888/docs
curl -s -o /dev/null -w "Site : HTTP %{http_code}\n" http://127.0.0.1:4000/
echo "Mise à jour terminée."
