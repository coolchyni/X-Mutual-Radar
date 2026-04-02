#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(python3 - <<'PY'
import json
from pathlib import Path
manifest = json.loads(Path('manifest.json').read_text())
print(manifest['version'])
PY
)"

OUTPUT_DIR="$ROOT/release"
OUTPUT_ZIP="$OUTPUT_DIR/x-mutual-radar-v${VERSION}.zip"

mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_ZIP"

cd "$ROOT"
zip -r "$OUTPUT_ZIP" \
  manifest.json \
  _locales \
  popup \
  src \
  assets/icons \
  README.md \
  assets/store/privacy-policy.md \
  -x "*.DS_Store" ".git/*" "release/*" "node_modules/*" "tests/*" "scripts/*"

echo "$OUTPUT_ZIP"
