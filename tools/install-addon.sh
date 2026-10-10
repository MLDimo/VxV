#!/usr/bin/env bash
# Builds the addon as a release would (development version) and copies its bundles into a game client.
# Usage: tools/install-addon.sh <dossier du client, ex. ".../World of Warcraft/_classic_beta_">
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <dossier du client WoW>" >&2
  exit 1
fi

readonly repository="$(cd "$(dirname "$0")/.." && pwd)"
readonly addons_dir="$1/Interface/AddOns"

if [[ ! -d "$addons_dir" ]]; then
  echo "Dossier AddOns introuvable : $addons_dir" >&2
  exit 1
fi

cd "$repository"
npm run --silent generate
npm run --silent release:prepare -- "0.0.0-dev.$(date +%Y%m%d%H%M)"
# The folders of the versions before the single addon (October 2026): VXV replaces them all.
shopt -s nullglob
for legacy in "$addons_dir"/VXV_{Core,Sync,Raid,Paris,Deathroll,Missions,Titles,Artisans,Ranking,PvP} \
  "$addons_dir"/VXV_Data_*; do
  [[ -e "$legacy" ]] || continue
  rm -rf "$legacy"
  echo "$(basename "$legacy") retiré (remplacé par VXV)"
done
for bundle in dist/release/VXV/*/; do
  name="$(basename "$bundle")"
  rsync -a --delete --exclude '._*' --exclude '.DS_Store' "$bundle" "$addons_dir/$name/"
  echo "$name installé"
done
echo "En jeu : /reload (ou redémarrer si c'est la première installation), puis /vxv."
