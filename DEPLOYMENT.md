# Bookiee Deployment Guide

## Step 1: Create Neon PostgreSQL Database

1. Go to https://neon.tech and sign up (free tier)
2. Create a new project named "bookiee"
3. Copy the connection string (looks like: `postgresql://neondb_owner:xxxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)
4. Save this for Railway deployment

## Step 2: Deploy Backend to Railway

1. Go to https://railway.app and sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your Bookiee repository
4. Add these environment variables in Railway:

```
DATABASE_URL=postgresql://neondb_owner:xxxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-random-key-here
JWT_EXPIRES_IN=7d
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=bookiee-webhook-verify
WHATSAPP_APP_SECRET=
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
NLP_SERVICE_URL=http://localhost:8001
APP_URL=https://your-app.vercel.app
API_URL=https://your-app.up.railway.app
```

5. Railway will auto-deploy. Note the deployment URL (e.g., `https://bookiee-api.up.railway.app`)

## Step 3: Deploy Frontend to Vercel

1. Go to https://vercel.com and sign up with GitHub
2. Click "New Project" → Import your Bookiee repository
3. Set root directory to `frontend`
4. Add environment variable:
   - `VITE_API_URL` = `/api` (for proxy) or `https://your-app.up.railway.app` (direct)

5. Update `frontend/vercel.json` with your actual Railway URL:
   - Change `https://bookiee-api.up.railway.app/api/:path*` to your Railway URL

6. Deploy

## Step 4: Run Database Migrations

1. Go to Railway dashboard → your backend service → Variables
2. Add `DATABASE_URL` with your Neon connection string
3. Open Railway shell and run:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

## Step 5: Configure WhatsApp (Optional)

1. Create a Meta Business account at https://business.facebook.com
2. Create a WhatsApp Business API app
3. Get Phone Number ID and Access Token
4. Add to Railway environment variables
5. Set webhook URL in Meta dashboard to: `https://your-app.up.railway.app/api/v1/whatsapp/webhook`

## Step 6: Configure Paystack (Optional)

1. Sign up at https://paystack.com
2. Get API keys from dashboard
3. Add to Railway environment variables

## Cost Estimate

- **Neon PostgreSQL**: Free tier (512 MB storage, 24/7 compute)
- **Railway**: $5 free credit/month (enough for small app)
- **Vercel**: Free tier for hobby projects
- **Total**: ~$0/month for small usage

## Local Development

```bash
# Start all services
docker-compose up -d

# Run migrations
cd backend && npx prisma migrate dev

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```
