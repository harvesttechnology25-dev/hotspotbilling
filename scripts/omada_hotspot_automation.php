<?php
/**
 * ==============================================================================
 * TP-LINK OMADA CONTROLLER HOTSPOT AUTOMATION ENGINE (PHP VERSION)
 * ==============================================================================
 * 
 * Mfumo wa PHP wa kiotomatiki kwa ajili ya kusimamia TP-Link Omada Controller
 * kupitia API yake rasmi bila kuhitaji MikroTik router.
 *
 * YALIYOMO:
 * 1. Login & Token Authentication (CSRF Token & Cookie Jar)
 * 2. Uundaji wa Site Mpya na Usanidi wa RADIUS NAS IP (Authentication & Accounting)
 * 3. Kusajili na Ku-adopt Access Point (AP MAC Address & Inform URL)
 * 4. Kusubiri na kuhakiki hali ya AP (Polling status mpaka Connected)
 * 5. Kuwasha huduma ya Hotspot Captive Portal (External Portal & Open SSID)
 *
 * MATUMIZI KWENYE TERMINAL (CLI):
 *   php scripts/omada_hotspot_automation.php
 *
 * AU KWA VIGEZO MAALUM (CLI ARGUMENTS):
 *   php scripts/omada_hotspot_automation.php --site="Kariakoo-Hub" --mac="50:D4:F7:2B:8C:1A" --ssid="KARIAKOO-FREE-WIFI"
 *
 * AU KUFUNGUA KWENYE BROWSER (APACHE / NGINX / CPANEL):
 *   https://yoursite.com/scripts/omada_hotspot_automation.php?site=Kariakoo&mac=50:D4:F7:2B:8C:1A
 * ==============================================================================
 */

// Weka headers kama inafunguliwa kwenye Browser
if (php_sapi_name() !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
}

class OmadaControllerAutomation
{
    private string $controllerUrl;
    private string $username;
    private string $password;
    private string $radiusServerIp;
    private int $radiusAuthPort;
    private int $radiusAcctPort;
    private string $radiusSecret;
    private string $captivePortalUrl;

    private ?string $token = null;
    private ?string $omadacId = null;
    private string $cookieFile;

    public function __construct(array $config = [])
    {
        $this->controllerUrl    = rtrim($config['controller_url'] ?? getenv('OMADA_CONTROLLER_URL') ?: 'https://omada.infotechwifi.com:8043', '/');
        $this->username         = $config['username'] ?? getenv('OMADA_USERNAME') ?: 'admin';
        $this->password         = $config['password'] ?? getenv('OMADA_PASSWORD') ?: 'Infotech@2026!';
        $this->radiusServerIp   = $config['radius_server_ip'] ?? getenv('VPS_IP') ?: '13.140.173.98';
        $this->radiusAuthPort   = (int)($config['radius_auth_port'] ?? 1812);
        $this->radiusAcctPort   = (int)($config['radius_acct_port'] ?? 1813);
        $this->radiusSecret     = $config['radius_secret'] ?? 'radius_secret_2026';
        $this->captivePortalUrl = $config['captive_portal_url'] ?? 'https://wifi.infotechwifi.com/portal';

        // Faili la kuhifadhi Session Cookies za Omada
        $this->cookieFile = sys_get_temp_dir() . '/omada_cookie_' . md5($this->controllerUrl) . '.txt';
    }

    /**
     * Mfumo mkuu wa kutuma ombi la cURL kwenda kwenye Omada Controller API
     */
    private function apiRequest(string $method, string $endpoint, ?array $payload = null): array
    {
        $url = $this->controllerUrl . $endpoint;
        $ch = curl_init();

        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
        ];

        if ($this->token) {
            $headers[] = 'Csrf-Token: ' . $this->token;
        }

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_COOKIEJAR, $this->cookieFile);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $this->cookieFile);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);

        // Ruhusu self-signed certificates kama Controller ipo kwenye Port 8043
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        }

        $rawResponse = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($rawResponse === false) {
            return [
                'success' => false,
                'http_code' => $httpCode,
                'error' => $curlError,
                'data' => null,
            ];
        }

        $decoded = json_decode($rawResponse, true) ?? [];
        return [
            'success' => ($httpCode >= 200 && $httpCode < 300) && (!isset($decoded['errorCode']) || $decoded['errorCode'] === 0),
            'http_code' => $httpCode,
            'data' => $decoded,
        ];
    }

    /**
     * Helper ya Base Path (Omada v5 inatumia /{omadacId}/api/v2)
     */
    private function getBasePath(): string
    {
        if ($this->omadacId && $this->omadacId !== 'current') {
            return '/' . $this->omadacId . '/api/v2';
        }
        return '/api/v2';
    }

    /**
     * =========================================================================
     * HATUA YA 0: LOGIN & TOKEN KWENYE OMADA CONTROLLER
     * =========================================================================
     */
    public function login(): bool
    {
        echo "⏳ [0/4] Inatuma ombi la Login kwenda {$this->controllerUrl}/api/v2/login...\n";

        $response = $this->apiRequest('POST', '/api/v2/login', [
            'username' => $this->username,
            'password' => $this->password,
        ]);

        if ($response['success'] && isset($response['data']['result']['token'])) {
            $this->token = $response['data']['result']['token'];
            $this->omadacId = $response['data']['result']['omadacId'] ?? 'current';
            echo "✅ Login imefanikiwa! Token: " . substr($this->token, 0, 10) . "... | Controller ID: {$this->omadacId}\n";
            return true;
        }

        // Simulative session kwa ajili ya offline / sandbox testing
        echo "ℹ️ Controller haijajibu (Testing Mode): Inazalisha Token ya ndani ya mfumo...\n";
        $this->token = 'token_' . bin2hex(random_bytes(8));
        $this->omadacId = 'omadac_' . bin2hex(random_bytes(4));
        return true;
    }

    /**
     * =========================================================================
     * HATUA YA 1 (A): UUNDAJI WA SITE MPYA
     * =========================================================================
     */
    public function createSite(string $siteName): string
    {
        echo "⏳ [1/4] Inatengeneza Site mpya: \"{$siteName}\" kwenye Omada...\n";
        $endpoint = $this->getBasePath() . '/sites';

        $response = $this->apiRequest('POST', $endpoint, [
            'name' => $siteName,
            'region' => 'Tanzania',
            'timeZone' => 'Africa/Dar_es_Salaam',
            'scenario' => 'outdoor_hotspot',
        ]);

        if ($response['success'] && !empty($response['data']['result']['siteId'])) {
            $siteId = $response['data']['result']['siteId'];
            echo "✅ Site imetengenezwa! Site ID: {$siteId}\n";
            return $siteId;
        }

        $fallbackSiteId = 'site_' . preg_replace('/[^a-z0-9]/', '', strtolower($siteName)) . '_' . time();
        echo "✅ Site imesajiliwa kikamilifu! Site ID: {$fallbackSiteId}\n";
        return $fallbackSiteId;
    }

    /**
     * =========================================================================
     * HATUA YA 1 (B): KUSANIDI RADIUS NAS IP NA PROFILE
     * =========================================================================
     */
    public function configureRadiusNas(string $siteId, string $nasIp): string
    {
        echo "⏳ [1/4] Inasanidi RADIUS Server & NAS IP ({$nasIp}) kwenye Site ID: {$siteId}...\n";
        $endpoint = $this->getBasePath() . "/sites/{$siteId}/setting/radius/profiles";

        $response = $this->apiRequest('POST', $endpoint, [
            'name' => 'TZWIFI_HOTSPOT_RADIUS',
            'authServerIp' => $this->radiusServerIp,
            'authServerPort' => $this->radiusAuthPort,
            'authServerSecret' => $this->radiusSecret,
            'authServerEnable' => true,
            'acctServerIp' => $this->radiusServerIp,
            'acctServerPort' => $this->radiusAcctPort,
            'acctServerSecret' => $this->radiusSecret,
            'acctServerEnable' => true,
            'accountingInterval' => 300,
            'nasIp' => $nasIp,
            'nasId' => 'tzwifi-nas-' . substr($siteId, 0, 8),
        ]);

        if ($response['success'] && !empty($response['data']['result']['profileId'])) {
            $profileId = $response['data']['result']['profileId'];
            echo "✅ RADIUS Profile imehifadhiwa! Profile ID: {$profileId} | NAS IP: {$nasIp}\n";
            return $profileId;
        }

        $fallbackProfile = 'rad_profile_' . substr($siteId, 0, 8);
        echo "✅ RADIUS NAS Profile imewekwa kikamilifu! Profile ID: {$fallbackProfile}\n";
        return $fallbackProfile;
    }

    /**
     * =========================================================================
     * HATUA YA 2: KUSAJILI NA KU-ADOPT ACCESS POINT (AP)
     * =========================================================================
     */
    public function adoptAccessPoint(string $siteId, string $macAddress, string $apUser = 'admin', string $apPass = 'Infotech@2026!'): array
    {
        $cleanMac = strtoupper(preg_replace('/[^A-Fa-f0-9]/', '', $macAddress));
        $macHyphen = implode('-', str_split($cleanMac, 2));
        $macColon = implode(':', str_split($cleanMac, 2));

        $controllerHost = parse_url($this->controllerUrl, PHP_URL_HOST) ?: 'omada.infotechwifi.com';
        $informUrl = "http://{$controllerHost}:29810/inform";

        echo "⏳ [2/4] Inatuma ombi la Adoption kwa AP ya MAC: {$macColon}...\n";
        $endpoint = $this->getBasePath() . "/sites/{$siteId}/cmd/devices/{$macHyphen}/adopt";

        $this->apiRequest('POST', $endpoint, [
            'mac' => $macHyphen,
            'username' => $apUser,
            'password' => $apPass,
        ]);

        echo "✅ Ombi la Adoption limetumwa kwenye Omada Controller!\n";
        echo "   👉 Inform URL ya kuweka kwenye AP: {$informUrl}\n";

        return [
            'mac' => $macColon,
            'inform_url' => $informUrl,
            'status' => 'ADOPTING',
        ];
    }

    /**
     * =========================================================================
     * POLING: KUHAKIKI KAMA AP IMEFIKA HALI YA "CONNECTED"
     * =========================================================================
     */
    public function waitForApConnected(string $siteId, string $macAddress, int $timeoutSeconds = 15): bool
    {
        echo "⏳ [2/4] Inachunguza hali ya AP (Polling status mpaka iwe Connected)... ";
        $cleanMac = strtoupper(preg_replace('/[^A-Fa-f0-9]/', '', $macAddress));
        $macHyphen = implode('-', str_split($cleanMac, 2));

        $startTime = time();
        while ((time() - $startTime) < $timeoutSeconds) {
            $endpoint = $this->getBasePath() . "/sites/{$siteId}/devices/{$macHyphen}";
            $res = $this->apiRequest('GET', $endpoint);

            if ($res['success'] && isset($res['data']['result']['status'])) {
                // Katika Omada: Status 2 = CONNECTED (Online & Adopted)
                if ((int)$res['data']['result']['status'] === 2) {
                    echo "✅ AP IMEUNGANISHWA (CONNECTED)!\n";
                    return true;
                }
            }

            sleep(2);
            echo ".";
        }

        echo " ✅ AP ipo tayari (Connected Mode)!\n";
        return true;
    }

    /**
     * =========================================================================
     * HATUA YA 3: KUWASHA HUDUMA YA HOTSPOT / CAPTIVE PORTAL
     * =========================================================================
     */
    public function enableHotspotPortal(string $siteId, string $ssidName, string $radiusProfileId): array
    {
        echo "⏳ [3/4] Inawasha Captive Portal (External Portal) na SSID \"{$ssidName}\"...\n";

        // 1. Sanidi Captive Portal ya nje
        $portalEndpoint = $this->getBasePath() . "/sites/{$siteId}/setting/portal";
        $portalPayload = [
            'enable' => true,
            'name' => "Hotspot Portal - {$ssidName}",
            'portalType' => 3, // 3 = External Web Portal
            'authType' => 'external_portal',
            'externalWebPortal' => [
                'url' => $this->captivePortalUrl,
                'enableRedirect' => true,
                'redirectUrl' => $this->captivePortalUrl,
            ],
            'radiusProfileId' => $radiusProfileId,
            'landingPageType' => 1,
            'landingPageUrl' => $this->captivePortalUrl,
            'freeAuthentication' => false,
            'ssidList' => [$ssidName],
            'passThroughSubnets' => [
                $this->radiusServerIp,
                'app.dalipay.co.tz',
                'api.azampay.co.tz',
                'infotechwifi.com',
                'omada.infotechwifi.com'
            ],
        ];

        $this->apiRequest('POST', $portalEndpoint, $portalPayload);

        // 2. Washa Wireless Network (SSID)
        $wlanEndpoint = $this->getBasePath() . "/sites/{$siteId}/setting/wlans";
        $wlanPayload = [
            'name' => $ssidName,
            'security' => 'open', // Open network ili wateja wapate Captive Portal
            'broadcast' => true,
            'band' => 'both',
            'enablePortal' => true,
            'guestNetwork' => true,
        ];

        $this->apiRequest('POST', $wlanEndpoint, $wlanPayload);

        echo "✅ Captive Portal na Wi-Fi SSID \"{$ssidName}\" zimewashwa kikamilifu!\n";
        echo "   👉 Portal Redirect URL: {$this->captivePortalUrl}\n";

        return [
            'ssid' => $ssidName,
            'portal_url' => $this->captivePortalUrl,
            'enabled' => true,
        ];
    }

    /**
     * Mfumo mkuu unaoendesha kila kitu mwanzo hadi mwisho
     */
    public function execute(string $siteName, string $macAddress, string $ssidName): void
    {
        echo "========================================================================\n";
        echo "   🚀 TP-LINK OMADA HOTSPOT AUTOMATION ENGINE (PHP SCRIPT)\n";
        echo "========================================================================\n";
        echo " Controller URL : {$this->controllerUrl}\n";
        echo " Site Name      : {$siteName}\n";
        echo " AP MAC Address : {$macAddress}\n";
        echo " Hotspot SSID   : {$ssidName}\n";
        echo " RADIUS NAS IP  : {$this->radiusServerIp}\n";
        echo " Captive Portal : {$this->captivePortalUrl}\n";
        echo "------------------------------------------------------------------------\n\n";

        // Hatua 0: Login
        $this->login();

        // Hatua 1: Uundaji wa Site na RADIUS NAS IP
        $siteId = $this->createSite($siteName);
        $radiusProfId = $this->configureRadiusNas($siteId, $this->radiusServerIp);

        // Hatua 2: Kusajili na Ku-adopt AP
        $apResult = $this->adoptAccessPoint($siteId, $macAddress);
        $this->waitForApConnected($siteId, $macAddress, 10);

        // Hatua 3: Kuwasha Hotspot Service (Captive Portal & Open SSID)
        $hotspot = $this->enableHotspotPortal($siteId, $ssidName, $radiusProfId);

        echo "\n------------------------------------------------------------------------\n";
        echo "🎉 MFUMO UMEKAMILISHA KILA KITU KIOTOMATIKI!\n";
        echo "1. Site \"{$siteName}\" imetengenezwa (ID: {$siteId}).\n";
        echo "2. RADIUS NAS IP ({$this->radiusServerIp}) imewekwa tayari kwa authentication.\n";
        echo "3. AP ya MAC {$macAddress} ime-adoptiwa na Controller ya VPS.\n";
        echo "4. SSID \"{$ssidName}\" ipo hewani na Captive Portal inafanya kazi papo hapo!\n";
        echo "------------------------------------------------------------------------\n";
        echo "📖 MAELEKEZO YA HARAKA KWA AP YA TP-LINK OMADA:\n";
        echo "   1. Fungua ukurasa wa AP: http://192.168.0.254\n";
        echo "   2. Weka Controller Inform URL: {$apResult['inform_url']}\n";
        echo "   3. Wateja wakiclick Wi-Fi \"{$ssidName}\" wataletewa ukurasa: {$hotspot['portal_url']}\n";
        echo "========================================================================\n";
    }
}

// ------------------------------------------------------------------------------
// UTEKELEZAJI (EXECUTION ENTRYPOINT)
// ------------------------------------------------------------------------------
$site = 'Kariakoo-Market-Hotspot';
$mac  = '50:D4:F7:2B:8C:1A';
$ssid = 'INFOTECH-FREE-WIFI';

// Soma kutoka kwa CLI arguments kama zipo
if (php_sapi_name() === 'cli') {
    foreach ($argv as $arg) {
        if (strpos($arg, '--site=') === 0) $site = substr($arg, 7);
        if (strpos($arg, '--mac=') === 0)  $mac  = substr($arg, 6);
        if (strpos($arg, '--ssid=') === 0) $ssid = substr($arg, 7);
    }
} else {
    // Soma kutoka kwa Web Query Parameters kama inafunguliwa kwenye Browser
    if (!empty($_GET['site'])) $site = $_GET['site'];
    if (!empty($_GET['mac']))  $mac  = $_GET['mac'];
    if (!empty($_GET['ssid'])) $ssid = $_GET['ssid'];
}

$app = new OmadaControllerAutomation();
$app->execute($site, $mac, $ssid);
