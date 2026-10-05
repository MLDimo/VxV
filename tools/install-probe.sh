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

# Textures of the design test, made from the website's images with macOS's sips: the tavern in the middle of a
# 2048x1024 texture (cut to an even 1588 pixels wide first), the d20 at its own size, as TGA and PNG.
readonly images="$(cd "$(dirname "$0")/.." && pwd)/apps/web/public/images"
readonly media="$addons_dir/VXV_Probe/Media"
readonly work="$(mktemp -d)"
sips -c 672 1588 "$images/taverne.jpg" --out "$work/taverne.jpg" >/dev/null
sips --padToHeightWidth 1024 2048 --padColor 000000 "$work/taverne.jpg" --out "$work/taverne-2048.jpg" >/dev/null
sips -s format png "$work/taverne-2048.jpg" --out "$media/taverne.png" >/dev/null
sips -s format tga "$work/taverne-2048.jpg" --out "$media/taverne.tga" >/dev/null
cp "$images/d20.png" "$media/d20.png"
sips -s format tga "$media/d20.png" --out "$media/d20.tga" >/dev/null
rm -rf "$work"
echo "VXV_Probe installé dans $addons_dir. En jeu : /reload (ou redémarrer si c'est la première installation)."
