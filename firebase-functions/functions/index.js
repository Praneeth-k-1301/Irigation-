// Firebase Functions for Crop Prediction System with ML Integration
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// Firebase ML imports
const { getStorage } = require('firebase-admin/storage');
const tf = require('@tensorflow/tfjs-node');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const storage = getStorage();

// Global variables for ML model
let mlModel = null;
let modelMetadata = null;

// Firebase Function: ML-Powered Crop Prediction
exports.predictCropWithML = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('🤖 Firebase ML: Starting crop prediction...');

    const { city, moisture, soilType, userId } = req.body;

    if (!city || moisture === undefined || soilType === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: city, moisture, soilType'
      });
    }

    // Step 1: Get weather data
    const weatherData = await getWeatherData(city);
    if (!weatherData.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch weather data'
      });
    }

    // Step 2: Load ML model if not already loaded
    if (!mlModel) {
      const modelLoaded = await loadMLModel();
      if (!modelLoaded) {
        return res.status(500).json({
          success: false,
          error: 'Failed to load ML model'
        });
      }
    }

    // Step 3: Prepare input features
    const features = [
      weatherData.data.temperature,
      weatherData.data.humidity,
      parseFloat(moisture),
      parseInt(soilType),
      weatherData.data.rainfall || 0
    ];

    // Step 4: Make prediction using Firebase ML
    const prediction = await makePrediction(features);

    // Step 5: Generate additional recommendations
    const irrigation = calculateIrrigationNeed(prediction.crop, weatherData.data, moisture);
    const fertilizer = getFertilizerRecommendation(prediction.crop, soilType);
    const warnings = generateWarnings(weatherData.data, moisture, prediction.crop);

    // Step 6: Prepare comprehensive response
    const result = {
      predicted_crop: prediction.crop,
      confidence: prediction.confidence,
      irrigation: irrigation,
      fertilizer: fertilizer,
      warnings: warnings,
      weather_conditions: weatherData.data,
      soil_conditions: {
        moisture: parseFloat(moisture),
        type: ['Loamy', 'Sandy', 'Clay'][parseInt(soilType)] || 'Unknown'
      },
      prediction_summary: {
        total_warnings: warnings.length,
        critical_warnings: warnings.filter(w => w.type === 'critical').length,
        overall_suitability: warnings.filter(w => w.type === 'critical').length === 0 ? 'Good' : 'Caution Required'
      },
      ml_powered: true,
      processed_by: 'Firebase ML',
      timestamp: new Date().toISOString()
    };

    // Step 7: Save prediction to Firestore
    if (userId) {
      await savePredictionToFirestore(result, { city, moisture, soilType }, userId);
    }

    console.log(`✅ Firebase ML prediction completed: ${prediction.crop} (${prediction.confidence})`);

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Firebase ML prediction failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback_available: true
    });
  }
});

// Firebase Function: Enhanced Weather Processing
exports.processWeatherData = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('🌤️ Firebase Function: Processing weather data...');
    
    const cities = req.body?.cities || [
      'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore',
      'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
    ];

    const weatherPromises = cities.map(city => processWeatherForCity(city));
    const results = await Promise.all(weatherPromises);

    // Store results in Firestore
    await storeWeatherCache(results);

    res.status(200).json({
      success: true,
      message: 'Weather data processed by Firebase Functions',
      timestamp: new Date().toISOString(),
      citiesProcessed: cities.length,
      results: results.filter(r => r.success)
    });

  } catch (error) {
    console.error('❌ Firebase Function error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Firebase Function: Smart Crop Analytics
exports.generateCropAnalytics = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('📊 Firebase Function: Generating crop analytics...');
    
    // Get all predictions from Firestore
    const predictionsSnapshot = await db.collection('predictions').get();
    const predictions = predictionsSnapshot.docs.map(doc => doc.data());

    const analytics = {
      totalPredictions: predictions.length,
      cropDistribution: getCropDistribution(predictions),
      averageConfidence: getAverageConfidence(predictions),
      popularCities: getPopularCities(predictions),
      irrigationStats: getIrrigationStats(predictions),
      lastUpdated: new Date().toISOString()
    };

    // Store analytics in Firestore
    await db.collection('analytics').doc('latest').set(analytics);

    res.status(200).json({
      success: true,
      analytics: analytics,
      generatedBy: 'Firebase Functions'
    });

  } catch (error) {
    console.error('❌ Analytics generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Firebase Function: Smart Irrigation Scheduler
exports.scheduleIrrigation = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('💧 Firebase Function: Smart irrigation scheduling...');
    
    const { userId, cropType, location, soilMoisture } = req.body;
    
    if (!userId || !cropType || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, cropType, location'
      });
    }

    // Generate smart irrigation schedule
    const schedule = await generateIrrigationSchedule({
      userId,
      cropType,
      location,
      soilMoisture: soilMoisture || 50
    });

    // Store in Firestore
    await db.collection('irrigation_schedules').doc(userId).set({
      ...schedule,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    res.status(200).json({
      success: true,
      schedule: schedule,
      message: 'Irrigation schedule created by Firebase Functions'
    });

  } catch (error) {
    console.error('❌ Irrigation scheduling failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Firebase Function: Triggered by new predictions (Firestore trigger)
exports.onNewPrediction = functions.firestore
  .document('predictions/{predictionId}')
  .onCreate(async (snap, context) => {
    try {
      const prediction = snap.data();
      console.log('🔔 New prediction created:', prediction.prediction?.crop);

      // Update user statistics
      if (prediction.userId) {
        const userRef = db.collection('users').doc(prediction.userId);
        await userRef.update({
          totalPredictions: admin.firestore.FieldValue.increment(1),
          lastPrediction: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Update global statistics
      const statsRef = db.collection('system_stats').doc('global');
      await statsRef.set({
        totalPredictions: admin.firestore.FieldValue.increment(1),
        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('✅ Statistics updated successfully');

    } catch (error) {
      console.error('❌ Error updating statistics:', error);
    }
  });

// ML Helper Functions

async function loadMLModel() {
  try {
    console.log('📥 Loading ML model from Firebase Storage...');

    // Download model from Firebase Storage
    const bucket = storage.bucket();
    const modelFile = bucket.file('ml-models/crop_prediction_model.json');
    const metadataFile = bucket.file('ml-models/model_metadata.json');

    // Check if files exist
    const [modelExists] = await modelFile.exists();
    const [metadataExists] = await metadataFile.exists();

    if (!modelExists || !metadataExists) {
      console.log('⚠️ ML model files not found in Firebase Storage, using fallback');
      return false;
    }

    // Download and load model
    const [modelBuffer] = await modelFile.download();
    const [metadataBuffer] = await metadataFile.download();

    mlModel = await tf.loadLayersModel(tf.io.fromMemory(JSON.parse(modelBuffer.toString())));
    modelMetadata = JSON.parse(metadataBuffer.toString());

    console.log('✅ ML model loaded successfully');
    return true;

  } catch (error) {
    console.error('❌ Failed to load ML model:', error);
    return false;
  }
}

async function makePrediction(features) {
  try {
    if (!mlModel || !modelMetadata) {
      throw new Error('ML model not loaded');
    }

    // Normalize features using stored scaler parameters
    const normalizedFeatures = features.map((feature, index) => {
      const mean = modelMetadata.scaler_mean[index];
      const scale = modelMetadata.scaler_scale[index];
      return (feature - mean) / scale;
    });

    // Create tensor and make prediction
    const inputTensor = tf.tensor2d([normalizedFeatures]);
    const prediction = mlModel.predict(inputTensor);
    const probabilities = await prediction.data();

    // Find the class with highest probability
    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    const cropName = modelMetadata.classes[maxIndex];
    const confidence = probabilities[maxIndex];

    // Determine confidence level
    let confidenceLevel;
    if (confidence > 0.8) confidenceLevel = 'High';
    else if (confidence > 0.6) confidenceLevel = 'Medium';
    else confidenceLevel = 'Medium'; // No low confidence as per requirement

    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();

    console.log(`🎯 ML Prediction: ${cropName} (${confidence.toFixed(3)})`);

    return {
      crop: cropName,
      confidence: confidenceLevel,
      probability: confidence,
      all_probabilities: Object.fromEntries(
        modelMetadata.classes.map((crop, i) => [crop, probabilities[i]])
      )
    };

  } catch (error) {
    console.error('❌ ML prediction failed:', error);
    // Fallback prediction
    return {
      crop: 'Wheat',
      confidence: 'Medium',
      probability: 0.7,
      fallback: true
    };
  }
}

async function getWeatherData(city) {
  try {
    const apiKey = functions.config().openweather?.key || process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`,
      { timeout: 10000 }
    );

    return {
      success: true,
      data: {
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        rainfall: 0, // Current rainfall (you can enhance this)
        description: response.data.weather[0].description,
        city: city
      }
    };

  } catch (error) {
    console.error(`❌ Weather data fetch failed for ${city}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

function calculateIrrigationNeed(cropName, weatherData, soilMoisture) {
  const cropWaterNeeds = {
    'Wheat': 4.5,
    'Paddy': 8.0,
    'Cotton': 6.0,
    'Pulses': 3.5
  };

  const dailyNeed = cropWaterNeeds[cropName] || 5.0;
  const deficit = Math.max(0, dailyNeed - (weatherData.rainfall || 0));
  const irrigationNeeded = soilMoisture < 40 || deficit > 2;

  return {
    irrigation_needed: irrigationNeeded,
    water_amount: irrigationNeeded ? 'Light (2-5mm)' : 'No irrigation needed',
    daily_water_need: dailyNeed,
    rainfall_deficit: deficit,
    recommendation: irrigationNeeded ?
      `Light irrigation recommended. Rainfall deficit: ${deficit.toFixed(1)}mm for ${cropName}.` :
      `No irrigation needed. Soil moisture and rainfall are adequate for ${cropName}.`,
    confidence: 'High'
  };
}

function getFertilizerRecommendation(cropName, soilType) {
  const fertilizers = {
    'Wheat': {
      primary: 'NPK (12-32-16)',
      secondary: 'Urea, DAP',
      organic: 'FYM, Vermicompost',
      timing: 'Apply 50% at sowing, 25% at crown root initiation, 25% at jointing'
    },
    'Paddy': {
      primary: 'NPK (20-10-10)',
      secondary: 'Urea, SSP',
      organic: 'Green manure, Compost',
      timing: 'Apply 50% at transplanting, 25% at tillering, 25% at panicle initiation'
    },
    'Cotton': {
      primary: 'NPK (17-17-17)',
      secondary: 'Urea, MOP',
      organic: 'FYM, Neem cake',
      timing: 'Apply 50% at planting, 25% at flowering, 25% at boll formation'
    },
    'Pulses': {
      primary: 'NPK (10-26-26)',
      secondary: 'DAP, MOP',
      organic: 'Rhizobium culture, Compost',
      timing: 'Apply full dose at planting (pulses fix their own nitrogen)'
    }
  };

  const fertilizer = fertilizers[cropName] || fertilizers['Wheat'];
  const soilTypes = ['Loamy', 'Sandy', 'Clay'];
  const soilName = soilTypes[soilType] || 'Unknown';

  return {
    primary_fertilizer: fertilizer.primary,
    secondary_fertilizers: fertilizer.secondary,
    organic_fertilizers: fertilizer.organic,
    application_timing: fertilizer.timing,
    recommendation: `For ${cropName} in ${soilName} soil: Apply ${fertilizer.primary} as base fertilizer`
  };
}

function generateWarnings(weatherData, soilMoisture, cropName) {
  const warnings = [];

  // Temperature warnings
  if (weatherData.temperature > 35) {
    warnings.push({
      type: 'warning',
      category: 'temperature',
      message: `High temperature (${weatherData.temperature}°C) may affect crop growth`,
      recommendation: 'Ensure adequate water supply and consider heat-resistant varieties'
    });
  }

  // Moisture warnings
  if (soilMoisture < 25) {
    warnings.push({
      type: 'critical',
      category: 'moisture',
      message: `Very low soil moisture (${soilMoisture}%) - crops may wilt`,
      recommendation: 'Immediate irrigation required. Consider drip irrigation for efficiency'
    });
  }

  return warnings;
}

async function savePredictionToFirestore(result, inputData, userId) {
  try {
    const prediction = {
      userId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      input: inputData,
      prediction: {
        crop: result.predicted_crop,
        confidence: result.confidence
      },
      weather: result.weather_conditions,
      soil: result.soil_conditions,
      irrigation: result.irrigation,
      fertilizer: result.fertilizer,
      warnings: result.warnings,
      summary: result.prediction_summary,
      ml_powered: true,
      processed_by: 'Firebase ML'
    };

    await db.collection('predictions').add(prediction);
    console.log('✅ Prediction saved to Firestore');

  } catch (error) {
    console.error('❌ Failed to save prediction:', error);
  }
}

// Helper Functions

async function processWeatherForCity(city) {
  try {
    const apiKey = functions.config().openweather?.key || process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`,
      { timeout: 10000 }
    );

    const weatherData = {
      city: city,
      temperature: response.data.main.temp,
      humidity: response.data.main.humidity,
      pressure: response.data.main.pressure,
      windSpeed: response.data.wind?.speed || 0,
      description: response.data.weather[0].description,
      timestamp: new Date().toISOString(),
      // Enhanced processing
      heatIndex: calculateHeatIndex(response.data.main.temp, response.data.main.humidity),
      cropSuitability: assessCropSuitability(response.data)
    };

    console.log(`✅ Processed weather for ${city}: ${weatherData.temperature}°C`);
    return { success: true, city, data: weatherData };

  } catch (error) {
    console.error(`❌ Failed to process weather for ${city}:`, error.message);
    return { success: false, city, error: error.message };
  }
}

async function storeWeatherCache(results) {
  const batch = db.batch();
  
  results.forEach(result => {
    if (result.success) {
      const docRef = db.collection('weather_cache').doc(result.city);
      batch.set(docRef, {
        ...result.data,
        cachedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      });
    }
  });

  await batch.commit();
  console.log('✅ Weather cache updated in Firestore');
}

function getCropDistribution(predictions) {
  const distribution = {};
  predictions.forEach(p => {
    const crop = p.prediction?.crop || 'unknown';
    distribution[crop] = (distribution[crop] || 0) + 1;
  });
  return distribution;
}

function getAverageConfidence(predictions) {
  const confidences = predictions.map(p => {
    const conf = p.prediction?.confidence;
    if (conf === 'High') return 0.9;
    if (conf === 'Medium') return 0.7;
    return 0.6;
  });
  return confidences.length > 0 ? 
    (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2) : 0;
}

function getPopularCities(predictions) {
  const cities = {};
  predictions.forEach(p => {
    const city = p.input?.city || 'unknown';
    cities[city] = (cities[city] || 0) + 1;
  });
  return Object.entries(cities)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .reduce((obj, [city, count]) => ({ ...obj, [city]: count }), {});
}

function getIrrigationStats(predictions) {
  const needed = predictions.filter(p => p.irrigation?.irrigation_needed).length;
  return {
    irrigationNeeded: needed,
    irrigationNotNeeded: predictions.length - needed,
    percentage: predictions.length > 0 ? ((needed / predictions.length) * 100).toFixed(1) : 0
  };
}

async function generateIrrigationSchedule({ userId, cropType, location, soilMoisture }) {
  const schedule = {
    userId,
    cropType,
    location,
    currentSoilMoisture: soilMoisture,
    recommendations: [],
    weeklySchedule: []
  };

  // Generate 7-day schedule
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    const daySchedule = {
      date: date.toISOString().split('T')[0],
      irrigationNeeded: soilMoisture < 40,
      amount: getWaterAmount(cropType),
      timing: 'Early morning (6-8 AM)',
      notes: `Day ${i + 1}: Monitor soil moisture levels`
    };
    
    schedule.weeklySchedule.push(daySchedule);
  }

  return schedule;
}

function calculateHeatIndex(temp, humidity) {
  return Math.round(temp + (humidity / 100) * 5);
}

function assessCropSuitability(weatherData) {
  const temp = weatherData.main.temp;
  const humidity = weatherData.main.humidity;
  
  return {
    wheat: temp >= 15 && temp <= 25 ? 'excellent' : 'moderate',
    rice: humidity > 70 ? 'excellent' : 'poor',
    cotton: temp > 25 ? 'excellent' : 'moderate',
    pulses: temp >= 20 && temp <= 30 ? 'excellent' : 'moderate'
  };
}

function getWaterAmount(cropType) {
  const amounts = { 
    'Wheat': '5mm', 
    'Paddy': '10mm', 
    'Cotton': '7mm', 
    'Pulses': '4mm' 
  };
  return amounts[cropType] || '5mm';
}
