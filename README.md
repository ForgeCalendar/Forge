# <img src="public/brand/forge-logo-primary-black.svg" alt="Forge logo" height="32" /> Forge Calendar

[![Build and Push Docker Images](https://github.com/ForgeCalendar/Forge/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/ForgeCalendar/Forge/actions/workflows/docker-publish.yml)
[![Backend Tests](https://github.com/ForgeCalendar/Forge/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/ForgeCalendar/Forge/actions/workflows/backend-tests.yml)

Forge is a goal-centric planning system where an AI collaborator helps you decide **what to do today** by generating context-aware daily events from your long-term goals. Instead of micromanaging todo lists, Forge helps you answer "what should I work on today?" by reasoning about your goals, deadlines, and available time.

Goals are the source of truth in Forge, not tasks. The AI proposes daily events based on your objectives, but you maintain full autonomy—all suggestions are optional. Forge exists to reduce activation energy and serve as a thinking partner, not to enforce discipline or create guilt.

## Documentation

For developers looking to contribute or run locally, see the [`wiki/`](wiki/) directory:

- [**Development Guide**](wiki/DEVELOPMENT.md) — Local setup, architecture, and development workflow
- [**API Documentation**](wiki/API_DOCUMENTATION.md) — REST API endpoint reference
- [**Backend Summary**](wiki/BACKEND_SUMMARY.md) — Backend architecture and database schema
- [**Auth Documentation**](wiki/AUTH_DOCUMENTATION.md) — Authentication flow and security
- [**Testing**](wiki/TESTING.md) — Test structure and CI integration
- [**Vision**](wiki/VISION.md) — Project principles and long-term direction

## Deployment

Forge provides pre-built Docker images via GitHub Container Registry.

### Quick Start with Docker Compose

1. Download the example compose file:

```bash
curl -O https://raw.githubusercontent.com/ForgeCalendar/Forge/master/examples/docker-compose.yml
```

2. Generate a cookie secret and update the compose file:

```bash
openssl rand -base64 32
```

3. Edit `docker-compose.yml` and replace `COOKIE_SECRET` with your generated value.

4. Start the application:

```bash
docker compose up -d
```

Visit `http://localhost:3000` to access Forge.

### Docker Images

Two images are published:

| Image                                          | Purpose             |
| ---------------------------------------------- | ------------------- |
| `ghcr.io/forgecalendar/forge:latest`           | Main application    |
| `ghcr.io/forgecalendar/forge-migration:latest` | Database migrations |

### Environment Variables

| Variable        | Required | Description                                       |
| --------------- | -------- | ------------------------------------------------- |
| `DATABASE_URL`  | Yes      | SQLite database path (e.g., `file:/data/prod.db`) |
| `COOKIE_SECRET` | Yes      | Secret for signing session cookies                |

AI provider API keys are configured per-user through the application settings.

### Data Persistence

Mount a volume to `/data` to persist the SQLite database across container restarts:

```yaml
volumes:
  - forge-data:/data
```

## License

Private project
