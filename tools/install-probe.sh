#!/usr/bin/env bash
# Copies the probe into a game client's AddOns folder. Rerun after every change to tools/VXV_Probe.
# Usage: tools/install-probe.sh <dossier du client, ex. ".../World of Warcraft/_classic_beta_">
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <dossier du client WoW>" >&2
  exit 1
fi

readonly source_dir="$(cd "$(dirname "$0")" && pwd)/VXV_Probe/"
readonly addons_dir="$1/Interface/AddOns"

if [[ ! -d "$addons_dir" ]]; then
  echo "Dossier AddOns introuvable : $addons_dir" >&2
  exit 1
fi

rsync -a --delete --exclude '._*' --exclude '.DS_Store' "$source_dir" "$addons_dir/VXV_Probe/"
echo "VXV_Probe installé dans $addons_dir. En jeu : /reload (ou redémarrer si c'est la première installation)."
