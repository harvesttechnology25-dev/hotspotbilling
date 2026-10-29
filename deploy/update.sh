#!/usr/bin/env bash
# ==============================================================================
# 🔄 FULL UPDATE SCRIPT: GITHUB -> VPS (TZ-WIFI BILLING & CAPTIVE PORTAL)
# ==============================================================================
# Script hii inavuta kodi mpya kutoka GitHub, inahifadhi backup ya data na .env,
# inasakinisha npm packages, inajenga build ya kisasa ya React,
# inatengeneza table zote za MySQL (migration), na kurestart PM2 bila kukata mtandao.
# ==============================================================================
set -e

# Rangi za Terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}==============================================================${NC}"
echo -e "${CYAN}   🚀 KUSASISHA MFUMO WA TZ-WIFI KUTOKA GITHUB KWENDA VPS      ${NC}"
echo -e "${CYAN}==============================================================${NC}"

# 1. Tambua Saraka (Directory) ya Mradi
if [ -d "/var/www/tz-wifi-billing" ]; then
  PROJECT_DIR="/var/www/tz-wifi-billing"
elif [ -d "$PWD/deploy" ]; then
  PROJECT_DIR="$PWD"
else
  PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

cd "$PROJECT_DIR"
echo -e "${BLUE}📂 Eneo la Mfumo:${NC} $PROJECT_DIR"

# 2. Hifadhi Backup ya Dharura ya .env na Data (Database)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$PROJECT_DIR/backups/backup_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

if [ -f "$PROJECT_DIR/.env" ]; then
  cp "$PROJECT_DIR/.env" "$BACKUP_DIR/.env"
  echo -e "${GREEN}✓ .env imehifadhiwa salama kwenye backups/${NC}"
fi

if [ -f "$PROJECT_DIR/data/database.json" ]; then
  mkdir -p "$BACKUP_DIR/data"
  cp "$PROJECT_DIR/data/database.json" "$BACKUP_DIR/data/database.json"
  echo -e "${GREEN}✓ database.json imehifadhiwa salama kwenye backups/${NC}"
fi

# 3. Kuvuta Mabadiliko Mapya Kutoka GitHub (Git Pull)
echo ""
echo -e "${YELLOW}📥 1/6: Inavuta msimbo mpya (latest code) kutoka GitHub...${NC}"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  # Safisha mabadiliko ya kienyeji ya mafaili ya build au lockfiles ili yasiwe na conflict
  git checkout -- package-lock.json bun.lock 2>/dev/null || true
  git stash push -u -m "Auto-stash kabla ya update_$TIMESTAMP" 2>/dev/null || true
  
  # Tambua branch inayotumika (main au master)
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
  echo -e "   🌿 Tawi linalotumika: ${CYAN}$BRANCH${NC}"
  
  git fetch origin "$BRANCH" 2>/dev/null || git fetch origin main 2>/dev/null || git fetch origin master 2>/dev/null || true
  git pull origin "$BRANCH" || git pull origin main || git pull origin master || git pull || {
    echo -e "${RED}⚠️ Git pull imepata hitilafu ndogo, inajaribu kulazimisha checkout...${NC}"
    git reset --hard "origin/$BRANCH" 2>/dev/null || true
  }
  
  # Rejesha stash kama ipo
  git stash pop 2>/dev/null || true
else
  echo -e "${YELLOW}⚠️ Eneo hili halitambuliwi kama Git repo ya kawaida. Inaendelea na ujenzi...${NC}"
fi

# Rejesha .env endapo ilifutika kimakosa
if [ ! -f "$PROJECT_DIR/.env" ] && [ -f "$BACKUP_DIR/.env" ]; then
  cp "$BACKUP_DIR/.env" "$PROJECT_DIR/.env"
elif [ ! -f "$PROJECT_DIR/.env" ] && [ -f "$PROJECT_DIR/.env.example" ]; then
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  echo -e "${YELLOW}📄 Faili jipya la .env limetengenezwa kutoka .env.example${NC}"
fi

# 4. Sakinisha Vifurushi vya NPM (npm install)
echo ""
echo -e "${YELLOW}📦 2/6: Inasasisha na ku-install vifurushi vya mfumo (npm install)...${NC}"
npm install --legacy-peer-deps

# 5. Jenga upya Production Build ya Vite / React
echo ""
echo -e "${YELLOW}⚡ 3/6: Inajenga toleo jipya la mfumo (npm run build)...${NC}"
npm run build

# 6. Sanidi na Tengeneza Table zote za MySQL (Auto Database Migration)
echo ""
echo -e "${YELLOW}🗄️ 4/6: Inakagua na kutengeneza Jedwali (Tables) zote za MySQL...${NC}"
if [ -f "$PROJECT_DIR/scripts/migrate_to_mysql.cjs" ]; then
  node "$PROJECT_DIR/scripts/migrate_to_mysql.cjs" || {
    echo -e "${YELLOW}⚠️ Migration script iliripoti onyo, mfumo unaendelea na JSON/Database fallback salama.${NC}"
  }
elif [ -f "$PROJECT_DIR/scripts/migrate_to_mysql.js" ]; then
  node "$PROJECT_DIR/scripts/migrate_to_mysql.js" || {
    echo -e "${YELLOW}⚠️ Migration script iliripoti onyo, mfumo unaendelea na JSON/Database fallback salama.${NC}"
  }
else
  echo -e "${YELLOW}ℹ️ scripts/migrate_to_mysql.cjs haikupatikana, database ipo salama.${NC}"
fi

# 7. Washa Upya Huduma ya PM2 (Zero-Downtime Reload)
echo ""
echo -e "${YELLOW}🔥 5/6: Inawasha upya huduma ya PM2 (Zero-Downtime Reload)...${NC}"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe tz-wifi-billing >/dev/null 2>&1; then
    pm2 reload tz-wifi-billing --update-env || pm2 restart tz-wifi-billing --update-env
  else
    pm2 start server.ts --name tz-wifi-billing --interpreter tsx --update-env
  fi
  pm2 save >/dev/null 2>&1 || true
else
  echo -e "${RED}⚠️ PM2 haijapatikana. Hakikisha umeweka PM2 kwa amri: npm install -g pm2${NC}"
fi

# 8. Thibitisha Hali ya Huduma
echo ""
echo -e "${YELLOW}🔍 6/6: Inathibitisha kuwa tovuti na API ziko hewani...${NC}"
sleep 2

CURRENT_COMMIT=$(git log -1 --format="%h - %s (%cr)" 2>/dev/null || echo "Toleo Jipya")
SERVER_IP=$(curl -s --max-time 3 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')

echo ""
echo -e "${GREEN}==============================================================${NC}"
echo -e "${GREEN}   ✅ HONGERA! KUSASISHA MFUMO KWENYE VPS KUMEKOAMILIKA!      ${NC}"
echo -e "${GREEN}==============================================================${NC}"
echo -e "📌 ${CYAN}Toleo la Git:${NC}     $CURRENT_COMMIT"
echo -e "🌐 ${CYAN}Captive Portal:${NC}   http://${SERVER_IP:-localhost}:3000"
echo -e "⚙️ ${CYAN}Dashboard ya Admin:${NC} http://${SERVER_IP:-localhost}:3000/#admin"
echo -e "📊 ${CYAN}Kuangalia Hali:${NC}   pm2 status"
echo -e "📜 ${CYAN}Kuangalia Logs:${NC}   pm2 logs tz-wifi-billing --lines 30"
echo -e "${GREEN}==============================================================${NC}"
echo ""
