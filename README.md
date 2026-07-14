# UNZA Clinic Management System

This workspace contains:

- A React + Vite frontend in `src/`
- A Spring Boot backend in `backend/`
- The older Node prototype in `server/` kept only for reference

## Get Started Quickly (Docker Compose)

```bash
cd "UNZA CLINIC"
docker-compose up -d
```

Access:
- Frontend: http://localhost
- Backend API: http://localhost:8080/api
- API Docs (Swagger): http://localhost:8080/swagger-ui.html

### Default demo login
- Email: `admin@unza.zm`
- Password: `admin123`

**Important:** Change the admin password immediately after first login via Settings -> Profile.

## Development (Local)

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
npm run backend
```

Requires Java 17+, Maven, and PostgreSQL running on `localhost:5432`.

## Manual Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full deployment and operations guide, including:

- Docker and Docker Compose deployment
- Traditional manual deployment (systemd)
- Security hardening checklist
- Backup and recovery procedures
- Monitoring and health checks
- CI/CD pipeline configuration

## System Architecture

The system provides comprehensive clinic management:

- **Patient Management**: Registration, demographics, medical history
- **Clinical Workflow**: Encounters, triage, consultations, admissions
- **Laboratory & Radiology**: Test orders, results tracking
- **Pharmacy**: Drug inventory, prescriptions, dispensing
- **Billing**: Invoicing, payment tracking, tariff management
- **Staff Management**: Scheduling, attendance, user accounts
- **Reports & Analytics**: Clinical statistics, financial summaries
- **System Administration**: Audit logs, settings, backup/restore

All data is persisted in PostgreSQL. The backend exposes a REST JSON API protected by JWT authentication.

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Material UI (MUI) + custom components
- TanStack Query
- Recharts

**Backend:**
- Spring Boot 3.3.x (Java 17)
- Spring Security + JWT
- Spring Data JPA + Hibernate
- PostgreSQL 15+
- Flyway migrations
- Spring Boot Actuator
- OpenAPI / Swagger

## Key Features

- Role-based access control (Admin, Doctor, Nurse, Receptionist, Pharmacist, Lab Technician)
- Real-time encounter tracking across clinic sections (Reception -> Triage -> Consultation -> Pharmacy -> Checkout)
- Patient journey history with audit trail
- Clinical forms engine with custom templates
- Blood bank inventory management
- Staff attendance and scheduling
- Operational reporting and export support
- PWA-ready frontend for mobile access
- Dockerized deployment support
