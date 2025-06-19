// Cloud Run Function - Weather Data Processor
const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');
const axios = require('axios');

// Initialize Firestore
const firestore = new Firestore();

/**
 * Cloud Run Function: Process and cache weather data
 * Triggered by HTTP requests or Cloud Scheduler
 */
functions.http('processWeatherData', async (req, res) => {
  console.log('🌤️ Cloud Run Function: Processing weather data...');
  
  try {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const cities = req.body?.cities || [
      'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore',
      'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
    ];

    const results = await Promise.all(
      cities.map(city => processWeatherForCity(city))
    );

    // Store aggregated weather insights
    await storeWeatherInsights(results);

    res.status(200).json({
      success: true,
      message: 'Weather data processed successfully',
      timestamp: new Date().toISOString(),
      citiesProcessed: cities.length,
      results: results
    });

  } catch (error) {
    console.error('❌ Weather processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Cloud Run Function: Advanced crop analytics
 */
functions.http('cropAnalytics', async (req, res) => {
  console.log('📊 Cloud Run Function: Generating crop analytics...');
  
  try {
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Get analytics data from Firestore
    const analytics = await generateCropAnalytics();
    
    // Store analytics in cache
    await firestore.collection('analytics').doc('latest').set({
      ...analytics,
      generatedAt: new Date(),
      ttl: new Date(Date.now() + 60 * 60 * 1000) // 1 hour TTL
    });

    res.status(200).json({
      success: true,
      analytics: analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Analytics generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Cloud Run Function: Smart irrigation scheduler
 */
functions.http('irrigationScheduler', async (req, res) => {
  console.log('💧 Cloud Run Function: Smart irrigation scheduling...');
  
  try {
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const { userId, cropType, location, soilMoisture } = req.body;
    
    // Generate smart irrigation schedule
    const schedule = await generateIrrigationSchedule({
      userId,
      cropType,
      location,
      soilMoisture
    });

    // Store schedule in Firestore
    await firestore.collection('irrigation_schedules').doc(userId).set({
      ...schedule,
      createdAt: new Date(),
      nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    res.status(200).json({
      success: true,
      schedule: schedule,
      message: 'Irrigation schedule generated successfully'
    });

  } catch (error) {
    console.error('❌ Irrigation scheduling failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper Functions

async function processWeatherForCity(city) {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );

    const weatherData = {
      city: city,
      temperature: response.data.main.temp,
      humidity: response.data.main.humidity,
      pressure: response.data.main.pressure,
      windSpeed: response.data.wind.speed,
      cloudiness: response.data.clouds.all,
      description: response.data.weather[0].description,
      timestamp: new Date(),
      // Enhanced data processing
      heatIndex: calculateHeatIndex(response.data.main.temp, response.data.main.humidity),
      cropSuitability: assessCropSuitability(response.data),
      irrigationNeed: calculateIrrigationNeed(response.data)
    };

    // Store in Firestore cache
    await firestore.collection('weather_cache').doc(city).set(weatherData);
    
    console.log(`✅ Processed weather for ${city}: ${weatherData.temperature}°C`);
    return weatherData;

  } catch (error) {
    console.error(`❌ Failed to process weather for ${city}:`, error);
    return { city, error: error.message };
  }
}

async function generateCropAnalytics() {
  // Get all predictions from Firestore
  const predictionsSnapshot = await firestore.collection('predictions').get();
  const predictions = predictionsSnapshot.docs.map(doc => doc.data());

  // Generate analytics
  const analytics = {
    totalPredictions: predictions.length,
    cropDistribution: getCropDistribution(predictions),
    averageConfidence: getAverageConfidence(predictions),
    popularCities: getPopularCities(predictions),
    seasonalTrends: getSeasonalTrends(predictions),
    irrigationStats: getIrrigationStats(predictions),
    soilHealthTrends: getSoilHealthTrends(predictions)
  };

  return analytics;
}

async function generateIrrigationSchedule({ userId, cropType, location, soilMoisture }) {
  // Get weather forecast
  const weatherData = await getWeatherForecast(location);
  
  // Calculate irrigation needs
  const schedule = {
    userId: userId,
    cropType: cropType,
    location: location,
    currentSoilMoisture: soilMoisture,
    recommendations: [],
    nextIrrigation: null,
    weeklySchedule: []
  };

  // Generate 7-day schedule
  for (let i = 0; i < 7; i++) {
    const day = new Date();
    day.setDate(day.getDate() + i);
    
    const daySchedule = {
      date: day.toISOString().split('T')[0],
      irrigationNeeded: calculateDailyIrrigation(weatherData, soilMoisture, i),
      amount: calculateWaterAmount(cropType, weatherData, i),
      timing: getOptimalTiming(cropType),
      notes: generateDayNotes(weatherData, i)
    };
    
    schedule.weeklySchedule.push(daySchedule);
  }

  return schedule;
}

// Utility functions
function calculateHeatIndex(temp, humidity) {
  // Simplified heat index calculation
  return temp + (humidity / 100) * 5;
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

function calculateIrrigationNeed(weatherData) {
  const temp = weatherData.main.temp;
  const humidity = weatherData.main.humidity;
  
  if (temp > 30 && humidity < 50) return 'high';
  if (temp > 25 && humidity < 60) return 'medium';
  return 'low';
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
    if (conf === 'Low') return 0.5;
    return 0.6;
  });
  return confidences.reduce((a, b) => a + b, 0) / confidences.length;
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

function getSeasonalTrends(predictions) {
  // Implement seasonal analysis
  return { spring: 25, summer: 35, autumn: 20, winter: 20 };
}

function getIrrigationStats(predictions) {
  const needed = predictions.filter(p => p.irrigation?.irrigation_needed).length;
  return {
    irrigationNeeded: needed,
    irrigationNotNeeded: predictions.length - needed,
    percentage: (needed / predictions.length * 100).toFixed(1)
  };
}

function getSoilHealthTrends(predictions) {
  // Implement soil health analysis
  return { excellent: 30, good: 45, fair: 20, poor: 5 };
}

async function getWeatherForecast(location) {
  // Implement weather forecast API call
  return { forecast: '7-day forecast data' };
}

function calculateDailyIrrigation(weatherData, soilMoisture, dayIndex) {
  // Implement irrigation calculation logic
  return soilMoisture < 40;
}

function calculateWaterAmount(cropType, weatherData, dayIndex) {
  const amounts = { wheat: '5mm', rice: '10mm', cotton: '7mm', pulses: '4mm' };
  return amounts[cropType] || '5mm';
}

function getOptimalTiming(cropType) {
  return 'Early morning (6-8 AM)';
}

function generateDayNotes(weatherData, dayIndex) {
  return `Day ${dayIndex + 1}: Monitor soil moisture levels`;
}
