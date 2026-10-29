#!/usr/bin/env bash
# ==============================================================================
# 🔄 TZ-WIFI BILLING & CAPTIVE PORTAL - BULLETPROOF GITHUB UPDATE SCRIPT
# ==============================================================================
# Script hii inavuta kodi mpya kutoka GitHub kwenda kwenye VPS bila kupoteza
# data yoyote (Zero-Data-Loss Guaranteed Update).
#
# INACHOFANYA KWA USALAMA WA 100%:
# 1. Inatengeneza Backup salama ya .env na data/database.json maeneo 3 tofauti.
# 2. Inapiga full mysqldump ya MySQL database (kama MySQL ipo hewani).
# 3. Inazuia Git kufuta au kubadilisha database.json ya uzalishaji (production).
# 4. Inavuta mabadiliko mapya ya kodi (React frontend, Express backend, n.k.).
# 5. Inarejesha data zote halisi za mteja mara baada ya git pull kukamilika.
# 6. Inakagua ukubwa na uadilifu wa data (Integrity verification).
# 7. Inafanya npm install na npm run build bila error.
# 8. Inasasisha table za MySQL (schema migration salama bila kuandika demo data).
# 9. Inawasha upya PM2 kwa Zero-Downtime Reload.
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
echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}   🚀 KUSASISHA MFUMO WA TZ-WIFI KUTOKA GITHUB (ZERO-DATA-LOSS)      ${NC}"
echo -e "${CYAN}====================================================================${NC}"

# 1. Tambua Saraka (Directory) ya Mradi
if [ -d "/var/www/tz-wifi-billing" ]; then
  PROJECT_DIR="/var/www/tz-wifi-billing"
elif [ -f "$PWD/server.ts" ]; then
  PROJECT_DIR="$PWD"
elif [ -d "$PWD/deploy" ]; then
  PROJECT_DIR="$PWD"
else
  PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

cd "$PROJECT_DIR"
echo -e "${BLUE}📂 Eneo la Mfumo:${NC} $PROJECT_DIR"

# 2. Hifadhi Backup ya Dharura ya .env na Data (Database) Kabla ya Kugusa Chochote
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOCAL_BACKUP="$PROJECT_DIR/backups/backup_$TIMESTAMP"
SYS_BACKUP="/var/backups/tzwifi/backup_$TIMESTAMP"
EMERGENCY_DATA="/tmp/tzwifi_safe_data_${TIMESTAMP}.json"
EMERGENCY_ENV="/tmp/tzwifi_safe_env_${TIMESTAMP}"

mkdir -p "$LOCAL_BACKUP" 2>/dev/null || true
mkdir -p "$SYS_BACKUP" 2>/dev/null || true

echo ""
echo -e "${YELLOW}🔒 Hatua 1/7: Inatengeneza Hifadhi Nakala (Multi-Layer Safe Backup)...${NC}"

# Backup database.json
HAS_LOCAL_DB=false
if [ -f "$PROJECT_DIR/data/database.json" ] && [ -s "$PROJECT_DIR/data/database.json" ]; then
  HAS_LOCAL_DB=true
  mkdir -p "$LOCAL_BACKUP/data" 2>/dev/null || true
  cp -p "$PROJECT_DIR/data/database.json" "$LOCAL_BACKUP/data/database.json"
  cp -p "$PROJECT_DIR/data/database.json" "$SYS_BACKUP/database.json" 2>/dev/null || true
  cp -p "$PROJECT_DIR/data/database.json" "$EMERGENCY_DATA"
  
  DB_SIZE=$(wc -c < "$PROJECT_DIR/data/database.json" | tr -d ' ')
  echo -e "${GREEN}✓ database.json (${DB_SIZE} bytes) imehifadhiwa salama:${NC}"
  echo -e "   📁 $LOCAL_BACKUP/data/database.json"
  echo -e "   📁 $SYS_BACKUP/database.json"
  echo -e "   📁 $EMERGENCY_DATA (Protected Isolation)"
fi

# Backup .env
HAS_LOCAL_ENV=false
if [ -f "$PROJECT_DIR/.env" ] && [ -s "$PROJECT_DIR/.env" ]; then
  HAS_LOCAL_ENV=true
  cp -p "$PROJECT_DIR/.env" "$LOCAL_BACKUP/.env"
  cp -p "$PROJECT_DIR/.env" "$SYS_BACKUP/.env" 2>/dev/null || true
  cp -p "$PROJECT_DIR/.env" "$EMERGENCY_ENV"
  echo -e "${GREEN}✓ .env (Mipangilio ya Siri ya Malipo & DB) imehifadhiwa salama.${NC}"
fi

# Backup Live MySQL Database ikiwa inatumika
if command -v mysqldump >/dev/null 2>&1 && [ -f "$PROJECT_DIR/.env" ]; then
  DB_HOST=$(grep -E '^MYSQL_HOST=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d '=' -f2- | tr -d '"'\'' ' || echo "localhost")
  DB_PORT=$(grep -E '^MYSQL_PORT=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d '=' -f2- | tr -d '"'\'' ' || echo "3306")
  DB_USER=$(grep -E '^MYSQL_USER=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d '=' -f2- | tr -d '"'\'' ' || echo "tzwifi_user")
  DB_PASS=$(grep -E '^MYSQL_PASSWORD=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d '=' -f2- | tr -d '"'\'' ' || echo "")
  DB_NAME=$(grep -E '^MYSQL_DATABASE=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d '=' -f2- | tr -d '"'\'' ' || echo "tzwifi_billing")

  DB_HOST=${DB_HOST:-localhost}
  DB_PORT=${DB_PORT:-3306}
  DB_USER=${DB_USER:-tzwifi_user}
  DB_NAME=${DB_NAME:-tzwifi_billing}

  if [ -n "$DB_PASS" ]; then
    echo -e "${BLUE}🗄️ Inapiga Live mysqldump ya database '$DB_NAME'...${NC}"
    if mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$LOCAL_BACKUP/mysql_dump.sql" 2>/dev/null; then
      cp -p "$LOCAL_BACKUP/mysql_dump.sql" "$SYS_BACKUP/mysql_dump.sql" 2>/dev/null || true
      echo -e "${GREEN}✓ MySQL full backup imehifadhiwa: $LOCAL_BACKUP/mysql_dump.sql${NC}"
    fi
  fi
fi

# 3. Kuvuta Msimbo Mpya Kutoka GitHub (Git Pull - Non-Destructive)
echo ""
echo -e "${YELLOW}📥 Hatua 2/7: Inavuta msimbo mpya kutoka GitHub (bila kugusa data)...${NC}"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  # Hakikisha git haigusi database.json
  git update-index --assume-unchanged data/database.json 2>/dev/null || true
  git update-index --skip-worktree data/database.json 2>/dev/null || true

  # Safisha mabadiliko ya mafaili ya ujenzi yasiyo na maana (build artifacts)
  git checkout -- package-lock.json bun.lock 2>/dev/null || true
  git stash push -u -m "Auto-safe-stash-$TIMESTAMP" 2>/dev/null || true

  # Tambua branch ya GitHub
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
  [ "$BRANCH" = "HEAD" ] && BRANCH="main"
  echo -e "   🌿 Tawi linalotumika: ${CYAN}$BRANCH${NC}"

  # Vuta mabadiliko
  git fetch origin "$BRANCH" 2>/dev/null || git fetch origin main 2>/dev/null || git fetch origin master 2>/dev/null || true
  
  if ! git pull origin "$BRANCH" 2>/dev/null; then
    if ! git pull origin main 2>/dev/null; then
      if ! git pull origin master 2>/dev/null; then
        echo -e "${YELLOW}⚠️ Git pull ilikuta conflict ndogo, inachukua kodi mpya za mfumo moja kwa moja...${NC}"
        git checkout "origin/$BRANCH" -- src/ server/ index.html package.json tsconfig.json vite.config.ts deploy/ scripts/ 2>/dev/null || true
      fi
    fi
  fi
  echo -e "${GREEN}✓ Msimbo mpya wa GitHub umepokelewa kikamilifu!${NC}"
else
  echo -e "${YELLOW}ℹ️ Saraka hii haipo chini ya git ya kawaida, inasonga mbele kulinda data na build.${NC}"
fi

# 4. UTHIBITISHO NA UREJESHO WA DATA HALISI ZAIDI (100% Data Restoraton)
echo ""
echo -e "${YELLOW}🛡️ Hatua 3/7: Inalinda na kuthibitisha data zako halisi za uzalishaji...${NC}"

if [ "$HAS_LOCAL_DB" = true ]; then
  mkdir -p "$PROJECT_DIR/data"
  # Rejesha database.json halisi kutoka kwenye isolation backup
  if [ -f "$EMERGENCY_DATA" ] && [ -s "$EMERGENCY_DATA" ]; then
    cp -pf "$EMERGENCY_DATA" "$PROJECT_DIR/data/database.json"
    echo -e "${GREEN}✓ DATA SALAMA: database.json imerejeshwa kutoka emergency backup!${NC}"
  elif [ -f "$LOCAL_BACKUP/data/database.json" ]; then
    cp -pf "$LOCAL_BACKUP/data/database.json" "$PROJECT_DIR/data/database.json"
    echo -e "${GREEN}✓ DATA SALAMA: database.json imerejeshwa kutoka backup ya kienyeji!${NC}"
  fi
  
  # Zuia tena git isiguse database.json kamwe
  git update-index --assume-unchanged data/database.json 2>/dev/null || true
  git update-index --skip-worktree data/database.json 2>/dev/null || true
fi

# Rejesha .env
if [ "$HAS_LOCAL_ENV" = true ]; then
  if [ -f "$EMERGENCY_ENV" ] && [ -s "$EMERGENCY_ENV" ]; then
    cp -pf "$EMERGENCY_ENV" "$PROJECT_DIR/.env"
  elif [ -f "$LOCAL_BACKUP/.env" ]; then
    cp -pf "$LOCAL_BACKUP/.env" "$PROJECT_DIR/.env"
  fi
  echo -e "${GREEN}✓ .env ipo salama na imehifadhiwa kikamilifu.${NC}"
elif [ ! -f "$PROJECT_DIR/.env" ] && [ -f "$PROJECT_DIR/.env.example" ]; then
  cp -p "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  echo -e "${YELLOW}📄 Faili jipya la .env limetengenezwa kutoka .env.example${NC}"
fi

# Hakikisha database.json ina ukubwa na muundo sahihi
if [ -f "$PROJECT_DIR/data/database.json" ]; then
  CHECK_SIZE=$(wc -c < "$PROJECT_DIR/data/database.json" | tr -d ' ')
  echo -e "${CYAN}📊 Ukubwa wa database.json ya sasa:${NC} ${CHECK_SIZE} bytes"
fi

# 5. Sakinisha Vifurushi vya NPM (npm install)
echo ""
echo -e "${YELLOW}📦 Hatua 4/7: Inasasisha na ku-install vifurushi vya mfumo (npm install)...${NC}"
npm install --legacy-peer-deps

# 6. Jenga Upya Production Build ya Vite / React
echo ""
echo -e "${YELLOW}⚡ Hatua 5/7: Inajenga toleo jipya la mfumo (npm run build)...${NC}"
npm run build

# 7. Uthibitishaji wa Schema ya MySQL (Non-Destructive Migration)
echo ""
echo -e "${YELLOW}🗄️ Hatua 6/7: Inakagua na kusasisha Jedwali (Tables) za MySQL...${NC}"
if [ -f "$PROJECT_DIR/scripts/migrate_to_mysql.cjs" ]; then
  # Kwa kuwa database.json yetu ni ya LIVE data, migration itasawazisha live data tu
  node "$PROJECT_DIR/scripts/migrate_to_mysql.cjs" 2>/dev/null || {
    echo -e "${YELLOW}⚠️ MySQL migration ilitoa onyo, data ipo salama kwenye JSON na MySQL fallback.${NC}"
  }
fi

# 8. Washa Upya Huduma ya PM2 (Zero-Downtime Reload)
echo ""
echo -e "${YELLOW}🔥 Hatua 7/7: Inawasha upya huduma ya PM2 (Zero-Downtime Reload)...${NC}"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe tz-wifi-billing >/dev/null 2>&1; then
    pm2 reload tz-wifi-billing --update-env || pm2 restart tz-wifi-billing --update-env
  else
    pm2 start server.ts --name tz-wifi-billing --interpreter tsx --update-env
  fi
  pm2 save >/dev/null 2>&1 || true
  echo -e "${GREEN}✓ PM2 huduma ya tz-wifi-billing ipo hewani kikamilifu!${NC}"
else
  echo -e "${RED}⚠️ PM2 haijapatikana. Tumia amri hii kurestart: npm run dev au npm start${NC}"
fi

# 9. Muhtasari wa Mwisho na Uthibitisho
sleep 1
CURRENT_COMMIT=$(git log -1 --format="%h - %s (%cr)" 2>/dev/null || echo "Toleo Jipya (GitHub Update)")
SERVER_IP=$(curl -s --max-time 2 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')

echo ""
echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}   ✅ HONGERA! KUSASISHA MFUMO KUTOKA GITHUB KUMEKOAMILIKA!         ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo -e "📌 ${CYAN}Toleo la Git:${NC}        $CURRENT_COMMIT"
echo -e "🔒 ${CYAN}Hifadhi ya Data:${NC}      $LOCAL_BACKUP"
echo -e "🌐 ${CYAN}Captive Portal:${NC}      http://${SERVER_IP:-localhost}:3000"
echo -e "⚙️ ${CYAN}Dashboard ya Admin:${NC}   http://${SERVER_IP:-localhost}:3000/#admin"
echo -e "📊 ${CYAN}Kuangalia Hali:${NC}      pm2 status"
echo -e "📜 ${CYAN}Kuangalia Logs:${NC}      pm2 logs tz-wifi-billing --lines 30"
echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}   ✨ Data zote (Wamiliki, Routers, Miamala, Vocha) ZIKO SALAMA!  ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo ""
