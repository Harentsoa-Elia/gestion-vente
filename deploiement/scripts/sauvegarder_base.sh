#!/usr/bin/env bash
# Sauvegarde la base PostgreSQL de guichetweb dans /var/backups/guichetweb (garde les 14 dernières).
# Utilisation :  sudo bash /opt/guichetweb/deploiement/scripts/sauvegarder_base.sh
set -euo pipefail
DOSSIER=/var/backups/guichetweb
mkdir -p "$DOSSIER"
FICHIER="$DOSSIER/guichetweb_$(date +%Y-%m-%d_%H%M).dump"
sudo -u postgres pg_dump -Fc guichetweb > "$FICHIER"
ls -1t "$DOSSIER"/guichetweb_*.dump | tail -n +15 | xargs -r rm --
echo "Sauvegarde : $FICHIER ($(du -h "$FICHIER" | cut -f1))"
