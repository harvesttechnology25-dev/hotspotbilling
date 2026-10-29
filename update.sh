#!/usr/bin/env bash
# ==============================================================================
# 🔄 SHORTCUT RUNNER: ZERO-DATA-LOSS UPDATE FROM GITHUB TO VPS
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "$SCRIPT_DIR/deploy/update.sh" 2>/dev/null || true
bash "$SCRIPT_DIR/deploy/update.sh" "$@"
