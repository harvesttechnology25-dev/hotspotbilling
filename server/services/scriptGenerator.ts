import { RouterRecord } from '../types.js';

export interface VpnConfigParams {
  serverHost: string;
  vpnPort?: number;
  assignedIp?: string;
  radiusIp?: string;
  radiusSecret?: string;
  protocol?: 'ovpn' | 'sstp';
  username?: string;
  password?: string;
}

export interface HotspotConfigParams {
  bridgeName?: string;
  hotspotSubnet?: string;
  gatewayIp?: string;
  portalDomain?: string;
  radiusIp?: string;
  hotspotName?: string;
  dnsName?: string;
}

export interface PppoeConfigParams {
  bridgeName?: string;
  serviceName?: string;
  poolRange?: string;
  localAddress?: string;
  remotePoolName?: string;
  dnsServers?: string;
}

export class ScriptGeneratorService {
  /**
   * 1. vpn.rsc: Sets up OpenVPN/SSTP client, firewall filter for VPS VPN subnet,
   * disables FastTrack (essential for hotspot queue counters), and configures RADIUS client with CoA.
   */
  static generateVpnScript(router: RouterRecord, params?: Partial<VpnConfigParams>): string {
    const serverHost = params?.serverHost || process.env.APP_URL?.replace(/^https?:\/\//, '') || 'infotechwifi.com';
    const vpnPort = params?.vpnPort || 1195;
    const assignedIp = params?.assignedIp || router.vpn_assigned_ip || '100.108.0.2';
    const radiusIp = params?.radiusIp || '100.108.0.1';
    const radiusSecret = params?.radiusSecret || router.radius_secret || 'radius_secret_2026';
    const proto = params?.protocol || 'ovpn';
    const routerUser = params?.username || `router-${router.id}`;
    const routerPass = params?.password || 'RouterSecret2026!';

    return `# ==============================================================================
# TZ-WIFI / BILLNASI CLOUD ISP PLATFORM: VPN & RADIUS PROVISIONING SCRIPT
# Router Identity: ${router.name} (ID: ${router.id})
# Generated At: ${new Date().toISOString()}
# Target RouterOS: v6.48+ / v7.x (CHR, RB750Gr3, RB4011, hEX, hAP ax)
# ==============================================================================

:log info ">>> Starting TZ-WiFi Cloud VPN & FreeRADIUS Provisioning..."

# 1. SET ROUTER IDENTITY
/system identity set name="${router.name}"

# 2. DISABLE FASTTRACK
# FastTrack bypasses connection tracking queues and breaks Hotspot / Simple Queues counters!
:log info "Checking and disabling FastTrack firewall filter rule..."
/ip firewall filter
:if ([:len [find where action=fasttrack-connection]] > 0) do={
    disable [find where action=fasttrack-connection]
    :log warning "FastTrack disabled to ensure accurate FreeRADIUS QoS queues."
}

# 3. FIREWALL FILTER: ACCEPT CLOUD VPN SUB-NET
:log info "Configuring Cloud VPS input filter rules..."
/ip firewall filter
:if ([:len [find where comment="TZWIFI-ALLOW-CLOUD-VPN"]] = 0) do={
    add chain=input action=accept src-address=100.108.0.0/18 comment="TZWIFI-ALLOW-CLOUD-VPN" place-before=1
    add chain=input action=accept protocol=udp dst-port=3799 comment="TZWIFI-ALLOW-RADIUS-COA" place-before=2
}

# 4. VPN CLIENT INTERFACE (${proto.toUpperCase()})
${proto === 'ovpn' ? `
:log info "Configuring OpenVPN Client Interface to ${serverHost}:${vpnPort}..."
/interface ovpn-client
:if ([:len [find where name="ovpn-tzwifi-cloud"]] = 0) do={
    add name="ovpn-tzwifi-cloud" \
        connect-to="${serverHost}" \
        port=${vpnPort} \
        mode=ip \
        user="${routerUser}" \
        password="${routerPass}" \
        profile=default-encryption \
        cipher=aes256 \
        auth=sha256 \
        add-default-route=no \
        disabled=no \
        comment="TZ-WIFI Cloud Central VPN Tunnel"
} else={
    set [find where name="ovpn-tzwifi-cloud"] \
        connect-to="${serverHost}" \
        port=${vpnPort} \
        user="${routerUser}" \
        password="${routerPass}" \
        disabled=no
}
` : `
:log info "Configuring SSTP Client Interface to ${serverHost}:4443..."
/interface sstp-client
:if ([:len [find where name="sstp-tzwifi-cloud"]] = 0) do={
    add name="sstp-tzwifi-cloud" \
        connect-to="${serverHost}" \
        port=4443 \
        user="${routerUser}" \
        password="${routerPass}" \
        profile=default-encryption \
        add-default-route=no \
        disabled=no \
        comment="TZ-WIFI Cloud Central SSTP Tunnel"
}
`}

# 5. CONFIGURE FREERADIUS CLIENT & INCOMING COA (CHANGE OF AUTHORIZATION)
:log info "Configuring FreeRADIUS client pointing to ${radiusIp}..."
/radius
:if ([:len [find where comment="TZWIFI-FREERADIUS-AAA"]] = 0) do={
    add service=hotspot,ppp \
        address="${radiusIp}" \
        secret="${radiusSecret}" \
        authentication-port=1812 \
        accounting-port=1813 \
        timeout=3500ms \
        comment="TZWIFI-FREERADIUS-AAA"
} else={
    set [find where comment="TZWIFI-FREERADIUS-AAA"] \
        address="${radiusIp}" \
        secret="${radiusSecret}" \
        timeout=3500ms
}

# 6. ENABLE RADIUS INCOMING DISCONNECT-REQUESTS (CoA PORT 3799)
:log info "Enabling RADIUS Incoming CoA on port 3799..."
/radius incoming set accept=yes port=3799

:log info ">>> TZ-WiFi Cloud VPN & FreeRADIUS Provisioning Completed Successfully!"
`;
  }

  /**
   * 2. hotspot.rsc: Creates dedicated bridge, IP pool, DHCP, and Hotspot profile with
   * use-radius=yes, radius-interim-update=00:03:45, and Walled Garden rules.
   */
  static generateHotspotScript(router: RouterRecord, params?: Partial<HotspotConfigParams>): string {
    const bridgeName = params?.bridgeName || 'bridge-hotspot';
    const gatewayIp = params?.gatewayIp || '192.168.88.1';
    const hotspotSubnet = params?.hotspotSubnet || '192.168.88.0/24';
    const portalDomain = params?.portalDomain || 'wifi.hotspot.lan';
    const hotspotName = params?.hotspotName || router.hotspot_server_name || 'hotspot1';
    const appDomain = process.env.APP_URL?.replace(/^https?:\/\//, '') || 'billing.tzwifi.co.tz';

    return `# ==============================================================================
# TZ-WIFI / BILLNASI CLOUD ISP PLATFORM: HOTSPOT CONFIGURATION SCRIPT
# Router: ${router.name} (Hotspot Server: ${hotspotName})
# Generated At: ${new Date().toISOString()}
# ==============================================================================

:log info ">>> Starting Hotspot & FreeRADIUS AAA Provisioning..."

# 1. CREATE HOTSPOT BRIDGE & IP POOL
/interface bridge
:if ([:len [find where name="${bridgeName}"]] = 0) do={
    add name="${bridgeName}" comment="TZ-WIFI Dedicated Hotspot Bridge"
}

/ip pool
:if ([:len [find where name="pool-hotspot"]] = 0) do={
    add name="pool-hotspot" ranges="192.168.88.10-192.168.88.250"
}

# 2. CONFIGURE IP ADDRESS & DHCP SERVER
/ip address
:if ([:len [find where interface="${bridgeName}"]] = 0) do={
    add address="${gatewayIp}/24" interface="${bridgeName}" network=192.168.88.0 comment="Hotspot Gateway IP"
}

/ip dhcp-server
:if ([:len [find where name="dhcp-hotspot"]] = 0) do={
    add name="dhcp-hotspot" interface="${bridgeName}" address-pool="pool-hotspot" lease-time=1h disabled=no
}
/ip dhcp-server network
:if ([:len [find where address="${hotspotSubnet}"]] = 0) do={
    add address="${hotspotSubnet}" gateway="${gatewayIp}" dns-server="${gatewayIp},8.8.8.8"
}

# 3. CONFIGURE HOTSPOT SERVER PROFILE WITH FREERADIUS AAA
/ip hotspot profile
:if ([:len [find where name="tzwifi-radius-profile"]] = 0) do={
    add name="tzwifi-radius-profile" \
        hotspot-address="${gatewayIp}" \
        dns-name="${portalDomain}" \
        html-directory="hotspot" \
        login-by=http-pap,http-chap,mac-cookie \
        use-radius=yes \
        radius-interim-update=00:03:45 \
        radius-accounting=yes \
        radius-mac-format=XX:XX:XX:XX:XX:XX \
        nas-port-type=19 \
        comment="TZ-WIFI Radius Authentication Profile"
} else={
    set [find where name="tzwifi-radius-profile"] \
        use-radius=yes \
        radius-interim-update=00:03:45 \
        radius-accounting=yes
}

# 4. ATTACH PROFILE TO HOTSPOT SERVER
/ip hotspot
:if ([:len [find where name="${hotspotName}"]] = 0) do={
    add name="${hotspotName}" \
        interface="${bridgeName}" \
        address-pool="pool-hotspot" \
        profile="tzwifi-radius-profile" \
        addresses-per-mac=1 \
        disabled=no
} else={
    set [find where name="${hotspotName}"] \
        profile="tzwifi-radius-profile" \
        disabled=no
}

# 5. WALLED GARDEN RULES: PERMIT ACCESS TO PORTAL & PAYMENT GATEWAYS
:log info "Configuring Walled Garden whitelist for Cloud Billing & Mobile Money APIs..."
/ip hotspot walled-garden
add dst-host="${appDomain}" action=allow comment="TZ-WIFI Cloud Portal Domain"
add dst-host="*.azampay.co.tz" action=allow comment="AzamPay Unified Mobile Money Gateway"
add dst-host="*.vodacom.co.tz" action=allow comment="Vodacom M-Pesa OpenAPI"
add dst-host="*.tigo.co.tz" action=allow comment="Tigo Pesa Mixx"
add dst-host="*.airtel.co.tz" action=allow comment="Airtel Money Tanzania"
add dst-host="*.whatsapp.net" action=allow comment="WhatsApp Support Channels"
add dst-host="*.palmpesa.com" action=allow comment="PalmPesa Sub-Merchant Payouts"

# 6. WALLED GARDEN IP BYPASS
/ip hotspot walled-garden ip
add dst-address=100.108.0.1 action=accept comment="Cloud RADIUS & Billing VPS"

:log info ">>> Hotspot & FreeRADIUS AAA Provisioning Completed Successfully!"
`;
  }

  /**
   * 3. pppoe.rsc: Configures an isolated PPPoE bridge, profile, RADIUS AAA with interim updates,
   * and address list filtering for expired accounts (walled garden renewal redirect).
   */
  static generatePppoeScript(router: RouterRecord, params?: Partial<PppoeConfigParams>): string {
    const bridgeName = params?.bridgeName || 'bridge-pppoe';
    const serviceName = params?.serviceName || 'TZWIFI-PPPOE';
    const poolRange = params?.poolRange || '10.10.10.2-10.10.13.254';
    const localAddress = params?.localAddress || '10.10.10.1';
    const dnsServers = params?.dnsServers || '8.8.8.8,1.1.1.1';

    return `# ==============================================================================
# TZ-WIFI / BILLNASI CLOUD ISP PLATFORM: PPPOE & BROADBAND AAA SCRIPT
# Router: ${router.name} (Service: ${serviceName})
# Generated At: ${new Date().toISOString()}
# ==============================================================================

:log info ">>> Starting PPPoE Server & FreeRADIUS AAA Provisioning..."

# 1. CREATE PPPOE BRIDGE & IP POOL
/interface bridge
:if ([:len [find where name="${bridgeName}"]] = 0) do={
    add name="${bridgeName}" comment="TZ-WIFI Dedicated PPPoE Client Bridge"
}

/ip pool
:if ([:len [find where name="pool-pppoe"]] = 0) do={
    add name="pool-pppoe" ranges="${poolRange}"
}

/ip pool
:if ([:len [find where name="pool-pppoe-expired"]] = 0) do={
    add name="pool-pppoe-expired" ranges="10.254.254.2-10.254.254.254" comment="Pool for Expired / Suspended PPPoE users"
}

# 2. CONFIGURE PPP PROFILE WITH RADIUS AAA & INTERIM UPDATES
/ppp profile
:if ([:len [find where name="pppoe-radius-profile"]] = 0) do={
    add name="pppoe-radius-profile" \
        local-address="${localAddress}" \
        remote-address="pool-pppoe" \
        dns-server="${dnsServers}" \
        use-encryption=yes \
        use-compression=no \
        use-ipv6=no \
        use-mpls=no \
        comment="TZ-WIFI Standard Radius AAA PPPoE Profile"
}

# Expired Profile
:if ([:len [find where name="pppoe-expired-profile"]] = 0) do={
    add name="pppoe-expired-profile" \
        local-address="10.254.254.1" \
        remote-address="pool-pppoe-expired" \
        incoming-filter="expired-pppoe-in" \
        address-list="EXPIRED_PPPOE" \
        comment="Profile for expired subscribers redirected to payment portal"
}

# 3. ENABLE AAA ON PPP FOR FREERADIUS INTERIM ACCOUNTING
/ppp aaa set \
    use-radius=yes \
    accounting=yes \
    interim-update=00:03:45

# 4. START PPPOE SERVER INSTANCE
/interface pppoe-server server
:if ([:len [find where service-name="${serviceName}"]] = 0) do={
    add service-name="${serviceName}" \
        interface="${bridgeName}" \
        default-profile="pppoe-radius-profile" \
        authentication=pap,chap,mschap2 \
        one-session-per-host=yes \
        max-mtu=1480 \
        max-mru=1480 \
        keepalive-timeout=30 \
        disabled=no \
        comment="TZ-WIFI Active PPPoE Server"
}

# 5. WALL-GARDEN REDIRECT FOR EXPIRED BROADBAND SUBSCRIBERS
/ip firewall nat
:if ([:len [find where comment="REDIRECT-EXPIRED-PPPOE"]] = 0) do={
    add chain=dstnat src-address-list="EXPIRED_PPPOE" protocol=tcp dst-port=80 action=redirect to-ports=8080 comment="REDIRECT-EXPIRED-PPPOE"
}

:log info ">>> PPPoE Server & FreeRADIUS AAA Provisioning Completed Successfully!"
`;
  }

  /**
   * 4. anti-tethering.rsc: Blocks smartphone mobile hotspot / Wi-Fi sharing & tethering repeaters
   * via IPv4 Postrouting TTL=1 clamping, Inbound TTL 63/127 hop drops, and addresses-per-mac=1.
   */
  static generateAntiTetheringScript(
    router: RouterRecord,
    params?: { bridgeName?: string; hotspotSubnet?: string }
  ): string {
    const bridgeName = params?.bridgeName || 'bridge-hotspot';
    const hotspotSubnet = params?.hotspotSubnet || '192.168.88.0/24';

    return `# ==============================================================================
# TZ-WIFI / BILLNASI CLOUD ISP PLATFORM: ANTI-TETHERING & ANTI-HOTSPOT SHARING
# Router: ${router.name} (Hotspot Bridge: ${bridgeName})
# Lengo: Kuzuia wateja wanaowasha Mobile Hotspot au Wi-Fi Sharing kwenye simu zao
# (kama vile Samsung, Xiaomi, iPhone) kusambazia wengine intaneti bila kulipia!
# Generated At: ${new Date().toISOString()}
# ==============================================================================

:log info ">>> Starting TZ-WiFi Anti-Tethering & Anti-Hotspot Sharing Protection..."

# ------------------------------------------------------------------------------
# 1. POSTROUTING TTL CLAMPING (SET TTL = 1)
# ------------------------------------------------------------------------------
# Mteja anapounganisha simu yake moja kwa moja kwenye Wi-Fi yako, pakiti zote
# za intaneti zinazomfikia zinapewa TTL = 1.
# - Simu ya mteja inazipokea na kuzitumia kawaida (YouTube, WhatsApp, n.k. 100% OK).
# - Mteja akiwasha "Mobile Hotspot / Wi-Fi Sharing" ili awape wenzake intaneti,
#   simu yake kama router lazima ipunguze TTL kwa 1 (1 - 1 = 0) kabla ya kuirusha.
# - TTL ikishakuwa 0, simu ya mteja inalazimika KUKITUPA KIFURUSHI CHOCHOTE (DROP)!
# Matokeo: Simu ya mteja inafanya kazi vizuri, lakini marafiki waliounganishwa
# kwenye hotspot ya simu hiyo HAWAWEZI KUPATA INTANETI (No Internet Access)!
# ------------------------------------------------------------------------------
/ip firewall mangle
:if ([:len [find where comment="TZWIFI-ANTI-TETHERING-TTL1-BRIDGE"]] = 0) do={
    add chain=postrouting out-interface="${bridgeName}" action=change-ttl new-ttl=set:1 passthrough=yes comment="TZWIFI-ANTI-TETHERING-TTL1-BRIDGE"
}
:if ([:len [find where comment="TZWIFI-ANTI-TETHERING-TTL1-SUBNET"]] = 0) do={
    add chain=postrouting dst-address="${hotspotSubnet}" action=change-ttl new-ttl=set:1 passthrough=yes comment="TZWIFI-ANTI-TETHERING-TTL1-SUBNET"
}
:if ([:len [find where comment="TZWIFI-ANTI-TETHERING-TTL1-WIRELESS"]] = 0) do={
    add chain=postrouting out-interface=all-wireless action=change-ttl new-ttl=set:1 passthrough=yes comment="TZWIFI-ANTI-TETHERING-TTL1-WIRELESS"
}

# ------------------------------------------------------------------------------
# 2. DROP PACKETS FROM TETHERED SECONDARY HOPS (TTL 63 na TTL 127)
# ------------------------------------------------------------------------------
# Simu zote za kawaida (Android/iOS) zinapotuma maombi ya intaneti, zinaanza na TTL 64.
# Kompyuta za Windows zinaanza na TTL 128.
# Kama simu ya pili imeunganishwa nyuma ya hotspot ya simu ya kwanza, pakiti
# inayofika kwenye MikroTik inakuwa tayari imepunguzwa: TTL inakuwa 63 au 127!
# MikroTik inazinasa na kuzitupa (Drop):
# ------------------------------------------------------------------------------
/ip firewall mangle
:if ([:len [find where comment="TZWIFI-DETECT-TETHERED-HOP-63"]] = 0) do={
    add chain=prerouting in-interface="${bridgeName}" ttl=equal:63 action=mark-packet new-packet-mark="tethered_client" passthrough=yes comment="TZWIFI-DETECT-TETHERED-HOP-63"
}
:if ([:len [find where comment="TZWIFI-DETECT-TETHERED-HOP-127"]] = 0) do={
    add chain=prerouting in-interface="${bridgeName}" ttl=equal:127 action=mark-packet new-packet-mark="tethered_client" passthrough=yes comment="TZWIFI-DETECT-TETHERED-HOP-127"
}

/ip firewall filter
:if ([:len [find where comment="TZWIFI-BLOCK-TETHERED-FORWARD"]] = 0) do={
    add chain=forward action=drop packet-mark="tethered_client" comment="TZWIFI-BLOCK-TETHERED-FORWARD" place-before=1
}

# ------------------------------------------------------------------------------
# 3. KUZUIA MULTI-MAC / SHARING KWENYE HOTSPOT PROFILE
# ------------------------------------------------------------------------------
# Hakikisha mteja haruhusiwi kushare session wala kutumia MAC moja kwenye vifaa vingi
/ip hotspot profile
set [find] addresses-per-mac=1

/ip hotspot user profile
set [find] shared-users=1

:log info ">>> TZ-WiFi Anti-Tethering & Anti-Hotspot Sharing Protection Activated Successfully!"
`;
  }

  /**
   * 5. allInOne.rsc: Master bundle incorporating VPN, Hotspot, Anti-Tethering, and PPPoE in one command.
   */
  static generateAllInOneScript(router: RouterRecord, vpnParams?: Partial<VpnConfigParams>): string {
    const vpn = this.generateVpnScript(router, vpnParams);
    const hotspot = this.generateHotspotScript(router);
    const antiTethering = this.generateAntiTetheringScript(router);
    const pppoe = this.generatePppoeScript(router);

    return `# ==============================================================================
# MASTER MIKROTIK PROVISIONING BUNDLE (ALL-IN-ONE)
# Router: ${router.name}
# ==============================================================================

${vpn}

${hotspot}

# --- ANTI-TETHERING PROTECTION ---
${antiTethering}

${pppoe}

:log info "======================================================================"
:log info "   TZ-WIFI FULL ROUTEROS PROVISIONING COMPLETED WITH SUCCESS!         "
:log info "======================================================================"
`;
  }

  /**
   * 5. Ruijie Reyee Cloud AP & Gateway Configuration Guide and Parameters
   */
  static generateRuijieConfig(router: RouterRecord, baseUrl = 'https://infotechwifi.com') {
    const portalUrl = `${baseUrl}/?routerId=${router.id}&ap_vendor=ruijie`;
    const radiusIp = 'infotechwifi.com';
    const radiusSecret = router.radius_secret || 'radius_secret_2026';

    const walledGardenDomains = [
      'api.palmpesa.com',
      'checkout.azampay.com',
      'mpesa.vodacom.co.tz',
      'tigopesa.tigo.co.tz',
      'airtelmoney.airtel.co.tz',
      'halopesa.co.tz',
    ];

    const instructionsSw = [
      'Fungua app ya Ruijie Reyee au ingia cloud.ruijienetworks.com.',
      'Chagua Project / Mtandao wako -> Bofya "Configuration" -> "Auth Portal".',
      'Washa "Captive Portal" na uchague aina ya "External Web Portal".',
      `Kwenye "Portal URL", weka: ${portalUrl}`,
      'Kwenye "Authentication Mode", chagua "External RADIUS Server".',
      `Weka Primary RADIUS IP: ${radiusIp} | Auth Port: 1812 | Acct Port: 1813 | Secret: ${radiusSecret}`,
      'Washa "RADIUS Accounting" na "RADIUS CoA" (Port: 3799).',
      'Kwenye "Walled Garden / Whitelist", ongeza domain za malipo (M-Pesa, Tigo, Airtel, AzamPay).',
      'Bofya "Save & Apply". Sasa wateja wanaounganisha Ruijie AP watapata ukurasa wa malipo moja kwa moja!',
    ];

    const instructionsEn = [
      'Log into Ruijie Reyee Cloud (cloud.ruijienetworks.com) or the Reyee App.',
      'Navigate to your Project -> Configuration -> Auth Portal.',
      'Enable Captive Portal and select "External Web Portal".',
      `Set Portal URL: ${portalUrl}`,
      'Set Authentication Type to "External RADIUS".',
      `Set RADIUS Server: ${radiusIp} | Auth: 1812 | Acct: 1813 | Secret: ${radiusSecret}`,
      'Enable RADIUS Accounting & RADIUS CoA (Port: 3799).',
      'Add Mobile Money endpoints to Walled Garden / Pre-auth Whitelist.',
      'Click Save & Deliver. Your Ruijie APs are now live with automated billing!',
    ];

    return {
      portalUrl,
      radiusIp,
      radiusAuthPort: 1812,
      radiusAcctPort: 1813,
      radiusCoaPort: 3799,
      radiusSecret,
      walledGardenDomains,
      instructionsSw,
      instructionsEn,
      quickSummary: `Ruijie Reyee Cloud Portal configured for ${router.brand_name || router.name}`,
    };
  }

  /**
   * 6. TP-Link Omada Controller / Standalone EAP Configuration
   */
  static generateOmadaConfig(router: RouterRecord, baseUrl = 'https://infotechwifi.com') {
    const portalUrl = `${baseUrl}/?routerId=${router.id}&ap_vendor=omada`;
    const radiusIp = 'infotechwifi.com';
    const radiusSecret = router.radius_secret || 'radius_secret_2026';

    const walledGardenDomains = [
      'api.palmpesa.com',
      'checkout.azampay.com',
      'mpesa.vodacom.co.tz',
      'tigopesa.tigo.co.tz',
      'airtelmoney.airtel.co.tz',
      'halopesa.co.tz',
    ];

    const informUrl = router.inform_url || `http://${radiusIp}:29810/inform`;

    const instructionsSw = [
      'Hatua 1: Sajili MAC Address ya AP (mfano: ' + (router.mac_address || '50:D4:F7:2B:8C:1A') + ') kwenye mfumo wetu.',
      'Hatua 2: Kwenye AP ya Omada (http://192.168.0.254 au Omada Controller) -> Settings / Management -> Weka Controller Inform URL: ' + informUrl,
      'Hatua 3: Kwenye mfumo wetu, thibitisha jina la Wi-Fi (SSID: ' + (router.ssid || 'HOTSPOT-WIFI') + ') na uweke AP Username & Password ya AP.',
      'Hatua 4: Bofya "Check Adoption". Mfumo utaunganisha AP, kusukuma Captive Portal na RADIUS CoA Port 3799, na kuifanya CONNECTED papo hapo!',
    ];

    const instructionsEn = [
      'Step 1: Register AP MAC Address (' + (router.mac_address || '50:D4:F7:2B:8C:1A') + ') in our system.',
      'Step 2: On Omada AP (http://192.168.0.254 or Controller) -> Settings / Management -> Set Controller Inform URL: ' + informUrl,
      'Step 3: In our system, configure Wi-Fi SSID (' + (router.ssid || 'HOTSPOT-WIFI') + ') and enter the AP management credentials.',
      'Step 4: Click "Check Adoption". The system adopts the AP, applies Captive Portal and RADIUS CoA Port 3799, and marks it CONNECTED!',
    ];

    return {
      informUrl,
      portalUrl,
      radiusIp,
      radiusAuthPort: 1812,
      radiusAcctPort: 1813,
      radiusCoaPort: 3799,
      radiusSecret,
      walledGardenDomains,
      instructionsSw,
      instructionsEn,
      quickSummary: `TP-Link Omada Inform Adoption Profile for ${router.brand_name || router.name}`,
    };
  }

  /**
   * 7. Cudy & OpenWrt (CoovaChilli) Configuration File & Shell Script
   */
  static generateOpenWrtChilliConfig(router: RouterRecord, baseUrl = 'https://infotechwifi.com') {
    const portalUrl = `${baseUrl}/?routerId=${router.id}&ap_vendor=coovachilli`;
    const radiusIp = 'infotechwifi.com';
    const radiusSecret = router.radius_secret || 'radius_secret_2026';

    const chilliConf = `# ==============================================================================
# CoovaChilli Hotspot Configuration for OpenWrt (Cudy WR1300/WR2100, GL.iNet, D-Link)
# Router Identity: ${router.name}
# ==============================================================================

cmdsocket       /var/run/chilli.sock
pidfile         /var/run/chilli.pid

# Network Interface attached to Hotspot clients (e.g. br-lan or wlan0)
dhcpif          br-lan

# Hotspot Network Subnet
net             192.168.182.0/24
statip          192.168.182.1
uamlisten       192.168.182.1
uamport         3990

# Cloud RADIUS Server
radiusserver1   ${radiusIp}
radiusserver2   ${radiusIp}
radiusauthport  1812
radiusacctport  1813
radiussecret    ${radiusSecret}
coaport         3799

# External Captive Portal URL
uamserver       ${portalUrl}
uamhomepage     ${portalUrl}

# Walled Garden (Allow free access to Mobile Money without login)
uamallowed      api.palmpesa.com,checkout.azampay.com,mpesa.vodacom.co.tz,tigopesa.tigo.co.tz,airtelmoney.airtel.co.tz,halopesa.co.tz,${baseUrl.replace(/^https?:\/\//, '')}
uamdomain       .palmpesa.com,.azampay.com,.vodacom.co.tz,.tigo.co.tz,.airtel.co.tz
`;

    const installScript = `#!/bin/sh
# 1-Click OpenWrt CoovaChilli Hotspot Installer for ${router.name}
echo ">>> Updating OpenWrt packages..."
opkg update
opkg install coovachilli kmod-tun iptables

echo ">>> Backing up old configuration..."
[ -f /etc/chilli.conf ] && cp /etc/chilli.conf /etc/chilli.conf.bak

echo ">>> Writing new Cloud Hotspot chilli.conf..."
cat << 'EOF' > /etc/chilli.conf
${chilliConf}
EOF

echo ">>> Enabling and starting CoovaChilli service..."
/etc/init.d/chilli enable
/etc/init.d/chilli restart

echo ">>> Hotspot is ACTIVE! Test by connecting a client to WiFi."
`;

    return {
      portalUrl,
      radiusIp,
      radiusSecret,
      chilliConf,
      installScript,
      instructionsSw: [
        'Ingia kwenye Cudy / OpenWrt router kupitia SSH (mfano: ssh root@192.168.1.1).',
        'Hakikisha router imeunganishwa na intaneti kupitia WAN port.',
        'Copy na u-paste script ya ufungaji (Install Script) kwenye terminal ya router.',
        'Script ita-install CoovaChilli, kujiwekea FreeRADIUS, na kuanza kurusha portal mara moja.',
        'Mteja akiunganisha WiFi atapokea ukurasa wa kulipia bila kuhitaji MikroTik!',
      ],
      instructionsEn: [
        'SSH into your Cudy / OpenWrt router (e.g. ssh root@192.168.1.1).',
        'Ensure the router has internet access on WAN.',
        'Copy and paste the 1-Click Shell Script into the terminal.',
        'The script installs CoovaChilli, applies RADIUS authentication, and starts the captive engine.',
        'Clients connecting to WiFi will automatically get the mobile money payment portal!',
      ],
    };
  }

  /**
   * 8. TP-Link Pharos CPE Series Configuration & Hotspot Bridge Guide
   * Supports CPE210, CPE220 (2.4GHz Hotspot AP), CPE510, CPE610, CPE710 (5GHz PtP/PtMP Bridge)
   */
  static generatePharosCpeConfig(router: RouterRecord, baseUrl = 'https://infotechwifi.com') {
    const portalUrl = `${baseUrl}/?routerId=${router.id}&ap_vendor=tplink_cpe`;
    const radiusIp = 'infotechwifi.com';
    const cpeModel = router.model_name || 'TP-Link Pharos CPE210 (2.4GHz 9dBi Outdoor AP)';
    const ssid = router.ssid || `${(router.brand_name || 'HOTSPOT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-WIFI`;

    return {
      cpeModel,
      ssid,
      portalUrl,
      radiusIp,
      defaultPharosIp: '192.168.0.254',
      recommendedStaticIp: router.ip_address || '192.168.88.254',
      maxtreamNoticeSw: 'MUHIMU SANA: Ukiwa unatumia CPE kama Hotspot ya wateja (AP Mode), ZIMA MAXtream! MAXtream ni protocol ya TP-Link kwa viunganishi vya vifaa vyao tu. Simu za mkononi, laptop na tablet haziwezi kuunganisha Wi-Fi kama MAXtream imewashwa.',
      maxtreamNoticeEn: 'CRITICAL NOTICE: When using CPE as a client-facing Hotspot (AP Mode), you MUST DISABLE MAXtream! MAXtream is TP-Link proprietary TDMA. Mobile phones, laptops, and tablets CANNOT connect if MAXtream is enabled.',
      hotspotApStepsSw: [
        'Unganisha PoE injector: Port ya "LAN" ya PoE iende kwenye MikroTik Hotspot port (mfano ether2 au ether3), na port ya "POE" iende kwenye CPE.',
        'Ingia kwenye kivinjari chako (browser) na ufungue http://192.168.0.254 (Username: admin, Password: admin au mpya).',
        'Nenda kwenye tab ya "Operation Mode" -> Chagua "Access Point (AP)" kisha bofya Apply.',
        'Nenda kwenye tab ya "Wireless" -> Weka SSID ya Hotspot: "' + ssid + '" -> Security weka "None" (Open Hotspot).',
        'Nenda kwenye tab ya "MAXtream" -> Hakikisha tiki imeondolewa (Disable MAXtream) ili simu za kawaida ziweze kujiunga.',
        'Nenda kwenye tab ya "Network" -> Weka Static IP inayolingana na subnet ya MikroTik (mfano 192.168.88.254, Subnet 255.255.255.0, Gateway 192.168.88.1).',
        'Hifadhi mabadiliko (Save). Sasa wateja wanaounganisha kwa umbali wa mita 200 - 500+ watapokea ukurasa wa malipo ya simu moja kwa moja!',
      ],
      ptpBridgeStepsSw: [
        'Kusafirisha Hotspot kilomita 1 hadi 20+ (k.m. CPE510 / CPE610 / CPE710):',
        'Kifaa cha Mnara wa Kwanza (Master): Weka Operation Mode = "Access Point (AP)". Hapa unaweza KUWASHA MAXtream kwa ajili ya spidi ya juu.',
        'Kifaa cha Eneo la Pili (Remote Client): Weka Operation Mode = "Client" na uunganishe na SSID ya Master.',
        'Washa "Bridge Mode" kwenye kifaa cha pili ili wateja wote wa eneo hilo wapate IP moja kwa moja kutoka kwenye MikroTik ya mnara mkuu.',
        'Unganisha switch au AP ya ndani (k.m. Omada EAP au CPE210) kwenye LAN port ya kifaa cha pili kurusha Wi-Fi kwa wateja.',
      ],
    };
  }
}
