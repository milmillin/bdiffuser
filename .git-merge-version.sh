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

# Do a normal merge (writes result into CURRENT in-place)
git merge-file "$CURRENT" "$ANCESTOR" "$OTHER"
MERGE_EXIT=$?

if [ "$MERGE_EXIT" -eq 0 ]; then
  exit 0
fi

# There were conflicts. Only resolve conflict blocks where every non-marker
# line is a "version" line. Re-emit all other conflict blocks untouched.
awk -v ver="$HIGHER" '
/^<<<<<<</ {
  in_conflict = 1
  header = $0
  n = 0
  version_only = 1
  version_ws = ""
  delete buf
  next
}
in_conflict && /^>>>>>>>/ {
  in_conflict = 0
  if (version_only && version_ws != "") {
    print version_ws "\"version\": \"" ver "\","
  } else {
    print header
    for (i = 1; i <= n; i++) print buf[i]
    print $0
  }
  next
}
in_conflict {
  n++
  buf[n] = $0
  # Skip the ======= separator — it is neither version nor non-version content
  if ($0 ~ /^=======$/) next
  # Check if this content line is a version line
  if ($0 ~ /"version"[[:space:]]*:/) {
    match($0, /^[[:space:]]*/)
    version_ws = substr($0, RSTART, RLENGTH)
  } else {
    version_only = 0
  }
  next
}
{ print }
' "$CURRENT" > "$CURRENT.tmp" && mv "$CURRENT.tmp" "$CURRENT"

# Check if there are still conflict markers
if grep -q '^<<<<<<<' "$CURRENT"; then
  exit 1
fi

exit 0
