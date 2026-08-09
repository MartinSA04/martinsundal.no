#!/usr/bin/env bash
# Regenerates scripts/og-fonts/*.ttf from the site's woff2 faces.
#
# resvg has no browser font stack and does not read woff2, so the OG card
# renderer needs TTF copies of the same fonts the site serves. Run this if a
# font in public/fonts/ changes.
#
# Archivo is a variable font whose name-table family reads "Archivo SemiBold";
# resvg matches on that string, so font-family="Archivo" silently fell back to
# whatever else was in the directory. It is instanced to a static weight and
# renamed here so the match is exact.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p scripts/og-fonts

uv run --quiet --with fonttools --with brotli python - <<'PY'
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer


def rename(font, family, subfamily="Regular"):
    full = f"{family} {subfamily}".strip()
    ps = full.replace(" ", "")
    for record in font["name"].names:
        nid = record.nameID
        if nid == 1:
            record.string = family
        elif nid == 2:
            record.string = subfamily
        elif nid == 4:
            record.string = full
        elif nid == 6:
            record.string = ps
        elif nid == 16:
            record.string = family
        elif nid == 17:
            record.string = subfamily


# Archivo: pin the weight axis, then normalise the family name.
archivo = TTFont("public/fonts/archivo-var.woff2")
archivo.flavor = None
archivo = instancer.instantiateVariableFont(archivo, {"wght": 600})
rename(archivo, "Archivo")
archivo.save("scripts/og-fonts/Archivo.ttf")
print("Archivo.ttf  (static, wght 600)")

for src, dst, sub in [
    ("public/fonts/plexmono-400.woff2", "scripts/og-fonts/PlexMono.ttf", "Regular"),
    ("public/fonts/plexmono-600.woff2", "scripts/og-fonts/PlexMono-SemiBold.ttf", "SemiBold"),
]:
    f = TTFont(src)
    f.flavor = None
    rename(f, "IBM Plex Mono", sub)
    f.save(dst)
    print(f"{dst.split('/')[-1]}  ({sub})")
PY
