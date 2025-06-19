# Firebase Setup Guide for Irrigation Predictor

## 🔥 Firebase Configuration

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `irrigation-predictor`
4. Enable Google Analytics (optional)
5. Create project

### Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable **Anonymous** authentication
5. Save changes

### Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a location close to your users
5. Click **Done**

### Step 4: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to **Your apps**
3. Click **Web app** icon (`</>`)
4. Register app with name: `irrigation-predictor-web`
5. Copy the configuration object

### Step 5: Update Configuration File

Replace the configuration in `client/src/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

### Step 6: Set Firestore Security Rules (Development)

In Firestore Database > Rules, use these rules for development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 7: Production Security Rules

For production, use more restrictive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /predictions/{predictionId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Analytics data is read-only for authenticated users
    match /analytics/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can write analytics
    }
    
    // Feedback can be written by authenticated users
    match /feedback/{feedbackId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📊 Database Collections Structure

### Predictions Collection
```
predictions/
├── {predictionId}/
    ├── predicted_crop: string
    ├── irrigation: object
    ├── weather_conditions: object
    ├── soil_conditions: object
    ├── confidence: string
    ├── userId: string
    ├── timestamp: timestamp
    ├── input_data: object
    ├── user_location: string
    ├── soil_moisture_input: number
    ├── soil_type_input: number
    ├── accuracy: boolean (optional)
    └── userFeedback: string (optional)
```

### Users Collection
```
users/
├── {userId}/
    ├── createdAt: timestamp
    ├── lastLogin: timestamp
    ├── totalPredictions: number
    ├── preferences: object
    └── profile: object
```

### Feedback Collection
```
feedback/
├── {feedbackId}/
    ├── predictionId: string
    ├── feedback: object
    ├── timestamp: timestamp
    └── userId: string
```

## 🚀 Testing the Setup

1. Start your React app: `npm start`
2. Open browser console to check for Firebase connection
3. Make a prediction to test data saving
4. Check Firestore console to see saved data
5. Switch to Analytics tab to view dashboard

## 🔧 Troubleshooting

### Common Issues:

1. **Firebase not initialized**: Check if config is correct
2. **Permission denied**: Verify Firestore rules
3. **Authentication failed**: Ensure Anonymous auth is enabled
4. **Network errors**: Check internet connection and Firebase status

### Debug Steps:

1. Open browser console for error messages
2. Check Firebase Console for project status
3. Verify all Firebase services are enabled
4. Test with simple read/write operations

## 📈 Analytics Features

The system automatically tracks:
- Total predictions made
- Crop distribution
- City usage patterns
- Soil type preferences
- Monthly trends
- Irrigation recommendations
- User feedback and accuracy

## 🔐 Security Best Practices

1. Use environment variables for sensitive config
2. Implement proper Firestore rules
3. Enable App Check for production
4. Monitor usage in Firebase Console
5. Set up billing alerts
6. Regular security reviews

## 📱 Next Steps

1. Set up Firebase Hosting for deployment
2. Configure custom domain
3. Enable Firebase Analytics
4. Set up Cloud Functions for advanced features
5. Implement push notifications
6. Add offline support with Firebase SDK
