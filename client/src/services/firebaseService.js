import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

// Collection names
const COLLECTIONS = {
  PREDICTIONS: 'predictions',
  USERS: 'users',
  ANALYTICS: 'analytics',
  FEEDBACK: 'feedback'
};

// Save prediction to Firebase with complete data structure
export const savePrediction = async (predictionData, inputData, userId) => {
  try {
    const prediction = {
      // User information
      userId: userId,
      timestamp: serverTimestamp(),

      // Input data
      input: {
        city: inputData.city,
        soilMoisture: inputData.moisture,
        soilType: inputData.soilType,
        soilTypeName: ["Loamy", "Sandy", "Clay"][inputData.soilType] || "Unknown"
      },

      // Prediction results
      prediction: {
        crop: predictionData.predicted_crop,
        confidence: predictionData.confidence
      },

      // Weather data
      weather: predictionData.weather_conditions,
      weatherDetails: predictionData.weather_details,

      // Soil analysis
      soil: predictionData.soil_conditions,

      // Irrigation recommendations
      irrigation: predictionData.irrigation,

      // Fertilizer recommendations
      fertilizer: predictionData.fertilizer,

      // Environmental warnings
      warnings: predictionData.warnings || [],

      // Summary
      summary: predictionData.prediction_summary || {},

      // Metadata
      sessionId: generateSessionId(),
      accuracy: null, // Will be updated when user provides feedback
      userFeedback: null,
      isArchived: false
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.PREDICTIONS), prediction);
    console.log('Prediction saved with ID: ', docRef.id);

    // Update user's total predictions count
    await updateUserStats(userId);

    return docRef.id;
  } catch (error) {
    console.error('Error saving prediction: ', error);
    throw error;
  }
};

// Get user's prediction history
export const getUserPredictions = async (userId, limitCount = 10) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PREDICTIONS),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const predictions = [];
    
    querySnapshot.forEach((doc) => {
      predictions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return predictions;
  } catch (error) {
    console.error('Error getting user predictions: ', error);
    throw error;
  }
};

// Get all predictions for analytics
export const getAllPredictions = async (limitCount = 100) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PREDICTIONS),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const predictions = [];
    
    querySnapshot.forEach((doc) => {
      predictions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return predictions;
  } catch (error) {
    console.error('Error getting all predictions: ', error);
    throw error;
  }
};

// Save user feedback on prediction accuracy
export const saveFeedback = async (predictionId, feedback) => {
  try {
    const feedbackData = {
      predictionId,
      feedback,
      timestamp: serverTimestamp()
    };

    // Save feedback
    await addDoc(collection(db, COLLECTIONS.FEEDBACK), feedbackData);
    
    // Update prediction with accuracy
    const predictionRef = doc(db, COLLECTIONS.PREDICTIONS, predictionId);
    await updateDoc(predictionRef, {
      accuracy: feedback.accurate,
      userFeedback: feedback.comments
    });

    console.log('Feedback saved successfully');
  } catch (error) {
    console.error('Error saving feedback: ', error);
    throw error;
  }
};

// Get analytics data
export const getAnalytics = async () => {
  try {
    const predictions = await getAllPredictions(500);
    
    // Calculate analytics
    const analytics = {
      totalPredictions: predictions.length,
      cropDistribution: {},
      irrigationRecommendations: {
        needed: 0,
        notNeeded: 0
      },
      averageAccuracy: 0,
      cityDistribution: {},
      soilTypeDistribution: {},
      monthlyTrends: {}
    };

    let accuracySum = 0;
    let accuracyCount = 0;

    predictions.forEach(prediction => {
      // Crop distribution
      const crop = prediction.predicted_crop;
      analytics.cropDistribution[crop] = (analytics.cropDistribution[crop] || 0) + 1;

      // Irrigation recommendations
      if (prediction.irrigation?.irrigation_needed) {
        analytics.irrigationRecommendations.needed++;
      } else {
        analytics.irrigationRecommendations.notNeeded++;
      }

      // City distribution
      const city = prediction.weather_details?.city;
      if (city) {
        analytics.cityDistribution[city] = (analytics.cityDistribution[city] || 0) + 1;
      }

      // Soil type distribution
      const soilType = prediction.soil_conditions?.type;
      if (soilType) {
        analytics.soilTypeDistribution[soilType] = (analytics.soilTypeDistribution[soilType] || 0) + 1;
      }

      // Accuracy calculation
      if (prediction.accuracy !== null && prediction.accuracy !== undefined) {
        accuracySum += prediction.accuracy ? 1 : 0;
        accuracyCount++;
      }

      // Monthly trends
      if (prediction.timestamp) {
        const date = prediction.timestamp.toDate();
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        analytics.monthlyTrends[monthKey] = (analytics.monthlyTrends[monthKey] || 0) + 1;
      }
    });

    analytics.averageAccuracy = accuracyCount > 0 ? (accuracySum / accuracyCount) * 100 : 0;

    return analytics;
  } catch (error) {
    console.error('Error getting analytics: ', error);
    throw error;
  }
};

// Update user statistics
const updateUserStats = async (userId) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const currentData = userSnap.data();
      await updateDoc(userRef, {
        totalPredictions: (currentData.totalPredictions || 0) + 1,
        lastPrediction: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
};

// Generate unique session ID
const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Save user profile
export const saveUserProfile = async (userId, profileData) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...profileData,
      lastUpdated: serverTimestamp()
    });
    console.log('User profile updated');
  } catch (error) {
    console.error('Error saving user profile: ', error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile: ', error);
    throw error;
  }
};
