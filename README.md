# WellZo HRMS

Modern, production-grade HRMS SaaS platform built for Indian businesses. End-to-end HR management including payroll (PF/ESI/PT), attendance (geo-fencing, biometric), performance management, recruitment, and AI-powered insights.

## Architecture

```
HRMS/
├── frontend/          # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/   # 175+ UI & feature components
│   │   │   └── ui/      # Reusable design system (Button, Card, Dialog, etc.)
│   │   ├── contexts/    # Auth, Permissions, Theme, Chat, Confirm
│   │   ├── pages/       # 86 lazy-loaded route pages
│   │   ├── services/    # 37 typed API service modules
│   │   ├── types/       # TypeScript type definitions
│   │   └── utils/       # Utilities (cn, timeFormat, constants, etc.)
│   ├── .env.example
│   └── .env.production
├── backend/           # Node.js + Express REST API
│   ├── src/
│   │   ├── config/     # Env, DB, mailer, swagger, payment gateways
│   │   ├── middleware/  # 17 middleware (auth, validation, rate-limit, etc.)
│   │   ├── modules/    # 32 feature modules (auth, users, payroll, etc.)
│   │   └── utils/      # jwtHelper, encryption, etc.
│   └── .env.example
├── .github/workflows/ # CI/CD pipelines
├── docs/              # Architecture & design docs
├── commitlint.config.js
└── package.json       # Root scripts (husky, lint-staged)
```

## Tech Stack

### Frontend
- **React 18** + **TypeScript** (strict mode)
- **Vite** — Fast dev server & optimized builds
- **Tailwind CSS** — Utility-first styling with dark mode
- **TanStack Query** — Server state management & caching
- **React Router v6** — Lazy-loaded routes with auth guards
- **Formik + Yup** — Form state & validation
- **Framer Motion** — Page transitions & micro-interactions
- **i18next** — Full i18n support (react-i18next)
- **Vitest** — Unit/component test runner

### Backend
- **Node.js** + **Express** — REST API
- **PostgreSQL** — Primary database (hosted on Supabase)
- **Zod** — Schema validation for all inputs
- **Pino** — Structured JSON logging
- **Swagger** — API documentation at `/api-docs`
- **Helmet + CORS + Rate Limiting** — Security middleware
- **JWT** — Token-based authentication with refresh flow

### Deployment
- **Vercel** — Frontend (Vite static) + Backend (serverless functions)
- **Supabase** — PostgreSQL database hosting
- **GitHub Actions** — CI (typecheck, lint, build) + CD (auto-deploy on prod push)

## Quick Start

```bash
# Clone & install
git clone <repo-url>
cd HRMS
npm install           # Root (husky, commitlint)
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Set up environment
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL, JWT secrets, etc.

# Start development
cd frontend && npm run dev   # → http://localhost:5173
cd backend && npm run dev    # → http://localhost:5000
```

## Available Scripts

### Frontend
| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Tests with coverage report |

### Backend
| Script | Purpose |
|--------|---------|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Production start |
| `npm run test` | Run Jest tests |
| `npm run lint` | ESLint |

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add biometric attendance support
fix: resolve payroll date calculation edge case
chore: update dependencies
docs: add API documentation for attendance module
refactor: extract pagination into reusable hook
```

Husky enforces commit message format and runs lint-staged on pre-commit.

## Environment Variables

See `frontend/.env.example` and `backend/.env.example` for all required variables.

Production values are managed in:
- `.env.production` (frontend & backend) — committed template
- Vercel Environment Variables — actual secrets (DB URL, JWT secrets, API keys)
- GitHub Actions Secrets — VERCEL_TOKEN, etc.

## Deployment

Push to `prod` branch triggers GitHub Actions:
1. **CI**: typecheck → lint → build (on every PR)
2. **CD**: verify → deploy frontend to Vercel → deploy backend to Vercel

## Testing

```bash
# Frontend (Vitest)
cd frontend && npm run test        # Run once
cd frontend && npm run test:watch  # Watch mode

# Backend (Jest)
cd backend && npm run test
```

## API Documentation

Swagger UI available at `/api-docs` (development only).

## Project Status

- [x] Phase 1: Initial setup
- [x] Phase 2: Standardization (i18n, routes, types, toast, exports)
- [x] Phase 3: Infrastructure (CI/CD, env config, TS error fixes)
- [x] Phase 4: Quality & Testing (in progress)
- [ ] Phase 5: Security & Type Safety
- [ ] Phase 6: Developer Experience
- [ ] Phase 7: Monitoring & Observability
- [ ] Phase 8: Accessibility
