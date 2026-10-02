#!/usr/bin/env bash
# ==============================================================================
# 🚀 1-CLICK QUICK DEPLOY SCRIPT (TZ-WIFI BILLING & CAPTIVE PORTAL)
# Inafanya kila kitu yenyewe ndani ya sekunde 60 bila kupoteza muda!
# ==============================================================================
set -e

echo "=========================================================="
echo "   🚀 KUANZA KUDEPLOY MFUMO WA TZ-WIFI AUTOMATICALLY...   "
echo "=========================================================="

# 1. Hakikisha tuna root permissions
if [ "$EUID" -ne 0 ]; then
  echo "⚠️ Tafadhali endesha amri hii kama sudo au root: sudo bash deploy/quick-deploy.sh"
  exit 1
fi

# 2. Sakinisha Git, Curl, Node.js na PM2 kama havipo
echo "📦 Kuangalia na kusakinisha zana za msingi (Git, Curl, Node.js, PM2)..."
apt-get update -qq >/dev/null 2>&1
apt-get install -y git curl -qq >/dev/null 2>&1

if ! command -v node >/dev/null 2>&1; then
  echo "📦 Kusanikisha Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y nodejs >/dev/null 2>&1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "📦 Kusanikisha PM2 na tsx..."
  npm install -g pm2 tsx >/dev/null 2>&1
fi

# 3. Kusanikisha dependencies na kubuild application
echo "⚡ Ku-install dependencies na kujenga frontend..."
npm install --silent
npm run build

# 4. Angalia faili la .env
if [ ! -f .env ]; then
  echo "📄 Kutengeneza faili la .env kutoka .env.example..."
  cp .env.example .env
fi

# 5. Fungua port 80 na 3000 kwenye firewall
if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 3000/tcp >/dev/null 2>&1 || true
fi

# 6. Washa mfumo kwa PM2
echo "🔥 Kuwasha mfumo kwa PM2 (Auto-Restart 24/7)..."
pm2 stop tz-wifi-billing >/dev/null 2>&1 || true
pm2 delete tz-wifi-billing >/dev/null 2>&1 || true
pm2 stop tzvifi-billing >/dev/null 2>&1 || true
pm2 delete tzvifi-billing >/dev/null 2>&1 || true

pm2 start server.ts --name tz-wifi-billing --interpreter tsx
pm2 save >/dev/null 2>&1 || true
pm2 startup >/dev/null 2>&1 || true

# Pata IP ya VPS
SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')

echo ""
echo "=========================================================="
echo "   🎉 HONGERA! MFUMO WAKO UPO LIVE NA UNAFANYA KAZI!      "
echo "=========================================================="
echo "🌐 Fungua Browser yako hapa: http://${SERVER_IP}:3000"
echo "🌐 Au kwenye simu ya wateja:  http://${SERVER_IP}:3000"
echo ""
echo "📊 Kuangalia hali ya mfumo:    pm2 status"
echo "📜 Kuangalia logs:            pm2 logs tz-wifi-billing"
echo "🔄 Ku-restart mfumo:          pm2 restart tz-wifi-billing"
echo "=========================================================="
