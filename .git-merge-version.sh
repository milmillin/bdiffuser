#!/usr/bin/env bash
# Custom merge driver for package.json that auto-resolves version conflicts.
# During rebase, picks the higher version number for the "version" field,
# then falls back to normal merge for everything else.
#
# Usage (configured via .gitattributes + git config):
#   merge driver receives: %O (ancestor) %A (current) %B (other)

ANCESTOR="$1"
CURRENT="$2"
OTHER="$3"

# Extract version strings
get_version() {
  grep -oP '"version"\s*:\s*"\K[^"]+' "$1" 2>/dev/null || echo "0.0.0"
}

VER_CURRENT=$(get_version "$CURRENT")
VER_OTHER=$(get_version "$OTHER")

# Pick the higher version using sort -V (version sort)
HIGHER=$(printf '%s\n%s\n' "$VER_CURRENT" "$VER_OTHER" | sort -V | tail -1)

# Do a normal merge first
git merge-file -p "$CURRENT" "$ANCESTOR" "$OTHER" > "$CURRENT.merged" 2>/dev/null

if [ $? -eq 0 ]; then
  # No conflicts at all — use merged result
  mv "$CURRENT.merged" "$CURRENT"
  exit 0
fi

# There were conflicts — resolve just the version line by picking the higher version
# Start from the conflicted merge output and fix the version conflict markers
sed -E \
  -e '/^<<<<<<</,/^>>>>>>>/{ /^\s*"version"\s*:/{ s/.*/"  "version": "'"$HIGHER"'",/; p; d; }; /^<<<<<<</d; /^=======/d; /^>>>>>>>/d; }' \
  "$CURRENT.merged" > "$CURRENT.resolved"

# Check if there are still conflict markers (from non-version fields)
if grep -q '^<<<<<<<' "$CURRENT.resolved"; then
  # Still has other conflicts — let git handle them
  mv "$CURRENT.merged" "$CURRENT"
  rm -f "$CURRENT.resolved"
  exit 1
fi

mv "$CURRENT.resolved" "$CURRENT"
rm -f "$CURRENT.merged"
exit 0
