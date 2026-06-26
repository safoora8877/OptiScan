from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import base64
import io
from PIL import Image
import numpy as np
from datetime import datetime
import uvicorn
from pathlib import Path

from utils.model_utils import predict_and_explain
from utils.rag_utils import get_rag_response

app = FastAPI(
    title="OptiScan API",
    description="AI Eye Disease Detection & Medical Assistant API",
    version="1.0.0"
)



# CORS middleware for same-origin or cross-origin support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class PatientInfo(BaseModel):
    name: Optional[str] = None
    age: int
    gender: str  # "Male" or "Female"

class PredictionRequest(BaseModel):
    patient: PatientInfo
    eye_mode: str = "both"  # "one" or "both"

class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class PredictionResult(BaseModel):
    disease: str
    probability: float
    status: str  # "Positive" or "Negative"

class AnalysisResponse(BaseModel):
    patient: PatientInfo
    predictions: List[PredictionResult]
    visualization: str  # base64 encoded image
    timestamp: str

class ChatResponse(BaseModel):
    response: str
    timestamp: str

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    age: int = Form(...),
    gender: str = Form(...),
    eye_mode: str = Form("both")
):
    """
    Analyze fundus image for retinal diseases
    """
    try:
        # Validate file type
        if not file.content_type in ["image/jpeg", "image/jpg", "image/png"]:
            raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG and PNG images are supported.")

        # Read and process image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        # Prepare patient info
        patient = PatientInfo(name=name, age=age, gender=gender)
        gender_val = 1 if gender == "Male" else 0

        # Run ML prediction
        probas, disease_names, viz_image = predict_and_explain(image, age, gender_val)

        # Convert visualization to base64
        viz_buffer = io.BytesIO()
        Image.fromarray(viz_image).save(viz_buffer, format="PNG")
        viz_base64 = base64.b64encode(viz_buffer.getvalue()).decode()

        # Format predictions
        predictions = []
        for i, disease in enumerate(disease_names):
            prob = probas[i] * 100
            status = "Positive" if prob > 50 else "Negative"  # Threshold can be adjusted
            predictions.append(PredictionResult(
                disease=disease,
                probability=round(prob, 2),
                status=status
            ))

        return AnalysisResponse(
            patient=patient,
            predictions=predictions,
            visualization=viz_base64,
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    """
    Chat with the medical assistant using RAG
    """
    try:
        response = get_rag_response(request.message)
        return ChatResponse(
            response=response,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@app.get("/api/health")
async def health_check():
    """Health check for monitoring"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Static frontend assets must be mounted last so they don't override API routes
frontend_dist = Path(__file__).resolve().parent / "frontend" / "retina-sight-buddy" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    print(f"Warning: Frontend build not found at {frontend_dist}. Run npm run build in frontend/retina-sight-buddy.")

    @app.get("/{full_path:path}")
    async def frontend_not_built(full_path: str = ""):
        return {"detail": "Frontend build not found. Run npm run build in frontend/retina-sight-buddy."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)