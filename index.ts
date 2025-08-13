import * as cron from 'node-cron';

interface Config {
  coolifyToken: string;
  webhookUrls: string[];
  coolifyApiUrl?: string;
  coolifyAppUuids: string[];
  cronSchedule: string;
  deployOnStart: boolean;
  force: boolean;
  debug: boolean;
}

class CoolifyAppsRestarter {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  private async makeDeploymentRequest(url: string, body?: object, identifier?: string): Promise<void> {
    try {
      const displayName = identifier || url;
      console.log(`🔄 Triggering deployment: ${displayName}`);
      
      if (this.config.debug) {
        console.log(`🐛 [DEBUG] URL: ${url}`);
        console.log(`🐛 [DEBUG] Request headers:`, {
          'Authorization': `Bearer ${this.config.coolifyToken.substring(0, 10)}...`,
          'Content-Type': 'application/json',
        });
        if (body) {
          console.log(`🐛 [DEBUG] Request body:`, body);
        }
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.coolifyToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (this.config.debug) {
        console.log(`🐛 [DEBUG] Response status: ${response.status} ${response.statusText}`);
        console.log(`🐛 [DEBUG] Response headers:`, Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.clone().text();
        console.log(`🐛 [DEBUG] Response body:`, responseText || '(empty)');
      }

      if (response.ok) {
        const forceText = this.config.force ? ' (force rebuild)' : '';
        console.log(`✅ Successfully triggered deployment: ${displayName}${forceText}`);
      } else {
        console.error(`❌ Failed to trigger deployment: ${displayName} - Status: ${response.status}`);
        if (!this.config.debug) {
          const errorText = await response.text();
          console.error(`❌ Error response:`, errorText || '(empty response)');
        }
      }
    } catch (error) {
      const displayName = identifier || url;
      console.error(`❌ Error triggering deployment ${displayName}:`, error);
    }
  }

  async pingWebhook(url: string): Promise<void> {
    const finalUrl = this.config.force ? this.addForceParam(url) : url;
    await this.makeDeploymentRequest(finalUrl, undefined, url);
  }

  async deployApp(uuid: string): Promise<void> {
    if (!this.config.coolifyApiUrl) {
      throw new Error('COOLIFY_API_URL is required for API-based deployment');
    }

    const forceParam = this.config.force ? 'true' : 'false';
    const apiUrl = `${this.config.coolifyApiUrl}/deploy?uuid=${uuid}&force=${forceParam}`;
    await this.makeDeploymentRequest(apiUrl, undefined, `app ${uuid}`);
  }

  private addForceParam(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('force', 'true');
      return urlObj.toString();
    } catch (error) {
      console.warn(`⚠️ Invalid URL format: ${url}, using as-is`);
      return url + (url.includes('?') ? '&' : '?') + 'force=true';
    }
  }

  async restartAllApps(): Promise<void> {
    const forceText = this.config.force ? ' with force rebuild' : '';
    const webhookCount = this.config.webhookUrls.length;
    const apiAppCount = this.config.coolifyAppUuids.length;
    const totalApps = webhookCount + apiAppCount;
    
    console.log(`🚀 Starting deployment restart for ${totalApps} apps${forceText}...`);
    
    const promises: Promise<void>[] = [];
    
    // Add webhook-based deployments
    if (webhookCount > 0) {
      console.log(`📡 Triggering ${webhookCount} webhook-based deployments...`);
      promises.push(...this.config.webhookUrls.map(url => this.pingWebhook(url)));
    }
    
    // Add API-based deployments
    if (apiAppCount > 0 && this.config.coolifyApiUrl) {
      console.log(`🔗 Triggering ${apiAppCount} API-based deployments...`);
      promises.push(...this.config.coolifyAppUuids.map(uuid => this.deployApp(uuid)));
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
      console.log('🎉 All deployments have been triggered!');
    } else {
      console.log('⚠️ No deployment methods configured. Please set either WEBHOOK_URLS or both COOLIFY_API_URL and COOLIFY_APP_UUIDS.');
    }
  }

  async start(): Promise<void> {
    console.log(`⏰ Scheduler started with cron pattern: ${this.config.cronSchedule}`);
    
    const webhookCount = this.config.webhookUrls.length;
    const apiAppCount = this.config.coolifyAppUuids.length;
    
    if (webhookCount > 0) {
      console.log(`📡 Monitoring ${webhookCount} webhook URLs`);
    }
    if (apiAppCount > 0 && this.config.coolifyApiUrl) {
      console.log(`🔗 Monitoring ${apiAppCount} apps via Coolify API: ${this.config.coolifyApiUrl}`);
    }
    
    if (this.config.debug) {
      console.log(`🐛 [DEBUG] Configuration:`, {
        webhookCount: webhookCount,
        apiAppCount: apiAppCount,
        coolifyApiUrl: this.config.coolifyApiUrl || 'not configured',
        cronSchedule: this.config.cronSchedule,
        deployOnStart: this.config.deployOnStart,
        force: this.config.force,
        debug: this.config.debug,
        tokenPreview: this.config.coolifyToken.substring(0, 10) + '...'
      });
      if (webhookCount > 0) {
        console.log(`🐛 [DEBUG] Webhook URLs:`, this.config.webhookUrls);
      }
      if (apiAppCount > 0) {
        console.log(`🐛 [DEBUG] App UUIDs:`, this.config.coolifyAppUuids);
      }
    }
    
    // Trigger deployment on start if enabled
    if (this.config.deployOnStart) {
      console.log('🚀 Deploy on start enabled - triggering initial deployment...');
      await this.restartAllApps();
    }
    
    cron.schedule(this.config.cronSchedule, async () => {
      console.log(`\n🕐 ${new Date().toISOString()} - Executing scheduled restart...`);
      await this.restartAllApps();
    });

    console.log('🟢 Coolify Apps Restarter is running...');
  }
}

function loadConfig(): Config {
  const coolifyToken = process.env.COOLIFY_TOKEN;
  const webhookUrlsStr = process.env.WEBHOOK_URLS;
  const coolifyApiUrl = process.env.COOLIFY_API_URL;
  const coolifyAppUuidsStr = process.env.COOLIFY_APP_UUIDS;
  const cronSchedule = process.env.CRON_SCHEDULE || '0 */6 * * *'; // Default: every 6 hours
  const deployOnStartStr = process.env.DEPLOY_ON_START?.trim().toLowerCase() || 'false';
  const deployOnStart = ['true', 'on', 'yes', '1'].includes(deployOnStartStr); // Default: false
  const forceStr = process.env.FORCE?.trim().toLowerCase() || 'false';
  const force = ['true', 'on', 'yes', '1'].includes(forceStr); // Default: false
  const debugStr = process.env.DEBUG?.trim().toLowerCase() || 'false';
  const debug = ['true', 'on', 'yes', '1'].includes(debugStr); // Default: false

  if (!coolifyToken) {
    throw new Error('COOLIFY_TOKEN environment variable is required');
  }

  // Parse webhook URLs (optional)
  const webhookUrls = webhookUrlsStr ? webhookUrlsStr.split(',').map(url => url.trim()) : [];

  // Parse Coolify app UUIDs (optional)
  const coolifyAppUuids = coolifyAppUuidsStr ? coolifyAppUuidsStr.split(',').map(uuid => uuid.trim()) : [];

  // Validation: at least one deployment method must be configured
  if (webhookUrls.length === 0 && coolifyAppUuids.length === 0) {
    throw new Error('At least one deployment method must be configured: either WEBHOOK_URLS or COOLIFY_APP_UUIDS');
  }

  // If using Coolify API, both API URL and UUIDs are required
  if (coolifyAppUuids.length > 0 && !coolifyApiUrl) {
    throw new Error('COOLIFY_API_URL is required when COOLIFY_APP_UUIDS is provided');
  }

  return {
    coolifyToken,
    webhookUrls,
    coolifyApiUrl,
    coolifyAppUuids,
    cronSchedule,
    deployOnStart,
    force,
    debug,
  };
}

async function main() {
  try {
    const config = loadConfig();
    const restarter = new CoolifyAppsRestarter(config);
    await restarter.start();
  } catch (error) {
    console.error('❌ Failed to start Coolify Apps Restarter:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}