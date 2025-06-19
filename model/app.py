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

# GitHub Raw URLs for model files
GITHUB_MODEL_URLS = {
    'model': 'https://github.com/Praneeth-k-1301/Irigation-/raw/main/model/crop_model.pkl',
    'scaler': 'https://github.com/Praneeth-k-1301/Irigation-/raw/main/model/crop_scaler.pkl',
    'encoder': 'https://github.com/Praneeth-k-1301/Irigation-/raw/main/model/crop_encoder.pkl'
}

def download_model_from_github(url, filename):
    try:
        print(f"📥 Downloading {filename} from GitHub...")
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        temp_path = os.path.join(tempfile.gettempdir(), filename)
        with open(temp_path, 'wb') as f:
            f.write(response.content)
        print(f"✅ Downloaded {filename} successfully")
        return temp_path
    except Exception as e:
        print(f"❌ Failed to download {filename}: {e}")
        return None

def load_models():
    global model, scaler, encoder
    try:
        model = joblib.load("crop_model.pkl")
        scaler = joblib.load("crop_scaler.pkl")
        encoder = joblib.load("crop_encoder.pkl")
        print("✅ Models loaded from local files successfully!")
    except Exception as e:
        print(f"❌ Failed to load local files: {e}")
        print("🔄 Trying to download from GitHub as backup...")
        try:
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

# Load models at startup
load_models()

# Health check route
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Irrigation ML Model API",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get data from request
        data = request.get_json()
        
        # Extract features
        temp = float(data.get('Temparature', 25))
        humidity = float(data.get('Humidity', 60))
        moisture = float(data.get('Moisture', 50))
        soil_type = int(data.get('Soil Type', 0))
        rainfall = float(data.get('Rainfall', 0))
        
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
        
        # Prepare features for model
        features = np.array([[temp, humidity, ph_level, rainfall, nitrogen_level, 
                            phosphorus_level, potassium_level, soil_type, moisture]])
        
        # Scale features
        features_scaled = scaler.transform(features)
        
        # Make prediction
        prediction = model.predict(features_scaled)[0]
        
        # Decode prediction
        crop_name = encoder.inverse_transform([prediction])[0]
        
        return jsonify({
            "predicted_crop": crop_name,
            "input_features": {
                "temperature": temp,
                "humidity": humidity,
                "moisture": moisture,
                "soil_type": soil_type,
                "rainfall": rainfall,
                "ph_level": round(ph_level, 2),
                "nitrogen": round(nitrogen_level, 2),
                "phosphorus": round(phosphorus_level, 2),
                "potassium": round(potassium_level, 2)
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
