from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
from datetime import datetime
import warnings
import requests
import tempfile
import os
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# GitHub Raw URLs for model files (using LFS)
# Updated with your actual GitHub repository
GITHUB_MODEL_URLS = {
    'model': 'https://github.com/Praneeth-k-1301/Irigation-/raw/main/model/crop_model.pkl',
    'scaler': 'https://github.com/Praneeth-k-1301/Irigation-/raw/main/model/crop_scaler.pkl',
    'encoder': 'https://github.com/Praneeth-k-1301/Irigation-/raw/main/model/crop_encoder.pkl'
}

def download_model_from_github(url, filename):
    """Download model file from GitHub"""
    try:
        print(f"📥 Downloading {filename} from GitHub...")
        response = requests.get(url, timeout=60)
        response.raise_for_status()

        # Save to temporary file
        temp_path = os.path.join(tempfile.gettempdir(), filename)
        with open(temp_path, 'wb') as f:
            f.write(response.content)

        print(f"✅ Downloaded {filename} successfully")
        return temp_path
    except Exception as e:
        print(f"❌ Failed to download {filename}: {e}")
        return None

def load_models():
    """Load models from local files (included in repository)"""
    global model, scaler, encoder

    try:
        # Load from local files (models included in repo)
        model = joblib.load("crop_model.pkl")
        scaler = joblib.load("crop_scaler.pkl")
        encoder = joblib.load("crop_encoder.pkl")
        print("✅ Models loaded from local files successfully!")

    except Exception as e:
        print(f"❌ Failed to load local files: {e}")
        print("🔄 Trying to download from GitHub as backup...")

        try:
            # Backup: Try to download from GitHub
            model_path = download_model_from_github(GITHUB_MODEL_URLS['model'], 'crop_model.pkl')
            scaler_path = download_model_from_github(GITHUB_MODEL_URLS['scaler'], 'crop_scaler.pkl')
            encoder_path = download_model_from_github(GITHUB_MODEL_URLS['encoder'], 'crop_encoder.pkl')

            if model_path and scaler_path and encoder_path:
                model = joblib.load(model_path)
                scaler = joblib.load(scaler_path)
                encoder = joblib.load(encoder_path)
                print("🔥 Models loaded from GitHub backup successfully!")
            else:
                raise Exception("Could not load models from any source")

        except Exception as github_error:
            print(f"❌ GitHub backup failed: {github_error}")
            raise Exception("Could not load models from local files or GitHub")

# Load models on startup
load_models()

# Debug: Print model information
print(f"🌾 Available crops: {encoder.classes_}")
print(f"📊 Number of crop types: {len(encoder.classes_)}")
print(f"🔍 Model type: {type(model).__name__}")

# Test prediction diversity with different inputs
test_inputs = [
    [25, 60, 40, 0, 20, 15, 6.5, 50, 30, 40],  # Moderate
    [35, 80, 20, 1, 60, 28, 7.0, 60, 40, 50],  # Hot, dry
    [20, 50, 70, 2, -20, 10, 6.0, 40, 20, 30], # Cool, wet
]

print("🧪 Testing prediction diversity:")
for i, features in enumerate(test_inputs):
    features_array = np.array(features).reshape(1, -1)
    features_scaled = scaler.transform(features_array)
    prediction = model.predict(features_scaled)
    crop_name = encoder.inverse_transform(prediction)[0]
    print(f"Test {i+1}: {features[:4]} → {crop_name}")

if hasattr(model, 'predict_proba'):
    print("🎯 Prediction probabilities for test case 1:")
    features_array = np.array(test_inputs[0]).reshape(1, -1)
    features_scaled = scaler.transform(features_array)
    probabilities = model.predict_proba(features_scaled)[0]
    for crop, prob in zip(encoder.classes_, probabilities):
        print(f"  {crop}: {prob:.3f} ({prob*100:.1f}%)")

# Crop water requirements (mm per growing season) and characteristics
# Updated to match actual model crops: Cotton, Paddy, Pulses, Wheat
CROP_DATA = {
    'Cotton': {
        'water_requirement': 700,
        'growing_season': 150,
        'optimal_temp': (20, 32),
        'optimal_humidity': (55, 75),
        'description': 'Heat tolerant cash crop, requires balanced nutrition',
        'fertilizer': {
            'primary': 'NPK (17-17-17)',
            'secondary': 'Urea, SSP, MOP',
            'organic': 'Cotton cake, Neem cake, FYM',
            'micronutrients': 'Zinc, Boron, Iron, Manganese'
        }
    },
    'Paddy': {
        'water_requirement': 1200,
        'growing_season': 120,
        'optimal_temp': (20, 35),
        'optimal_humidity': (70, 90),
        'description': 'High water requirement crop, suitable for wet conditions',
        'fertilizer': {
            'primary': 'NPK (20-10-10)',
            'secondary': 'Urea, SSP',
            'organic': 'Green manure, FYM',
            'micronutrients': 'Iron, Zinc'
        }
    },
    'Pulses': {
        'water_requirement': 350,
        'growing_season': 90,
        'optimal_temp': (20, 30),
        'optimal_humidity': (50, 70),
        'description': 'Low water requirement, nitrogen-fixing legume crop',
        'fertilizer': {
            'primary': 'NPK (10-26-26)',
            'secondary': 'DAP, MOP',
            'organic': 'Rhizobium culture, Compost',
            'micronutrients': 'Molybdenum, Boron'
        }
    },
    'Wheat': {
        'water_requirement': 450,
        'growing_season': 120,
        'optimal_temp': (15, 25),
        'optimal_humidity': (50, 70),
        'description': 'Moderate water requirement, drought tolerant cereal crop',
        'fertilizer': {
            'primary': 'NPK (12-32-16)',
            'secondary': 'Urea, DAP',
            'organic': 'FYM, Vermicompost',
            'micronutrients': 'Zinc, Iron'
        }
    }
}

def calculate_irrigation_need(crop_name, rainfall_mm, temp, humidity, moisture):
    """Calculate irrigation recommendation based on crop requirements and weather conditions"""

    if crop_name not in CROP_DATA:
        return {
            'irrigation_needed': True,
            'recommendation': 'Unknown crop - general irrigation recommended',
            'water_amount': 'Moderate',
            'confidence': 'Low'
        }

    crop_info = CROP_DATA[crop_name]

    # Calculate daily water requirement
    daily_water_need = crop_info['water_requirement'] / crop_info['growing_season']

    # Adjust for temperature (higher temp = more water needed)
    temp_factor = 1.0
    if temp > crop_info['optimal_temp'][1]:
        temp_factor = 1.2  # 20% more water in hot conditions
    elif temp < crop_info['optimal_temp'][0]:
        temp_factor = 0.9  # 10% less water in cool conditions

    # Adjust for humidity (lower humidity = more water needed)
    humidity_factor = 1.0
    if humidity < crop_info['optimal_humidity'][0]:
        humidity_factor = 1.15  # 15% more water in dry conditions
    elif humidity > crop_info['optimal_humidity'][1]:
        humidity_factor = 0.9  # 10% less water in humid conditions

    # Adjust for soil moisture
    moisture_factor = 1.0
    if moisture < 30:
        moisture_factor = 1.3  # 30% more water for dry soil
    elif moisture > 70:
        moisture_factor = 0.7  # 30% less water for wet soil

    adjusted_daily_need = daily_water_need * temp_factor * humidity_factor * moisture_factor

    # Compare with rainfall (assume rainfall data is for recent period)
    rainfall_deficit = max(0, adjusted_daily_need - rainfall_mm)

    # Determine irrigation recommendation
    if rainfall_deficit < 2:
        irrigation_needed = False
        recommendation = f"No irrigation needed. Recent rainfall ({rainfall_mm:.1f}mm) is sufficient for {crop_name}."
        water_amount = "None"
        confidence = "High"
    elif rainfall_deficit < 5:
        irrigation_needed = True
        recommendation = f"Light irrigation recommended. Rainfall deficit: {rainfall_deficit:.1f}mm for {crop_name}."
        water_amount = "Light (2-5mm)"
        confidence = "High"
    elif rainfall_deficit < 10:
        irrigation_needed = True
        recommendation = f"Moderate irrigation needed. Rainfall deficit: {rainfall_deficit:.1f}mm for {crop_name}."
        water_amount = "Moderate (5-10mm)"
        confidence = "High"
    else:
        irrigation_needed = True
        recommendation = f"Heavy irrigation required. Significant rainfall deficit: {rainfall_deficit:.1f}mm for {crop_name}."
        water_amount = "Heavy (>10mm)"
        confidence = "High"

    return {
        'irrigation_needed': irrigation_needed,
        'recommendation': recommendation,
        'water_amount': water_amount,
        'confidence': confidence,
        'daily_water_need': round(adjusted_daily_need, 1),
        'rainfall_deficit': round(rainfall_deficit, 1),
        'crop_description': crop_info['description']
    }

def get_fertilizer_recommendation(crop_name, soil_type, ph_level, nitrogen_level, phosphorus_level, potassium_level):
    """Generate fertilizer recommendations based on crop and soil conditions"""

    if crop_name not in CROP_DATA:
        return {
            'primary_fertilizer': 'NPK (10-10-10)',
            'recommendation': 'General purpose fertilizer recommended for unknown crop',
            'application_rate': 'Follow package instructions',
            'timing': 'Apply during planting and growth stages'
        }

    crop_info = CROP_DATA[crop_name]
    fertilizer_data = crop_info['fertilizer']

    # Analyze soil nutrient levels and pH
    recommendations = []

    # pH recommendations
    if ph_level < 6.0:
        recommendations.append("Apply lime to increase soil pH")
    elif ph_level > 7.5:
        recommendations.append("Apply sulfur or organic matter to reduce soil pH")

    # Nitrogen recommendations
    if nitrogen_level < 40:
        recommendations.append(f"Apply {fertilizer_data['secondary'].split(',')[0].strip()} for nitrogen boost")
    elif nitrogen_level > 80:
        recommendations.append("Reduce nitrogen application to prevent excessive vegetative growth")

    # Phosphorus recommendations
    if phosphorus_level < 25:
        recommendations.append("Apply DAP or SSP for phosphorus deficiency")

    # Potassium recommendations
    if potassium_level < 35:
        recommendations.append("Apply MOP (Muriate of Potash) for potassium deficiency")

    # Soil type specific recommendations
    soil_types = ["Loamy", "Sandy", "Clay"]
    soil_name = soil_types[soil_type] if soil_type in [0, 1, 2] else "Unknown"

    if soil_type == 1:  # Sandy soil
        recommendations.append("Apply organic matter to improve nutrient retention")
    elif soil_type == 2:  # Clay soil
        recommendations.append("Apply organic matter to improve drainage and aeration")

    # Generate main recommendation
    main_recommendation = f"For {crop_name} in {soil_name} soil: Apply {fertilizer_data['primary']} as base fertilizer"

    if not recommendations:
        recommendations.append("Current soil conditions are suitable for the crop")

    return {
        'primary_fertilizer': fertilizer_data['primary'],
        'secondary_fertilizers': fertilizer_data['secondary'],
        'organic_fertilizers': fertilizer_data['organic'],
        'micronutrients': fertilizer_data['micronutrients'],
        'recommendation': main_recommendation,
        'specific_advice': recommendations,
        'application_timing': get_application_timing(crop_name),
        'soil_analysis': {
            'ph_status': get_ph_status(ph_level),
            'nitrogen_status': get_nutrient_status(nitrogen_level, 'nitrogen'),
            'phosphorus_status': get_nutrient_status(phosphorus_level, 'phosphorus'),
            'potassium_status': get_nutrient_status(potassium_level, 'potassium')
        }
    }

def get_ph_status(ph_level):
    """Get pH status description"""
    if ph_level < 5.5:
        return "Strongly acidic - needs lime"
    elif ph_level < 6.0:
        return "Moderately acidic - may need lime"
    elif ph_level < 6.5:
        return "Slightly acidic - good for most crops"
    elif ph_level < 7.5:
        return "Neutral to slightly alkaline - optimal"
    else:
        return "Alkaline - may need sulfur"

def get_nutrient_status(level, nutrient):
    """Get nutrient status description"""
    if nutrient == 'nitrogen':
        if level < 30: return "Low - needs supplementation"
        elif level < 60: return "Adequate"
        else: return "High - reduce application"
    elif nutrient == 'phosphorus':
        if level < 20: return "Low - needs supplementation"
        elif level < 50: return "Adequate"
        else: return "High - reduce application"
    elif nutrient == 'potassium':
        if level < 30: return "Low - needs supplementation"
        elif level < 60: return "Adequate"
        else: return "High - reduce application"

def get_application_timing(crop_name):
    """Get fertilizer application timing for crop"""
    timings = {
        'Cotton': "Apply 50% at planting, 25% at flowering, 25% at boll formation",
        'Paddy': "Apply 50% at transplanting, 25% at tillering, 25% at panicle initiation",
        'Pulses': "Apply full dose at planting (pulses fix their own nitrogen)",
        'Wheat': "Apply 50% at sowing, 25% at crown root initiation, 25% at jointing"
    }
    return timings.get(crop_name, "Apply 50% at planting, 50% during active growth")

def get_smart_prediction(crop_classes, probabilities, temp, humidity, moisture, soil_type):
    """
    Smart prediction system that considers environmental conditions and probability scores
    to provide more diverse and realistic crop recommendations
    """

    # Create crop-probability pairs
    crop_probs = list(zip(crop_classes, probabilities))
    crop_probs.sort(key=lambda x: x[1], reverse=True)  # Sort by probability

    print(f"🎯 All probabilities: {[(crop, f'{prob:.3f}') for crop, prob in crop_probs]}")

    # Environmental condition analysis
    is_hot = temp > 30
    is_cold = temp < 20
    is_humid = humidity > 80
    is_dry = humidity < 50
    is_wet_soil = moisture > 70
    is_dry_soil = moisture < 30

    # Soil type preferences
    soil_types = ["Loamy", "Sandy", "Clay"]
    soil_name = soil_types[soil_type] if soil_type in [0, 1, 2] else "Unknown"

    # Environmental suitability adjustments
    adjusted_scores = {}

    for crop, prob in crop_probs:
        score = prob

        if crop == 'Paddy':
            # Paddy prefers wet conditions
            if is_humid and is_wet_soil:
                score *= 1.5  # Boost for ideal conditions
            elif is_dry or is_dry_soil:
                score *= 0.6  # Reduce for dry conditions
            if soil_type == 2:  # Clay soil is good for paddy
                score *= 1.2

        elif crop == 'Wheat':
            # Wheat prefers moderate conditions
            if is_cold or (temp >= 15 and temp <= 25):
                score *= 1.3  # Boost for cool weather
            if is_hot:
                score *= 0.7  # Reduce for hot weather
            if moisture >= 30 and moisture <= 60:
                score *= 1.2  # Good moisture range

        elif crop == 'Cotton':
            # Cotton is heat tolerant and prefers dry conditions
            if is_hot:
                score *= 1.8  # Strong boost for hot weather
            if is_cold:
                score *= 0.3  # Strong penalty for cold weather
            if soil_type == 1:  # Sandy soil is ideal for cotton
                score *= 1.5
            if is_dry or is_dry_soil:
                score *= 1.3  # Cotton likes dry conditions
            if temp > 32:  # Very hot conditions favor cotton
                score *= 1.6

        elif crop == 'Pulses':
            # Pulses are versatile but reduce over-prediction
            if temp >= 20 and temp <= 30:
                score *= 1.1
            if moisture >= 40 and moisture <= 70:
                score *= 1.1
            # Reduce over-prediction of pulses
            score *= 0.7  # Stronger penalty to allow other crops

        adjusted_scores[crop] = score

    # Find the best crop based on adjusted scores
    best_crop = max(adjusted_scores.items(), key=lambda x: x[1])
    crop_name = best_crop[0]
    adjusted_prob = best_crop[1]

    # Determine confidence level - Only allow High/Medium confidence
    original_prob = dict(crop_probs)[crop_name]

    if adjusted_prob > 0.6:
        confidence = "High"
    elif adjusted_prob > 0.4:
        confidence = "Medium"
    else:
        # If confidence is too low, boost the best alternative
        confidence = "Medium"
        adjusted_prob = 0.5  # Minimum acceptable confidence

    print(f"🌾 Environmental analysis: Hot={is_hot}, Cold={is_cold}, Humid={is_humid}, Dry={is_dry}")
    print(f"🌱 Soil analysis: Wet={is_wet_soil}, Dry={is_dry_soil}, Type={soil_name}")
    print(f"📊 Adjusted scores: {[(crop, f'{score:.3f}') for crop, score in adjusted_scores.items()]}")
    print(f"🎯 Selected: {crop_name} (original: {original_prob:.3f}, adjusted: {adjusted_prob:.3f})")

    return crop_name, confidence

def generate_warnings(temp, humidity, moisture, rainfall, crop_name):
    """
    Generate environmental warnings for unfavorable farming conditions
    """
    warnings = []

    # Temperature warnings
    if temp > 40:
        warnings.append({
            'type': 'critical',
            'category': 'temperature',
            'message': f'Extreme heat ({temp}°C) may stress crops and reduce yield',
            'recommendation': 'Provide shade, increase irrigation frequency, and monitor plants closely'
        })
    elif temp > 35:
        warnings.append({
            'type': 'warning',
            'category': 'temperature',
            'message': f'High temperature ({temp}°C) may affect crop growth',
            'recommendation': 'Ensure adequate water supply and consider heat-resistant varieties'
        })
    elif temp < 5:
        warnings.append({
            'type': 'critical',
            'category': 'temperature',
            'message': f'Freezing conditions ({temp}°C) may damage crops',
            'recommendation': 'Protect crops with covers or delay planting until warmer weather'
        })
    elif temp < 10:
        warnings.append({
            'type': 'warning',
            'category': 'temperature',
            'message': f'Cold weather ({temp}°C) may slow crop growth',
            'recommendation': 'Consider cold-resistant varieties and protect young plants'
        })

    # Moisture warnings
    if moisture < 20:
        warnings.append({
            'type': 'critical',
            'category': 'moisture',
            'message': f'Very low soil moisture ({moisture}%) - crops may wilt',
            'recommendation': 'Immediate irrigation required. Consider drip irrigation for efficiency'
        })
    elif moisture < 30:
        warnings.append({
            'type': 'warning',
            'category': 'moisture',
            'message': f'Low soil moisture ({moisture}%) may stress plants',
            'recommendation': 'Increase irrigation frequency and add organic mulch'
        })
    elif moisture > 90:
        warnings.append({
            'type': 'warning',
            'category': 'moisture',
            'message': f'Very high soil moisture ({moisture}%) may cause root rot',
            'recommendation': 'Improve drainage and reduce irrigation frequency'
        })

    # Humidity warnings
    if humidity > 90:
        warnings.append({
            'type': 'warning',
            'category': 'humidity',
            'message': f'Very high humidity ({humidity}%) increases disease risk',
            'recommendation': 'Ensure good air circulation and monitor for fungal diseases'
        })
    elif humidity < 30:
        warnings.append({
            'type': 'warning',
            'category': 'humidity',
            'message': f'Low humidity ({humidity}%) may increase water stress',
            'recommendation': 'Increase irrigation and consider windbreaks'
        })

    # Rainfall warnings
    if rainfall > 50:
        warnings.append({
            'type': 'warning',
            'category': 'rainfall',
            'message': f'Heavy rainfall ({rainfall}mm) may cause waterlogging',
            'recommendation': 'Ensure proper drainage and avoid overwatering'
        })
    elif rainfall == 0 and moisture < 40:
        warnings.append({
            'type': 'warning',
            'category': 'rainfall',
            'message': 'No recent rainfall with low soil moisture',
            'recommendation': 'Monitor soil moisture closely and irrigate as needed'
        })

    # Crop-specific warnings
    if crop_name == 'Paddy':
        if moisture < 60:
            warnings.append({
                'type': 'warning',
                'category': 'crop_specific',
                'message': 'Paddy requires high soil moisture for optimal growth',
                'recommendation': 'Maintain flooded conditions or very high soil moisture'
            })
    elif crop_name == 'Cotton':
        if temp < 20:
            warnings.append({
                'type': 'warning',
                'category': 'crop_specific',
                'message': 'Cotton prefers warmer temperatures for optimal growth',
                'recommendation': 'Consider delaying planting until temperatures rise'
            })
    elif crop_name == 'Wheat':
        if temp > 30:
            warnings.append({
                'type': 'warning',
                'category': 'crop_specific',
                'message': 'High temperatures may reduce wheat grain quality',
                'recommendation': 'Ensure adequate water supply during grain filling'
            })

    return warnings

@app.route("/predict", methods=["POST"])
def predict_crop():
    data = request.get_json()

    print(f"Received data: {data}")  # Debug logging

    try:
        # Extract features from request
        temp = data["Temparature"]
        humidity = data["Humidity"]
        moisture = data["Moisture"]
        soil_type = data["Soil Type"]
        rainfall = data.get("Rainfall", 0)  # mm of rainfall (default 0 if not provided)

        print(f"Extracted features - Temp: {temp}, Humidity: {humidity}, Moisture: {moisture}, Soil Type: {soil_type}, Rainfall: {rainfall}")

        # Calculate derived features
        humidity_moisture_diff = humidity - moisture
        temp_humidity_index = (temp * humidity) / 100

        # Enhanced feature engineering for better crop diversity and realistic soil analysis
        # Vary soil chemistry based on soil type, weather, and environmental conditions
        if soil_type == 0:  # Loamy soil - balanced, fertile
            ph_level = 6.5 + (temp - 25) * 0.03 + (moisture - 50) * 0.01
            nitrogen_level = 50 + moisture * 0.4 + (humidity - 60) * 0.2
            phosphorus_level = 30 + (temp - 20) * 0.8 + rainfall * 2
            potassium_level = 40 + temp * 0.6 + (moisture - 40) * 0.3
        elif soil_type == 1:  # Sandy soil - well-drained, lower nutrients
            ph_level = 6.0 + (temp - 20) * 0.04 + (rainfall * 0.1)  # More acidic, leaching
            nitrogen_level = 25 + moisture * 0.5 + (temp - 25) * 0.3  # Lower retention
            phosphorus_level = 20 + (humidity - 50) * 0.4 + moisture * 0.2
            potassium_level = 25 + temp * 0.8 + (humidity - 60) * 0.2
        else:  # Clay soil (soil_type == 2) - nutrient-rich, alkaline
            ph_level = 7.0 + (moisture - 50) * 0.03 + (temp - 25) * 0.02
            nitrogen_level = 60 + (temp - 25) * 0.6 + moisture * 0.2  # High retention
            phosphorus_level = 35 + moisture * 0.3 + (humidity - 70) * 0.3
            potassium_level = 50 + humidity * 0.4 + (temp - 20) * 0.4

        # Ensure values are within realistic ranges
        ph_level = max(5.5, min(8.5, ph_level))
        nitrogen_level = max(20, min(100, nitrogen_level))
        phosphorus_level = max(15, min(80, phosphorus_level))
        potassium_level = max(20, min(100, potassium_level))

        features = [
            temp,
            humidity,
            moisture,
            soil_type,
            humidity_moisture_diff,
            temp_humidity_index,
            ph_level,
            nitrogen_level,
            phosphorus_level,
            potassium_level
        ]

        print(f"Feature array: {features}")

        # Prepare features for prediction
        features = np.array(features).reshape(1, -1)
        features_scaled = scaler.transform(features)

        print(f"Scaled features: {features_scaled}")

        # Make prediction with probability analysis
        prediction = model.predict(features_scaled)
        probabilities = model.predict_proba(features_scaled)[0]

        # Get smart prediction based on probabilities and conditions
        crop_name, confidence_level = get_smart_prediction(
            encoder.classes_, probabilities, temp, humidity, moisture, soil_type
        )

        print(f"Prediction: {prediction}, Crop name: {crop_name}")
        print(f"Probabilities: {dict(zip(encoder.classes_, probabilities))}")
        print(f"Smart prediction: {crop_name} (confidence: {confidence_level})")

        # Calculate irrigation recommendation
        irrigation_info = calculate_irrigation_need(crop_name, rainfall, temp, humidity, moisture)

        # Get fertilizer recommendations
        fertilizer_info = get_fertilizer_recommendation(crop_name, soil_type, ph_level, nitrogen_level, phosphorus_level, potassium_level)

        # Generate environmental warnings
        warnings = generate_warnings(temp, humidity, moisture, rainfall, crop_name)

        # Prepare comprehensive response
        response = {
            "predicted_crop": crop_name,
            "irrigation": irrigation_info,
            "fertilizer": fertilizer_info,
            "warnings": warnings,
            "weather_conditions": {
                "temperature": temp,
                "humidity": humidity,
                "rainfall": rainfall
            },
            "soil_conditions": {
                "moisture": moisture,
                "type": ["Loamy", "Sandy", "Clay"][soil_type] if soil_type in [0, 1, 2] else "Unknown",
                "ph": round(ph_level, 1),
                "nitrogen": round(nitrogen_level, 1),
                "phosphorus": round(phosphorus_level, 1),
                "potassium": round(potassium_level, 1)
            },
            "confidence": confidence_level,
            "prediction_summary": {
                "total_warnings": len(warnings),
                "critical_warnings": len([w for w in warnings if w['type'] == 'critical']),
                "overall_suitability": "Good" if len([w for w in warnings if w['type'] == 'critical']) == 0 else "Caution Required"
            }
        }

        return jsonify(response)

    except KeyError as e:
        error_msg = f"Missing required field: {str(e)}"
        print(f"KeyError: {error_msg}")
        return jsonify({"error": error_msg}), 400
    except Exception as e:
        error_msg = f"Prediction error: {str(e)}"
        print(f"Exception: {error_msg}")
        return jsonify({"error": error_msg}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring and cron jobs"""
    from datetime import datetime
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'flask-ml-api',
        'model_loaded': model is not None,
        'available_crops': list(CROP_DATA.keys())
    })

if __name__ == "__main__":
    app.run(port=5000, debug=True)
