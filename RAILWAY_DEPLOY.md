# Railway Deployment Guide

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. MongoDB database (can use Railway's MongoDB service or external like MongoDB Atlas)
3. Environment variables configured

## Deployment Steps

### 1. Install Railway CLI (Optional but Recommended)

```bash
npm i -g @railway/cli
railway login
```

### 2. Deploy via Railway Dashboard

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo" (connect your GitHub account if needed)
4. Select your `pdfAssist` repository
5. Railway will automatically detect the Dockerfile and start building

### 3. Configure Environment Variables

In Railway dashboard, go to your service → Variables tab and add:

**Required:**
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `GEMINI_API_KEY` or `API_KEY` - Your Google Gemini API key
- `MONGODB_URI` - Your MongoDB connection string
- `NODE_ENV=production`

**Optional:**
- `TEMP_DIR=/tmp` - Use /tmp for serverless (already handled in code)
- `MAX_FILE_SIZE_MB=10`
- `TEMP_FILE_TIMEOUT=300`

### 4. Add MongoDB Service (Optional)

If you want to use Railway's MongoDB:
1. In your Railway project, click "New" → "Database" → "MongoDB"
2. Railway will automatically provide `MONGO_URL` variable
3. Update your code to use `MONGO_URL` if needed, or map it to `MONGODB_URI`

### 5. Configure Port

Railway automatically sets `PORT` environment variable. Your Next.js app should use it:
- Next.js automatically uses `process.env.PORT` or defaults to 3000
- Railway will handle port mapping automatically

## Free Tier Limitations

- **$1/month in credits** (roughly 144 hours of runtime)
- **0.5 GB RAM** - May be tight for PDF processing
- **1 vCPU** - Single core
- **0.5 GB storage** - Limited temp file storage

**Recommendation**: Start with free tier to test, but consider upgrading to Hobby ($5/month) for production use.

## Monitoring

- Check logs in Railway dashboard
- Monitor usage in the "Metrics" tab
- Set up alerts for high usage

## Troubleshooting

### PDF Unlocking Fails
- Check logs to see if qpdf is installed: `railway logs`
- Verify qpdf is in PATH: The Dockerfile installs it, so it should work

### Out of Memory
- Free tier has only 0.5 GB RAM
- Large PDFs may cause issues
- Consider upgrading to Hobby plan

### Database Connection Issues
- Verify `MONGODB_URI` is set correctly
- Check MongoDB service is running (if using Railway MongoDB)
- Ensure MongoDB allows connections from Railway IPs

## Alternative: Render.com

If Railway free tier is too limited, consider Render.com:
- Free tier available (with limitations)
- Can install system packages
- Similar Dockerfile approach works

