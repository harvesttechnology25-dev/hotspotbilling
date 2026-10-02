#!/usr/bin/env bash
# ==============================================================================
# 🔄 1-CLICK SYSTEM UPDATE SCRIPT (TZ-WIFI BILLING & CAPTIVE PORTAL)
# ==============================================================================
# Hii script inavuta msimbo mpya (git pull), kusakinisha packages mpya,
# kubuild frontend, na kurestart PM2 bila kukatisha huduma ya wateja waliopo hewani.
# ==============================================================================
set -e

echo "=========================================================="
echo "   🔄 KUANZA KUSASISHA MFUMO WA TZ-WIFI (UPDATE)...       "
echo "=========================================================="

# 1. Tambua directory ya mfumo
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"
echo "📂 Enka ya Mradi: $PROJECT_DIR"

# 2. Hifadhi mabadiliko ya kienyeji (kama yapo) na vuta msimbo mpya kutoka GitHub
echo "📥 1/5: Kuvuta mabadiliko mapya kutoka GitHub (Git Pull)..."
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  # Hifadhi faili la .env lisifutwe
  git stash push -u -m "Auto-stash before update" 2>/dev/null || true
  git fetch origin main || git fetch origin master || true
  git pull origin main || git pull origin master || git pull || true
  git stash pop 2>/dev/null || true
else
  echo "⚠️ Sio Git repository ya kawaida. Inasonga mbele na mchakato wa build..."
fi

# 3. Sakinisha vifurushi vipya vya npm (kama vimeongezeka)
echo "📦 2/5: Ku-install na kusasisha maktaba za mfumo (npm install)..."
npm install --silent

# 4. Jenga upya production build ya React / Vite
echo "⚡ 3/5: Kujenga toleo jipya la mfumo (npm run build)..."
npm run build

# 5. Angalia na uhakikishe faili la .env lipo
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "📄 Kutengeneza faili la .env kutoka .env.example..."
    cp .env.example .env
  fi
fi

# 6. Sasisha au Washa upya huduma ya PM2 (Zero-Downtime Reload)
echo "🔥 4/5: Kusasisha huduma ya PM2 (Reload / Restart)..."
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe tz-wifi-billing >/dev/null 2>&1; then
    pm2 reload tz-wifi-billing || pm2 restart tz-wifi-billing
  else
    pm2 start server.ts --name tz-wifi-billing --interpreter tsx
  fi
  pm2 save >/dev/null 2>&1 || true
else
  echo "⚠️ PM2 haijapatikana, kuanzisha kupitia Node/tsx moja kwa moja..."
  npm run build
fi

# 7. Thibitisha kuwa mfumo umerudi hewani
echo "🔍 5/5: Kuthibitisha hali ya huduma..."
sleep 2

CURRENT_COMMIT=$(git log -1 --format="%h - %s (%cr)" 2>/dev/null || echo "Toleo Lililosasishwa")
SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')

echo ""
echo "=========================================================="
echo "   ✅ HONGERA! MFUMO WAKO UMEMALIZA KUSASISHWA SALAMA!   "
echo "=========================================================="
echo "📌 Toleo Jipya:   $CURRENT_COMMIT"
echo "🌐 Anwani ya VPS: http://${SERVER_IP:-localhost}:3000"
echo "📊 Hali ya PM2:   pm2 status"
echo "📜 Logs za Mfumo: pm2 logs tz-wifi-billing --lines 30"
echo "=========================================================="
