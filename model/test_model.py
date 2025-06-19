#!/usr/bin/env python3
"""
Test script to debug ML model predictions and check crop diversity
"""

import joblib
import numpy as np
import warnings
warnings.filterwarnings('ignore')

# Load the models
try:
    model = joblib.load("crop_model.pkl")
    scaler = joblib.load("crop_scaler.pkl")
    encoder = joblib.load("crop_encoder.pkl")
    print("✅ Models loaded successfully")
except Exception as e:
    print(f"❌ Error loading models: {e}")
    exit(1)

# Check what crops the encoder knows about
print(f"\n🌾 Available crops in encoder: {encoder.classes_}")
print(f"📊 Number of crop types: {len(encoder.classes_)}")

# Test with various input combinations to see prediction diversity
test_cases = [
    # [temp, humidity, moisture, soil_type, humidity_moisture_diff, temp_humidity_index, ph, N, P, K]
    [25, 60, 40, 0, 20, 15, 6.5, 50, 30, 40],  # Moderate conditions
    [35, 80, 20, 1, 60, 28, 7.0, 60, 40, 50],  # Hot, humid, dry soil
    [20, 50, 70, 2, -20, 10, 6.0, 40, 20, 30],  # Cool, wet soil
    [30, 90, 80, 0, 10, 27, 7.5, 70, 50, 60],  # Hot, very humid, wet
    [15, 40, 30, 1, 10, 6, 5.5, 30, 15, 25],   # Cool, dry conditions
    [40, 70, 10, 2, 60, 28, 8.0, 80, 60, 70],  # Very hot, dry soil
    [22, 85, 90, 0, -5, 18.7, 6.8, 45, 35, 45], # Rice-like conditions
    [28, 55, 25, 1, 30, 15.4, 7.2, 55, 25, 35], # Wheat-like conditions
]

print(f"\n🧪 Testing {len(test_cases)} different input combinations:")
print("=" * 80)

predictions_count = {}

for i, features in enumerate(test_cases):
    try:
        # Prepare features for prediction
        features_array = np.array(features).reshape(1, -1)
        features_scaled = scaler.transform(features_array)
        
        # Make prediction
        prediction = model.predict(features_scaled)
        crop_name = encoder.inverse_transform(prediction)[0]
        
        # Count predictions
        predictions_count[crop_name] = predictions_count.get(crop_name, 0) + 1
        
        print(f"Test {i+1:2d}: {features[:4]} → {crop_name}")
        
    except Exception as e:
        print(f"Test {i+1:2d}: ERROR - {e}")

print("\n📈 Prediction Summary:")
print("=" * 40)
for crop, count in predictions_count.items():
    percentage = (count / len(test_cases)) * 100
    print(f"{crop:12s}: {count:2d}/{len(test_cases)} ({percentage:5.1f}%)")

# Test with extreme values to force different predictions
print(f"\n🔬 Testing extreme conditions:")
print("=" * 50)

extreme_cases = [
    # Very hot and dry (desert-like)
    [45, 20, 5, 1, 15, 9, 8.5, 20, 10, 15],
    # Very cold and wet (temperate)
    [5, 95, 95, 2, 0, 4.75, 5.0, 80, 60, 70],
    # Tropical conditions
    [35, 95, 85, 0, 10, 33.25, 6.0, 60, 40, 50],
    # Arid conditions
    [38, 30, 15, 1, 15, 11.4, 7.8, 25, 15, 20],
]

for i, features in enumerate(extreme_cases):
    try:
        features_array = np.array(features).reshape(1, -1)
        features_scaled = scaler.transform(features_array)
        prediction = model.predict(features_scaled)
        crop_name = encoder.inverse_transform(prediction)[0]
        
        print(f"Extreme {i+1}: Temp={features[0]}°C, Humidity={features[1]}%, Moisture={features[2]}% → {crop_name}")
        
    except Exception as e:
        print(f"Extreme {i+1}: ERROR - {e}")

# Check model information
print(f"\n🔍 Model Information:")
print("=" * 30)
print(f"Model type: {type(model).__name__}")
print(f"Feature count expected: {model.n_features_in_ if hasattr(model, 'n_features_in_') else 'Unknown'}")

# Check if model is biased towards one class
if hasattr(model, 'predict_proba'):
    print(f"\n🎯 Prediction Probabilities for Test Case 1:")
    features_array = np.array(test_cases[0]).reshape(1, -1)
    features_scaled = scaler.transform(features_array)
    probabilities = model.predict_proba(features_scaled)[0]
    
    for crop, prob in zip(encoder.classes_, probabilities):
        print(f"{crop:12s}: {prob:6.3f} ({prob*100:5.1f}%)")

print(f"\n✅ Model testing complete!")
