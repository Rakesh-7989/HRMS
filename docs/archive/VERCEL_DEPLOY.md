# Vercel + Supabase Live Deployment

## Step 1: Vercel — Connect GitHub Repo

1. Go to https://vercel.com and login
2. Go to each project (frontend, backend) → **Settings → Git → Connect Git Repository**
3. Select `Rakesh-7989/HRMS`
4. Set **Production Branch** to `prod` for both
5. Auto-deploy will trigger on each push to `prod`

## Step 2: Vercel — Environment Variables

### Backend (`hrms-backend`)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase PostgreSQL connection string (`postgresql://...`) |
| `JWT_ACCESS_SECRET` | Your secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Your secret (min 32 chars) |
| `ENCRYPTION_KEY` | 64-char hex key |
| `CASHFREE_APP_ID` | Cashfree API client ID |
| `CASHFREE_SECRET_KEY` | Cashfree API secret |
| `FRONTEND_URL` | `https://frontend.vercel.app` (your Vercel frontend URL) |
| `BACKEND_URL` | `https://backend.vercel.app` (your Vercel backend URL) |
| `RUN_MIGRATIONS_ON_START` | `true` |
| `NODE_ENV` | `production` |
| `SMTP_HOST` | Your SMTP host |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | SMTP email |
| `SMTP_PASS` | SMTP app password |
| `EMAIL_FROM` | `HRMS <noreply@yourdomain.com>` |
| `TZ` | `Asia/Kolkata` |

### Frontend (`hrms-frontend`)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://backend.vercel.app/api` (your Vercel backend URL + /api) |
| `VITE_CASHFREE_ENVIRONMENT` | `sandbox` or `production` |
| `VITE_RAZORPAY_KEY_ID` | Razorpay key ID (if using) |

## Step 3: Supabase — Database Setup

1. Go to https://supabase.com → your project → **Project Settings → Database**
2. Copy the **Connection string** (URI format)
3. Use that as `DATABASE_URL` in Vercel backend env vars
4. The app will auto-run all 80+ SQL migrations on first start (via `RUN_MIGRATIONS_ON_START=true`)

## Step 4: Trigger Deploy

After setting env vars:
1. Push to `prod` branch: `git push origin prod`
2. Vercel auto-deploys both projects
3. Check deployment status at Vercel dashboard → **Deployments**
