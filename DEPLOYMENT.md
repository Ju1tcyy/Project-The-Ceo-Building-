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

# OAuth 2.0 (Google)
SESSION_SECRET=your_secure_random_string_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Access Restriction (Optional)
ALLOWED_EMAILS=admin@sekolah.ac.id,user@gmail.com
ALLOWED_GOOGLE_DOMAINS=sekolah.ac.id,company.com
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
| `SESSION_SECRET` | Secret untuk session encryption | Yes (untuk OAuth) | - |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes (untuk OAuth) | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes (untuk OAuth) | - |
| `OAUTH_CALLBACK_URL` | OAuth callback URL | Yes (untuk OAuth) | - |
| `ALLOWED_EMAILS` | Comma-separated allowed emails | No | - |
| `ALLOWED_GOOGLE_DOMAINS` | Comma-separated allowed domains | No | - |

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

### Opsi Hosting

#### 1. **VPS (Virtual Private Server)** - Recommended untuk WhatsApp Bot

**Platform populer:**
- **DigitalOcean** (Starting $6/bulan)
- **Linode** (Starting $5/bulan)
- **Vultr** (Starting $6/bulan)
- **Hetzner** (Starting €4/bulan)
- **AWS EC2** / **Google Cloud Compute** / **Azure VM**

**Setup di VPS:**

```bash
# 1. SSH ke server
ssh root@your-server-ip

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install docker-compose -y

# 3. Clone repository
git clone <your-repo-url> /opt/wazium-bot
cd /opt/wazium-bot

# 4. Setup environment
cp env.example .env
nano .env  # Edit dengan konfigurasi production

# 5. Update OAuth callback URL untuk production
# OAUTH_CALLBACK_URL=https://yourdomain.com/auth/google/callback

# 6. Build dan jalankan
docker-compose up -d

# 7. Setup reverse proxy (nginx)
```

#### 2. **Railway** (Easy Deployment)

1. Buat akun di [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add environment variables di Railway dashboard
4. Deploy otomatis

**Railway environment variables:**
```
BOTNUMBER=628xxxxxxxxx
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OAUTH_CALLBACK_URL=https://your-app.railway.app/auth/google/callback
SESSION_SECRET=...
```

#### 3. **Render** (Free tier available)

1. Buat akun di [render.com](https://render.com)
2. Connect GitHub repository
3. Pilih "Web Service"
4. Set environment variables
5. Deploy

#### 4. **Fly.io** (Global edge deployment)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Set secrets
fly secrets set GOOGLE_CLIENT_ID=...
fly secrets set GOOGLE_CLIENT_SECRET=...
```

#### 5. **Heroku** (Paid, but easy)

```bash
# Install Heroku CLI
# Login dan create app
heroku login
heroku create wazium-bot

# Set environment variables
heroku config:set BOTNUMBER=628xxxxxxxxx
heroku config:set GOOGLE_CLIENT_ID=...
heroku config:set GOOGLE_CLIENT_SECRET=...
heroku config:set OAUTH_CALLBACK_URL=https://wazium-bot.herokuapp.com/auth/google/callback

# Deploy
git push heroku main
```

### Setup dengan Docker Compose (Recommended untuk VPS)

1. **Set up reverse proxy** (nginx/traefik)
2. **Configure SSL certificates** (Let's Encrypt)
3. **Set up monitoring** (optional)
4. **Configure log rotation**

### Setup Nginx Reverse Proxy dengan SSL

**Install Nginx dan Certbot:**

```bash
apt-get update
apt-get install nginx certbot python3-certbot-nginx -y
```

**Nginx configuration (`/etc/nginx/sites-available/wazium-bot`):**

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
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Enable site dan setup SSL:**

```bash
# Enable site
ln -s /etc/nginx/sites-available/wazium-bot /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Setup SSL dengan Let's Encrypt
certbot --nginx -d your-domain.com

# Auto-renewal (sudah otomatis, tapi bisa test)
certbot renew --dry-run
```

**Update OAuth Callback URL:**

Di Google Cloud Console, update Authorized redirect URIs:
- `https://your-domain.com/auth/google/callback`

Di `.env` file:
```env
OAUTH_CALLBACK_URL=https://your-domain.com/auth/google/callback
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
