import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load local environment variables from .env
load_dotenv()

# Ensure the local directories are in system path
base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)
models_dir = os.path.join(base_dir, "models")
if models_dir not in sys.path:
    sys.path.insert(0, models_dir)
routes_dir = os.path.join(base_dir, "routes")
if routes_dir not in sys.path:
    sys.path.insert(0, routes_dir)

from predictor import StudentRiskPredictor
from train_synthetic import generate_synthetic_data
from routes.predict import router as predict_router
from routes.train import router as train_router
from routes.ingest import router as ingest_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup and train predictor on startup if missing
    model_path = os.path.join(base_dir, "model.pkl")
    predictor = StudentRiskPredictor(model_path)
    
    if not os.path.exists(model_path):
        print(f"[{__name__}] Serialized model not found at {model_path}. Generating synthetic data and training...")
        try:
            df, y = generate_synthetic_data(500)
            predictor.train(df, y)
            print(f"[{__name__}] Model trained successfully and serialized to {model_path}.")
        except Exception as e:
            print(f"[{__name__}] Failed to run startup model training: {e}")
    else:
        print(f"[{__name__}] Serialized model found. Loading model from {model_path}...")
        predictor.load_model()

    app.state.predictor = predictor
    yield

app = FastAPI(
    title="Student Risk Performance AI Predictor Service",
    description="Microservice providing student drop-out and low performance predictions based on scikit-learn models.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend (Vercel and Local hosts)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open origins, but can be restricted via config
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include endpoint routes
app.include_router(predict_router)
app.include_router(train_router)
app.include_router(ingest_router)

@app.get("/health")
async def health_check():
    """Simple health-check endpoint displaying status and model load state."""
    model_loaded = False
    try:
        if hasattr(app.state, "predictor") and app.state.predictor.model is not None:
            model_loaded = True
    except Exception:
        pass
    
    return {
        "status": "ok",
        "model_loaded": model_loaded
    }

if __name__ == "__main__":
    import uvicorn
    # Default port 7860 is used for Hugging Face Spaces compatibility
    uvicorn.run("main:app", host="0.0.0.0", port=7860, reload=True)
