import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  CheckCircle2,
  Home,
  ImagePlus,
  MessageCircle,
  UploadCloud,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ApiService,
  type PatientInfo,
  type PredictionResult,
  type AnalysisResponse,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  component: Index,
});

type Step = "home" | "patient" | "upload" | "results";
type EyeMode = "one" | "both";
type Patient = { name: string; age: string; gender: string };
type EyeUpload = { label: string; file?: File; preview?: string };
type EyeAnalysisResult = { label: string; result: AnalysisResponse };

function Index() {
  const [step, setStep] = useState<Step>("home");
  const [patient, setPatient] = useState<Patient>({ name: "", age: "", gender: "" });
  const [eyeMode, setEyeMode] = useState<EyeMode>("both");
  const [uploads, setUploads] = useState<EyeUpload[]>([
    { label: "Left eye" },
    { label: "Right eye" },
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<EyeAnalysisResult[] | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const activeUploads = useMemo(
    () => (eyeMode === "both" ? uploads : uploads.slice(0, 1)),
    [eyeMode, uploads],
  );

  const goHome = () => {
    setStep("home");
    setAnalysisResults(null);
    setAnalysisError(null);
  };

  const setMode = (mode: EyeMode) => {
    setEyeMode(mode);
    setUploads(
      mode === "both"
        ? [{ label: "Left eye" }, { label: "Right eye" }]
        : [{ label: "Retina image" }],
    );
  };

  const handleFile = (index: number, file?: File) => {
    if (!file) return;
    setUploads((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, file, preview: URL.createObjectURL(file) } : item,
      ),
    );
  };

  const handleAnalysis = async () => {
    const uploadedFiles = activeUploads.filter((upload) => upload.file);
    if (uploadedFiles.length === 0) {
      setAnalysisError("Please upload at least one image");
      return;
    }

    if (!patient.age || !patient.gender) {
      setAnalysisError("Please fill in patient age and gender");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const patientInfo: PatientInfo = {
        name: patient.name || undefined,
        age: parseInt(patient.age),
        gender: patient.gender,
      };

      const results = await Promise.all(
        uploadedFiles.map(async (upload) => {
          if (!upload.file) throw new Error("No file found");
          const result = await ApiService.analyzeImage(upload.file, patientInfo);
          return { label: upload.label, result };
        })
      );
      
      setAnalysisResults(results);
      setStep("results");
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisError(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-foreground sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full border border-primary/15" />
        <div className="absolute right-8 top-32 h-52 w-52 rounded-full border border-accent/25" />
      </div>

      <Header currentStep={step} goHome={goHome} />

      <section className="relative mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-6xl items-center justify-center pb-10 pt-8">
        {step === "home" && <Landing onStart={() => setStep("patient")} />}
        {step === "patient" && (
          <PatientPanel
            patient={patient}
            setPatient={setPatient}
            onNext={() => setStep("upload")}
          />
        )}
        {step === "upload" && (
          <UploadPanel
            eyeMode={eyeMode}
            setMode={setMode}
            uploads={activeUploads}
            handleFile={handleFile}
            onAnalyze={handleAnalysis}
            isAnalyzing={isAnalyzing}
            error={analysisError}
          />
        )}
        {step === "results" && analysisResults && analysisResults.length > 0 && (
          <ResultsPanel
            patient={analysisResults[0].result.patient}
            analysisResults={analysisResults}
            uploads={activeUploads}
          />
        )}
      </section>

      <ChatBubble prominent={step === "results"} />
    </main>
  );
}

function Header({ currentStep, goHome }: { currentStep: Step; goHome: () => void }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
      <button
        onClick={goHome}
        className="flex items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-surface"
      >
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow">
          <ImagePlus className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-display text-lg font-bold">OptiScan</span>
          <span className="block text-xs text-muted-foreground">Retina insight suite</span>
        </span>
      </button>
      {currentStep !== "home" && (
        <Button variant="soft" size="sm" onClick={goHome}>
          <Home className="h-4 w-4" /> Home
        </Button>
      )}
    </header>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_0.85fr]">
      <div className="max-w-2xl">
        <p className="mb-4 inline-flex rounded-full border border-primary/20 bg-surface px-4 py-2 text-sm font-medium text-primary">
          AI-assisted retinal and fundus image screening
        </p>
        <h1 className="font-display text-5xl font-black leading-[1.02] text-foreground sm:text-7xl">
          Detect eye disease signals from retina images.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          OptiScan turns retinal images into clear probabilities for conditions like AMD, DR,
          glaucoma, cataract, hypertension, and myopia.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button variant="hero" size="xl" onClick={onStart}>
            Start diagnosis <UploadCloud className="h-5 w-5" />
          </Button>
          <span className="text-sm text-muted-foreground">Hi, I’ll guide the patient gently.</span>
        </div>
      </div>
      <RetinaPreview />
    </div>
  );
}

function RetinaPreview() {
  return (
    <div className="float-soft glass-panel relative mx-auto aspect-[0.86] w-full max-w-sm overflow-hidden rounded-2xl border border-border p-6">
      <div className="absolute inset-x-8 top-10 h-1 rounded-full bg-primary retina-scan" />
      <div className="mx-auto mt-8 grid aspect-square w-64 place-items-center rounded-full bg-retina/20 shadow-glow">
        <div className="grid aspect-square w-48 place-items-center rounded-full bg-retina/35">
          <div className="aspect-square w-28 rounded-full border-[18px] border-primary/30 bg-accent/50" />
        </div>
      </div>
      <div className="mt-8 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold">Hello, patient 👋</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We’ll collect details, upload retina images, then review AI probabilities.
        </p>
      </div>
    </div>
  );
}

function PatientPanel({
  patient,
  setPatient,
  onNext,
}: {
  patient: Patient;
  setPatient: (patient: Patient) => void;
  onNext: () => void;
}) {
  return (
    <div className="glass-panel w-full max-w-xl rounded-2xl border border-border p-6 sm:p-8">
      <p className="text-sm font-semibold text-primary">Hi there</p>
      <h2 className="mt-2 font-display text-3xl font-black">Let’s meet the patient.</h2>
      <div className="mt-7 grid gap-4">
        <Field
          label="Patient name"
          value={patient.name}
          onChange={(name) => setPatient({ ...patient, name })}
          placeholder="e.g. Amina Shah"
        />
        <Field
          label="Age"
          value={patient.age}
          onChange={(age) => setPatient({ ...patient, age })}
          placeholder="e.g. 42"
          type="number"
        />
        <label className="grid gap-2 text-sm font-semibold">
          Gender
          <select
            className="h-12 rounded-lg border border-input bg-background px-4 text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring"
            value={patient.gender}
            onChange={(event) => setPatient({ ...patient, gender: event.target.value })}
          >
            <option value="">Select gender</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </select>
        </label>
      </div>
      <Button className="mt-7 w-full" variant="hero" size="xl" onClick={onNext}>
        Continue to retina upload
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <input
        className="h-12 rounded-lg border border-input bg-background px-4 text-foreground outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function UploadPanel({
  eyeMode,
  setMode,
  uploads,
  handleFile,
  onAnalyze,
  isAnalyzing,
  error,
}: {
  eyeMode: EyeMode;
  setMode: (mode: EyeMode) => void;
  uploads: EyeUpload[];
  handleFile: (index: number, file?: File) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  error: string | null;
}) {
  return (
    <div className="w-full max-w-4xl">
      <div className="text-center">
        <p className="text-sm font-semibold text-primary">Retinal image upload</p>
        <h2 className="mt-2 font-display text-4xl font-black">
          Would you like to upload one eye or both eyes?
        </h2>
      </div>
      <div className="mx-auto mt-6 flex w-fit rounded-xl border border-border bg-surface p-1">
        <button
          className={`rounded-lg px-5 py-3 text-sm font-semibold transition ${eyeMode === "one" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setMode("one")}
        >
          1 retina
        </button>
        <button
          className={`rounded-lg px-5 py-3 text-sm font-semibold transition ${eyeMode === "both" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setMode("both")}
        >
          Both eyes
        </button>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {uploads.map((upload, index) => (
          <DropBox key={upload.label} upload={upload} index={index} onFile={handleFile} />
        ))}
      </div>
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}
      <Button
        className="mx-auto mt-7 flex"
        variant="hero"
        size="xl"
        onClick={onAnalyze}
        disabled={isAnalyzing}
      >
        {isAnalyzing ? "Analyzing..." : "Analyze retina images"}
      </Button>
    </div>
  );
}

function DropBox({
  upload,
  index,
  onFile,
}: {
  upload: EyeUpload;
  index: number;
  onFile: (index: number, file?: File) => void;
}) {
  return (
    <label
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFile(index, event.dataTransfer.files?.[0]);
      }}
      className="glass-panel group flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/35 p-6 text-center transition hover:-translate-y-1 hover:border-primary"
    >
      {upload.preview ? (
        <img
          src={upload.preview}
          alt={`${upload.label} retina preview`}
          className="mb-4 h-32 w-32 rounded-full object-cover shadow-glow"
        />
      ) : (
        <UploadCloud className="mb-4 h-10 w-10 text-primary transition group-hover:-translate-y-1" />
      )}
      <span className="font-display text-xl font-bold">{upload.label}</span>
      <span className="mt-2 text-sm text-muted-foreground">
        Drag and drop a fundus image, or attach file
      </span>
      {upload.file && (
        <span className="mt-3 rounded-full bg-accent/40 px-3 py-1 text-xs font-semibold text-accent-foreground">
          {upload.file.name}
        </span>
      )}
      <input
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(event) => onFile(index, event.target.files?.[0])}
      />
    </label>
  );
}

function ResultsPanel({
  patient,
  analysisResults,
  uploads,
}: {
  patient: PatientInfo;
  analysisResults: EyeAnalysisResult[];
  uploads: EyeUpload[];
}) {
  return (
    <div className="w-full max-w-6xl">
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Diagnosis summary</p>
          <h2 className="mt-2 font-display text-4xl font-black">
            Screening results{patient.name ? ` for ${patient.name}` : ""}
          </h2>
        </div>
        <div className="rounded-2xl border border-accent/35 bg-accent/20 p-4 text-sm text-accent-foreground">
          <strong>Need help?</strong> Chat with the OptiScan assistant about these probabilities.
        </div>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        {analysisResults.map(({ label, result }) => (
          <div key={label}>
            <h3 className="mb-4 font-display text-2xl font-bold">{label} Results</h3>
            <div className="glass-panel overflow-hidden rounded-2xl border border-border">
              {result.predictions.map((pred) => (
                <div
                  key={pred.disease}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 sm:px-6"
                >
                  <span className="font-semibold">{pred.disease}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {pred.probability.toFixed(2)}%
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${pred.status === "Positive" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                  >
                    {pred.status === "Positive" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}{" "}
                    {pred.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {analysisResults.map(({ label, result }) => {
          const upload = uploads.find(u => u.label === label);
          if (!upload) return null;
          return <ImageComparison key={label} upload={upload} visualization={result.visualization} />
        })}
      </div>
      
      <div className="mt-12 mb-8 flex justify-center">
        <Button variant="hero" size="xl" onClick={() => document.getElementById('findings-sheet')?.showModal()}>
          View Detailed Findings Sheet
        </Button>
      </div>

      <dialog id="findings-sheet" className="bg-transparent p-0 w-full max-w-5xl backdrop:bg-background/80 backdrop:backdrop-blur-sm fixed inset-0 z-50 outline-none open:flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
        <FindingsSheet 
          patient={patient} 
          analysisResults={analysisResults} 
          onClose={() => document.getElementById('findings-sheet')?.close()} 
        />
      </dialog>
    </div>
  );
}

const DISEASE_COLORS: Record<string, string> = {
  "Normal (N)": "#10b981",       // emerald-500
  "DR (D)": "#f59e0b",           // amber-500
  "Glaucoma (G)": "#ef4444",     // red-500
  "Cataract (C)": "#06b6d4",     // cyan-500
  "AMD (A)": "#8b5cf6",          // violet-500
  "Hypertension (H)": "#f97316", // orange-500
  "Myopia (M)": "#3b82f6",       // blue-500
  "Other (O)": "#64748b",        // slate-500
};

const DISEASE_ADVICE: Record<string, string> = {
  "Normal (N)": "Maintain a healthy lifestyle, protect your eyes from excessive UV light, and schedule regular annual eye checkups.",
  "DR (D)": "Strictly monitor and control your blood sugar levels. Diabetic Retinopathy can progress quickly. Schedule an immediate consultation with a retinal specialist for a comprehensive dilated eye exam.",
  "Glaucoma (G)": "Glaucoma can cause irreversible vision loss due to optic nerve damage. Please consult an ophthalmologist immediately for intraocular pressure (IOP) measurement and visual field testing to prevent further deterioration.",
  "Cataract (C)": "Consider scheduling a comprehensive eye exam to discuss potential surgical options if your vision is interfering with daily activities, driving, or reading.",
  "AMD (A)": "Protect your eyes from UV light, stop smoking if applicable, and consider dietary supplements (such as the AREDS2 formula) after consulting with your eye care professional.",
  "Hypertension (H)": "Your retinas show signs of high blood pressure damage. Please consult your primary care physician to monitor and manage your systemic blood pressure immediately to prevent cardiovascular issues.",
  "Myopia (M)": "Ensure your corrective lens prescription is up to date. Avoid prolonged screen time without breaks, and practice the 20-20-20 rule to reduce severe eye strain.",
  "Other (O)": "Anomalies were detected that do not strongly match the primary categories. We strongly recommend getting a detailed checkup from a specialist to determine the exact underlying condition.",
};

function FindingsSheet({ patient, analysisResults, onClose }: { patient: PatientInfo, analysisResults: EyeAnalysisResult[], onClose: () => void }) {
  return (
    <div className="w-full bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left">
      <div className="flex justify-between items-center p-6 border-b border-border bg-surface-strong">
        <div>
          <h2 className="text-2xl font-black font-display">Detailed Findings Sheet</h2>
          <p className="text-muted-foreground text-sm">Confidential Patient Report</p>
        </div>
        <button onClick={onClose} className="p-2 bg-muted hover:bg-accent hover:text-accent-foreground rounded-full transition">
          <XCircle className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 grid gap-8">
        <div className="grid grid-cols-3 gap-4 p-5 rounded-2xl bg-accent/10 border border-accent/20">
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Patient Name</p>
            <p className="text-lg font-semibold">{patient.name || "Anonymous"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Age</p>
            <p className="text-lg font-semibold">{patient.age} years</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Gender</p>
            <p className="text-lg font-semibold">{patient.gender}</p>
          </div>
        </div>
        
        <div className={`grid gap-8 ${analysisResults.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {analysisResults.map(({ label, result }) => {
            const sortedResults = [...result.predictions].sort((a, b) => b.probability - a.probability);
            let currentOffset = 0;
            const circumference = 2 * Math.PI * 40; 
            const totalProb = result.predictions.reduce((sum, r) => sum + Math.max(0.1, r.probability), 0);
            const topDisease = sortedResults[0];
            const isHealthy = topDisease.disease === "Normal (N)" && topDisease.probability > 50;

            return (
              <div key={label} className="border border-border rounded-2xl p-6 bg-surface-strong flex flex-col h-full">
                <h3 className="text-xl font-bold font-display mb-6 text-center">{label} Analysis</h3>
                <div className="grid gap-6 flex-1">
                  <div className="relative aspect-square w-full max-w-[200px] mx-auto">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-xl">
                      {sortedResults.map((pred) => {
                        const val = Math.max(0.1, pred.probability);
                        const percentage = val / totalProb;
                        const strokeLength = percentage * circumference;
                        const dasharray = `${strokeLength} ${circumference}`;
                        const dashoffset = -currentOffset;
                        currentOffset += strokeLength;
                        
                        return (
                          <circle
                            key={pred.disease}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke={DISEASE_COLORS[pred.disease] || "#ccc"}
                            strokeWidth="15"
                            strokeDasharray={dasharray}
                            strokeDashoffset={dashoffset}
                            className="transition-all duration-1000 ease-out hover:stroke-width-18 cursor-pointer"
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-2xl font-black" style={{ color: DISEASE_COLORS[topDisease.disease] }}>
                        {topDisease.probability.toFixed(1)}%
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground px-2 leading-tight">{topDisease.disease}</span>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    {sortedResults.slice(0, 4).map((pred) => (
                      <div key={pred.disease} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: DISEASE_COLORS[pred.disease] || "#ccc" }} />
                        <span className="flex-1 font-medium text-xs">{pred.disease}</span>
                        <span className="font-mono text-xs font-bold">{pred.probability.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>

                  <div className={`p-4 rounded-xl border mt-auto ${isHealthy ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
                    <h4 className={`flex items-center gap-2 font-bold text-sm mb-2 ${isHealthy ? 'text-success' : 'text-destructive'}`}>
                      {isHealthy ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} 
                      Recommendations
                    </h4>
                    <p className="text-xs text-foreground leading-relaxed">
                      {DISEASE_ADVICE[topDisease.disease] || DISEASE_ADVICE["Other (O)"]}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ImageComparison({ upload, visualization }: { upload: EyeUpload; visualization: string }) {
  const camSrc = visualization ? `data:image/png;base64,${visualization}` : undefined;
  return (
    <div className="glass-panel rounded-2xl border border-border p-4">
      <h3 className="mb-4 font-display text-xl font-bold">{upload.label}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <RetinaImage title="Original retina" src={upload.preview} />
        <RetinaImage title="EigenCAM highlighted areas" src={camSrc} />
      </div>
    </div>
  );
}

function RetinaImage({
  title,
  src,
}: {
  title: string;
  src?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-3">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-muted">
        {src ? (
          <img src={src} alt={title} className="h-full w-full object-contain" />
        ) : (
          <div className="aspect-square w-28 rounded-full bg-retina/35" />
        )}
      </div>
    </div>
  );
}

function ChatBubble({ prominent }: { prominent: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>(
    [],
  );
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await ApiService.chatWithAssistant({ message: userMessage });
      setMessages((prev) => [...prev, { role: "assistant", content: response.response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-5 right-5 z-20 flex items-center gap-3 rounded-full border border-border bg-surface-strong px-4 py-3 text-sm font-semibold shadow-soft transition hover:-translate-y-1 ${prominent ? "ring-2 ring-accent" : ""}`}
      >
        {prominent ? (
          <Bot className="h-5 w-5 text-primary" />
        ) : (
          <MessageCircle className="h-5 w-5 text-primary" />
        )}
        <span>{prominent ? "Chat about results" : "Chat"}</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-5 z-30 w-96 max-h-96 bg-surface-strong border border-border rounded-2xl shadow-soft flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-primary">OptiScan Assistant</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-64">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm">
                Ask me anything about retinal diseases or your results!
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-80 rounded-lg px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-surface rounded-lg px-3 py-2 text-sm text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about retinal diseases..."
                className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              />
              <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()} size="sm">
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
