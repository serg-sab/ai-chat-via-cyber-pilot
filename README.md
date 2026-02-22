# AI Chat Application

A web-based AI chat application with streaming responses, conversation history, and admin observability.

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Run migrations**:
   ```bash
   npm run migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── db/
│   ├── migrations/     # SQL migration files
│   ├── pool.ts         # PostgreSQL connection pool
│   ├── redis.ts        # Redis client
│   ├── migrate.ts      # Migration runner
│   └── index.ts        # Database module exports
```

## Database Schema

### Tables

- **users** - User accounts with auth credentials and settings
- **conversations** - Chat threads owned by users
- **messages** - Individual messages in conversations

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Migrations are applied in order and tracked in the `migrations` table
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `DB_POOL_MIN` | Minimum pool connections | 2 |
| `DB_POOL_MAX` | Maximum pool connections | 10 |

## Development

```bash
# Build TypeScript
npm run build

# Run tests
npm test
```

## Architecture

See [docs/DESIGN.md](docs/DESIGN.md) for detailed architecture documentation.

## Features

See [docs/DECOMPOSITION.md](docs/DECOMPOSITION.md) for feature breakdown and implementation status.
