# Coolify Apps Restarter

A lightweight Bun application that automatically restarts your Coolify applications using deployment webhooks on a configurable cron schedule.

## 🚀 Features

- **Automated Scheduling**: Uses cron expressions to schedule app restarts
- **Multiple App Support**: Restart multiple applications with a single configuration
- **Webhook Integration**: Leverages Coolify's deployment webhooks for reliable restarts
- **Parallel Execution**: Triggers all webhooks simultaneously for faster execution
- **Environment Configuration**: Secure configuration through environment variables
- **Docker Support**: Run anywhere with Docker containerization
- **Error Handling**: Robust error handling with detailed logging

## 📋 Prerequisites

- [Bun](https://bun.sh) v1.0+ (for local development)
- Docker (for containerized deployment)
- Coolify instance with API access
- Deployment webhooks configured for your applications

## 🛠️ Installation

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd coolify-apps-restarter
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   COOLIFY_TOKEN=your_coolify_api_token_here
   WEBHOOK_URLS=https://your-coolify.com/webhooks/app1,https://your-coolify.com/webhooks/app2
   CRON_SCHEDULE=0 */6 * * *
   ```

4. **Run the application**:
   ```bash
   bun start
   ```

### Docker Deployment

1. **Build the image**:
   ```bash
   docker build -t coolify-apps-restarter .
   ```

2. **Run the container**:
   ```bash
   docker run -d \
     --name coolify-restarter \
     -e COOLIFY_TOKEN="your_token_here" \
     -e WEBHOOK_URLS="https://your-coolify.com/webhooks/app1,https://your-coolify.com/webhooks/app2" \
     -e CRON_SCHEDULE="0 */6 * * *" \
     coolify-apps-restarter
   ```

### Docker Compose

```yaml
version: '3.8'
services:
  coolify-restarter:
    build: .
    environment:
      - COOLIFY_TOKEN=your_token_here
      - WEBHOOK_URLS=https://your-coolify.com/webhooks/app1,https://your-coolify.com/webhooks/app2
      - CRON_SCHEDULE=0 */6 * * *
    restart: unless-stopped
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `COOLIFY_TOKEN` | Your Coolify API token | ✅ | - |
| `WEBHOOK_URLS` | Comma-separated webhook URLs | ✅ | - |
| `CRON_SCHEDULE` | Cron expression for scheduling | ❌ | `0 */6 * * *` |
| `DEPLOY_ON_START` | Trigger deployment on app startup (true/false, on/off, yes/no, 1/0) | ❌ | `false` |

### Getting Coolify API Token

1. Navigate to your Coolify dashboard
2. Go to **Settings** → **API Tokens**
3. Click **+ New Token**
4. Give your token a descriptive name (e.g., "Apps Restarter")
5. **Select permissions**: Make sure to enable **Deploy** permission (required for triggering webhooks)
6. Copy the generated token immediately (it won't be shown again)
7. Use this token as your `COOLIFY_TOKEN` environment variable

> **Note**: The token needs **Deploy** permission to successfully trigger deployment webhooks.

### Getting Coolify Webhooks

1. Navigate to your Coolify dashboard
2. Select the application you want to restart
3. Go to **Settings** → **Webhooks**
4. Copy the deployment webhook URL
5. Repeat for each application

### Cron Schedule Examples

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every 6 hours | `0 */6 * * *` | Default schedule |
| Daily at 2 AM | `0 2 * * *` | Once per day |
| Every Monday at 9 AM | `0 9 * * 1` | Weekly restart |
| Every 30 minutes | `*/30 * * * *` | Frequent restarts |
| Twice daily | `0 6,18 * * *` | 6 AM and 6 PM |

## 📊 Monitoring

The application provides detailed console output:

```
⏰ Scheduler started with cron pattern: 0 */6 * * *
📡 Monitoring 3 webhook URLs
🟢 Coolify Apps Restarter is running...

🕐 2024-01-15T12:00:00.000Z - Executing scheduled restart...
🚀 Starting deployment restart for 3 apps...
🔄 Pinging webhook: https://your-coolify.com/webhooks/app1
🔄 Pinging webhook: https://your-coolify.com/webhooks/app2
🔄 Pinging webhook: https://your-coolify.com/webhooks/app3
✅ Successfully triggered deployment for: https://your-coolify.com/webhooks/app1
✅ Successfully triggered deployment for: https://your-coolify.com/webhooks/app2
✅ Successfully triggered deployment for: https://your-coolify.com/webhooks/app3
🎉 All deployment webhooks have been triggered!
```

## 🐳 Production Deployment

### Coolify Deployment

If you're using Coolify to deploy this app:

1. Create a new application in Coolify
2. Connect your Git repository
3. Set environment variables in the application settings
4. Deploy and monitor logs

### Docker Swarm / Kubernetes

The application is stateless and perfect for container orchestration:

```yaml
# kubernetes-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coolify-restarter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: coolify-restarter
  template:
    metadata:
      labels:
        app: coolify-restarter
    spec:
      containers:
      - name: coolify-restarter
        image: coolify-apps-restarter:latest
        env:
        - name: COOLIFY_TOKEN
          valueFrom:
            secretKeyRef:
              name: coolify-secrets
              key: token
        - name: WEBHOOK_URLS
          value: "https://your-coolify.com/webhooks/app1,https://your-coolify.com/webhooks/app2"
        - name: CRON_SCHEDULE
          value: "0 */6 * * *"
```

## 🔧 Development

### Scripts

- `bun dev` - Run in development mode
- `bun start` - Run in production mode
- `bun build` - Build the application
- `bun lint` - Type checking

### Project Structure

```
coolify-apps-restarter/
├── index.ts              # Main application
├── package.json          # Dependencies and scripts
├── Dockerfile           # Container configuration
├── .env.example         # Environment template
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## ⚠️ Security Notes

- Never commit your `.env` file or expose your Coolify token
- Use secrets management in production environments
- Regularly rotate your Coolify API tokens
- Monitor webhook endpoint access logs

## 🆘 Troubleshooting

### Common Issues

**Error: COOLIFY_TOKEN environment variable is required**
- Ensure your `.env` file exists and contains the token
- Check that the environment variable is properly set in your deployment

**Webhook requests failing**
- Verify webhook URLs are correct and accessible
- Check that your Coolify token has proper permissions
- Ensure your Coolify instance is reachable from the deployment environment

**Cron jobs not executing**
- Validate your cron expression using [crontab.guru](https://crontab.guru)
- Check application logs for error messages
- Ensure the application container doesn't exit unexpectedly

### Getting Help

- Check the application logs for detailed error messages
- Verify your Coolify webhook configuration
- Test webhook URLs manually using curl:
  ```bash
  curl -X POST "https://your-coolify.com/webhooks/your-app" \
       -H "Authorization: Bearer your_token"
  ```

---

Built with ❤️ using [Bun](https://bun.sh) - A fast all-in-one JavaScript runtime.