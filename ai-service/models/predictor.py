import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from typing import Dict, List, Any

class StudentRiskPredictor:
    def __init__(self, model_path: str = "model.pkl"):
        self.model_path = model_path
        self.feature_names = [
            "avg_marks",
            "attendance_rate",
            "marks_trend",
            "weak_subjects_count",
            "absent_streak"
        ]
        self.model = None

    def load_model(self) -> bool:
        """Loads the serialized model.pkl file. Returns True if successful, else False."""
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                return True
            except Exception as e:
                print(f"Error loading model from {self.model_path}: {e}")
        return False

    def train(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, float]:
        """Trains the Random Forest model on features X and labels y, and saves it."""
        X_aligned = X[self.feature_names]
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_aligned, y)
        
        # Save model to disk
        joblib.dump(self.model, self.model_path)
        
        # Calculate feature importances
        importances = self.model.feature_importances_
        return dict(zip(self.feature_names, [float(val) for val in importances]))

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Runs model inference on a single dictionary of student features."""
        if self.model is None:
            if not self.load_model():
                raise ValueError("Random Forest model is not trained or loaded.")

        # Prepare single record DataFrame aligned to feature names
        df = pd.DataFrame([features])[self.feature_names]
        
        # Predict class and probabilities
        proba = self.model.predict_proba(df)[0]
        risk_flag_val = self.model.predict(df)[0]

        score = float(proba[1])  # probability of being high risk (class 1)
        confidence = float(proba[risk_flag_val])
        risk_flag = bool(risk_flag_val == 1)

        return {
            "risk_flag": risk_flag,
            "score": score,
            "confidence": confidence
        }

    def generate_suggestions(self, features: Dict[str, Any], weak_subjects: List[str]) -> List[str]:
        """Generates list of recommendations based on student performance features."""
        avg_marks = features.get("avg_marks", 0.0)
        attendance_rate = features.get("attendance_rate", 0.0)
        marks_trend = features.get("marks_trend", 0.0)
        weak_subjects_count = features.get("weak_subjects_count", 0)

        # Try generating personalized insights using Google Cloud Vertex AI (Gemini)
        # using the local Application Default Credentials (ADC) setup.
        try:
            import vertexai
            from vertexai.generative_models import GenerativeModel
            import json
            import re

            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT") or "gen-lang-client-0632178408"
            location = os.environ.get("GOOGLE_CLOUD_LOCATION") or "us-central1"
            
            vertexai.init(project=project_id, location=location)
            
            # Using the fast and cost-effective gemini-1.5-flash model
            model = GenerativeModel("gemini-1.5-flash")
            
            prompt = f"""
            You are an expert academic advisor. Provide 3 highly personalized, actionable suggestions to help a student succeed.
            Student statistics:
            - Average Marks: {avg_marks}%
            - Attendance Rate: {attendance_rate * 100}%
            - Performance Trend: {marks_trend} points change recently
            - Number of Weak Subjects: {weak_subjects_count}
            - Weak Subjects List: {", ".join(weak_subjects) if weak_subjects else "None"}
            
            Format the response as a valid JSON list of strings (exactly 3 items). Do not include any markdown format or additional text. Example output:
            ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
            """
            
            response = model.generate_content(prompt)
            cleaned_text = response.text.strip()
            
            # Clean markdown code block if present
            if "```" in cleaned_text:
                cleaned_text = re.sub(r"```[a-zA-Z]*", "", cleaned_text).strip()
            
            suggestions_list = json.loads(cleaned_text)
            if isinstance(suggestions_list, list) and len(suggestions_list) > 0:
                return [str(s) for s in suggestions_list]
        except Exception as e:
            # Fallback gracefully to rules if Vertex AI is not enabled, billed, or configured
            print(f"[StudentRiskPredictor] Google Vertex AI suggestions generation failed, using rule-based fallback: {e}")

        # Rule-based fallback suggestions
        suggestions = []
        # 1. Academic Performance Check
        if avg_marks < 40.0:
            subj_list = ", ".join(weak_subjects) if weak_subjects else "multiple subjects"
            suggestions.append(f"Immediate academic intervention needed for {subj_list}")

        # 2. Attendance Check
        if attendance_rate < 0.75:
            suggestions.append("Attendance below 75% — risk of exam ineligibility")

        # 3. Performance Trend Check
        if marks_trend < -10.0:
            suggestions.append("Performance declining — schedule teacher meeting")

        # 4. Weak Subjects Volume Check
        if weak_subjects_count >= 3:
            suggestions.append("Struggling in multiple subjects — consider tutoring")

        # Fallback if no warning triggers
        if not suggestions:
            suggestions.append("Student on track — maintain consistency")

        return suggestions

    def get_feature_importance(self) -> Dict[str, float]:
        """Returns the model's feature importance weights mapping."""
        if self.model is None:
            if not self.load_model():
                return {}
        
        importances = self.model.feature_importances_
        return dict(zip(self.feature_names, [float(val) for val in importances]))
