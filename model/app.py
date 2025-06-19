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

# ✅ GitHub Raw URLs for model files (hosted with Git LFS)
GITHUB_MODEL_URLS = {
    'model': 'https://github.com/Praneeth-k-1301/Irigation-/raw/main/model/crop_model.pkl',
    'scaler': 'https://github.com/Praneeth-k-1301/Irigation-/raw/main/model/crop_scaler.pkl',
    'encoder': 'https://github.com/Praneeth-k-1301/Irigation-/raw/main/model/crop_encoder.pkl'
}

# ✅ The rest of your code continues below unchanged...
# Includes: download_model_from_github, load_models, crop prediction, fertilizer, irrigation, smart prediction, warnings, etc.

# Example:
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

# 🔽 🔽 🔽 Include the rest of your app code here...
# You’ve already pasted the rest of the code in your previous message.
# So just make sure it starts from: 
#   - `@app.route("/predict", methods=["POST"])`
#   - and ends at: `app.run(port=5000, debug=True)`
