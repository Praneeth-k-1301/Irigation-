// Railway Cron Job - Add this to your Node.js server
const cron = require('node-cron');
const axios = require('axios');

// Popular cities to refresh weather data
const POPULAR_CITIES = [
  'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore', 
  'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
];

// Weather data cache
let weatherCache = new Map();

// Cron job that runs every hour
const startHourlyRefresh = () => {
  console.log('🕐 Starting hourly refresh cron job...');
  
  // Run every hour at minute 0 (0 * * * *)
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running hourly API refresh...');
    
    try {
      await Promise.all([
        refreshWeatherData(),
        keepApisWarm(),
        updateSystemHealth()
      ]);
      
      console.log('✅ Hourly refresh completed successfully');
    } catch (error) {
      console.error('❌ Hourly refresh failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Indian timezone
  });
  
  console.log('✅ Hourly refresh cron job started');
};

// Refresh weather data for popular cities
const refreshWeatherData = async () => {
  console.log('🌤️ Refreshing weather data...');
  
  const refreshPromises = POPULAR_CITIES.map(async (city) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather`,
        {
          params: {
            q: city,
            appid: process.env.OPENWEATHER_API_KEY,
            units: 'metric'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      // Cache the weather data
      weatherCache.set(city, {
        data: response.data,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      });
      
      console.log(`✅ Refreshed ${city}: ${response.data.main.temp}°C`);
      return { city, success: true, temp: response.data.main.temp };
      
    } catch (error) {
      console.error(`❌ Failed to refresh ${city}:`, error.message);
      return { city, success: false, error: error.message };
    }
  });
  
  const results = await Promise.all(refreshPromises);
  const successful = results.filter(r => r.success).length;
  
  console.log(`🌤️ Weather refresh complete: ${successful}/${POPULAR_CITIES.length} cities updated`);
  return results;
};

// Keep APIs warm to prevent cold starts
const keepApisWarm = async () => {
  console.log('🚀 Keeping APIs warm...');
  
  const apis = [
    {
      name: 'Flask ML API',
      url: process.env.ML_API_URL || 'http://localhost:5000',
      endpoint: '/health'
    }
  ];
  
  const pingPromises = apis.map(async (api) => {
    try {
      const response = await axios.get(`${api.url}${api.endpoint}`, {
        timeout: 15000 // 15 second timeout
      });
      
      console.log(`✅ ${api.name} is healthy (${response.status})`);
      return { api: api.name, success: true, status: response.status };
      
    } catch (error) {
      console.error(`❌ ${api.name} health check failed:`, error.message);
      return { api: api.name, success: false, error: error.message };
    }
  });
  
  const results = await Promise.all(pingPromises);
  return results;
};

// Update system health status
const updateSystemHealth = async () => {
  console.log('📊 Updating system health...');
  
  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    lastRefresh: new Date().toISOString(),
    nextRefresh: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    weatherCacheSize: weatherCache.size,
    uptime: process.uptime()
  };
  
  // You can store this in Firebase or your database
  console.log('📊 System health updated:', healthStatus);
  
  return healthStatus;
};

// Get cached weather data
const getCachedWeather = (city) => {
  const cached = weatherCache.get(city);
  
  if (cached && cached.expiresAt > new Date()) {
    console.log(`🎯 Using cached weather data for ${city}`);
    return cached.data;
  }
  
  return null;
};

// Export functions
module.exports = {
  startHourlyRefresh,
  getCachedWeather,
  refreshWeatherData,
  keepApisWarm
};
