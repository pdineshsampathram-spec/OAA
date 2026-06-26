from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class MarkRecord(BaseModel):
    subject: str
    marks: float
    max_marks: float = 100.0

class PredictRequest(BaseModel):
    student_id: Optional[str] = Field(None, alias="studentId")
    marks: Optional[List[MarkRecord]] = None
    attendance_rate: Optional[float] = Field(None, ge=0.0, le=1.0, alias="attendanceRate")
    marks_history: Optional[List[float]] = Field(None, alias="marksHistory")
    
    # Direct feature inputs (camelCase and snake_case) sent by Next.js API
    avg_marks: Optional[float] = Field(None, alias="avgMarks")
    marks_trend: Optional[float] = Field(None, alias="marksTrend")
    weak_subjects_count: Optional[int] = Field(None, alias="weakSubjectsCount")
    absent_streak: Optional[int] = Field(None, alias="absentStreak")

    model_config = {
        "populate_by_name": True
    }

class PredictResponse(BaseModel):
    student_id: Optional[str] = None
    studentId: Optional[str] = None
    risk_flag: bool
    riskFlag: bool
    score: float
    confidence: float
    suggestions: List[str]
    feature_importance: Dict[str, float]
    featureImportance: Dict[str, float]

    model_config = {
        "populate_by_name": True
    }

class TrainRecord(BaseModel):
    features: Dict[str, float]
    label: int = Field(..., ge=0, le=1, description="Binary classification target label (0: low risk, 1: high risk)")

class TrainRequest(BaseModel):
    records: List[TrainRecord]
