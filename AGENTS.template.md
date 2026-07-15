# Project Config

## Vercel
- **Token**: `set in GitHub secrets / Vercel dashboard`
- **Org ID**: `team_lAjOepLfDaFUyAINRNPdz3a0`
- **Frontend Project**: `hrms-saas-rakesh` (ID: `prj_naeWObOLJjW3xZ71OAH0Tc1iYydU`)
- **Backend Project**: `backend` (ID: `prj_2A9b3vpSqFFOmBE0opFU5vmjI3l3`)
- **Production Branch**: `prod`
- **Frontend URL**: `https://hrms-saas-rakesh-site-tracker-pro-s-projects.vercel.app`
- **Backend URL**: `https://backend-site-tracker-pro-s-projects.vercel.app`

## GitHub Secrets (repo Settings → Secrets → Actions)
| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | `<set in GitHub secrets — DO NOT COMMIT>` |

## GitHub Variables (repo Settings → Variables → Actions)
| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://backend-site-tracker-pro-s-projects.vercel.app/api` |

## Frontend Production Env (`.env.production`)
| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://backend-site-tracker-pro-s-projects.vercel.app/api` |
| `VITE_API_BASE_URL` | `https://backend-site-tracker-pro-s-projects.vercel.app` |
| `VITE_STATIC_BASE_URL` | `https://backend-site-tracker-pro-s-projects.vercel.app` |
| `VITE_CASHFREE_ENVIRONMENT` | `PRODUCTION` |

## Backend Production Env (`.env.production`)
Non-sensitive variables only. Secrets are set via Vercel Environment Variables.

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `BACKEND_URL` | `https://backend-site-tracker-pro-s-projects.vercel.app` |
| `FRONTEND_URL` | `https://hrms-saas-rakesh-site-tracker-pro-s-projects.vercel.app` |
| `LOG_LEVEL` | `info` |
| `TZ` | `Asia/Kolkata` |
| `BCRYPT_SALT_ROUNDS` | `10` |
| `RUN_MIGRATIONS_ON_START` | `true` |
| `JWT_EXPIRES_IN` | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |

## CI/CD Workflows
- `.github/workflows/ci.yml` — PR checks (typecheck, lint, build)
- `.github/workflows/deploy.yml` — Deploy frontend + backend on push to `prod`

## ⚠️ Security Notes
- All secrets are set via **GitHub Secrets** (for Actions) and **Vercel Environment Variables** (for deployments)
- **Never commit** `.env.production`, `AGENTS.md` with live values, or any file containing secrets
- If this file was committed with live secrets, **rotate all secrets immediately**:
  - Rotate the Vercel token
  - Rotate JWT secrets on the backend
  - Change SMTP password
  - Rotate any database credentials
