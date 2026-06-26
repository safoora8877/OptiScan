// src/lib/api.ts
const API_BASE_URL = "/api";

export interface PatientInfo {
  name?: string;
  age: number;
  gender: string;
}

export interface PredictionResult {
  disease: string;
  probability: number;
  status: string;
}

export interface AnalysisResponse {
  patient: PatientInfo;
  predictions: PredictionResult[];
  visualization: string; // base64 encoded image
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  context?: Record<string, any>;
}

export interface ChatResponse {
  response: string;
  timestamp: string;
}

export class ApiService {
  static async analyzeImage(file: File, patient: PatientInfo): Promise<AnalysisResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (patient.name) formData.append("name", patient.name);
    formData.append("age", patient.age.toString());
    formData.append("gender", patient.gender);

    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  static async chatWithAssistant(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }

    return response.json();
  }

  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error("API is not available");
    }
    return response.json();
  }
}
