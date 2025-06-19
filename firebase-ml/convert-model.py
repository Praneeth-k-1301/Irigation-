# Convert your existing ML model to Firebase ML format
import joblib
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import StandardScaler
import json

def convert_sklearn_to_firebase_ml():
    """Convert your existing scikit-learn model to TensorFlow Lite for Firebase ML"""
    
    print("🔄 Converting your ML model to Firebase ML format...")
    
    # Load your existing model
    try:
        model = joblib.load('../model/crop_prediction_model.pkl')
        scaler = joblib.load('../model/scaler.pkl')
        encoder = joblib.load('../model/label_encoder.pkl')
        print("✅ Loaded existing ML model successfully")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False
    
    # Create a TensorFlow model that mimics your scikit-learn model
    def create_tf_model():
        # Input layer - 5 features (Temperature, Humidity, Moisture, Soil Type, Rainfall)
        inputs = tf.keras.Input(shape=(5,), name='input_features')
        
        # Hidden layers to approximate your trained model
        x = tf.keras.layers.Dense(64, activation='relu')(inputs)
        x = tf.keras.layers.Dense(32, activation='relu')(x)
        x = tf.keras.layers.Dense(16, activation='relu')(x)
        
        # Output layer - 4 crops (Wheat, Paddy, Pulses, Cotton)
        outputs = tf.keras.layers.Dense(4, activation='softmax', name='crop_prediction')(x)
        
        model = tf.keras.Model(inputs=inputs, outputs=outputs)
        return model
    
    # Create TensorFlow model
    tf_model = create_tf_model()
    
    # Train the TF model to mimic your existing model
    print("🔄 Training TensorFlow model to mimic your existing model...")
    
    # Generate training data using your existing model
    np.random.seed(42)
    X_synthetic = np.random.rand(10000, 5)
    X_synthetic[:, 0] = X_synthetic[:, 0] * 40 + 10  # Temperature: 10-50°C
    X_synthetic[:, 1] = X_synthetic[:, 1] * 80 + 20  # Humidity: 20-100%
    X_synthetic[:, 2] = X_synthetic[:, 2] * 90 + 10  # Moisture: 10-100%
    X_synthetic[:, 3] = np.random.randint(0, 3, 10000)  # Soil Type: 0,1,2
    X_synthetic[:, 4] = X_synthetic[:, 4] * 100  # Rainfall: 0-100mm
    
    # Scale the data
    X_scaled = scaler.transform(X_synthetic)
    
    # Get predictions from your existing model
    y_pred = model.predict(X_scaled)
    
    # Convert to one-hot encoding
    y_onehot = tf.keras.utils.to_categorical(y_pred, num_classes=4)
    
    # Compile and train the TensorFlow model
    tf_model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    tf_model.fit(X_scaled, y_onehot, epochs=50, batch_size=32, verbose=1)
    
    # Convert to TensorFlow Lite
    converter = tf.lite.TFLiteConverter.from_keras_model(tf_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()
    
    # Save the TFLite model
    with open('crop_prediction_model.tflite', 'wb') as f:
        f.write(tflite_model)
    
    # Save model metadata
    metadata = {
        'model_name': 'crop_prediction_model',
        'version': '1.0',
        'input_shape': [1, 5],
        'output_shape': [1, 4],
        'features': ['temperature', 'humidity', 'moisture', 'soil_type', 'rainfall'],
        'classes': encoder.classes_.tolist(),
        'scaler_mean': scaler.mean_.tolist(),
        'scaler_scale': scaler.scale_.tolist()
    }
    
    with open('model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("✅ Model converted successfully!")
    print("📁 Files created:")
    print("   - crop_prediction_model.tflite")
    print("   - model_metadata.json")
    
    return True

def test_converted_model():
    """Test the converted model"""
    print("\n🧪 Testing converted model...")
    
    # Load TFLite model
    interpreter = tf.lite.Interpreter(model_path='crop_prediction_model.tflite')
    interpreter.allocate_tensors()
    
    # Get input and output tensors
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    # Test with sample data
    test_input = np.array([[25.0, 60.0, 45.0, 0.0, 0.0]], dtype=np.float32)
    
    interpreter.set_tensor(input_details[0]['index'], test_input)
    interpreter.invoke()
    
    output_data = interpreter.get_tensor(output_details[0]['index'])
    predicted_class = np.argmax(output_data[0])
    confidence = np.max(output_data[0])
    
    # Load metadata
    with open('model_metadata.json', 'r') as f:
        metadata = json.load(f)
    
    crop_name = metadata['classes'][predicted_class]
    
    print(f"✅ Test prediction: {crop_name} (confidence: {confidence:.2f})")
    print(f"📊 All probabilities: {output_data[0]}")
    
    return True

if __name__ == "__main__":
    success = convert_sklearn_to_firebase_ml()
    if success:
        test_converted_model()
        print("\n🎉 Your model is ready for Firebase ML!")
        print("📋 Next steps:")
        print("   1. Upload crop_prediction_model.tflite to Firebase ML")
        print("   2. Deploy Firebase Functions")
        print("   3. Test the integration")
    else:
        print("❌ Model conversion failed. Check your model files.")
