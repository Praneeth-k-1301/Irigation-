# 🚀 Deploy Backend to Railway - Step by Step

## 📋 Prerequisites
- GitHub account
- Railway account (free)
- Your code pushed to GitHub

## 🔗 Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

## 🚂 Step 2: Deploy to Railway

### Option A: One-Click Deploy
Click this button to deploy directly:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/Praneeth-k-1301/irrigation-predictor)

### Option B: Manual Deploy

1. **Go to Railway:** https://railway.app
2. **Sign up/Login** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose:** `Praneeth-k-1301/irrigation-predictor`
6. **Railway will auto-detect** Node.js and deploy

## ⚙️ Step 3: Configure Environment Variables

In Railway dashboard:
1. **Go to Variables tab**
2. **Add these variables:**
   ```
   NODE_ENV=production
   PORT=$PORT
   OPENWEATHER_API_KEY=b8e566b5b5e5b5b5b5b5b5b5b5b5b5b5
   ```

## 🌐 Step 4: Get Your Railway URL

After deployment, Railway will give you a URL like:
```
https://irrigation-predictor-production.up.railway.app
```

## 🔧 Step 5: Update Frontend

Update the API_BASE_URL in your frontend to use the Railway URL.

## ✅ Step 6: Test

Test your deployed backend:
```bash
curl https://your-railway-url.railway.app/health
```

## 🎯 Expected Result

Your backend will be live at:
- **Health Check:** https://your-app.railway.app/health
- **Crop Prediction:** https://your-app.railway.app/api/crop
- **Analytics:** https://your-app.railway.app/api/analytics

## 💰 Cost

Railway offers:
- ✅ **$5 free credit** per month
- ✅ **500 hours** of usage (enough for hobby projects)
- ✅ **No credit card required** for free tier
