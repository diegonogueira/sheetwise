#!/usr/bin/env bash
# Gera os ícones do app Android a partir da arte vetorial em src/assets/brand/.
# Requer: rsvg-convert (librsvg) e ImageMagick 7 (magick).
#
#   ./scripts/gen-icons.sh
#
# Fontes da verdade:
#   src/assets/brand/icon.svg     o ladrilho inteiro (fundo + pauta + clave) = o favicon
#   src/assets/brand/icon-fg.svg  só a arte, na grade 108 do ícone adaptativo
set -euo pipefail

cd "$(dirname "$0")/.."
RES=android/app/src/main/res
TILE=src/assets/brand/icon.svg
FG=src/assets/brand/icon-fg.svg
ACCENT="#6366f1" # --color-accent: o fundo do ícone adaptativo e do ladrilho
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# nome:tamanho do ícone legado (mipmap) e do primeiro plano adaptativo (108dp)
DENSITIES="mdpi:48:108 hdpi:72:162 xhdpi:96:216 xxhdpi:144:324 xxxhdpi:192:432"

rsvg-convert -w 512 -h 512 "$TILE" -o "$TMP/tile.png"

for d in $DENSITIES; do
  dir=${d%%:*}; rest=${d#*:}; legacy=${rest%%:*}; fg=${rest#*:}
  out=$RES/mipmap-$dir
  mkdir -p "$out"

  # adaptativo: o launcher aplica a máscara, então o primeiro plano vai inteiro
  rsvg-convert -w "$fg" -h "$fg" "$FG" -o "$out/ic_launcher_foreground.png"

  # legado (Android < 8): a máscara tem de vir aplicada na arte
  radius=$((legacy * 22 / 100))
  magick "$TMP/tile.png" -resize "${legacy}x${legacy}" \
    \( -size "${legacy}x${legacy}" xc:none -fill white \
       -draw "roundrectangle 0,0 $((legacy - 1)),$((legacy - 1)) $radius,$radius" \) \
    -alpha set -compose DstIn -composite "$out/ic_launcher.png"
  magick "$TMP/tile.png" -resize "${legacy}x${legacy}" \
    \( -size "${legacy}x${legacy}" xc:none -fill white \
       -draw "circle $((legacy / 2)),$((legacy / 2)) $((legacy / 2)),0" \) \
    -alpha set -compose DstIn -composite "$out/ic_launcher_round.png"
done

cat > "$RES/values/ic_launcher_background.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">$ACCENT</color>
</resources>
XML

echo "✓ ícones gerados em $RES"
