# UNZA Clinic Production Deployment Guide

## Prerequisites

- Docker and Docker Compose (recommended for easy deployment)
- OR Java 17+ and PostgreSQL 15+ for manual deployment
- Minimum 4GB RAM, 2 CPU cores, 20GB storage

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Nginx (Port 80)                              │
│                     Reverse Proxy + Static Files                     │
└───────┬─────────────────────────────┬───────────────────────────────┘
        │                             │
        ▼                             ▼
┌───────────────┐            ┌─────────────────────┐
│  Frontend     │            │  Backend API        │
│  React/Vite   │            │  Spring Boot 3.3.x  │
│  (Static)     │            │  Port 8080          │
└───────────────┘            └─────────┬───────────┘
                                        │
                                        ▼
                               ┌─────────────────────┐
                               │ PostgreSQL 15+      │
                               │ Port 5432           │
                               └─────────────────────┘
```

## Option 1: Docker Compose (Recommended)

### 1. Prepare Environment

```bash
# Clone repository and navigate to project root
cd unza-clinic

# Create environment configuration
cp .env.backend.example .env.backend
# Edit .env.backend with secure values:
# - SPRING_DATASOURCE_PASSWORD=<your-secure-db-password>
# - UNZA_JWT_SECRET=<256-bit-random-secret>
# - HR_SERVICE_USERNAME / HR_SERVICE_PASSWORD (production HR service account — see below)

# Generate a strong JWT secret (minimum 256-bit):
# openssl rand -base64 32
```

`docker-compose.yml` loads `.env.backend` automatically via `env_file`, so anything set there (JWT secret, DB password, HR/Counseling credentials) reaches the backend container — this file must exist before `docker-compose up` or the backend service will fail to start.

**HR system whitelisting:** `devhr.unza.zm` only accepts requests from IPs it has whitelisted. Before go-live, get this production server's outbound IP to whoever administers the HR system and have it whitelisted (replacing the dev-machine IP used during testing) — otherwise staff/dependents lookups will silently fail (the integration degrades gracefully to "not found" rather than erroring, so this is easy to miss without testing it directly after deploy).

### 2. Configure PostgreSQL Password

```bash
# In .env.backend, set:
SPRING_DATASOURCE_PASSWORD=your_secure_postgres_password
POSTGRES_PASSWORD=your_secure_postgres_password
```

### 3. Deploy

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes database!)
docker-compose down -v
```

### 4. Access the Application

- Frontend: `http://localhost` or `http://<server-ip>`
- Backend API: `http://localhost:8080/api`
- API Health: `http://localhost:8080/api/health`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

### 5. Initial Admin Login

This system no longer auto-creates a demo admin account or demo clinic data — provision your first real Admin user directly against the database before going live.

### 6. Clear Legacy Demo Data (Existing Deployments Only)

If this deployment was previously seeded with demo data before the auto-seeder was removed, clear it via:

1. Log in as Admin
2. Go to Settings → "Deployment Danger Zone"
3. Type `CLEAR SEEDED DATA` and confirm

This removes demo patients, appointments, invoices, etc., while preserving the admin account and clinic settings.

## Option 2: Manual Deployment (Traditional)

### 1. Database Setup

```bash
# Install PostgreSQL 15+
sudo apt-get install postgresql-15  # Ubuntu/Debian
# or
sudo yum install postgresql15-server  # RHEL/CentOS

# Create database
sudo -u postgres psql
CREATE DATABASE unza_hospital;
CREATE USER postgres WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE unza_hospital TO postgres;
\q
```

### 2. Backend Deployment

```bash
# Build with Maven
cd backend
mvn clean package -DskipTests

# The JAR will be at: target/clinic-backend-0.0.1-SNAPSHOT.jar

# Run with production profile
java -jar target/clinic-backend-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=prod \
  --UNZA_JWT_SECRET=<your-secret> \
  --SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/unza_hospital \
  --SPRING_DATASOURCE_PASSWORD=<db-password>
```

**Use a process manager (systemd) for production:**

Create `/etc/systemd/system/unza-clinic.service`:
```ini
[Unit]
Description=UNZA Clinic Backend
After=network.target postgresql.service

[Service]
Type=simple
User=unza
WorkingDirectory=/opt/unza-clinic/backend
Environment="SPRING_PROFILES_ACTIVE=prod"
Environment="UNZA_JWT_SECRET=your_secret"
Environment="SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/unza_hospital"
ExecStart=/usr/bin/java -jar clinic-backend-0.0.1-SNAPSHOT.jar
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable unza-clinic
sudo systemctl start unza-clinic
sudo systemctl status unza-clinic
```

### 3. Frontend Deployment

```bash
cd src
npm ci
npm run build

# Output in dist/ folder
# Serve with any static file server (nginx, caddy, apache)

# Example nginx config snippet:
server {
    listen 80;
    server_name yourdomain.com;
    root /opt/unza-clinic/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /swagger-ui/ {
        proxy_pass http://localhost:8080/swagger-ui/;
    }
}
```

## Security Checklist for Production

- [ ] Change default admin password immediately
- [ ] Use strong JWT secret (256+ bits, random, stored in environment)
- [ ] Use strong PostgreSQL password
- [ ] Enable HTTPS (use Let's Encrypt with certbot)
- [ ] Configure firewall (allow only ports 80, 443)
- [ ] Set up regular automated backups (see Backup Strategy)
- [ ] Enable audit logging in settings
- [ ] Review and assign user roles appropriately
- [ ] Clear seeded demo data before go-live
- [ ] Install and configure fail2ban for SSH brute-force protection

## Backup & Recovery

### Automated Daily Backups

Add to crontab (`crontab -e`):
```cron
0 2 * * * /usr/bin/docker exec unza-clinic-backend curl -s http://localhost:8080/api/backup/manual > /backup/unza-$(date +\%Y-\%m-\%d).json
```

Or using API:
```bash
curl -X POST http://localhost:8080/api/backup/manual \
  -H "Authorization: Bearer <admin-jwt-token>"
```

Backups are JSON files containing all clinic data including settings.

### Restore from Backup

```bash
curl -X POST http://localhost:8080/api/backup/restore \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d @backup-file.json
```

**Warning:** This replaces ALL data. Confirm you have a valid backup before running.

## Monitoring & Health Checks

### Health Endpoint
```
GET /api/health
```
Returns service status and timestamp. Use for uptime monitoring.

### Actuator Metrics
```
GET /actuator/health
GET /actuator/metrics
GET /actuator/prometheus  # for Prometheus scraping
```

### Logs

- Docker: `docker-compose logs -f <service>`
- Systemd: `sudo journalctl -u unza-clinic -f`
- Log file location (when using production logging): `/opt/unza-clinic/logs/unza-clinic.log`

## Updating the Application

### Docker Compose

```bash
# Pull new images (if using registry)
docker-compose pull

# Rebuild and restart
docker-compose up -d --build

# Zero-downtime update strategy
docker-compose up -d --no-deps --build backend
# wait for health check, then update frontend similarly
```

### Manual

```bash
# Backend
systemctl stop unza-clinic
cd /opt/unza-clinic/backend
git pull origin main
mvn clean package -DskipTests
cp target/clinic-backend-*.jar /opt/unza-clinic/
systemctl start unza-clinic

# Frontend
systemctl stop nginx
cd /opt/unza-clinic/frontend
git pull origin main
npm ci
npm run build
systemctl start nginx
```

## Troubleshooting

### Backend won't start (port 8080 already in use)
```bash
sudo lsof -i :8080
sudo kill -9 <PID>
```

### Database connection error
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check credentials in `.env.backend`
- Ensure database exists: `sudo -u postgres psql -l`

### Frontend shows blank page
- Check Nginx config: `sudo nginx -t`
- Verify static files exist in `/opt/unza-clinic/frontend/dist`
- Check browser console for errors

### JWT token errors
- Ensure UNZA_JWT_SECRET is set and unchanged (tokens become invalid if changed)
- Clear browser localStorage and re-login

### 500 Internal Server Error
- Check backend logs: `docker-compose logs backend` or `sudo journalctl -u unza-clinic`
- Enable debug logging: set `logging.level.com.unza.clinic=DEBUG` in `application-prod.yml`

## Support

For issues, contact: it@unza.zm  
Documentation: https://github.com/your-org/unza-clinic
