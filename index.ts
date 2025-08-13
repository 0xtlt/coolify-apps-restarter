import * as cron from 'node-cron';

interface Config {
  coolifyToken: string;
  webhookUrls: string[];
  cronSchedule: string;
  deployOnStart: boolean;
  force: boolean;
}

class CoolifyAppsRestarter {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async pingWebhook(url: string): Promise<void> {
    try {
      const finalUrl = this.config.force ? this.addForceParam(url) : url;
      console.log(`🔄 Pinging webhook: ${finalUrl}`);
      
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.coolifyToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const forceText = this.config.force ? ' (force rebuild)' : '';
        console.log(`✅ Successfully triggered deployment for: ${url}${forceText}`);
      } else {
        console.error(`❌ Failed to trigger deployment for: ${url} - Status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error pinging webhook ${url}:`, error);
    }
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
    console.log(`🚀 Starting deployment restart for ${this.config.webhookUrls.length} apps${forceText}...`);
    
    const promises = this.config.webhookUrls.map(url => this.pingWebhook(url));
    await Promise.all(promises);
    
    console.log('🎉 All deployment webhooks have been triggered!');
  }

  async start(): Promise<void> {
    console.log(`⏰ Scheduler started with cron pattern: ${this.config.cronSchedule}`);
    console.log(`📡 Monitoring ${this.config.webhookUrls.length} webhook URLs`);
    
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
  const cronSchedule = process.env.CRON_SCHEDULE || '0 */6 * * *'; // Default: every 6 hours
  const deployOnStartStr = process.env.DEPLOY_ON_START?.trim().toLowerCase() || 'false';
  const deployOnStart = ['true', 'on', 'yes', '1'].includes(deployOnStartStr); // Default: false
  const forceStr = process.env.FORCE?.trim().toLowerCase() || 'false';
  const force = ['true', 'on', 'yes', '1'].includes(forceStr); // Default: false

  if (!coolifyToken) {
    throw new Error('COOLIFY_TOKEN environment variable is required');
  }

  if (!webhookUrlsStr) {
    throw new Error('WEBHOOK_URLS environment variable is required');
  }

  const webhookUrls = webhookUrlsStr.split(',').map(url => url.trim());

  return {
    coolifyToken,
    webhookUrls,
    cronSchedule,
    deployOnStart,
    force,
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