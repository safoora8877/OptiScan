# OptiScan - AI Eye Disease Detection System

OptiScan is an intelligent retinal disease detection system that combines advanced AI models with a modern web interface for comprehensive eye health screening.

## Features

- **AI-Powered Detection**: Ensemble of ResNet50, EfficientNet, and XGBoost models for 8 major retinal diseases
- **Eigen-CAM Visualization**: Highlighted areas showing what the AI focused on
- **Medical Chat Assistant**: RAG-powered assistant using Groq LLM for medical guidance
- **Modern Web Interface**: Built with React, TypeScript, and Tailwind CSS
- **REST API Backend**: FastAPI-based backend for scalable deployment

## Architecture

### Backend (Python/FastAPI)

- **ML Models**: Disease detection using ensemble learning
- **RAG System**: Medical knowledge base with ChromaDB vector store
- **API Endpoints**: RESTful APIs for analysis and chat
- **File Upload**: Secure image upload handling

### Frontend (React/TypeScript)

- **Multi-step Workflow**: Patient info → Image upload → Results
- **Real-time Analysis**: Live API integration
- **Responsive Design**: Modern UI with Radix components
- **Chat Interface**: Interactive medical assistant

## Supported Diseases

1. Normal (N)
2. Diabetic Retinopathy (DR)
3. Glaucoma (G)
4. Cataract (C)
5. Age-related Macular Degeneration (AMD)
6. Hypertensive Retinopathy (H)
7. Myopia (M)
8. Other Diseases (O)

## Installation

### Prerequisites

- Python 3.11+ (3.14 recommended)
- Node.js 18+
- Git

### Setup

1. **Clone and setup Python environment:**

```bash
git clone <repository-url>
cd optiscan
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

2. **Setup frontend:**

```bash
cd frontend/retina-sight-buddy
npm install
```

3. **Download ML models:**
   Place the following model files in the `models/` directory:

- `best_resnet_with_cbam.pth`
- `best_efficientnet_with_cbam.pth`
- `xgboost_fused_model.sav`

4. **Add medical documents:**
   Place PDF documents in the `rag_documents/` directory for the medical assistant.

## Running the Application

### Single Command Start (Windows)

```bash
start.bat
```

This launches the full OptiScan app in one terminal. The backend serves the built React frontend and API from the same host.

> Note: `app.py` is not used as the production user interface. The React frontend in `frontend/retina-sight-buddy` is the only UI.

### Manual Start

1. **Activate the Python environment** (from project root):

```bash
.venv\Scripts\activate
```

2. **Build the frontend** (first-run only or after changes):

```bash
cd frontend\retina-sight-buddy
npm install
npm run build
cd ../../
```

3. **Run the unified server**:

```bash
python -m uvicorn api:app --host 0.0.0.0 --port 8000
```

The application will be available at: http://localhost:8000

## API Documentation

### Endpoints

- `POST /api/analyze` - Analyze fundus image
- `POST /api/chat` - Chat with medical assistant
- `GET /api/health` - API health check

### Example API Usage

```python
import requests

# Analyze image
files = {'file': open('fundus_image.jpg', 'rb')}
data = {'name': 'John Doe', 'age': 45, 'gender': 'Male'}
response = requests.post('http://localhost:8000/api/analyze', files=files, data=data)

# Chat with assistant
data = {'message': 'What are the symptoms of diabetic retinopathy?'}
response = requests.post('http://localhost:8000/api/chat', json=data)
```

## Development

### Backend Development

- Models are in `utils/model_utils.py`
- RAG system in `utils/rag_utils.py`
- API endpoints in `api.py`

### Frontend Development

- Main app in `frontend/retina-sight-buddy/src/routes/index.tsx`
- API client in `frontend/retina-sight-buddy/src/lib/api.ts`
- Components use Radix UI and Tailwind CSS

## Model Training

The ensemble model combines:

- **ResNet50 with CBAM**: Spatial attention for feature extraction
- **EfficientNet with CBAM**: Efficient architecture with attention
- **XGBoost**: Final classification with patient metadata

## Medical Disclaimer

This tool is for screening purposes only and should not replace professional medical diagnosis. Always consult with qualified ophthalmologists for definitive diagnosis and treatment.


