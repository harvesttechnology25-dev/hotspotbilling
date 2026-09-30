# MWONGOZO KAMILI WA KUDEPLOY MFUMO WA WIFI BILLING (VPS HADI MTEJA KUPATA INTERNET)

Mfumo huu unaunganisha sehemu 3 kuu:
1. **VPS (Ubuntu 22.04 / 24.04)** - Inapoendesha tovuti ya malipo (Captive Portal), API, Database, na Webhooks za Mitandao ya Simu.
2. **MikroTik RouterOS** - Router inayotoa Wi-Fi eneo la biashara na kusimamia Hotspot ya wateja.
3. **Malipo ya Simu (M-Pesa, Tigo Pesa, Airtel Money, HaloPesa)** - Mteja akilipa, anapata intaneti papo hapo bila msaada wa mtu.

---

## HATUA YA 1: KUDEPLOY MFUMO KWENYE VPS KWA KUTUMIA GITHUB (INAYOPENDEKEZWA)

Hii ndiyo njia rasmi ya kisasa ya kudeploy mfumo kwenye uzalishaji (Production). Inakupa usalama wa msimbo wako, kurahisisha kusasisha mfumo (updates) kwa amri moja tu, na kuhakikisha huduma haikatiki.

### 1.1 Ingia Kwenye VPS Yako (SSH)
Kutoka kwenye terminal au PuTTY ya kompyuta yako:
```bash
ssh root@IP_YA_VPS_YAKO
# au kama mtumiaji ni ubuntu:
ssh ubuntu@IP_YA_VPS_YAKO
```

### 1.2 Sakinisha Git, Node.js 20 LTS, na PM2
Copy na paste amri hizi kwenye terminal ya VPS:
```bash
sudo apt update && sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2 tsx
```

### 1.3 Shusha Mfumo Kutoka GitHub (Git Clone)
Tengeneza folda la uzalishaji na u-clone mradi wako:
```bash
sudo mkdir -p /var/www/tz-wifi-billing
sudo chown -R $USER:$USER /var/www/tz-wifi-billing
git clone https://github.com/USERNAME/REPO_NAME.git /var/www/tz-wifi-billing
cd /var/www/tz-wifi-billing
```

### 1.4 Sakinisha Dependencies na Jenga Frontend (Production Build)
```bash
npm install
npm run build
```

### 1.5 Sanidi Faili la Mazingira (`.env`)
Tengeneza faili la `.env` kutokana na `.env.example`:
```bash
cp .env.example .env
nano .env
```
Weka vigezo vyako muhimu:
```env
PORT=3000
NODE_ENV=production

# Taarifa za AzamPay / Mitandao ya Simu (M-Pesa, Tigo, Airtel, HaloPesa)
AZAMPAY_APP_NAME="TZ-WIFI-HOTSPOT"
AZAMPAY_CLIENT_ID="your_azampay_client_id"
AZAMPAY_CLIENT_SECRET="your_azampay_client_secret"
AZAMPAY_API_KEY="your_azampay_api_key"
AZAMPAY_ACCOUNT_NUMBER="255754000111"
AZAMPAY_WEBHOOK_SECRET="tzwifi_secret_key_89230492"

# Taarifa za MikroTik Hardware API
MIKROTIK_HOST="192.168.88.1"
MIKROTIK_API_PORT="8728"
MIKROTIK_USER="billing_api"
MIKROTIK_PASSWORD="PasswordSalamaYaRouter2026"
```
*(Bonyeza `CTRL + O`, kisha `ENTER` kuhifadhi, na `CTRL + X` kutoka).*

### 1.6 Washa Mfumo kwa PM2 (24/7 Auto-Restart)
Ili mfumo uendelee kufanya kazi bila kukatika hata VPS ikizimika au kuanza upya:
```bash
pm2 start server.ts --name "tz-wifi-billing" --interpreter tsx
pm2 startup
pm2 save
```
Unaweza kuangalia hali ya mfumo wakati wowote kwa kupiga:
```bash
pm2 status
pm2 logs tz-wifi-billing
```

### 1.7 Jinsi ya Kusasisha Mfumo Unapofanya Mabadiliko GitHub (CI/CD Updates)
Kila ukifanya maboresho au kubadilisha msimbo na ku-push GitHub, unaingia tu kwenye VPS na kupiga:
```bash
cd /var/www/tz-wifi-billing
git pull origin main
npm install
npm run build
pm2 restart tz-wifi-billing
```
*Mchakato huu unachukua chini ya sekunde 15 na hauathiri wateja wanaotumia intaneti!*

### 1.8 Njia Mbadala: 1-Line Quick Deploy Script
Kama hutaki kuandika amri moja baada ya nyingine, ukiwa ndani ya VPS unaweza kuendesha amri hii moja:
```bash
sudo bash deploy/quick-deploy.sh
```

---

## HATUA YA 2: KUPATA DOMAIN NAME NA KUWASHA HTTPS / SSL YA BURE

Kuwa na Domain na HTTPS (`https://wifi.jinalako.com`) ni muhimu sana kwa sababu:
- **Simu za wateja (Android na iPhone)** hazitaleta ujumbe wa onyo (*"Not Secure / Hati hii si salama"*).
- **M-Pesa / AzamPay Webhooks** zinahitaji HTTPS ili kuruhusu miamala ya malipo salama.

### 2.1 Kupata Domain Name
- **Kama huna domain:** Unaweza kusajili jina la biashara yako (mfano: `kampuniyako.com` au `kampuniyako.co.tz`) kutoka kwa watoa huduma kama *Namecheap*, *Truehost.co.tz*, *Extreme Web*, au *Cloudflare* (Gharama ni ndogo sana, takriban TZS 20,000 - 30,000 kwa mwaka mzima).
- **Kama tayari una domain ya biashara yako:** Tumia **Subdomain ya bure**! Mfano: `wifi.kampuniyako.com` au `hotspot.kampuniyako.com`.

### 2.2 Elekeza Domain Kwenye VPS (DNS A-Record)
Kwenye akaunti yako ya Domain (Namecheap, Cloudflare, au cPanel):
1. Nenda sehemu ya **DNS Management / Advanced DNS**.
2. Ongeza **A Record**:
   - **Type:** `A`
   - **Host:** `wifi` (au `@` kama unataka kutumia domain nzima)
   - **Points to (Value):** `IP_YA_VPS_YAKO` (mfano: `161.35.45.89`)
   - **TTL:** `Auto` au `300`

### 2.3 Washa HTTPS / SSL ya Bure (Amri Moja Tu)
Mara tu DNS ikishakaa sawa (inachukua dakika 1 hadi 5), nenda kwenye Terminal ya VPS yako na upige amri hii moja:
```bash
sudo bash deploy/setup-ssl.sh wifi.kampuniyako.com
```
*Script hii itaweka Nginx, itachukua cheti cha bure cha SSL kutoka **Let's Encrypt**, na kuwasha HTTPS yenye kufuli ya kijani moja kwa moja! Cheti hiki kitajihuisha (auto-renew) chenyewe kila baada ya miezi 3 bila gharama yoyote!*

---

## HATUA YA 3: KUSANIDI MIKROTIK ROUTEROS

Fungua **WinBox** au ingia kwenye **Terminal ya MikroTik**, kisha copy na paste amri hizi:

### 2.1 Tengeneza Mtumiaji wa API (API User)
Ili VPS iweze kutengeneza vocha na kuruhusu wateja waliolipa:
```routeros
/user group add name=billing_group policy=api,read,write,test
/user add name=billing_api group=billing_group password="PasswordSalamaYaRouter2026"
/ip service enable api
```

### 2.2 Weka Walled Garden (Ruhusu Malipo Kabla ya Kupata Intaneti)
Mteja asiye na bando anahitaji kufungua tovuti ya malipo kwenye VPS na kuwasiliana na mitandao ya simu bila kukatwa au kuzuiliwa:
```routeros
/ip hotspot walled-garden
add dst-host=IP_YA_VPS_YAKO action=allow
add dst-host=*.azampay.co.tz action=allow
add dst-host=*.vodacom.co.tz action=allow
add dst-host=*.tigo.co.tz action=allow
add dst-host=*.airtel.co.tz action=allow
add dst-host=*.halotel.co.tz action=allow
add dst-port=80,443,3000 action=allow
```

### 2.3 Sanidi Heartbeat ya Sekunde 10 (Cloud Sync Scheduler)
Kama MikroTik yako haina Public IP ya moja kwa moja (iko nyuma ya modemu ya Vodacom/Halotel 4G au Local ISP):
```routeros
/system script add name="tzwifi_cloud_sync" source={
  :do {
    /tool fetch url="http://IP_YA_VPS_YAKO:3000/api/v1/routers/1/poll" mode=http dst-path="cloud_sync.rsc";
    /import file-name="cloud_sync.rsc";
  } on-error={
    :log warning "TZ-WiFi: Imeshindwa kuwasiliana na Cloud Server";
  }
}

/system scheduler add name="tzwifi_sync_timer" interval=10s on-event="tzwifi_cloud_sync"
```

---

## HATUA YA 3: KUUNGANISHA CAPTIVE PORTAL YA MIKROTIK NA VPS

Mteja anapounganisha simu yake kwenye Wi-Fi, anapaswa kuona ukurasa wa malipo badala ya ukurasa wa kawaida wa MikroTik.

### 3.1 Badilisha faili la `login.html` la MikroTik
Kwenye WinBox, nenda **Files** ➔ `hotspot/login.html`:
Fungua faili hilo na uweke kodi hii rahisi ya redirect:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Inaelekeza kwenye Malipo...</title>
  <script type="text/javascript">
    // Inachukua taarifa za simu ya mteja (MAC, IP, na Login URL) na kumpeleka VPS
    var mac = "$(mac)";
    var ip = "$(ip)";
    var linkLogin = "$(link-login-only)";
    var linkOrig = "$(link-orig)";
    var error = "$(error)";

    var vpsUrl = "http://IP_YA_VPS_YAKO:3000/?mac=" + encodeURIComponent(mac) + 
                 "&ip=" + encodeURIComponent(ip) + 
                 "&link-login=" + encodeURIComponent(linkLogin) + 
                 "&link-orig=" + encodeURIComponent(linkOrig) + 
                 "&error=" + encodeURIComponent(error);

    window.location.replace(vpsUrl);
  </script>
</head>
<body style="font-family:sans-serif; text-align:center; padding-top:50px;">
  <p>Tafadhali subiri, unaelekezwa kwenye mfumo wa vifurushi vya Wi-Fi...</p>
</body>
</html>
```
*(Hifadhi faili hili na uliweke ndani ya folda la `hotspot` kwenye MikroTik).*

---

## HATUA YA 4: KUSANIDI WEBHOOK YA MALIPO KWENYE AZAMPAY / GATEWAY

Kwenye Dashibodi ya AzamPay / Selcom:
- **Webhook URL:** Weka `http://IP_YA_VPS_YAKO:3000/api/v1/payment/callback/azampay` (au ukiwa na domain: `https://wifi.domain-yako.com/api/v1/payment/callback/azampay`)
- **Webhook Secret:** Weka nenosiri uliloweka kwenye `.env` (`AZAMPAY_WEBHOOK_SECRET`).

---

## HATUA YA 5: SAFARI YA MTEJA (JINSI INAVYOFANYA KAZI KWA VITENDO)

Hivi ndivyo mchakato mzima unavyofanyika mteja anapokuja eneo lako:

1. **Mteja anafungua Wi-Fi** kwenye simu yake na kuchagua jina la Wi-Fi yako (SSID).
2. Simu inatoa taarifa: *"Sign in to Wi-Fi network"* na **Captive Portal inafunguka papo hapo**.
3. Mteja anachagua Kifurushi (mfano: **Masaa 24 @ TZS 1,000**).
4. Mteja anaandika namba yake ya simu (mfano: `0754 123 456`). Mfumo unatambua mara moja kuwa ni **Vodacom M-Pesa**.
5. Mteja anabonyeza kitufe cha **`Lipia TZS 1,000`**.
6. Simu ya mteja inapokea **USSD Pop-up ya M-Pesa** moja kwa moja:
   > *"Ingiza namba yako ya siri kulipa TZS 1,000 kwenda TZ-WIFI-HOTSPOT..."*
7. Mteja anaweka **PIN** yake.
8. Mtandao wa simu (Vodacom/AzamPay) unatuma taarifa ya papo hapo (Webhook) kwenda kwenye VPS yako.
9. VPS inathibitisha malipo na inafanya mambo mawili kwa sekunde 1:
   - Inatengeneza mtumiaji kwenye MikroTik kupitia API au Cloud Sync.
   - Inafanya **Auto-Login** kwa MAC Address ya simu ya mteja.
10. Simu ya mteja inafunguka intaneti yenye kasi kubwa mara moja! 🎉
