#!/usr/bin/env node
/**
 * ==============================================================================
 * TP-LINK OMADA CONTROLLER HOTSPOT BILLING AUTOMATION SCRIPT (NODE.JS)
 * ==============================================================================
 *
 * Mfumo wa kiotomatiki wa kusimamia TP-Link Omada Controller bila MikroTik:
 * 1. Uundaji wa Site mpya na Usanidi wa RADIUS NAS IP
 * 2. Kusajili na Ku-adopt Access Point (AP) kupitia MAC Address na Inform URL
 * 3. Kuwasha huduma ya Hotspot Captive Portal (External Portal) na Open SSID
 *
 * Matumizi (Usage):
 *   npx tsx scripts/omada-hotspot-automation.ts --site="Kariakoo-Hub" --mac="50:D4:F7:2B:8C:1A" --ssid="KARIAKOO-FREE-WIFI"
 *
 * Au kupitia Environment Variables:
 *   OMADA_CONTROLLER_URL="https://omada.infotechwifi.com:8043" \
 *   OMADA_USERNAME="admin" \
 *   OMADA_PASSWORD="YourPassword" \
 *   npx tsx scripts/omada-hotspot-automation.ts
 * ==============================================================================
 */

import { OmadaAutomationService } from '../server/services/omadaAutomationService.js';

// Parse command line arguments
function parseArgs() {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value || 'true';
    }
  });
  return args;
}

async function runCli() {
  const cliArgs = parseArgs();

  const siteName = cliArgs.site || process.env.HOTSPOT_SITE_NAME || 'INFOTECH-HOTSPOT-01';
  const apMac = cliArgs.mac || process.env.AP_MAC_ADDRESS || '50:D4:F7:2B:8C:1A';
  const ssidName = cliArgs.ssid || process.env.HOTSPOT_SSID || `${siteName.toUpperCase()}-WIFI`;
  const portalUrl = cliArgs.portal || process.env.CAPTIVE_PORTAL_URL || 'https://wifi.infotechwifi.com/portal';
  const nasIp = cliArgs.nas || process.env.VPS_IP || '13.140.173.98';

  console.log('========================================================================');
  console.log('   🚀 INFOTECH TP-LINK OMADA CONTROLLER HOTSPOT AUTOMATION ENGINE');
  console.log('========================================================================');
  console.log(`📌 Omada Controller : ${process.env.OMADA_CONTROLLER_URL || 'https://omada.infotechwifi.com:8043'}`);
  console.log(`📌 Site Name        : ${siteName}`);
  console.log(`📌 Access Point MAC : ${apMac}`);
  console.log(`📌 Wi-Fi SSID       : ${ssidName}`);
  console.log(`📌 RADIUS NAS IP    : ${nasIp}`);
  console.log(`📌 Captive Portal   : ${portalUrl}`);
  console.log('------------------------------------------------------------------------');

  const automationService = new OmadaAutomationService({
    controllerUrl: process.env.OMADA_CONTROLLER_URL || 'https://omada.infotechwifi.com:8043',
    username: process.env.OMADA_USERNAME || 'admin',
    password: process.env.OMADA_PASSWORD || 'Infotech@2026!',
    radiusServerIp: nasIp,
    captivePortalUrl: portalUrl,
  });

  console.log('\n[1/4] 🔐 Inaanza mawasiliano na Omada Controller...');
  const result = await automationService.executeFullAutomation({
    siteName,
    apMacAddress: apMac,
    ssidName,
    nasIp,
    portalUrl,
    timeoutSeconds: 20,
  });

  console.log('\n📋 Rekodi za Kila Hatua (Execution Logs):');
  result.logs.forEach((log) => {
    const symbol =
      log.status === 'COMPLETED' ? '✅' :
      log.status === 'IN_PROGRESS' ? '⏳' :
      log.status === 'PENDING' ? 'ℹ️' : '❌';
    console.log(`  ${symbol} [Hatua ${log.step}] ${log.name}: ${log.message}`);
  });

  console.log('\n------------------------------------------------------------------------');
  if (result.success) {
    console.log('🎉 AUTOMATION IMEKAMILIKA KWA MAFANIKIO!');
    console.log(`   Site ID          : ${result.site?.id}`);
    console.log(`   RADIUS NAS IP    : ${result.site?.nasIp}`);
    console.log(`   AP MAC           : ${result.ap?.macAddress} (${result.ap?.status})`);
    console.log(`   Hotspot SSID     : ${result.hotspot?.ssid}`);
    console.log(`   Portal URL       : ${result.hotspot?.portalUrl}`);
  } else {
    console.log(`⚠️ AUTOMATION IMEISHIA KWA TAHADHARI: ${result.message}`);
  }

  console.log('\n📖 MAELEKEZO YA KUUNGANISHA ACCESS POINT (AP INFORM URL SETUP):');
  result.informInstructions.stepsSwahili.forEach((step) => {
    console.log(`   ${step}`);
  });

  console.log('========================================================================\n');
}

runCli().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
