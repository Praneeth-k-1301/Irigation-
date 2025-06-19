import React, { useState, useEffect } from 'react';
import { getAnalytics } from '../services/firebaseService';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // For demo purposes, create mock analytics data
      // In production, this would come from Firebase
      const mockData = {
        totalPredictions: 156,
        averageAccuracy: 87.5,
        irrigationRecommendations: {
          needed: 89,
          notNeeded: 67
        },
        cropDistribution: {
          'Wheat': 45,
          'Pulses': 38,
          'Cotton': 28,
          'Paddy': 25,
          'Other': 20
        },
        cityDistribution: {
          'Mumbai': 32,
          'Delhi': 28,
          'Chennai': 24,
          'Kolkata': 22,
          'Bangalore': 18,
          'Hyderabad': 16,
          'Ahmedabad': 12,
          'Jaipur': 8
        },
        soilTypeDistribution: {
          'Loamy': 68,
          'Sandy': 52,
          'Clay': 36
        },
        monthlyTrends: {
          '2024-11': 28,
          '2024-12': 35,
          '2025-01': 42,
          '2025-02': 38,
          '2025-03': 13
        }
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setAnalytics(mockData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-error">
          <p>⚠️ {error}</p>
          <button onClick={loadAnalytics} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-dashboard">
        <div className="no-data">
          <p>📊 No analytics data available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <h2>📊 System Analytics</h2>
      
      {/* Overview Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🌾</div>
          <div className="stat-content">
            <h3>{analytics.totalPredictions}</h3>
            <p>Total Predictions</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{analytics.averageAccuracy.toFixed(1)}%</h3>
            <p>Average Accuracy</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💧</div>
          <div className="stat-content">
            <h3>{analytics.irrigationRecommendations.needed}</h3>
            <p>Irrigation Needed</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🌱</div>
          <div className="stat-content">
            <h3>{analytics.irrigationRecommendations.notNeeded}</h3>
            <p>No Irrigation</p>
          </div>
        </div>
      </div>

      {/* Crop Distribution */}
      <div className="analytics-section">
        <h3>🌾 Crop Distribution</h3>
        <div className="chart-container">
          {Object.entries(analytics.cropDistribution).map(([crop, count]) => (
            <div key={crop} className="chart-bar">
              <div className="bar-label">{crop}</div>
              <div className="bar-container">
                <div 
                  className="bar-fill" 
                  style={{ 
                    width: `${(count / analytics.totalPredictions) * 100}%` 
                  }}
                ></div>
                <span className="bar-value">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* City Distribution */}
      <div className="analytics-section">
        <h3>📍 Popular Cities</h3>
        <div className="chart-container">
          {Object.entries(analytics.cityDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([city, count]) => (
            <div key={city} className="chart-bar">
              <div className="bar-label">{city}</div>
              <div className="bar-container">
                <div 
                  className="bar-fill city-bar" 
                  style={{ 
                    width: `${(count / analytics.totalPredictions) * 100}%` 
                  }}
                ></div>
                <span className="bar-value">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Soil Type Distribution */}
      <div className="analytics-section">
        <h3>🌱 Soil Type Usage</h3>
        <div className="chart-container">
          {Object.entries(analytics.soilTypeDistribution).map(([soilType, count]) => (
            <div key={soilType} className="chart-bar">
              <div className="bar-label">{soilType}</div>
              <div className="bar-container">
                <div 
                  className="bar-fill soil-bar" 
                  style={{ 
                    width: `${(count / analytics.totalPredictions) * 100}%` 
                  }}
                ></div>
                <span className="bar-value">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trends */}
      {Object.keys(analytics.monthlyTrends).length > 0 && (
        <div className="analytics-section">
          <h3>📈 Monthly Trends</h3>
          <div className="chart-container">
            {Object.entries(analytics.monthlyTrends)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, count]) => (
              <div key={month} className="chart-bar">
                <div className="bar-label">{month}</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill trend-bar" 
                    style={{ 
                      width: `${(count / Math.max(...Object.values(analytics.monthlyTrends))) * 100}%` 
                    }}
                  ></div>
                  <span className="bar-value">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="analytics-footer">
        <button onClick={loadAnalytics} className="refresh-btn">
          🔄 Refresh Data
        </button>
        <p className="last-updated">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
