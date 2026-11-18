# Production Deployment Guide (Ubuntu VPS)

**Project:** Delgone Digital Sales Ledger  
**Organization:** Delgone Trading PLC — Addis Ababa, Ethiopia  
**Phase:** Phase 6 — Production Readiness, PWA, Deployment & Security  
**Target Platform:** Ubuntu 22.04 / 24.04 LTS (x86_64 or ARM64)  

---

## Prerequisites & Architecture Overview

Before deploying, ensure you have:
1. An active Ubuntu VPS (recommended: 2 vCPUs, 4GB RAM, 40GB SSD).
2. A registered domain or subdomain pointed to the VPS public IP (e.g., `ledger.delgone.com`).
3. Root or `sudo` SSH access to the VPS.

### Production Container Topology
```
Internet (Port 80/443)
        │
        ▼
[ Nginx Reverse Proxy & SSL ]
        │
        ├──► /api/ ──► [ FastAPI Backend (Gunicorn/Uvicorn) ] ──► [ PostgreSQL 16 (Internal Net) ]
        │
        └──► /     ──► [ Frontend Static Shell (Nginx Alpine) ]
```

---

## 1. VPS Preparation

Update system packages and configure a secure non-root user:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw htop fail2ban jq

# Configure Uncomplicated Firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh          # Port 22
sudo ufw allow 80/tcp       # HTTP for ACME challenge & HTTPS redirect
sudo ufw allow 443/tcp      # HTTPS for application traffic
sudo ufw --force enable
```

---

## 2. Installing Docker & Docker Compose

Install official Docker Engine and Compose plugin:
```bash
# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow current user to run docker
sudo usermod -aG docker $USER
```
*(Log out and back in for group membership to take effect)*

---

## 3. Configuring Environment Variables

Clone the repository to `/opt/delgone`:
```bash
sudo mkdir -p /opt/delgone
sudo chown -R $USER:$USER /opt/delgone
git clone https://github.com/nathnael68/Digital-ledger.git /opt/delgone
cd /opt/delgone

# Create production environment configuration
cp .env.production.example .env.production
chmod 600 .env.production
```

Edit `.env.production` using `nano .env.production` and generate strong secrets:
```bash
# Generate high-entropy database password:
openssl rand -hex 24

# Generate 64-character JWT secret key:
openssl rand -hex 32
```
Set `DOMAIN_NAME=ledger.delgone.com` and `CORS_ORIGINS=["https://ledger.delgone.com"]`.

---

## 4. Configuring the Domain (DNS)

In your DNS provider (e.g., Cloudflare, Route53, Namecheap):
- Create an **A Record**:
  - **Host / Name:** `ledger` (or `@` for apex domain)
  - **Type:** `A`
  - **Value:** `<YOUR_VPS_PUBLIC_IPV4>`
  - **TTL:** Auto or 300s

Verify DNS propagation before proceeding:
```bash
dig +short ledger.delgone.com
```

---

## 5. Configuring HTTPS & SSL Certificates

### Step A: Initial ACME Certificate Request
Temporarily request certificates using Certbot standalone mode:
```bash
sudo apt install -y certbot
sudo certbot certonly --standalone \
  -d ledger.delgone.com \
  --agree-tos \
  --email it-admin@delgone.com \
  --non-interactive
```

### Step B: Link Certificates into Docker Volumes
Ensure the certificates are located where Nginx expects them:
```bash
sudo mkdir -p /etc/letsencrypt/live/ledger.delgone.com
# Verify fullchain.pem and privkey.pem exist in /etc/letsencrypt/live/ledger.delgone.com/
```

Update `nginx/conf.d/delgone.conf` with your exact domain name:
```bash
sed -i 's/ledger.delgone.com/<your-actual-domain>/g' nginx/conf.d/delgone.conf
```

---

## 6. Starting the Application

Build and start the complete production stack:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Verify all containers are running and healthy:
```bash
docker compose -f docker-compose.prod.yml ps
```
You should see:
- `delgone_prod_db` (healthy)
- `delgone_prod_backend` (running)
- `delgone_prod_frontend` (running)
- `delgone_prod_proxy` (running, ports 80/443)
- `delgone_prod_certbot` (running auto-renew loop)

---

## 7. Running Database Migrations

Apply Alembic migrations to construct all tables, constraints, and sequences in the production PostgreSQL database:
```bash
docker exec -t delgone_prod_backend alembic upgrade head
```

Verify tables created:
```bash
docker exec -it delgone_prod_db psql -U delgone_prod_user -d delgone_sales_ledger -c "\dt"
```

---

## 8. Creating the First Administrator

Bootstrap the root administrative account:
```bash
docker exec -it delgone_prod_backend python -m backend.app.cli.bootstrap_admin
```
Provide:
- Admin Username: `delgone_admin`
- Full Name: `System Administrator`
- Secure Password: *(Choose a strong password with symbols, uppercase, numbers)*

---

## 9. Testing Login

1. Open your browser and navigate to `https://ledger.delgone.com`.
2. Inspect the SSL padlock: ensure TLS 1.3 encryption is active.
3. Log in with `delgone_admin` and the password created in Step 8.
4. Verify you land on the **Executive Dashboard**.
5. Test navigation to:
   - Sales Ledger
   - Reports & Analytics
   - Settings & Security Profile

---

## 10. Verifying the Production Database

Confirm that the database is isolated and persistent:
1. **Public Port Isolation Check:**
   ```bash
   # Confirm port 5432 is NOT open to the external internet:
   ss -tulpn | grep 5432
   ```
   *(Only docker-proxy or internal bridge should appear, not 0.0.0.0:5432)*

2. **Persistence Check:**
   ```bash
   docker volume inspect delgone_postgres_prod_data
   ```

---

## 11. Performing Automated Backups

1. Ensure the backup script is executable:
   ```bash
   chmod +x /opt/delgone/scripts/backup_db.sh
   ```

2. Test manual execution:
   ```bash
   sudo /bin/bash /opt/delgone/scripts/backup_db.sh
   ```

3. Confirm backup archive created:
   ```bash
   ls -lh /var/backups/delgone_ledger/daily/
   ```

4. Set up daily cron job:
   ```bash
   sudo crontab -e
   # Add:
   0 2 * * * /bin/bash /opt/delgone/scripts/backup_db.sh >> /var/log/delgone_backup.log 2>&1
   ```

---

## 12. Restoring Backups (Disaster Recovery Verification)

Test restoring a backup in a controlled drill:
```bash
chmod +x /opt/delgone/scripts/restore_db.sh

# Run restoration test:
sudo /bin/bash /opt/delgone/scripts/restore_db.sh \
  /var/backups/delgone_ledger/daily/delgone_ledger_backup_YYYYMMDD_HHMMSS.sql.gz
```
The script validates the checksum, prompts for confirmation, restores data, and reports table counts.

---

## 13. Updating the Application Safely (Rolling Updates)

When new versions or security updates are pushed to GitHub:

1. **Perform pre-update backup:**
   ```bash
   sudo /bin/bash /opt/delgone/scripts/backup_db.sh
   ```

2. **Pull latest code:**
   ```bash
   cd /opt/delgone
   git pull origin master
   ```

3. **Rebuild images and restart containers with zero database downtime:**
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production build
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

4. **Run any pending database migrations:**
   ```bash
   docker exec -t delgone_prod_backend alembic upgrade head
   ```

5. **Verify system health:**
   ```bash
   curl -s https://ledger.delgone.com/api/health | jq .
   ```
