#!/usr/bin/env bash
# Test 0.6: simulates the companion app by rewriting VXV_Probe/External/Inbox.lua.
# Usage: tools/write-inbox.sh <chemin du dossier AddOns/VXV_Probe> [taille en Ko, défaut 1]
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <dossier AddOns/VXV_Probe> [Ko]" >&2
  exit 1
fi

readonly addon_dir="$1"
readonly size_kb="${2:-1}"
readonly target="$addon_dir/External/Inbox.lua"

if [[ ! -f "$target" ]]; then
  echo "Fichier introuvable : $target" >&2
  exit 1
fi

payload="$(head -c $((size_kb * 1024)) /dev/zero | tr '\0' 'x')"
printf 'VXV_ProbeInbox = { source = "write-inbox.sh", writtenAt = %s, payload = "%s" }\n' "$(date +%s)" "$payload" > "$target"
echo "Écrit : $target ($size_kb Ko). Taper /reload en jeu puis /vxvtest files check."
