# Student Performance Analytics AI Microservice

This repository hosts the AI predictive microservice for the Student Performance Analytics Dashboard. Built using **FastAPI**, **scikit-learn**, and **pandas**, this service utilizes a Random Forest classifier to identify students at risk of drop-out or academic underperformance.

The service is configured to run locally or containerized, making it fully ready for deployment on Vercel-compatible frontends, Hugging Face Spaces, or Railway.

---

## Technical Stack
- **FastAPI**: Lightweight web framework for building APIs.
- **scikit-learn**: Random Forest Classifier for student classification.
- **pandas** & **numpy**: Feature engineering and matrices generation.
- **joblib**: Model serialization.
- **Pydantic**: JSON request/response structure validation.

---

## Local Development Setup


### 1. Prerequisites
- Python 3.10 or 3.11
- `pip` or `uv` package manager

### 2. Install Dependencies
Initialize a virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Run Synthetic Model Training (Optional)
On the very first startup, the service automatically detects if `model.pkl` is missing and runs synthetic training. To run training manually:
```bash
python models/train_synthetic.py
```

### 4. Start the Development Server
Run the application with `uvicorn`:
```bash
uvicorn main:app --host 0.0.0.0 --port 7860 --reload
```
The application will boot up at `http://localhost:7860`. Open `http://localhost:7860/docs` to view the interactive Swagger API documentation.

---

## API Endpoints

### 1. Health Status Check
Check service status and if the prediction model has loaded successfully.

* **URL**: `GET /health`
* **Response**:
  ```json
  {
    "status": "ok",
    "model_loaded": true
  }
  ```

### 2. Risk Inference Prediction
Calculates student risk indicators, returning predictions in both snake_case and camelCase for direct Vercel Next.js dashboard compatibility.

* **URL**: `POST /predict`
* **Request (CamelCase Direct features - Sent by Next.js API)**:
  ```json
  {
    "avgMarks": 58.5,
    "attendanceRate": 0.72,
    "marksTrend": -12.4,
    "weakSubjectsCount": 2
  }
  ```
* **Request (SnakeCase and full marks list supported)**:
  ```json
  {
    "student_id": "stud_123",
    "attendance_rate": 0.72,
    "marks": [
      { "subject": "Mathematics", "marks": 45.0, "max_marks": 100.0 },
      { "subject": "Science", "marks": 52.0, "max_marks": 100.0 }
    ],
    "marks_history": [65.0, 58.5]
  }
  ```
* **Response**:
  ```json
  {
    "student_id": "stud_123",
    "studentId": "stud_123",
    "risk_flag": true,
    "riskFlag": true,
    "score": 0.74,
    "confidence": 0.82,
    "suggestions": [
      "Immediate academic intervention needed for Mathematics",
      "Attendance below 75% — risk of exam ineligibility",
      "Performance declining — schedule teacher meeting"
    ],
    "feature_importance": {
      "avg_marks": 0.38,
      "attendance_rate": 0.35,
      "marks_trend": 0.12,
      "weak_subjects_count": 0.10,
      "absent_streak": 0.05
    },
    "featureImportance": {
      "avg_marks": 0.38,
      "attendance_rate": 0.35,
      "marks_trend": 0.12,
      "weak_subjects_count": 0.10,
      "absent_streak": 0.05
    }
  }
  ```

### 3. Model Retraining
Allows submission of training data payloads to update the classifier model dynamically.

* **URL**: `POST /train`
* **Request**:
  ```json
  {
    "records": [
      {
        "features": {
          "avg_marks": 35.0,
          "attendance_rate": 0.60,
          "marks_trend": -15.0,
          "weak_subjects_count": 4,
          "absent_streak": 8
        },
        "label": 1
      },
      {
        "features": {
          "avg_marks": 85.0,
          "attendance_rate": 0.95,
          "marks_trend": 5.0,
          "weak_subjects_count": 0,
          "absent_streak": 0
        },
        "label": 0
      }
    ]
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "message": "Model retrained and saved successfully.",
    "evaluation": {
      "training_accuracy": 1.0,
      "num_samples": 2
    },
    "feature_importance": {
      "avg_marks": 0.40,
      "attendance_rate": 0.35,
      "marks_trend": 0.15,
      "weak_subjects_count": 0.07,
      "absent_streak": 0.03
    }
  }
  ```

---

## Deployment Guides

### Deploying to Hugging Face Spaces (Docker Space)
1. Create a new Space on [Hugging Face](https://huggingface.co/spaces).
2. Choose **Docker** as the SDK.
3. Select the **Blank** template or **FastAPI**.
4. Push this repository (or copy the contents of `ai-service/` to the space repository).
5. The Space will automatically run the build process from the `Dockerfile`, execute synthetic model training, and boot the server on port `7860`.

### Deploying to Railway
1. Sign in to [Railway.app](https://railway.app).
2. Create a **New Project** -> **Deploy from GitHub repo**.
3. Choose the branch and folder `ai-service`.
4. Railway will auto-detect the `Dockerfile` and build it.
5. Set environment variable `PORT` to `7860` if required, or let Railway bind automatically.

---

## Linking the Next.js Frontend
Once the microservice is deployed, you must instruct the Next.js API router to utilize it by defining the url in the Next.js environmental setup.

Add the variable inside `.env.local`:
```env
AI_SERVICE_URL=https://your-huggingface-space-url.hf.space
```
If empty, the Next.js server will automatically fall back to its internal, rule-based fallback decision engine.
