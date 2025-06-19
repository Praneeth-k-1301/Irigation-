# 🌾 Smart Crop Prediction & Irrigation System

An AI-powered cloud computing project that predicts optimal crops and irrigation needs based on real-time weather data, soil conditions, and machine learning algorithms.

## 🚀 Features

### 🤖 AI-Powered Predictions
- **Machine Learning Models**: Pre-trained models for crop prediction
- **Real-time Weather Integration**: OpenWeather API for live data
- **Intelligent Irrigation Recommendations**: Based on rainfall, crop requirements, and soil conditions
- **Multi-factor Analysis**: Temperature, humidity, soil moisture, and soil type

### ☁️ Cloud Computing Architecture
- **Firebase Firestore**: Real-time cloud database
- **Anonymous Authentication**: Secure user sessions
- **Cloud Storage**: Prediction history and analytics
- **Scalable Infrastructure**: Auto-scaling cloud services

### 📊 Advanced Analytics
- **Real-time Dashboard**: Usage statistics and trends
- **Prediction Accuracy Tracking**: User feedback system
- **Geographic Analysis**: City-wise usage patterns
- **Temporal Trends**: Monthly prediction patterns

### 🎨 Modern UI/UX
- **Responsive Design**: Works on all devices
- **Interactive Dashboard**: Beautiful data visualizations
- **Real-time Updates**: Live prediction history
- **Progressive Web App**: Fast and reliable

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Node.js Server │    │  Flask ML API   │
│   (Frontend)    │◄──►│   (Middleware)  │◄──►│   (AI Engine)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Firebase Cloud  │    │ OpenWeather API │    │ ML Models (.pkl)│
│   (Database)    │    │ (Weather Data)  │    │ (Predictions)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **React.js**: Modern UI framework
- **CSS3**: Advanced styling and animations
- **Firebase SDK**: Cloud integration

### Backend
- **Node.js**: API middleware
- **Express.js**: Web framework
- **Flask**: Python ML API
- **Axios**: HTTP client

### AI/ML
- **scikit-learn**: Machine learning models
- **pandas**: Data processing
- **numpy**: Numerical computations
- **joblib**: Model serialization

### Cloud Services
- **Firebase Firestore**: NoSQL database
- **Firebase Auth**: User authentication
- **Firebase Analytics**: Usage tracking
- **OpenWeather API**: Weather data

## 📦 Installation

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- Firebase account
- OpenWeather API key

### 1. Clone Repository
```bash
git clone <repository-url>
cd irrigation-predictor
```

### 2. Setup Python Environment
```bash
cd model
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install flask flask-cors scikit-learn pandas numpy joblib
```

### 3. Setup Node.js Server
```bash
cd server
npm install
```

### 4. Setup React Client
```bash
cd client
npm install
```

### 5. Configure Environment
1. Get OpenWeather API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Create `server/.env`:
```
OPENWEATHER_API_KEY=your_api_key_here
```

### 6. Setup Firebase
Follow the detailed guide in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

## 🚀 Running the Application

### Start All Services

1. **Flask ML API** (Terminal 1):
```bash
cd model
python app.py
```

2. **Node.js Server** (Terminal 2):
```bash
cd server
node index.js
```

3. **React Client** (Terminal 3):
```bash
cd client
npm start
```

### Access the Application
- **Frontend**: http://localhost:3000 (or 3002)
- **Node.js API**: http://localhost:3001
- **Flask ML API**: http://localhost:5000

## 📊 Usage

### Making Predictions
1. Select your city from the dropdown
2. Enter soil moisture percentage (0-100%)
3. Choose soil type (Loamy/Sandy/Clay)
4. Click "Get Crop Prediction"
5. View detailed results and irrigation recommendations

### Analytics Dashboard
1. Click "Analytics" tab
2. View system statistics and trends
3. Analyze crop distribution patterns
4. Monitor prediction accuracy

### Prediction History
1. View your recent predictions
2. Track irrigation recommendations
3. Compare different scenarios

## 🔧 API Endpoints

### Node.js Server
- `POST /api/crop`: Get crop prediction and irrigation recommendation

### Flask ML API
- `POST /predict`: Raw ML prediction endpoint

## 🧠 AI Models

### Crop Prediction Model
- **Algorithm**: Random Forest Classifier
- **Features**: Temperature, humidity, soil moisture, soil type, derived features
- **Output**: Crop type (Rice, Wheat, Corn, Pulses, Sugarcane, Cotton)

### Irrigation Recommendation Engine
- **Input**: Crop type, weather conditions, soil moisture, rainfall
- **Logic**: Crop-specific water requirements with environmental adjustments
- **Output**: Irrigation need (Yes/No), water amount, detailed reasoning

## 📈 Data Analytics

### Tracked Metrics
- Total predictions made
- Crop distribution patterns
- Geographic usage (cities)
- Soil type preferences
- Monthly trends
- Irrigation recommendations
- User feedback and accuracy

### Visualization Features
- Interactive charts and graphs
- Real-time statistics
- Trend analysis
- Performance metrics

## 🔐 Security

### Authentication
- Firebase Anonymous Authentication
- Secure user sessions
- Data isolation per user

### Database Security
- Firestore security rules
- User-specific data access
- Input validation and sanitization

## 🌐 Deployment

### Cloud Platforms
- **Frontend**: Vercel, Netlify, Firebase Hosting
- **Backend**: Heroku, Railway, Google Cloud Run
- **Database**: Firebase Firestore (managed)

### Environment Variables
```bash
# Server
OPENWEATHER_API_KEY=your_key

# Client (Firebase Config)
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenWeatherMap for weather data API
- Firebase for cloud infrastructure
- scikit-learn for machine learning capabilities
- React community for frontend framework

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting guide in FIREBASE_SETUP.md
- Review the API documentation

---

**Built with ❤️ for sustainable agriculture and smart farming**
