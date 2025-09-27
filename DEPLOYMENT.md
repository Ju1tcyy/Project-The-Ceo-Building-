# WaziumBot Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- WhatsApp number for bot authentication

## Quick Start with Docker

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd WaziumBot

# Copy environment file
cp env.example .env

# Edit .env file with your configuration
nano .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your settings:

```env
BOTNUMBER=628xxxxxxxxx
NODE_ENV=production
PORT=3000
WEBHOOKS=https://your-webhook-url.com/webhook
```

### 3. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### 4. Alternative: Build and Run with Docker

```bash
# Build the image
docker build -t wazium-bot .

# Run the container
docker run -d \
  --name wazium-bot \
  -p 3000:3000 \
  -v $(pwd)/session:/app/session \
  -v $(pwd)/data:/app/data \
  -e BOTNUMBER=628xxxxxxxxx \
  wazium-bot
```

## First Time Setup

1. **Start the container** using one of the methods above
2. **Check logs** to see the pairing code:
   ```bash
   docker-compose logs -f
   ```
3. **Scan QR code** or **enter pairing code** in your WhatsApp
4. **Verify connection** by visiting: http://localhost:3000/bot-status

## Accessing the Application

- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **Bot Status**: http://localhost:3000/bot-status

## Data Persistence

The following directories are mounted as volumes to persist data:

- `./session` - WhatsApp session data
- `./data` - Tenant configuration data
- `./logs` - Application logs (optional)

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `BOTNUMBER` | WhatsApp number with country code | Yes | - |
| `PORT` | Port for the web server | No | 3000 |
| `NODE_ENV` | Environment mode | No | production |
| `WEBHOOKS` | Comma-separated webhook URLs | No | - |

## API Endpoints

### Send Message
```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789@s.whatsapp.net",
    "message": {
      "text": "Hello from API!"
    }
  }'
```

### Check Bot Status
```bash
curl http://localhost:3000/bot-status
```

### Get Tenants
```bash
curl http://localhost:3000/api/tenants
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs wazium-bot

# Check if port is already in use
netstat -tulpn | grep :3000
```

### Bot connection issues
1. Check if session files exist in `./session`
2. Delete session files and restart to re-authenticate
3. Verify BOTNUMBER format (include country code)

### Permission issues
```bash
# Fix permissions
sudo chown -R $USER:$USER ./session ./data
chmod -R 755 ./session ./data
```

## Production Deployment

### Using Docker Compose (Recommended)

1. **Set up reverse proxy** (nginx/traefik)
2. **Configure SSL certificates**
3. **Set up monitoring** (optional)
4. **Configure log rotation**

### Example nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring

### Health Checks
The container includes built-in health checks. Monitor with:

```bash
# Check container health
docker ps

# View health check logs
docker inspect wazium-bot | grep -A 10 Health
```

### Logs
```bash
# View real-time logs
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100
```

## Backup and Restore

### Backup
```bash
# Backup session and data
tar -czf wazium-backup-$(date +%Y%m%d).tar.gz session/ data/
```

### Restore
```bash
# Stop container
docker-compose down

# Restore backup
tar -xzf wazium-backup-YYYYMMDD.tar.gz

# Start container
docker-compose up -d
```

## Security Considerations

1. **Change default ports** in production
2. **Use environment variables** for sensitive data
3. **Set up firewall rules**
4. **Regular security updates**
5. **Monitor access logs**

## Support

For issues and questions:
- Check the logs first
- Review this deployment guide
- Check GitHub issues
- Contact the development team
