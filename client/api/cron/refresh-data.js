// Vercel Cron Job - Runs every hour to refresh API data
// This is a serverless function that runs on Vercel's cloud

export default async function handler(req, res) {
  // Verify this is a cron request (security)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Starting hourly API refresh...');
    
    // 1. Refresh weather data cache for popular cities
    const popularCities = ['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore'];
    const weatherRefreshPromises = popularCities.map(city => refreshWeatherData(city));
    
    // 2. Ping your APIs to keep them warm (prevent cold starts)
    const apiHealthChecks = [
      fetch(process.env.REACT_APP_API_URL || 'https://your-nodejs-api.railway.app/health'),
      fetch(process.env.REACT_APP_ML_API_URL || 'https://your-flask-api.railway.app/health')
    ];
    
    // 3. Execute all refresh operations
    await Promise.all([
      ...weatherRefreshPromises,
      ...apiHealthChecks
    ]);
    
    // 4. Update system status
    await updateSystemStatus();
    
    console.log('✅ Hourly refresh completed successfully');
    
    res.status(200).json({
      success: true,
      message: 'API refresh completed',
      timestamp: new Date().toISOString(),
      refreshedCities: popularCities.length,
      apisChecked: 2
    });
    
  } catch (error) {
    console.error('❌ Hourly refresh failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Refresh weather data for a city
async function refreshWeatherData(city) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Weather API error for ${city}: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`🌤️ Refreshed weather data for ${city}: ${data.main.temp}°C`);
    
    // Store in cache or database if needed
    // await storeWeatherCache(city, data);
    
    return data;
  } catch (error) {
    console.error(`Failed to refresh weather for ${city}:`, error);
    throw error;
  }
}

// Update system status
async function updateSystemStatus() {
  try {
    // You can store system health status in Firebase
    const statusData = {
      lastRefresh: new Date().toISOString(),
      status: 'healthy',
      nextRefresh: new Date(Date.now() + 60 * 60 * 1000).toISOString() // +1 hour
    };
    
    // Store in Firebase or your database
    console.log('📊 System status updated:', statusData);
    
    return statusData;
  } catch (error) {
    console.error('Failed to update system status:', error);
    throw error;
  }
}
