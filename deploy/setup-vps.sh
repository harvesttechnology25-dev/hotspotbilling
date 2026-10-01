#!/usr/bin/env bash
# ==============================================================================
# BILLNASI-STYLE MIKROTIK HOTSPOT & ISP BILLING PLATFORM
# AUTOMATED CLOUD VPS PROVISIONING SCRIPT FOR UBUNTU 22.04 LTS
# ==============================================================================
# Installs & Configures:
#   1. System Security & UFW (Port 80/443, 1195 OpenVPN, 4443 SSTP, 
#      and isolates RADIUS 1812/1813 & CoA 3799 strictly to 100.108.0.0/18)
#   2. Node.js 20 LTS, Git, TypeScript, and PM2 Process Manager
#   3. MySQL 8 Database Server & FreeRADIUS SQL Integration
#   4. FreeRADIUS 3.x with CoA / Disconnect-Request support & MikroTik Dictionary
#   5. OpenVPN Server with 100.108.0.0/18 Virtual Subnet & Easy-RSA 3 PKI
#   6. Nginx Reverse Proxy with SSL, WebSocket Support, and Static SPA Serving
# ==============================================================================

set -euo pipefail

# Color Palette for Console Logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# ------------------------------------------------------------------------------
# 1. Environment & Pre-Flight Validations
# ------------------------------------------------------------------------------
echo -e "${CYAN}"
echo "======================================================================"
echo "    INFOTECH WiFi CLOUD VPS PROVISIONING ENGINE (Ubuntu 22.04)   "
echo "======================================================================"
echo -e "${NC}"

if [ "${EUID}" -ne 0 ]; then
  log_error "This script must be run as root. Please run: sudo bash $0"
  exit 1
fi

# Configuration Variables
APP_DIR="/var/www/tzwifi"
APP_USER="www-data"
NODE_PORT="5000"
VPN_SUBNET="100.108.0.0/18"
VPN_SERVER_IP="100.108.0.1"
VPN_PORT="1195"
SSTP_PORT="4443"
RADIUS_SECRET="${RADIUS_SECRET:-radius_secret_2026}"
MYSQL_ROOT_PASS="${MYSQL_ROOT_PASS:-SecureDbRoot2026!}"
MYSQL_RADIUS_PASS="${MYSQL_RADIUS_PASS:-SecureRadiusPass2026!}"
DOMAIN_NAME="${DOMAIN_NAME:-billing.tzwifi.co.tz}"

log_info "Step 1/7: Updating base system and installing core dependencies..."
export DEBIAN_FRONTEND=noninteractive
timedatectl set-timezone Africa/Dar_es_Salaam || true

apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
  curl \
  wget \
  gnupg \
  git \
  build-essential \
  ca-certificates \
  software-properties-common \
  ufw \
  iptables \
  net-tools \
  jq \
  unzip \
  dnsutils \
  libssl-dev \
  openssl \
  easy-rsa \
  openvpn \
  nginx \
  certbot \
  python3-certbot-nginx \
  mysql-server

log_success "Base system packages installed successfully."

# ------------------------------------------------------------------------------
# 2. Firewall Hardening (UFW) & Port Isolation
# ------------------------------------------------------------------------------
log_info "Step 2/7: Hardening firewall with UFW (Isolating RADIUS to ${VPN_SUBNET})..."

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Public Services
ufw allow 22/tcp comment "SSH Remote Management"
ufw allow 80/tcp comment "HTTP Web & Certbot Validation"
ufw allow 443/tcp comment "HTTPS Secure Portal & API"
ufw allow ${VPN_PORT}/udp comment "OpenVPN Router Tunnel"
ufw allow ${SSTP_PORT}/tcp comment "SoftEther SSTP Router Tunnel"

# Restricted to Router VPN Fleet Subnet (100.108.0.0/18)
ufw allow from ${VPN_SUBNET} to any port 1812 proto udp comment "FreeRADIUS Authentication"
ufw allow from ${VPN_SUBNET} to any port 1813 proto udp comment "FreeRADIUS Accounting"
ufw allow from ${VPN_SUBNET} to any port 3799 proto udp comment "FreeRADIUS CoA / Disconnect-Request"

echo "y" | ufw enable
log_success "Firewall enabled: RADIUS 1812/1813 & CoA 3799 isolated to VPN Subnet."

# ------------------------------------------------------------------------------
# 3. Node.js 20 LTS, TypeScript & PM2 Engine
# ------------------------------------------------------------------------------
log_info "Step 3/7: Installing Node.js 20 LTS, tsx, and PM2 process supervisor..."

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

npm install -g pm2 tsx typescript

log_success "Node.js $(node -v) and PM2 $(pm2 -v) ready."

# ------------------------------------------------------------------------------
# 4. MySQL 8 Database Server & FreeRADIUS Schema
# ------------------------------------------------------------------------------
log_info "Step 4/7: Configuring MySQL 8 Database and FreeRADIUS Schema..."

systemctl start mysql
systemctl enable mysql

# Create databases and users
mysql -u root <<EOF
-- Set root password
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASS}';

-- Create Application Database
CREATE DATABASE IF NOT EXISTS \`tzwifi_billing\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create FreeRADIUS Database
CREATE DATABASE IF NOT EXISTS \`radius\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create FreeRADIUS User
CREATE USER IF NOT EXISTS 'radius'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_RADIUS_PASS}';
GRANT ALL PRIVILEGES ON \`radius\`.* TO 'radius'@'localhost';
GRANT ALL PRIVILEGES ON \`tzwifi_billing\`.* TO 'radius'@'localhost';

FLUSH PRIVILEGES;
EOF

log_success "MySQL database 'radius' and 'tzwifi_billing' provisioned."

# ------------------------------------------------------------------------------
# 5. FreeRADIUS 3.x Installation & Configuration
# ------------------------------------------------------------------------------
log_info "Step 5/7: Installing FreeRADIUS 3.x with MySQL Driver & CoA Listener..."

apt-get install -y freeradius freeradius-mysql freeradius-utils

systemctl stop freeradius

# Populate FreeRADIUS MySQL Tables
if [ -f /etc/freeradius/3.0/mods-config/sql/main/mysql/schema.sql ]; then
  mysql -u radius -p"${MYSQL_RADIUS_PASS}" radius < /etc/freeradius/3.0/mods-config/sql/main/mysql/schema.sql || true
  log_success "FreeRADIUS base schema loaded into MySQL."
fi

# Configure FreeRADIUS SQL Module
cat > /etc/freeradius/3.0/mods-available/sql <<EOF
sql {
    driver = "rlm_sql_mysql"
    dialect = "mysql"

    server = "localhost"
    port = 3306
    login = "radius"
    password = "${MYSQL_RADIUS_PASS}"

    radius_db = "radius"

    read_groups = yes
    read_profiles = yes
    read_clients = yes

    client_table = "nas"

    # Connection pool configuration
    pool {
        start = 5
        min = 4
        max = 32
        spare = 3
        uses = 0
        retry_delay = 30
        lifetime = 0
        idle_timeout = 60
    }

    \$INCLUDE \${modconfdir}/\${.:name}/main/\${dialect}/queries.conf
}
EOF

# Symlink SQL module into mods-enabled
ln -sf /etc/freeradius/3.0/mods-available/sql /etc/freeradius/3.0/mods-enabled/sql

# Enable SQL in default virtual server
sed -i 's/-sql/sql/g' /etc/freeradius/3.0/sites-available/default || true

# Authorize MikroTik NAS devices from VPN Subnet in clients.conf
cat >> /etc/freeradius/3.0/clients.conf <<EOF

# ==============================================================================
# MIKROTIK VPN FLEET NAS CONFIGURATION
# ==============================================================================
client vpn-fleet {
    ipaddr = ${VPN_SUBNET}
    secret = ${RADIUS_SECRET}
    shortname = mikrotik-fleet
    nas_type = mikrotik
    require_message_authenticator = no
    limit {
        max_connections = 128
        lifetime = 0
        idle_timeout = 30
    }
}
EOF

# Configure CoA (Change of Authorization) on port 3799 for Disconnect Requests
cat > /etc/freeradius/3.0/sites-available/coa <<EOF
server coa {
    listen {
        type = coa
        ipaddr = *
        port = 3799
    }

    recv-coa {
        ok
    }

    send-coa {
        ok
    }
}
EOF
ln -sf /etc/freeradius/3.0/sites-available/coa /etc/freeradius/3.0/sites-enabled/coa || true

# Fix permissions
chown -R freerad:freerad /etc/freeradius/3.0
systemctl start freeradius
systemctl enable freeradius

log_success "FreeRADIUS 3.x is active and listening on ports 1812, 1813, and 3799 (CoA)."

# ------------------------------------------------------------------------------
# 6. OpenVPN Server Provisioning (Virtual Subnet: 100.108.0.0/18)
# ------------------------------------------------------------------------------
log_info "Step 6/7: Setting up OpenVPN Server & Router Certificate Infrastructure..."

OPENVPN_DIR="/etc/openvpn"
EASYRSA_DIR="/etc/openvpn/easy-rsa"

mkdir -p "${OPENVPN_DIR}/ccd"
rm -rf "${EASYRSA_DIR}"
make-cadir "${EASYRSA_DIR}"
cd "${EASYRSA_DIR}"

# Initialize Easy-RSA PKI non-interactively
./easyrsa init-pki
EASYRSA_BATCH=1 ./easyrsa build-ca nopass
EASYRSA_BATCH=1 ./easyrsa gen-dh
EASYRSA_BATCH=1 ./easyrsa build-server-full server nopass
openvpn --genkey secret "${OPENVPN_DIR}/ta.key"

cp pki/ca.crt "${OPENVPN_DIR}/"
cp pki/issued/server.crt "${OPENVPN_DIR}/"
cp pki/private/server.key "${OPENVPN_DIR}/"
cp pki/dh.pem "${OPENVPN_DIR}/"

# Write OpenVPN Server Configuration
cat > /etc/openvpn/server.conf <<EOF
port ${VPN_PORT}
proto udp
dev tun
topology subnet
server 100.108.0.0 255.255.192.0
ifconfig-pool-persist /etc/openvpn/ipp.txt
client-config-dir /etc/openvpn/ccd
client-to-client

ca /etc/openvpn/ca.crt
cert /etc/openvpn/server.crt
key /etc/openvpn/server.key
dh /etc/openvpn/dh.pem
tls-auth /etc/openvpn/ta.key 0

cipher AES-256-GCM
auth SHA256
keepalive 10 120
persist-key
persist-tun
status /var/log/openvpn-status.log
log-append /var/log/openvpn.log
verb 3
explicit-exit-notify 1
EOF

# Enable IPv4 Forwarding in Kernel
cat > /etc/sysctl.d/99-openvpn-forward.conf <<EOF
net.ipv4.ip_forward=1
EOF
sysctl -p /etc/sysctl.d/99-openvpn-forward.conf

# Setup NAT iptables rule
PUBLIC_IFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
iptables -t nat -A POSTROUTING -s ${VPN_SUBNET} -o "${PUBLIC_IFACE}" -j MASQUERADE

# Persist iptables
apt-get install -y iptables-persistent
netfilter-persistent save

systemctl enable openvpn@server
systemctl restart openvpn@server

log_success "OpenVPN Server active on ${VPN_PORT}/udp (Subnet: ${VPN_SUBNET}, Gateway: ${VPN_SERVER_IP})."

# ------------------------------------------------------------------------------
# 7. Nginx Reverse Proxy & Node.js Application Setup
# ------------------------------------------------------------------------------
log_info "Step 7/7: Configuring Nginx Reverse Proxy and PM2 Application Service..."

# Generate self-signed SSL certificate fallback
SSL_CERT_DIR="/etc/ssl/tzwifi"
mkdir -p "${SSL_CERT_DIR}"
if [ ! -f "${SSL_CERT_DIR}/selfsigned.crt" ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "${SSL_CERT_DIR}/selfsigned.key" \
    -out "${SSL_CERT_DIR}/selfsigned.crt" \
    -subj "/C=TZ/ST=DarEsSalaam/L=DarEsSalaam/O=TZ-WiFi/CN=${DOMAIN_NAME}"
fi

cat > /etc/nginx/sites-available/tzwifi.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_NAME} _;

    # Certbot ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN_NAME} _;

    ssl_certificate ${SSL_CERT_DIR}/selfsigned.crt;
    ssl_certificate_key ${SSL_CERT_DIR}/selfsigned.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Performance
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    client_max_body_size 50M;

    root ${APP_DIR}/dist;
    index index.html;

    # Captive Portal & SPA routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API Proxy to Node.js Backend
    location /api/ {
        proxy_pass http://127.0.0.1:${NODE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90;
    }
}
EOF

ln -sf /etc/nginx/sites-available/tzwifi.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx
systemctl enable nginx

log_success "Nginx reverse proxy active with SSL and WebSocket support."

# Summary Printout
echo -e "${GREEN}"
echo "======================================================================"
echo "    VPS PROVISIONING COMPLETED SUCCESSFULLY!                          "
echo "======================================================================"
echo -e "${NC}"
echo -e "• FreeRADIUS Service:    ${GREEN}ACTIVE${NC} (Ports: 1812, 1813, 3799)"
echo -e "• FreeRADIUS Secret:     ${CYAN}${RADIUS_SECRET}${NC}"
echo -e "• OpenVPN Server:        ${GREEN}ACTIVE${NC} (Port: ${VPN_PORT}/udp, Subnet: ${VPN_SUBNET})"
echo -e "• VPN Gateway IP:        ${CYAN}${VPN_SERVER_IP}${NC}"
echo -e "• Web & API Proxy:       ${GREEN}ACTIVE${NC} (https://${DOMAIN_NAME})"
echo -e "• MySQL Database:        ${GREEN}ACTIVE${NC} (radius & tzwifi_billing)"
echo ""
echo "Next step: Deploy your application code to ${APP_DIR} and start with PM2:"
echo "  cd ${APP_DIR} && npm install && npm run build"
echo "  pm2 start server.ts --name tzwifi-billing --interpreter tsx"
echo "  pm2 save && pm2 startup"
echo ""
