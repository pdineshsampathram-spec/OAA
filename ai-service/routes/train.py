from fastapi import APIRouter, HTTPException, Request
import pandas as pd
from sklearn.model_selection import train_test_split
from schemas import TrainRequest

router = APIRouter()

@router.post("/train")
async def train_model(request: TrainRequest, app_request: Request):
    try:
        predictor = app_request.app.state.predictor

        if not request.records:
            raise HTTPException(status_code=400, detail="No training records provided.")

        processed_features = []
        labels = []

        for record in request.records:
            feats = record.features
            label = record.label

            # Handle both snake_case and camelCase keys
            avg_marks = feats.get("avg_marks", feats.get("avgMarks", 0.0))
            attendance_rate = feats.get("attendance_rate", feats.get("attendanceRate", 1.0))
            marks_trend = feats.get("marks_trend", feats.get("marksTrend", 0.0))
            weak_subjects_count = feats.get("weak_subjects_count", feats.get("weakSubjectsCount", 0))
            
            absent_streak = feats.get("absent_streak", feats.get("absentStreak", None))
            if absent_streak is None:
                absent_streak = max(0, int(round((1.0 - attendance_rate) * 10.0)))

            processed_features.append({
                "avg_marks": float(avg_marks),
                "attendance_rate": float(attendance_rate),
                "marks_trend": float(marks_trend),
                "weak_subjects_count": int(weak_subjects_count),
                "absent_streak": int(absent_streak)
            })
            labels.append(int(label))

        df_X = pd.DataFrame(processed_features)
        series_y = pd.Series(labels)

        # Validate label distribution
        unique_labels = series_y.unique()
        
        evaluation = {}
        # Calculate training set accuracy
        # Fit on all data and get feature importances
        importances = predictor.train(df_X, series_y)
        
        # Calculate training accuracy
        train_preds = predictor.model.predict(df_X[predictor.feature_names])
        train_acc = float((train_preds == series_y).mean())
        evaluation["training_accuracy"] = train_acc
        evaluation["num_samples"] = len(labels)

        # If we have at least 10 samples and both classes are present, compute test accuracy
        if len(labels) >= 10 and len(unique_labels) > 1:
            try:
                X_train, X_test, y_train, y_test = train_test_split(
                    df_X[predictor.feature_names], series_y, test_size=0.2, random_state=42, stratify=series_y
                )
                from sklearn.ensemble import RandomForestClassifier
                eval_model = RandomForestClassifier(n_estimators=100, random_state=42)
                eval_model.fit(X_train, y_train)
                test_acc = float(eval_model.score(X_test, y_test))
                evaluation["test_accuracy"] = test_acc
            except Exception as eval_err:
                evaluation["test_accuracy_error"] = str(eval_err)

        return {
            "success": True,
            "message": "Model retrained and saved successfully.",
            "evaluation": evaluation,
            "feature_importance": importances,
            "featureImportance": importances
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")
