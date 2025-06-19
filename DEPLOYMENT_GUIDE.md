# 🚀 Deployment Guide - Smart Crop Prediction System

## Overview
This guide covers deploying the AI-powered crop prediction system to cloud platforms with Firebase backend.

## 🏗️ Architecture for Production

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel/Netlify│    │  Railway/Heroku │    │ Google Cloud Run│
│   (React App)   │◄──►│  (Node.js API)  │◄──►│  (Flask ML API) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Firebase Hosting│    │ OpenWeather API │    │ Container Registry│
│   (Alternative) │    │ (Weather Data)  │    │ (Docker Images) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Deployment Options

### Option 1: Full Cloud Deployment (Recommended)

#### Frontend: Vercel
1. **Connect Repository**
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Set build command: `npm run build`
   - Set output directory: `build`
   - Add environment variables:
     ```
     REACT_APP_API_URL=https://your-api.railway.app
     REACT_APP_FIREBASE_API_KEY=your_key
     REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
     REACT_APP_FIREBASE_PROJECT_ID=your_project_id
     ```

#### Backend API: Railway
1. **Deploy Node.js Server**
   ```bash
   # In server directory
   echo "web: node index.js" > Procfile
   ```

2. **Railway Deployment**
   - Go to [Railway](https://railway.app)
   - Connect GitHub repository
   - Select `server` directory
   - Add environment variables:
     ```
     OPENWEATHER_API_KEY=your_key
     FLASK_API_URL=https://your-flask-api.run.app
     PORT=3001
     ```

#### ML API: Google Cloud Run
1. **Create Dockerfile**
   ```dockerfile
   # In model directory
   FROM python:3.9-slim

   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt

   COPY . .
   EXPOSE 5000

   CMD ["python", "app.py"]
   ```

2. **Deploy to Cloud Run**
   ```bash
   # Build and deploy
   gcloud builds submit --tag gcr.io/PROJECT_ID/crop-predictor
   gcloud run deploy --image gcr.io/PROJECT_ID/crop-predictor --platform managed
   ```

### Option 2: Firebase Hosting (Alternative)

#### Deploy Everything to Firebase
1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize Firebase Hosting**
   ```bash
   firebase init hosting
   # Select your project
   # Set public directory: build
   # Configure as SPA: Yes
   ```

3. **Build and Deploy**
   ```bash
   cd client
   npm run build
   firebase deploy
   ```

## 🔧 Environment Configuration

### Production Environment Variables

#### Client (.env.production)
```bash
REACT_APP_API_URL=https://your-production-api.com
REACT_APP_FIREBASE_API_KEY=your_production_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-app-id
```

#### Server (.env)
```bash
NODE_ENV=production
PORT=3001
OPENWEATHER_API_KEY=your_production_key
FLASK_API_URL=https://your-flask-api.com
CORS_ORIGIN=https://your-frontend-domain.com
```

#### Flask (.env)
```bash
FLASK_ENV=production
PORT=5000
```

## 🐳 Docker Deployment

### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./client
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3001

  backend:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - OPENWEATHER_API_KEY=${OPENWEATHER_API_KEY}
      - FLASK_API_URL=http://ml-api:5000

  ml-api:
    build: ./model
    ports:
      - "5000:5000"
```

### Individual Dockerfiles

#### Client Dockerfile
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### Server Dockerfile
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

#### Model Dockerfile
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

## 🔐 Security Configuration

### Production Security Checklist

#### Firebase Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /predictions/{predictionId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    match /analytics/{document} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

#### CORS Configuration
```javascript
// server/index.js
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

#### Environment Security
- Use environment variables for all secrets
- Enable HTTPS in production
- Set up proper CORS policies
- Configure Firebase App Check
- Enable rate limiting

## 📊 Monitoring & Analytics

### Performance Monitoring
1. **Firebase Performance**
   ```javascript
   import { getPerformance } from 'firebase/performance';
   const perf = getPerformance(app);
   ```

2. **Error Tracking**
   ```javascript
   // Add error boundary and logging
   import * as Sentry from '@sentry/react';
   ```

### Analytics Setup
1. **Google Analytics**
2. **Firebase Analytics**
3. **Custom metrics tracking**

## 🚀 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: |
          cd client && npm install
          cd ../server && npm install
          
      - name: Build client
        run: cd client && npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🔍 Testing in Production

### Health Checks
```bash
# Test API endpoints
curl https://your-api.com/health
curl -X POST https://your-api.com/api/crop \
  -H "Content-Type: application/json" \
  -d '{"city":"Mumbai","moisture":45,"soilType":2}'
```

### Load Testing
```bash
# Use tools like Artillery or k6
npm install -g artillery
artillery quick --count 10 --num 5 https://your-api.com/api/crop
```

## 📈 Scaling Considerations

### Auto-scaling Setup
- Configure auto-scaling on Cloud Run
- Set up load balancers
- Implement caching strategies
- Database connection pooling

### Performance Optimization
- Enable CDN for static assets
- Implement service worker for PWA
- Optimize bundle sizes
- Use lazy loading for components

## 🆘 Troubleshooting

### Common Issues
1. **CORS errors**: Check origin configuration
2. **Firebase connection**: Verify API keys
3. **Model loading**: Check file paths and permissions
4. **Memory issues**: Optimize model size and caching

### Monitoring Commands
```bash
# Check logs
gcloud logging read "resource.type=cloud_run_revision"
heroku logs --tail -a your-app-name
vercel logs your-deployment-url
```

## 📞 Support

For deployment issues:
- Check the troubleshooting section
- Review platform-specific documentation
- Monitor application logs
- Set up alerting for critical errors

---

**🎉 Your AI-powered crop prediction system is now ready for production!**
