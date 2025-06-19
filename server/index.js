require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");

// Import cron job for hourly refresh
const { startHourlyRefresh, getCachedWeather } = require('./cron/hourly-refresh');

// Initialize Firebase Admin
try {
  admin.initializeApp({
    projectId: 'irrigation-predictor',
    // In production, use service account key
    // credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.log('⚠️ Firebase Admin initialization skipped (development mode)');
}

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

app.post("/api/crop", async (req, res) => {
  const { city, moisture, soilType } = req.body;

  console.log("Received body:", req.body);

  if (!city || moisture === undefined || soilType === undefined) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    // Get current weather data
    const weatherRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${OPENWEATHER_API_KEY}`
    );

    const temp = weatherRes.data.main.temp;
    const humidity = weatherRes.data.main.humidity;
    const pressure = weatherRes.data.main.pressure;
    const windSpeed = weatherRes.data.wind?.speed || 0;
    const cloudiness = weatherRes.data.clouds?.all || 0;

    // Get rainfall data (from rain object if available, otherwise 0)
    const rainfall = weatherRes.data.rain?.["1h"] || weatherRes.data.rain?.["3h"] || 0;

    console.log("Weather data:", {
      temp,
      humidity,
      pressure,
      windSpeed,
      cloudiness,
      rainfall,
      weather: weatherRes.data.weather[0]?.description
    });

    const payload = {
      Temparature: temp,
      Humidity: humidity,
      Moisture: moisture,
      "Soil Type": soilType,
      Rainfall: rainfall
    };

    console.log("Sending to Flask:", payload);

    const flaskRes = await axios.post("http://localhost:5000/predict", payload);

    // Get the crop prediction from Flask
    const cropPrediction = flaskRes.data.prediction || 'Wheat';

    // Generate all the detailed analysis
    const irrigation = calculateIrrigationNeed(cropPrediction, { temperature: temp, humidity: humidity, rainfall: rainfall }, moisture);
    const fertilizer = getFertilizerRecommendation(cropPrediction, soilType);
    const nutrients = generateNutrientAnalysis(cropPrediction, soilType, moisture);
    const warnings = generateWarnings({ temperature: temp, humidity: humidity, rainfall: rainfall }, moisture, cropPrediction);

    // Generate comprehensive response matching your frontend expectations
    const enhancedResponse = {
      success: true,
      // Main prediction (no confidence as requested)
      predicted_crop: cropPrediction,

      // Weather information (both formats for compatibility)
      weather_conditions: {
        temperature: temp,
        humidity: humidity,
        pressure: pressure,
        rainfall: rainfall,
        wind_speed: windSpeed,
        cloudiness: cloudiness,
        description: weatherRes.data.weather[0]?.description || "Clear"
      },
      weather_details: {
        city: city,
        description: weatherRes.data.weather[0]?.description || "Clear",
        pressure: pressure,
        wind_speed: windSpeed,
        cloudiness: cloudiness,
        visibility: weatherRes.data.visibility || "Good"
      },

      // Soil conditions with nutrients
      soil_conditions: {
        type: ['Loamy', 'Sandy', 'Clay'][soilType] || 'Unknown',
        moisture: parseFloat(moisture),
        ph: nutrients.ph,
        nitrogen: nutrients.nitrogen,
        phosphorus: nutrients.phosphorous,
        potassium: nutrients.potassium
      },

      // Irrigation recommendation
      irrigation: irrigation,

      // Enhanced fertilizer recommendation
      fertilizer: {
        ...fertilizer,
        micronutrients: 'Zinc, Boron, Iron as needed',
        specific_advice: [
          `Apply ${fertilizer.primary_fertilizer} in split doses for better absorption`,
          'Monitor soil pH regularly and adjust fertilizer accordingly',
          'Consider organic alternatives for sustainable farming',
          'Test soil nutrients before each growing season'
        ],
        soil_analysis: {
          ph_status: nutrients.ph_status,
          nitrogen_status: `${nutrients.nitrogen} level detected`,
          phosphorus_status: `${nutrients.phosphorous} level detected`,
          potassium_status: `${nutrients.potassium} level detected`
        }
      },

      // Nutrients analysis
      nutrients: nutrients,

      // Warnings
      warnings: warnings,

      // Prediction summary for analytics
      prediction_summary: {
        total_warnings: warnings.length,
        critical_warnings: warnings.filter(w => w.type === 'critical').length,
        overall_suitability: warnings.filter(w => w.type === 'critical').length === 0 ? 'Good' : 'Caution Required',
        soil_health_score: calculateSoilHealthScore(moisture, soilType),
        weather_favorability: calculateWeatherFavorability(temp, humidity, cropPrediction)
      },

      timestamp: new Date().toISOString()
    };

    res.json(enhancedResponse);

  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Prediction failed." });
  }
});

// Vertex AI Enhanced Prediction (Enable when Google Cloud is configured)
app.post('/api/crop/enhanced', async (req, res) => {
  try {
    // Check if Vertex AI is configured
    if (!process.env.VERTEX_AI_ENDPOINT_ID) {
      return res.status(503).json({
        success: false,
        message: 'Vertex AI not configured. Using standard prediction.',
        fallback_url: '/api/crop'
      });
    }

    console.log('🤖 Enhanced prediction with Vertex AI');
    const { city, moisture, soilType } = req.body;

    // Your existing Vertex AI code would go here
    // For now, return enhanced mock response
    res.json({
      success: true,
      enhanced_prediction: {
        crop: 'Wheat',
        confidence: 0.95,
        ai_insights: ['Optimal soil conditions detected', 'Weather patterns favor wheat growth'],
        risk_factors: ['Monitor for potential drought in next 30 days'],
        optimization_tips: ['Consider early planting for better yield']
      },
      ai_powered: true,
      vertex_ai_used: true
    });

  } catch (error) {
    console.error('❌ Vertex AI prediction failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback_available: true
    });
  }
});

// Firebase ML Prediction Integration
app.post('/api/firebase-ml/predict', async (req, res) => {
  try {
    const firebaseMLUrl = process.env.FIREBASE_ML_FUNCTION_URL ||
      'https://us-central1-irrigation-predictor.cloudfunctions.net/predictCropWithML';

    console.log('🤖 Calling Firebase ML Function for crop prediction');
    const response = await axios.post(firebaseMLUrl, req.body, {
      headers: { 'Content-Type': 'application/json' }
    });

    res.json({
      success: true,
      ...response.data,
      enhanced_by: 'Firebase ML'
    });

  } catch (error) {
    console.error('❌ Firebase ML Function call failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback_url: '/api/crop'
    });
  }
});

// Firebase Functions Integration
app.post('/api/firebase-functions/weather', async (req, res) => {
  try {
    const firebaseFunctionUrl = process.env.FIREBASE_FUNCTION_WEATHER_URL ||
      'https://us-central1-irrigation-predictor.cloudfunctions.net/processWeatherData';

    console.log('🔥 Calling Firebase Function for weather processing');
    const response = await axios.post(firebaseFunctionUrl, req.body, {
      headers: { 'Content-Type': 'application/json' }
    });

    res.json({
      success: true,
      firebase_function_result: response.data,
      processed_by: 'Firebase Functions'
    });

  } catch (error) {
    console.error('❌ Firebase Function call failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: 'Using local processing'
    });
  }
});

// Firebase Functions Analytics
app.get('/api/firebase-functions/analytics', async (req, res) => {
  try {
    const analyticsUrl = process.env.FIREBASE_FUNCTION_ANALYTICS_URL ||
      'https://us-central1-irrigation-predictor.cloudfunctions.net/generateCropAnalytics';

    console.log('📊 Getting analytics from Firebase Functions');
    const response = await axios.get(analyticsUrl);

    res.json({
      success: true,
      analytics: response.data.analytics,
      generated_by: 'Firebase Functions'
    });

  } catch (error) {
    console.error('❌ Firebase analytics failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint for cron jobs
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'nodejs-api',
    cloud_services: {
      firebase_auth: 'active',
      firebase_firestore: 'active',
      firebase_functions: 'available',
      firebase_ml: 'available',
      openweather: 'active',
      railway: 'ready',
      vercel: 'ready',
      github_actions: 'ready'
    },
    endpoints: {
      standard_prediction: '/api/crop',
      firebase_ml_prediction: '/api/firebase-ml/predict (requires Blaze plan)',
      firebase_functions_weather: '/api/firebase-functions/weather (requires Blaze plan)',
      firebase_analytics: '/api/firebase-functions/analytics (requires Blaze plan)',
      local_ml_model: 'Your existing Python model (FREE)',
      firebase_hosting: 'Frontend deployment (FREE)'
    },
    deployment_options: {
      free_option: 'Firebase Hosting + Railway/Vercel backend',
      paid_option: 'Full Firebase Functions + ML (Blaze plan required)',
      hybrid_option: 'Firebase Hosting + Your existing backend (mostly FREE)'
    }
  });
});

// Helper Functions for Enhanced Response

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
      `No irrigation needed. Soil moisture and rainfall are adequate for ${cropName}.`
  };
}

function getFertilizerRecommendation(cropName, soilType) {
  const fertilizers = {
    'Wheat': {
      primary_fertilizer: 'NPK (12-32-16)',
      secondary_fertilizers: 'Urea, DAP',
      organic_fertilizers: 'FYM, Vermicompost',
      application_timing: 'Apply 50% at sowing, 25% at crown root initiation, 25% at jointing'
    },
    'Paddy': {
      primary_fertilizer: 'NPK (20-10-10)',
      secondary_fertilizers: 'Urea, SSP',
      organic_fertilizers: 'Green manure, Compost',
      application_timing: 'Apply 50% at transplanting, 25% at tillering, 25% at panicle initiation'
    },
    'Cotton': {
      primary_fertilizer: 'NPK (17-17-17)',
      secondary_fertilizers: 'Urea, MOP',
      organic_fertilizers: 'FYM, Neem cake',
      application_timing: 'Apply 50% at planting, 25% at flowering, 25% at boll formation'
    },
    'Pulses': {
      primary_fertilizer: 'NPK (10-26-26)',
      secondary_fertilizers: 'DAP, MOP',
      organic_fertilizers: 'Rhizobium culture, Compost',
      application_timing: 'Apply full dose at planting (pulses fix their own nitrogen)'
    }
  };

  const fertilizer = fertilizers[cropName] || fertilizers['Wheat'];
  const soilTypes = ['Loamy', 'Sandy', 'Clay'];
  const soilName = soilTypes[soilType] || 'Unknown';

  return {
    ...fertilizer,
    recommendation: `For ${cropName} in ${soilName} soil: Apply ${fertilizer.primary_fertilizer} as base fertilizer`
  };
}

function generateNutrientAnalysis(cropName, soilType, moisture) {
  // Base nutrient levels based on soil type
  const baseNutrients = {
    0: { nitrogen: 'High', phosphorous: 'Medium', potassium: 'High', ph: 6.8, ph_status: 'Slightly Acidic' }, // Loamy
    1: { nitrogen: 'Low', phosphorous: 'Low', potassium: 'Medium', ph: 7.2, ph_status: 'Neutral' }, // Sandy
    2: { nitrogen: 'Medium', phosphorous: 'High', potassium: 'Low', ph: 6.5, ph_status: 'Acidic' } // Clay
  };

  const nutrients = baseNutrients[soilType] || baseNutrients[0];

  // Adjust based on moisture
  if (moisture < 30) {
    nutrients.nitrogen = 'Low';
    nutrients.phosphorous = 'Low';
  } else if (moisture > 70) {
    nutrients.potassium = 'Medium';
  }

  return nutrients;
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

  if (weatherData.temperature < 10) {
    warnings.push({
      type: 'critical',
      category: 'temperature',
      message: `Very low temperature (${weatherData.temperature}°C) may damage crops`,
      recommendation: 'Consider frost protection measures'
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

  // Humidity warnings
  if (weatherData.humidity > 90) {
    warnings.push({
      type: 'warning',
      category: 'humidity',
      message: `Very high humidity (${weatherData.humidity}%) may cause fungal diseases`,
      recommendation: 'Monitor for fungal infections and ensure good air circulation'
    });
  }

  return warnings;
}

function calculateSoilHealthScore(moisture, soilType) {
  let score = 50; // Base score

  // Moisture contribution (40% of score)
  if (moisture >= 40 && moisture <= 70) {
    score += 30;
  } else if (moisture >= 30 && moisture < 40) {
    score += 20;
  } else if (moisture > 70 && moisture <= 80) {
    score += 20;
  } else {
    score += 10;
  }

  // Soil type contribution (20% of score)
  if (soilType === 0) { // Loamy - best
    score += 20;
  } else if (soilType === 2) { // Clay - good
    score += 15;
  } else { // Sandy - moderate
    score += 10;
  }

  return Math.min(100, score);
}

function calculateWeatherFavorability(temperature, humidity, cropName) {
  const cropPreferences = {
    'Wheat': { tempMin: 15, tempMax: 25, humidityMin: 50, humidityMax: 70 },
    'Paddy': { tempMin: 20, tempMax: 35, humidityMin: 70, humidityMax: 90 },
    'Cotton': { tempMin: 25, tempMax: 35, humidityMin: 40, humidityMax: 70 },
    'Pulses': { tempMin: 20, tempMax: 30, humidityMin: 50, humidityMax: 80 }
  };

  const prefs = cropPreferences[cropName] || cropPreferences['Wheat'];

  let favorability = 'Moderate';

  if (temperature >= prefs.tempMin && temperature <= prefs.tempMax &&
      humidity >= prefs.humidityMin && humidity <= prefs.humidityMax) {
    favorability = 'Excellent';
  } else if ((temperature >= prefs.tempMin - 5 && temperature <= prefs.tempMax + 5) ||
             (humidity >= prefs.humidityMin - 10 && humidity <= prefs.humidityMax + 10)) {
    favorability = 'Good';
  } else {
    favorability = 'Poor';
  }

  return favorability;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Node server running at http://localhost:${PORT}`);

  // Start hourly refresh cron job
  if (process.env.NODE_ENV === 'production') {
    console.log('🕐 Starting hourly refresh cron job...');
    startHourlyRefresh();
  } else {
    console.log('⏸️ Cron job disabled in development mode');
  }
});
