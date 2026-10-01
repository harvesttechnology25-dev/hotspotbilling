#!/usr/bin/env bash
# ==============================================================================
# 🔒 SCRIPT YA KUSANIDI DOMAIN & HTTPS/SSL YA BURE (LET'S ENCRYPT + NGINX)
# Inafanya mfumo wako uwe na HTTPS (Kufuli ya Kijani) ndani ya sekunde 30!
# Matumizi: sudo bash deploy/setup-ssl.sh wifi.domain-yako.com barua@pepe.com
# ==============================================================================
set -e

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ]; then
  echo "======================================================================"
  echo "  🔒 KUSANIDI DOMAIN & SSL (HTTPS) KWA AJILI YA TZ-WIFI BILLING       "
  echo "======================================================================"
  read -p "Ingiza Domain yako (mfano: wifi.kampuniyako.com): " DOMAIN
fi

if [ -z "$DOMAIN" ]; then
  echo "❌ Kosa: Lazima uweke domain name ili kuendelea!"
  exit 1
fi

if [ -z "$EMAIL" ]; then
  read -p "Ingiza Barua Pepe yako kwa ajili ya arifa za SSL (mfano: admin@$DOMAIN): " EMAIL
fi

if [ -z "$EMAIL" ]; then
  EMAIL="admin@$DOMAIN"
fi

echo ""
echo "🚀 1. Kuangalia na kusakinisha Nginx & Certbot..."
apt-get update -qq >/dev/null 2>&1
apt-get install -y nginx certbot python3-certbot-nginx -qq >/dev/null 2>&1

echo "⚙️  2. Kusanidi Nginx Reverse Proxy kwa port 3000..."
cat > /etc/nginx/sites-available/tz-wifi-billing << EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Washa tovuti na zima ile default
ln -sf /etc/nginx/sites-available/tz-wifi-billing /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Hakikisha configuration ya Nginx haina hitilafu
nginx -t >/dev/null 2>&1

# Washa upya Nginx
systemctl restart nginx

# Fungua ports 80 na 443 kwenye firewall
if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw reload >/dev/null 2>&1 || true
fi

echo "🔒 3. Kupata Cheti cha Bure cha SSL kutoka Let's Encrypt..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect >/dev/null 2>&1 || {
  echo "⚠️ Ilipata changamoto na Let's Encrypt. Hakikisha DNS A-Record ya '$DOMAIN' inaelekeza kwenye IP ya VPS hii."
  echo "Unaweza kurudia amri hii mara tu DNS ikishakaa sawa: sudo certbot --nginx -d $DOMAIN"
  exit 1
}

echo ""
echo "======================================================================"
echo "  🎉 HONGERA! DOMAIN & SSL ZIMEWEKWA KIKAMILIFU!                     "
echo "======================================================================"
echo "  🌐 Tovuti yako sasa inatumia HTTPS salama:                         "
echo "     👉 https://$DOMAIN                                              "
echo ""
echo "  📌 SASA BADILISHA KWENYE MIKROTIK (login.html):                     "
echo "     Kwenye login.html ya MikroTik badilisha URL iwe:                "
echo "     https://$DOMAIN/?mac=\$(mac)&ip=\$(ip)                            "
echo ""
echo "  📌 NA KWENYE DASHIBODI YA AZAMPAY (Webhook):                       "
echo "     https://$DOMAIN/api/v1/payment/callback/azampay                 "
echo "======================================================================"
