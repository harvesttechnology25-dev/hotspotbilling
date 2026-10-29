#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
chmod +x "$SCRIPT_DIR/fix_update_conflict.sh" 2>/dev/null || true
bash "$SCRIPT_DIR/fix_update_conflict.sh" "$@"
