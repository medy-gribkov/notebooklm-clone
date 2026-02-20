#!/usr/bin/env bash
set -euo pipefail

# DocChat - VPS Deployment Script
# Run this on a fresh Ubuntu 22.04+ VPS.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh <your-domain.com> <your-email@example.com>
#
# Prerequisites:
#   - DNS A record pointing your domain to this server's IP
#   - .env.local file with all required env vars (see .env.local.example)

DOMAIN="${1:?Usage: ./deploy.sh <domain> <email>}"
EMAIL="${2:?Usage: ./deploy.sh <domain> <email>}"
APP_DIR="/opt/docchat"

echo "=== DocChat Deployment ==="
echo "Domain: $DOMAIN"
echo "Email:  $EMAIL"
echo ""

# 1. Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 2. Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    apt-get update && apt-get install -y docker-compose-plugin
fi

# 3. Clone or pull the repo
if [ -d "$APP_DIR" ]; then
    echo "Updating existing installation..."
    cd "$APP_DIR"
    git pull origin master
else
    echo "Cloning repository..."
    git clone https://github.com/medy-gribkov/notebooklm-clone.git "$APP_DIR"
    cd "$APP_DIR"
fi

# 4. Check for .env.local
if [ ! -f .env.local ]; then
    echo ""
    echo "ERROR: .env.local not found."
    echo "Copy .env.local.example to .env.local and fill in your values:"
    echo "  cp .env.local.example .env.local"
    echo "  nano .env.local"
    exit 1
fi

# 5. Update nginx config with actual domain
sed -i "s/server_name _;/server_name $DOMAIN;/g" nginx/nginx.conf
sed -i "s|/etc/letsencrypt/live/docchat/|/etc/letsencrypt/live/$DOMAIN/|g" nginx/nginx.conf

# 6. Create certbot webroot directory
mkdir -p nginx/certbot-webroot

# 7. Get initial SSL certificate (temporarily start nginx without SSL)
echo "Obtaining SSL certificate..."
cat > /tmp/nginx-init.conf << 'INITCONF'
server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 200 'DocChat setup in progress';
        add_header Content-Type text/plain;
    }
}
INITCONF

# Start temporary nginx for ACME challenge
docker run -d --name nginx-init \
    -p 80:80 \
    -v /tmp/nginx-init.conf:/etc/nginx/conf.d/default.conf:ro \
    -v "$APP_DIR/nginx/certbot-webroot:/var/www/certbot" \
    nginx:alpine

# Request certificate
docker run --rm \
    -v docchat_certbot-etc:/etc/letsencrypt \
    -v docchat_certbot-var:/var/lib/letsencrypt \
    -v "$APP_DIR/nginx/certbot-webroot:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot -w /var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# Stop temporary nginx
docker stop nginx-init && docker rm nginx-init

# 8. Build and start the full stack
echo "Building and starting DocChat..."
docker compose up -d --build

echo ""
echo "=== Deployment Complete ==="
echo "DocChat is running at https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f        # View logs"
echo "  docker compose down            # Stop"
echo "  docker compose up -d --build   # Rebuild and restart"
echo "  docker compose exec app sh     # Shell into app container"
