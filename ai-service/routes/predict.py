from fastapi import APIRouter, HTTPException, Request
from schemas import PredictRequest, PredictResponse

router = APIRouter()

@router.post("/predict", response_model=PredictResponse)
async def predict_risk(request: PredictRequest, app_request: Request):
    try:
        # Pull predictor instance from FastAPI app state to avoid circular imports
        predictor = app_request.app.state.predictor

        # Initialize base feature variables
        avg_marks = 0.0
        attendance_rate = 1.0
        marks_trend = 0.0
        weak_subjects_count = 0
        weak_subjects = []

        # 1. Determine avg_marks and weak subjects count
        if request.avg_marks is not None:
            avg_marks = request.avg_marks
        elif request.marks:
            subject_scores = {}
            total_pct_sum = 0.0
            for m in request.marks:
                pct = (m.marks / m.max_marks * 100.0) if m.max_marks > 0 else 0.0
                total_pct_sum += pct
                if m.subject not in subject_scores:
                    subject_scores[m.subject] = []
                subject_scores[m.subject].append(pct)
            
            avg_marks = total_pct_sum / len(request.marks)
            
            # Identify weak subjects (average score in subject < 50.0)
            for sub, scores in subject_scores.items():
                sub_avg = sum(scores) / len(scores)
                if sub_avg < 50.0:
                    weak_subjects.append(sub)
        
        # Determine weak subjects count
        if request.weak_subjects_count is not None:
            weak_subjects_count = request.weak_subjects_count
        else:
            weak_subjects_count = len(weak_subjects)

        # 2. Determine attendance_rate
        if request.attendance_rate is not None:
            attendance_rate = request.attendance_rate

        # 3. Determine marks_trend
        if request.marks_trend is not None:
            marks_trend = request.marks_trend
        elif request.marks_history and len(request.marks_history) > 1:
            marks_trend = float(request.marks_history[-1] - request.marks_history[0])

        # 4. Determine absent_streak
        if request.absent_streak is not None:
            absent_streak = request.absent_streak
        else:
            # Compute absent_streak (approximation from attendance rate: 0..1 scale mapped to 0..10 days)
            absent_streak = max(0, int(round((1.0 - attendance_rate) * 10.0)))

        features = {
            "avg_marks": avg_marks,
            "attendance_rate": attendance_rate,
            "marks_trend": marks_trend,
            "weak_subjects_count": weak_subjects_count,
            "absent_streak": absent_streak
        }

        # 5. Perform prediction
        prediction_result = predictor.predict(features)
        
        # 6. Generate recommendations
        suggestions = predictor.generate_suggestions(features, weak_subjects)
        
        # 7. Retrieve feature importances
        feature_importance = predictor.get_feature_importance()

        student_id = request.student_id or "unknown"

        # Return both snake_case and camelCase parameters to satisfy all UI and backend requirements
        return PredictResponse(
            student_id=student_id,
            studentId=student_id,
            risk_flag=prediction_result["risk_flag"],
            riskFlag=prediction_result["risk_flag"],
            score=prediction_result["score"],
            confidence=prediction_result["confidence"],
            suggestions=suggestions,
            feature_importance=feature_importance,
            featureImportance=feature_importance
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
