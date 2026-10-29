#!/usr/bin/env bash
# ==============================================================================
# 🛠️ SCRIPT YA KUTATUA MERGE CONFLICT YA DATABASE.JSON NA KUREJESHA DATA
# ==============================================================================
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}==============================================================${NC}"
echo -e "${CYAN}   🛠️ INATATUA CONFLICT YA GIT NA KUREJESHA DATABASE YAKO     ${NC}"
echo -e "${CYAN}==============================================================${NC}"

PROJECT_DIR="/var/www/tz-wifi-billing"
[ ! -d "$PROJECT_DIR" ] && PROJECT_DIR="$PWD"
cd "$PROJECT_DIR"

# 1. Tafuta backup safi iliyotengenezwa kabla ya conflict
echo -e "${YELLOW}🔍 Hatua 1: Inatafuta backup safi ya database.json yako...${NC}"
CLEAN_BACKUP=""

if [ -d "$PROJECT_DIR/backups" ]; then
  for b in $(ls -td "$PROJECT_DIR/backups"/* 2>/dev/null); do
    if [ -f "$b/data/database.json" ] && [ -s "$b/data/database.json" ]; then
      if ! grep -q "<<<<<<< HEAD" "$b/data/database.json" 2>/dev/null; then
        CLEAN_BACKUP="$b/data/database.json"
        break
      fi
    elif [ -f "$b/database.json" ] && [ -s "$b/database.json" ]; then
      if ! grep -q "<<<<<<< HEAD" "$b/database.json" 2>/dev/null; then
        CLEAN_BACKUP="$b/database.json"
        break
      fi
    fi
  done
fi

if [ -z "$CLEAN_BACKUP" ] && [ -d "/var/backups/tzwifi" ]; then
  for b in $(ls -td /var/backups/tzwifi/* 2>/dev/null); do
    if [ -f "$b/data/database.json" ] && ! grep -q "<<<<<<< HEAD" "$b/data/database.json" 2>/dev/null; then
      CLEAN_BACKUP="$b/data/database.json"
      break
    elif [ -f "$b/database.json" ] && ! grep -q "<<<<<<< HEAD" "$b/database.json" 2>/dev/null; then
      CLEAN_BACKUP="$b/database.json"
      break
    fi
  done
fi

if [ -n "$CLEAN_BACKUP" ]; then
  echo -e "${GREEN}✓ Imepata backup safi ya wateja wako:${NC} $CLEAN_BACKUP"
else
  echo -e "${YELLOW}ℹ️ Inasafisha conflict markers moja kwa moja...${NC}"
fi

# 2. Tatua na uondoe Git Merge Conflict
echo -e "${YELLOW}🧹 Hatua 2: Inaondoa git merge conflict...${NC}"
git merge --abort 2>/dev/null || true
git reset --merge 2>/dev/null || true
git checkout --ours data/database.json 2>/dev/null || true
git add data/database.json 2>/dev/null || true

# 3. Rejesha data halisi kutoka kwenye backup
echo -e "${YELLOW}📂 Hatua 3: Inarejesha data/database.json yako halisi...${NC}"
if [ -n "$CLEAN_BACKUP" ]; then
  mkdir -p "$PROJECT_DIR/data"
  cp -pf "$CLEAN_BACKUP" "$PROJECT_DIR/data/database.json"
  echo -e "${GREEN}✓ database.json imerejeshwa kutoka: $CLEAN_BACKUP${NC}"
elif [ -f "$PROJECT_DIR/data/database.json" ] && grep -q "<<<<<<< HEAD" "$PROJECT_DIR/data/database.json"; then
  echo -e "${YELLOW}Inasafisha conflict markers kwenye data/database.json...${NC}"
  node -e '
    const fs = require("fs");
    let c = fs.readFileSync("data/database.json", "utf8");
    if (c.includes("<<<<<<< HEAD")) {
      const lines = c.split("\n");
      const clean = [];
      let inOurs = true;
      for (const line of lines) {
        if (line.startsWith("<<<<<<<")) { inOurs = true; continue; }
        if (line.startsWith("=======")) { inOurs = false; continue; }
        if (line.startsWith(">>>>>>>")) { inOurs = true; continue; }
        if (inOurs) clean.push(line);
      }
      fs.writeFileSync("data/database.json", clean.join("\n"), "utf8");
      console.log("✓ Conflict markers zimesafishwa.");
    }
  ' 2>/dev/null || true
fi

# 4. Zuia Git kugusa data/database.json kamwe
echo -e "${YELLOW}🔒 Hatua 4: Inazuia Git kufuatilia data/database.json...${NC}"
git update-index --assume-unchanged data/database.json 2>/dev/null || true
git update-index --skip-worktree data/database.json 2>/dev/null || true

# 5. Vuta kodi mpya za mfumo bila kugusa data
echo -e "${YELLOW}📥 Hatua 5: Inavuta kodi mpya kutoka GitHub (src/, server/, n.k.)...${NC}"
git fetch origin main 2>/dev/null || git fetch origin master 2>/dev/null || true
git checkout origin/main -- src/ server/ index.html package.json tsconfig.json vite.config.ts deploy/ scripts/ update.sh 2>/dev/null || true

# Rejesha tena database.json
if [ -n "$CLEAN_BACKUP" ]; then
  cp -pf "$CLEAN_BACKUP" "$PROJECT_DIR/data/database.json"
fi

# 6. Thibitisha kuwa database.json ni valid JSON
echo -e "${YELLOW}🔍 Hatua 6: Inakagua kama database.json ipo sahihi...${NC}"
node -e '
  const fs = require("fs");
  try {
    const d = JSON.parse(fs.readFileSync("data/database.json", "utf8"));
    console.log("✓ SUCCESS: database.json ni JSON sahihi! Wamiliki: " + (d.owners ? d.owners.length : 0));
  } catch (e) {
    console.error("✗ ERROR: " + e.message);
  }
' 2>/dev/null || true

# 7. Sasa Endesha Migration na Jenga Build
echo -e "${YELLOW}⚡ Hatua 7: Inasasisha MySQL na kujenga mfumo (npm run build)...${NC}"
if [ -f "$PROJECT_DIR/scripts/migrate_to_mysql.cjs" ]; then
  node "$PROJECT_DIR/scripts/migrate_to_mysql.cjs" 2>/dev/null || true
fi
npm run build

# 8. Restart PM2
echo -e "${YELLOW}🔥 Hatua 8: Inawasha upya PM2...${NC}"
pm2 reload tz-wifi-billing --update-env 2>/dev/null || pm2 restart tz-wifi-billing --update-env 2>/dev/null || true

echo ""
echo -e "${GREEN}==============================================================${NC}"
echo -e "${GREEN}   ✅ HITILAFU IMETATULIWA NA DATA ZOTE ZIKO SALAMA!          ${NC}"
echo -e "${GREEN}==============================================================${NC}"
echo -e "🌐 Captive Portal: http://$(curl -s --max-time 2 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}'):3000"
echo -e "⚙️ Dashboard:      http://$(curl -s --max-time 2 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}'):3000/#admin"
echo ""
