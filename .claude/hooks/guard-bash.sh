#!/bin/sh
cmd=$(jq -r '.tool_input.command // ""')
if printf '%s' "$cmd" | grep -Eq -- '--no-verify|HUSKY=0|core\.hooksPath|git[[:space:]]+commit.*[[:space:]]-n([[:space:]]|$)|gh[[:space:]]+pr[[:space:]]+merge|gh[[:space:]]+api.*(-X|--method)[[:space:]=]*(POST|PUT|PATCH|DELETE)|git[[:space:]]+push.*(--force|[[:space:]]-f([[:space:]]|$)|[[:space:]]\+|:main|[[:space:]]main([[:space:]]|$))|\.env(\.local|[[:space:]]|$)'; then
  echo "Bloqué par guard-bash.sh (règle projet) : $cmd" >&2
  exit 2
fi
exit 0
