import sys
import os
import numpy as np
import pandas as pd

# Add the parent directory to system path to load local sibling modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from predictor import StudentRiskPredictor

def generate_synthetic_data(num_records: int = 500):
    """Generates synthetic student records representing features and risk factors."""
    np.random.seed(42)
    
    # 1. Generate base features
    avg_marks = np.random.uniform(20.0, 95.0, num_records)
    attendance_rate = np.random.uniform(0.5, 1.0, num_records)
    marks_trend = np.random.normal(0.0, 8.0, num_records)
    
    # weak_subjects_count correlates with avg_marks
    weak_subjects_count = []
    for mark in avg_marks:
        if mark < 40.0:
            weak_subjects_count.append(np.random.randint(3, 6))
        elif mark < 60.0:
            weak_subjects_count.append(np.random.randint(1, 4))
        else:
            weak_subjects_count.append(np.random.randint(0, 2))
    weak_subjects_count = np.array(weak_subjects_count)

    # absent_streak correlates with attendance_rate
    absent_streak = []
    for att in attendance_rate:
        if att < 0.75:
            absent_streak.append(np.random.randint(5, 12))
        elif att < 0.90:
            absent_streak.append(np.random.randint(2, 6))
        else:
            absent_streak.append(np.random.randint(0, 3))
    absent_streak = np.array(absent_streak)

    # 2. Generate labels (1 if avg_marks < 40 OR attendance_rate < 0.75, else 0, with 5% noise)
    labels = []
    for i in range(num_records):
        is_risk = (avg_marks[i] < 40.0) or (attendance_rate[i] < 0.75)
        # Add 5% noise to simulate real-world data imperfections
        if np.random.rand() < 0.05:
            labels.append(0 if is_risk else 1)
        else:
            labels.append(1 if is_risk else 0)
            
    df = pd.DataFrame({
        "avg_marks": avg_marks,
        "attendance_rate": attendance_rate,
        "marks_trend": marks_trend,
        "weak_subjects_count": weak_subjects_count,
        "absent_streak": absent_streak
    })
    y = pd.Series(labels)
    
    return df, y

if __name__ == "__main__":
    print("Generating 500 synthetic student records...")
    X, y = generate_synthetic_data(500)
    
    # Save the model relative to predictor root
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(os.path.dirname(current_dir), "model.pkl")
    
    print(f"Training RandomForest model and saving to {model_path}...")
    predictor = StudentRiskPredictor(model_path)
    importances = predictor.train(X, y)
    
    print("✓ Model trained and saved to model.pkl successfully!")
    print("Feature Importances:")
    for feat, val in importances.items():
        print(f"  {feat}: {val:.4f}")
