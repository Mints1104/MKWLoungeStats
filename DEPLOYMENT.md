# Vercel Deployment Guide

## ✅ Deployment is Ready!

Your project is now configured for Vercel deployment with:

- ✓ Backend API as serverless functions
- ✓ Frontend as static site
- ✓ CORS configuration
- ✓ Build scripts
- ✓ API routing

---

## 📋 Pre-Deployment Checklist

1. **Install CORS dependency** (if not already installed):

   ```bash
   npm install cors
   ```

2. **Commit all changes**:

   ```bash
   git add .
   git commit -m "Configure Vercel deployment with serverless backend"
   git push origin main
   ```

3. **Verify frontend builds locally** (optional but recommended):
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

---

## 🚀 Deploy to Vercel

### Option A: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not installed):

   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:

   ```bash
   vercel login
   ```

3. **Deploy**:

   ```bash
   vercel
   ```

   - Follow the prompts
   - Select your scope (personal account or team)
   - Link to existing project or create new one
   - Accept default settings

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

---

### Option B: Deploy via Vercel Dashboard

1. **Go to**: https://vercel.com/new

2. **Import Git Repository**:

   - Click "Import Git Repository"
   - Select your GitHub/GitLab/Bitbucket repository
   - Click "Import"

3. **Configure Project**:

   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as root)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install`

4. **Environment Variables** (Optional):

   - Add `FRONTEND_URL` if you want to restrict CORS
   - Format: `https://your-app.vercel.app`
   - Note: You'll need to add this AFTER first deployment

5. **Click "Deploy"**

---

## 🔧 After First Deployment

### 1. Add FRONTEND_URL Environment Variable (Optional)

If you want to restrict CORS to your frontend domain:

1. Go to your project dashboard on Vercel
2. Click **Settings** → **Environment Variables**
3. Add:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://your-app.vercel.app` (use your actual Vercel URL)
   - **Environment**: Production
4. Click **Save**
5. **Redeploy** to apply changes

### 2. Test Your Deployment

Visit your Vercel URL and test:

- ✅ Homepage loads
- ✅ Navigation works
- ✅ API calls work (check browser console for errors)
- ✅ All pages render correctly

### 3. Test API Endpoints

Open browser console on your deployed site:

```javascript
fetch("/api/player/details/YourPlayerName")
  .then((r) => r.json())
  .then(console.log);
```

---

## 🐛 Troubleshooting

### API Returns 404 or 500

**Check**:

1. Vercel function logs: Dashboard → Deployments → Click deployment → Functions tab
2. Ensure `api/index.js` exists
3. Verify `server.js` exports the app: `module.exports = app;`

**Fix**:

```bash
# Redeploy
vercel --prod
```

---

### CORS Errors

**Symptoms**: Console shows `Access-Control-Allow-Origin` errors

**Fix**:

1. Ensure `cors` is in `package.json` dependencies
2. Check `server.js` has CORS middleware
3. If restricting origins, verify `FRONTEND_URL` matches your Vercel domain

---

### Frontend Shows 404 for Routes

**Symptoms**: Direct navigation to `/player/info` shows 404

**Fix**: Vercel automatically handles SPA routing, but verify:

1. `frontend/dist` contains `index.html`
2. Routes in `vercel.json` include filesystem handler
3. React Router is configured correctly

---

### Build Fails

**Check Vercel build logs** for specific errors.

Common issues:

- Missing dependencies → Run `npm install` in root and frontend
- Build command fails → Test locally: `npm run build`
- Node version mismatch → Add `.nvmrc` file with Node version

---

## 📊 Monitor Your Deployment

After deployment:

1. **Analytics**: Vercel dashboard → Analytics
2. **Function Logs**: Dashboard → Deployments → [Select deployment] → Functions
3. **Speed Insights**: Dashboard → Speed Insights

---

## 🔄 Continuous Deployment

Once connected to Git, Vercel automatically:

- Deploys every push to `main` branch → Production
- Creates preview deployments for pull requests
- Runs build checks on every commit
  ok

---

## 🎉 Your URLs

After deployment, you'll have:

- **Production**: `https://your-app.vercel.app`
- **API**: `https://your-app.vercel.app/api/*`
- **Preview URLs**: Automatically generated for PRs

---

## 📝 Next Steps (Optional)

1. **Custom Domain**: Settings → Domains → Add your domain
2. **Performance**: Enable Edge Caching for static assets
3. **Monitoring**: Set up Vercel Analytics and Speed Insights
4. **Environment Variables**: Add any API keys or secrets in Settings

---

## ❓ Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support
- **Community**: https://github.com/vercel/vercel/discussions
