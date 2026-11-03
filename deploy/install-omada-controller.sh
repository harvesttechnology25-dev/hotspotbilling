#!/usr/bin/env bash
# ==============================================================================
# 🚀 AUTOMATED TP-LINK OMADA CONTROLLER INSTALLER & SUBDOMAIN SETUP SCRIPT
# Inasakinisha TP-Link Omada Software Controller kwenye VPS na kuweka Subdomain
# ikiwa na Nginx Reverse Proxy na Cheti cha Bure cha SSL (Let's Encrypt HTTPS).
#
# Matumizi (Usage):
#   sudo bash deploy/install-omada-controller.sh omada.infotechwifi.com admin@infotechwifi.com
# ==============================================================================

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "======================================================================"
echo "    🌐 TP-LINK OMADA CONTROLLER & SUBDOMAIN AUTO-INSTALLER          "
echo "======================================================================"
echo -e "${NC}"

if [ "${EUID}" -ne 0 ]; then
  echo -e "${RED}[ERROR] Lazima uendeshe script hii kama root (sudo).${NC}"
  echo "Tafadhali tumia: sudo bash $0 omada.infotechwifi.com"
  exit 1
fi

SUBDOMAIN="${1:-}"
EMAIL="${2:-}"

# Kama mtumiaji hajaweka subdomain kwenye argument, muulize
if [ -z "$SUBDOMAIN" ]; then
  read -p "Ingiza Subdomain unayotaka kwa ajili ya Omada Controller (mfano: omada.infotechwifi.com): " SUBDOMAIN
fi

if [ -z "$SUBDOMAIN" ]; then
  echo -e "${RED}[ERROR] Lazima uweke Subdomain ili kuendelea.${NC}"
  exit 1
fi

if [ -z "$EMAIL" ]; then
  read -p "Ingiza barua pepe yako kwa ajili ya SSL (mfano: admin@infotechwifi.com): " EMAIL
fi

if [ -z "$EMAIL" ]; then
  EMAIL="admin@${SUBDOMAIN}"
fi

# Pata IP ya VPS ya sasa
VPS_PUBLIC_IP=$(curl -s -4 https://ifconfig.me || curl -s -4 https://api.ipify.org || hostname -I | awk '{print $1}')

echo ""
echo -e "${BLUE}📌 Taarifa za Usakinishaji:${NC}"
echo "   👉 Subdomain:    $SUBDOMAIN"
echo "   👉 VPS IP:       $VPS_PUBLIC_IP"
echo "   👉 Email ya SSL: $EMAIL"
echo "----------------------------------------------------------------------"

# ------------------------------------------------------------------------------
# 1. Angalia na Usakinishe Docker & Docker Compose kama havipo
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}⏳ [Hatua 1/6] Kuangalia na kusakinisha Docker & utegemezi...${NC}"

if ! command -v docker &> /dev/null; then
  echo "Inapakua na kusakinisha Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}✅ Docker imewekwa kikamilifu!${NC}"
else
  echo -e "${GREEN}✅ Docker tayari ipo kwenye mfumo.${NC}"
fi

# ------------------------------------------------------------------------------
# 2. Sakinisha Nginx na Certbot kwa ajili ya Reverse Proxy & SSL
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}⏳ [Hatua 2/6] Kusakinisha Nginx na Certbot...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq >/dev/null 2>&1
apt-get install -y nginx certbot python3-certbot-nginx curl ufw net-tools -qq >/dev/null 2>&1
echo -e "${GREEN}✅ Nginx na Certbot zipo tayari!${NC}"

# ------------------------------------------------------------------------------
# 3. Fungua Ports Muhimu za Omada Controller kwenye UFW Firewall
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}⏳ [Hatua 3/6] Kufungua Ports za TP-Link Omada kwenye Firewall...${NC}"
# Ports za Omada:
# - 8043/tcp : Omada Web GUI & Management API (HTTPS)
# - 8088/tcp : Omada Web GUI (HTTP)
# - 29810/udp: AP Discovery & Inform
# - 29811/tcp: AP Manager
# - 29812/tcp: AP Adopt
# - 29813/tcp: AP Upgrade
# - 29814/tcp: Captive Portal / Controller Inform
# - 29815/tcp: Speed Test
# - 29816/tcp & udp: Speed Test
if command -v ufw &> /dev/null; then
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw allow 8043/tcp >/dev/null 2>&1 || true
  ufw allow 29810/udp >/dev/null 2>&1 || true
  ufw allow 29811/tcp >/dev/null 2>&1 || true
  ufw allow 29812/tcp >/dev/null 2>&1 || true
  ufw allow 29813/tcp >/dev/null 2>&1 || true
  ufw allow 29814/tcp >/dev/null 2>&1 || true
  ufw allow 29815/tcp >/dev/null 2>&1 || true
  ufw allow 29816/tcp >/dev/null 2>&1 || true
  ufw allow 29816/udp >/dev/null 2>&1 || true
  ufw reload >/dev/null 2>&1 || true
  echo -e "${GREEN}✅ Ports zote za Omada Controller (29810-29816 & 8043) zimefunguliwa kwenye UFW!${NC}"
fi

# ------------------------------------------------------------------------------
# 4. Kuanzisha TP-Link Omada Software Controller Container
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}⏳ [Hatua 4/6] Kuanzisha TP-Link Omada Software Controller Container...${NC}"

# Tengeneza folda za kuhifadhi data za Omada ili zisipotee server ikizimwa
mkdir -p /opt/omada/data /opt/omada/work /opt/omada/logs
chmod -R 775 /opt/omada

# Kama container tayari lipo, lisimamishe na kulisasisha
if docker ps -a --format '{{.Names}}' | grep -Eq "^omada-controller$"; then
  echo "Container la zamani limepatikana, linasimamishwa..."
  docker stop omada-controller >/dev/null 2>&1 || true
  docker rm omada-controller >/dev/null 2>&1 || true
fi

# Hakikisha port 29810 haishikiliwi na process nyingine kabla ya kuwasha Omada
if command -v fuser &> /dev/null; then
  fuser -k 29810/tcp >/dev/null 2>&1 || true
  fuser -k 29810/udp >/dev/null 2>&1 || true
fi

# Anzisha Omada Controller Docker Container kwa kutumia Host Network au Port Mappings
# mbentley/omada-controller ndiyo image thabiti zaidi na iliyopimwa duniani kote
docker run -d \
  --name omada-controller \
  --restart unless-stopped \
  --net host \
  -e TZ="Africa/Dar_es_Salaam" \
  -e MANAGE_HTTP_PORT=8088 \
  -e MANAGE_HTTPS_PORT=8043 \
  -e PORTAL_HTTP_PORT=8088 \
  -e PORTAL_HTTPS_PORT=8843 \
  -e SHOW_SERVER_LOGS=true \
  -e SHOW_MONGODB_LOGS=false \
  -v /opt/omada/data:/opt/tplink/EAPController/data \
  -v /opt/omada/work:/opt/tplink/EAPController/work \
  -v /opt/omada/logs:/opt/tplink/EAPController/logs \
  mbentley/omada-controller:latest

echo -e "${GREEN}✅ Omada Controller Container imeanza kufanya kazi!${NC}"

# ------------------------------------------------------------------------------
# 5. Kusanidi Nginx Reverse Proxy kwa Subdomain ($SUBDOMAIN)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}⏳ [Hatua 5/6] Kusanidi Nginx Reverse Proxy kwa ajili ya https://${SUBDOMAIN}...${NC}"

NGINX_CONF="/etc/nginx/sites-available/omada-controller"

cat > "$NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name SUBDOMAIN_PLACEHOLDER;

    client_max_body_size 100M;

    # Njia ya uthibitishaji wa Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass https://127.0.0.1:8043;
        proxy_ssl_verify off;
        proxy_ssl_server_name off;
        proxy_http_version 1.1;

        # WebSocket support kwa ajili ya live topology na telemetry
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        proxy_connect_timeout 300s;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

# Weka subdomain halisi kwenye template
sed -i "s/SUBDOMAIN_PLACEHOLDER/$SUBDOMAIN/g" "$NGINX_CONF"

# Washa tovuti kwenye Nginx
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/omada-controller

# Hakikisha folda ya webroot ipo
mkdir -p /var/www/html

# Test Nginx syntax
nginx -t >/dev/null 2>&1
systemctl reload nginx

echo -e "${GREEN}✅ Mipangilio ya Nginx kwa ${SUBDOMAIN} imekamilika!${NC}"

# ------------------------------------------------------------------------------
# 6. Kusanidi Cheti cha SSL cha Let's Encrypt (HTTPS)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}⏳ [Hatua 6/6] Kupata Cheti cha Bure cha SSL (Let's Encrypt) kwa ${SUBDOMAIN}...${NC}"

SSL_SUCCESS=false
if certbot --nginx -d "$SUBDOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect >/dev/null 2>&1; then
  SSL_SUCCESS=true
  echo -e "${GREEN}✅ Cheti cha SSL kimewekwa kikamilifu na kufanya tovuti kuwa HTTPS salama!${NC}"
else
  echo -e "${YELLOW}⚠️ Angalizo kuhusu SSL:${NC}"
  echo "Certbot haijaweza kupata cheti mara moja. Sababu kuu ni:"
  echo "👉 DNS Record ya '${SUBDOMAIN}' bado haijaelekezwa kwenye IP ya VPS (${VPS_PUBLIC_IP})."
  echo ""
  echo "Hatua ya kufanya:"
  echo "1. Ingia kwenye paneli yako ya DNS (Cloudflare, Namecheap, cPanel, n.k.)."
  echo "2. Ongeza 'A Record':"
  echo "     Name:  $(echo $SUBDOMAIN | cut -d'.' -f1)"
  echo "     Type:  A"
  echo "     Value: ${VPS_PUBLIC_IP}"
  echo "3. Kisha endesha amri hii mara moja: sudo certbot --nginx -d ${SUBDOMAIN}"
fi

# ------------------------------------------------------------------------------
# MATOKEO NA MAELEKEZO YA KUANZA KUTUMIA
# ------------------------------------------------------------------------------
echo ""
echo -e "${CYAN}======================================================================${NC}"
echo -e "${GREEN}🎉 HONGERA! TP-LINK OMADA CONTROLLER IMEWEKWA KIKAMILIFU!            ${NC}"
echo -e "${CYAN}======================================================================${NC}"
if [ "$SSL_SUCCESS" = true ]; then
  echo -e "🌐 Fungua Controller kwenye Kivinjari chako:"
  echo -e "   👉 ${GREEN}https://${SUBDOMAIN}${NC}"
else
  echo -e "🌐 Fungua Controller kwenye Kivinjari chako:"
  echo -e "   👉 ${GREEN}http://${SUBDOMAIN}${NC} (au moja kwa moja: ${CYAN}https://${VPS_PUBLIC_IP}:8043${NC})"
fi
echo ""
echo "📌 MAELEZO MUHIMU YA KUTUMIA NA HOTSPOT BILLING YETU:"
echo "----------------------------------------------------------------------"
echo "1. Inform URL ya kuweka kwenye Access Points (AP):"
echo -e "   👉 ${CYAN}http://${SUBDOMAIN}:29810/inform${NC} (au http://${VPS_PUBLIC_IP}:29810/inform)"
echo ""
echo "2. Kwenye Hatua ya Kwanza ya Omada Setup Wizard:"
echo "   - Fungua: https://${SUBDOMAIN}"
echo "   - Tengeneza Controller Name (mfano: INFOTECH-OMADA-HQ)"
echo "   - Tengeneza Administrator Username & Password"
echo "   - Chagua Region: Tanzania na Timezone: Africa/Dar_es_Salaam"
echo ""
echo "3. Kuangalia Hali ya Omada Container (Logs):"
echo "   - docker logs -f omada-controller"
echo ""
echo "4. Kuanza au Kusimamisha Controller:"
echo "   - docker restart omada-controller"
echo -e "${CYAN}======================================================================${NC}"
