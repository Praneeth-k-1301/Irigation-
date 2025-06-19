import React, { useState, useEffect } from "react";
import "./App.css";
import { savePrediction, getUserPredictions } from "./services/firebaseService";
import { onAuthStateChange } from "./services/authService";
import Login from "./components/Login";
import Signup from "./components/Signup";
import UserHeader from "./components/UserHeader";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import "./components/AnalyticsDashboard.css";

function App() {
  const [form, setForm] = useState({
    city: "Chennai",
    Moisture: "",
    SoilType: "0"
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('prediction'); // 'prediction' or 'analytics'
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (currentUser) => {
      setAuthLoading(false);
      if (currentUser) {
        setUser(currentUser);
        // Load user's prediction history
        try {
          const history = await getUserPredictions(currentUser.uid, 10);
          setPredictionHistory(history);
        } catch (err) {
          console.error("Error loading prediction history:", err);
        }
      } else {
        setUser(null);
        setPredictionHistory([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.Moisture) {
      setError("Please enter soil moisture percentage");
      return;
    }

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const data = {
        city: form.city,
        moisture: parseFloat(form.Moisture),
        soilType: parseInt(form.SoilType)
      };

      console.log("Sending to Node:", data);

      const res = await fetch(process.env.REACT_APP_API_URL || "http://localhost:3001/api/crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();
      console.log("Received result:", result);

      if (result.error) {
        setError(result.error);
      } else {
        setPrediction(result);

        // Save prediction to Firebase
        if (user) {
          try {
            await savePrediction(result, data, user.uid);

            // Refresh prediction history
            const updatedHistory = await getUserPredictions(user.uid, 10);
            setPredictionHistory(updatedHistory);

            console.log("Prediction saved to Firebase");
          } catch (firebaseError) {
            console.error("Error saving to Firebase:", firebaseError);
            // Don't show this error to user as the prediction still worked
          }
        }
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to get prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Authentication handlers
  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleSignupSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setPrediction(null);
    setPredictionHistory([]);
    setActiveTab('prediction');
  };

  const getIrrigationIcon = (needed) => {
    return needed ? "💧" : "🌱";
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case "high": return "#4CAF50";
      case "medium": return "#FF9800";
      default: return "#4CAF50"; // Default to high confidence color
    }
  };

  // Show loading screen while checking auth state
  if (authLoading) {
    return (
      <div className="app-container">
        <div className="auth-loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication screens if user is not logged in
  if (!user) {
    return authMode === 'login' ? (
      <Login
        onSwitchToSignup={() => setAuthMode('signup')}
        onLoginSuccess={handleLoginSuccess}
      />
    ) : (
      <Signup
        onSwitchToLogin={() => setAuthMode('login')}
        onSignupSuccess={handleSignupSuccess}
      />
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>🌾 Smart Crop Prediction & Irrigation System</h1>
        <p>Get AI-powered crop recommendations and irrigation guidance based on real-time weather data</p>

        {/* User Header */}
        <UserHeader user={user} onLogout={handleLogout} />

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'prediction' ? 'active' : ''}`}
            onClick={() => setActiveTab('prediction')}
          >
            🔍 Prediction
          </button>
          <button
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      <div className="main-content">
        {activeTab === 'prediction' ? (
          <>
            <div className="input-section">
          <h2>📍 Location & Soil Information</h2>

          <div className="form-group">
            <label>🏙️ Select City:</label>
            <select name="city" value={form.city} onChange={handleChange} className="form-control">
              <option value="Chennai">Chennai</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Delhi">Delhi</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Ahmedabad">Ahmedabad</option>
              <option value="Kolkata">Kolkata</option>
              <option value="Jaipur">Jaipur</option>
              <option value="Lucknow">Lucknow</option>
              <option value="Patna">Patna</option>
            </select>
          </div>

          <div className="form-group">
            <label>💧 Soil Moisture (%):</label>
            <input
              name="Moisture"
              value={form.Moisture}
              onChange={handleChange}
              type="number"
              min="0"
              max="100"
              placeholder="Enter 0-100"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>🌱 Soil Type:</label>
            <select name="SoilType" value={form.SoilType} onChange={handleChange} className="form-control">
              <option value="0">🟤 Loamy (Best for most crops)</option>
              <option value="1">🟡 Sandy (Good drainage)</option>
              <option value="2">🔴 Clay (Water retention)</option>
            </select>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`predict-button ${loading ? 'loading' : ''}`}
          >
            {loading ? "🔄 Analyzing..." : "🔍 Get Crop Prediction"}
          </button>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>

        {prediction && (
          <div className="results-section">
            <h2>📊 Analysis Results</h2>

            {/* Weather Information */}
            <div className="weather-card">
              <h3>🌤️ Current Weather in {prediction.weather_details?.city}</h3>
              <div className="weather-grid">
                <div className="weather-item">
                  <span className="weather-label">🌡️ Temperature:</span>
                  <span className="weather-value">{prediction.weather_conditions?.temperature}°C</span>
                </div>
                <div className="weather-item">
                  <span className="weather-label">💨 Humidity:</span>
                  <span className="weather-value">{prediction.weather_conditions?.humidity}%</span>
                </div>
                <div className="weather-item">
                  <span className="weather-label">🌧️ Rainfall:</span>
                  <span className="weather-value">{prediction.weather_conditions?.rainfall || 0}mm</span>
                </div>
                <div className="weather-item">
                  <span className="weather-label">☁️ Conditions:</span>
                  <span className="weather-value">{prediction.weather_details?.description}</span>
                </div>
              </div>
            </div>

            {/* Crop Prediction */}
            <div className="prediction-card">
              <h3>🌾 Recommended Crop</h3>
              <div className="crop-result">
                <div className="crop-name">{prediction.predicted_crop}</div>
                <div className="confidence-badge" style={{backgroundColor: getConfidenceColor(prediction.confidence)}}>
                  {prediction.confidence} Confidence
                </div>
              </div>
              {prediction.irrigation?.crop_description && (
                <p className="crop-description">{prediction.irrigation.crop_description}</p>
              )}
            </div>

            {/* Environmental Warnings */}
            {prediction.warnings && prediction.warnings.length > 0 && (
              <div className="warnings-card">
                <h3>⚠️ Environmental Warnings</h3>
                <div className="warnings-summary">
                  <div className="warning-stats">
                    <span className="total-warnings">
                      {prediction.warnings.length} Warning{prediction.warnings.length !== 1 ? 's' : ''}
                    </span>
                    <span className={`suitability ${prediction.prediction_summary?.overall_suitability === 'Good' ? 'good' : 'caution'}`}>
                      {prediction.prediction_summary?.overall_suitability || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="warnings-list">
                  {prediction.warnings.map((warning, index) => (
                    <div key={index} className={`warning-item ${warning.type}`}>
                      <div className="warning-header">
                        <span className="warning-icon">
                          {warning.type === 'critical' ? '🚨' : '⚠️'}
                        </span>
                        <span className="warning-category">{warning.category.replace('_', ' ').toUpperCase()}</span>
                        <span className={`warning-type ${warning.type}`}>
                          {warning.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="warning-message">{warning.message}</p>
                      <p className="warning-recommendation">
                        <strong>Recommendation:</strong> {warning.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Irrigation Recommendation */}
            <div className="irrigation-card">
              <h3>{getIrrigationIcon(prediction.irrigation?.irrigation_needed)} Irrigation Recommendation</h3>
              <div className="irrigation-status">
                <div className={`irrigation-badge ${prediction.irrigation?.irrigation_needed ? 'needed' : 'not-needed'}`}>
                  {prediction.irrigation?.irrigation_needed ? "Irrigation Required" : "No Irrigation Needed"}
                </div>
                <div className="water-amount">
                  Water Amount: <strong>{prediction.irrigation?.water_amount}</strong>
                </div>
              </div>
              <p className="irrigation-recommendation">{prediction.irrigation?.recommendation}</p>

              {prediction.irrigation?.daily_water_need && (
                <div className="irrigation-details">
                  <div className="detail-item">
                    <span>Daily Water Need:</span>
                    <span>{prediction.irrigation.daily_water_need}mm</span>
                  </div>
                  <div className="detail-item">
                    <span>Rainfall Deficit:</span>
                    <span>{prediction.irrigation.rainfall_deficit}mm</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fertilizer Recommendations */}
            <div className="fertilizer-card">
              <h3>🌿 Fertilizer Recommendations</h3>
              <div className="fertilizer-content">
                <div className="fertilizer-main">
                  <div className="fertilizer-primary">
                    <strong>Primary Fertilizer:</strong> {prediction.fertilizer?.primary_fertilizer}
                  </div>
                  <div className="fertilizer-recommendation">
                    {prediction.fertilizer?.recommendation}
                  </div>
                </div>

                <div className="fertilizer-details">
                  <div className="fertilizer-section">
                    <h4>📋 Application Details</h4>
                    <p><strong>Timing:</strong> {prediction.fertilizer?.application_timing}</p>
                    <p><strong>Secondary:</strong> {prediction.fertilizer?.secondary_fertilizers}</p>
                    <p><strong>Organic:</strong> {prediction.fertilizer?.organic_fertilizers}</p>
                    <p><strong>Micronutrients:</strong> {prediction.fertilizer?.micronutrients}</p>
                  </div>

                  {prediction.fertilizer?.specific_advice && (
                    <div className="fertilizer-section">
                      <h4>💡 Specific Advice</h4>
                      <ul>
                        {prediction.fertilizer.specific_advice.map((advice, index) => (
                          <li key={index}>{advice}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Soil Information */}
            <div className="soil-card">
              <h3>🌱 Soil Analysis</h3>
              <div className="soil-grid">
                <div className="soil-item">
                  <span>Type:</span>
                  <span>{prediction.soil_conditions?.type}</span>
                </div>
                <div className="soil-item">
                  <span>Moisture:</span>
                  <span>{prediction.soil_conditions?.moisture}%</span>
                </div>
                <div className="soil-item">
                  <span>pH Level:</span>
                  <span>{prediction.soil_conditions?.ph}</span>
                </div>
                <div className="soil-item">
                  <span>Nitrogen:</span>
                  <span>{prediction.soil_conditions?.nitrogen}</span>
                </div>
                <div className="soil-item">
                  <span>Phosphorus:</span>
                  <span>{prediction.soil_conditions?.phosphorus}</span>
                </div>
                <div className="soil-item">
                  <span>Potassium:</span>
                  <span>{prediction.soil_conditions?.potassium}</span>
                </div>
              </div>

              {prediction.fertilizer?.soil_analysis && (
                <div className="soil-status">
                  <h4>📊 Nutrient Status</h4>
                  <div className="nutrient-status">
                    <div className="status-item">
                      <span>pH:</span>
                      <span className={`status ${prediction.fertilizer.soil_analysis.ph_status?.includes('optimal') ? 'good' : 'warning'}`}>
                        {prediction.fertilizer.soil_analysis.ph_status}
                      </span>
                    </div>
                    <div className="status-item">
                      <span>Nitrogen:</span>
                      <span className={`status ${prediction.fertilizer.soil_analysis.nitrogen_status?.includes('Adequate') ? 'good' : 'warning'}`}>
                        {prediction.fertilizer.soil_analysis.nitrogen_status}
                      </span>
                    </div>
                    <div className="status-item">
                      <span>Phosphorus:</span>
                      <span className={`status ${prediction.fertilizer.soil_analysis.phosphorus_status?.includes('Adequate') ? 'good' : 'warning'}`}>
                        {prediction.fertilizer.soil_analysis.phosphorus_status}
                      </span>
                    </div>
                    <div className="status-item">
                      <span>Potassium:</span>
                      <span className={`status ${prediction.fertilizer.soil_analysis.potassium_status?.includes('Adequate') ? 'good' : 'warning'}`}>
                        {prediction.fertilizer.soil_analysis.potassium_status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prediction History Section */}
        {predictionHistory.length > 0 && (
          <div className="history-section">
            <div className="history-header">
              <h2>📈 Recent Predictions</h2>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="toggle-history-btn"
              >
                {showHistory ? "Hide History" : "Show History"}
              </button>
            </div>

            {showHistory && (
              <div className="history-list">
                {predictionHistory.map((item, index) => (
                  <div key={item.id || index} className="history-item">
                    <div className="history-item-header">
                      <span className="history-crop">{item.predicted_crop}</span>
                      <span className="history-date">
                        {item.timestamp?.toDate?.()?.toLocaleDateString() || 'Recent'}
                      </span>
                    </div>
                    <div className="history-details">
                      <span>📍 {item.user_location}</span>
                      <span>💧 {item.soil_moisture_input}% moisture</span>
                      <span>🌱 {["Loamy", "Sandy", "Clay"][item.soil_type_input] || "Unknown"} soil</span>
                      <span className={`irrigation-status ${item.irrigation?.irrigation_needed ? 'needed' : 'not-needed'}`}>
                        {item.irrigation?.irrigation_needed ? "💧 Irrigation needed" : "🌱 No irrigation"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </>
        ) : (
          <AnalyticsDashboard />
        )}
      </div>
    </div>
  );
}

export default App;
