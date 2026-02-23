#!/usr/bin/env sh
# Auto-bump patch version across all workspace package.json files.
# Called by the pre-commit hook so the bumped version is included in the commit.

set -e

ROOT="$(git rev-parse --show-toplevel)"

# Read current version from root package.json
CURRENT=$(node -e "process.stdout.write(require('$ROOT/package.json').version)")

# Increment patch: 1.0.0 -> 1.0.1
NEXT=$(node -e "
  const [major, minor, patch] = '$CURRENT'.split('.').map(Number);
  process.stdout.write(major + '.' + minor + '.' + (patch + 1));
")

echo "Bumping version: $CURRENT -> $NEXT"

# Update all package.json files
for PKG in \
  "$ROOT/package.json" \
  "$ROOT/packages/shared/package.json" \
  "$ROOT/packages/server/package.json" \
  "$ROOT/packages/client/package.json"
do
  node -e "
    const fs = require('fs');
    const path = '$PKG';
    const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
    pkg.version = '$NEXT';
    fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  "
done

# Stage the updated files so they're included in the commit
git add \
  "$ROOT/package.json" \
  "$ROOT/packages/shared/package.json" \
  "$ROOT/packages/server/package.json" \
  "$ROOT/packages/client/package.json"
