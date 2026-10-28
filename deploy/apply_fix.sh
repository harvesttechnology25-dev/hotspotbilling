#!/bin/bash
# ==============================================================================
# 🛡️ TZ-WIFI BILLING: KAZI YA KUZUIA VOCHA KUTOKA KABLA YA PIN YA MALIPO
# ==============================================================================
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}==============================================================${NC}"
echo -e "${CYAN}   🔒 KUREKEBISHA USALAMA WA MALIPO: KUZUIA VOCHA KABLA YA PIN  ${NC}"
echo -e "${CYAN}==============================================================${NC}"

# Tafuta saraka ya mradi
if [ -d "/var/www/tz-wifi-billing" ]; then
  cd /var/www/tz-wifi-billing
elif [ -d "$PWD/server" ]; then
  cd "$PWD"
else
  echo -e "${RED}Saraka ya mfumo haikupatikana!${NC}"
  exit 1
fi

echo -e "${YELLOW}1. Inafungua na kuweka kodi sahihi ya paymentGateway.ts...${NC}"

# Hakikisha checkData.success haitumiki kama uthibitisho wa malipo
python3 - << 'EOF'
import re

pg_path = "server/paymentGateway.ts"
try:
    with open(pg_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Ondoa checkData.success === true kama ilikuwepo
    old_pattern = r"(remoteStatus\s*===\s*['\"]PAID['\"]\s*\|\|\s*checkData\.success\s*===\s*true)"
    new_replacement = "remoteStatus === 'PAID' || remoteStatus === 'SUCCESSFUL'"
    if re.search(old_pattern, content):
        content = re.sub(old_pattern, new_replacement, content)
        print("✓ Imerekebisha isConfirmedPaid katika DaliPay status check.")

    # Hakikisha isConfirmedPaid inakagua tu SUCCESS / COMPLETED / PAID / SUCCESSFUL
    strict_check = """            const remoteData = checkData.data || checkData;
            const remoteStatus = String(remoteData.status || checkData.status || '').toUpperCase();
            const isConfirmedPaid =
              remoteStatus === 'SUCCESS' ||
              remoteStatus === 'COMPLETED' ||
              remoteStatus === 'PAID' ||
              remoteStatus === 'SUCCESSFUL';"""

    with open(pg_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ paymentGateway.ts imehakikiwa na kuwekwa salama.")
except Exception as e:
    print(f"Onyo wakati wa kurekebisha paymentGateway.ts: {e}")
EOF

echo -e "${YELLOW}2. Inajenga upya mfumo (npm run build)...${NC}"
npm run build

echo -e "${YELLOW}3. Inawasha upya huduma ya PM2...${NC}"
if command -v pm2 >/dev/null 2>&1; then
  pm2 reload tz-wifi-billing --update-env || pm2 restart tz-wifi-billing --update-env
fi

echo -e "${GREEN}==============================================================${NC}"
echo -e "${GREEN}   ✅ TAYARI! VOCHA SASA HAITATOKA HADI MTEJA AWEKE PIN HALISI ${NC}"
echo -e "${GREEN}==============================================================${NC}"
