import * as cron from 'node-cron';

interface Config {
  coolifyToken: string;
  webhookUrls: string[];
  cronSchedule: string;
}

class CoolifyAppsRestarter {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async pingWebhook(url: string): Promise<void> {
    try {
      console.log(`🔄 Pinging webhook: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.coolifyToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log(`✅ Successfully triggered deployment for: ${url}`);
      } else {
        console.error(`❌ Failed to trigger deployment for: ${url} - Status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error pinging webhook ${url}:`, error);
    }
  }

  async restartAllApps(): Promise<void> {
    console.log(`🚀 Starting deployment restart for ${this.config.webhookUrls.length} apps...`);
    
    const promises = this.config.webhookUrls.map(url => this.pingWebhook(url));
    await Promise.all(promises);
    
    console.log('🎉 All deployment webhooks have been triggered!');
  }

  start(): void {
    console.log(`⏰ Scheduler started with cron pattern: ${this.config.cronSchedule}`);
    console.log(`📡 Monitoring ${this.config.webhookUrls.length} webhook URLs`);
    
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
  };
}

async function main() {
  try {
    const config = loadConfig();
    const restarter = new CoolifyAppsRestarter(config);
    restarter.start();
  } catch (error) {
    console.error('❌ Failed to start Coolify Apps Restarter:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}