#!/bin/sh
# Lit sur l'entrée standard la liste des fichiers modifiés par une PR, un par ligne.
# Répond `false` si tous sont des fichiers Markdown (documentation seule), `true` sinon.
# Liste vide : `true`, par prudence (la CI complète tourne).
# Testé par src/lib/ci/codeModifie.test.ts (#105).

fichiers=$(grep -v '^$')

if [ -n "$fichiers" ] && ! printf '%s\n' "$fichiers" | grep -qv '\.md$'; then
  echo false
else
  echo true
fi
