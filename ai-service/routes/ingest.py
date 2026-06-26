import os
import re
import json
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, List, Any
from pypdf import PdfReader

router = APIRouter(prefix="/ingest", tags=["ingest"])

SCHEMA_MAPPING = {
    "student_id": ["id", "roll", "register", "uid", "number", "identifier", "identity"],
    "name": ["name", "full", "candidate", "student"],
    "email": ["email", "mail", "contact"],
    "class": ["class", "grade", "standard", "year"],
    "section": ["section", "sec", "group"],
    "gender": ["gender", "sex"],
}

def map_headers(columns: List[str]) -> Dict[str, Any]:
    mapped = {}
    remaining_cols = list(columns)
    
    for key, keywords in SCHEMA_MAPPING.items():
        best_col = None
        best_score = -1.0
        
        for col in remaining_cols:
            col_lower = str(col).lower().strip()
            score = 0.0
            
            for kw in keywords:
                if kw in col_lower:
                    score += 2.0
                    if kw == col_lower:
                        score += 5.0
                    score -= len(col_lower) * 0.05
            
            # Special case: student name shouldn't map to student_id
            if key == "student_id" and "name" in col_lower:
                score -= 10.0
                
            if score > best_score and score > 0:
                best_score = score
                best_col = col
                
        if best_col:
            mapped[key] = best_col
            remaining_cols.remove(best_col)
            
    # Remaining columns are potential academic subjects
    subject_cols = []
    for col in remaining_cols:
        col_lower = str(col).lower().strip()
        # Exclude obvious non-subject meta fields
        if not any(k in col_lower for k in ["date", "time", "created", "updated", "status", "attendance", "remarks"]):
            subject_cols.append(col)
            
    mapped["subjects"] = subject_cols
    return mapped

@router.post("/excel")
async def ingest_excel(file: UploadFile = File(...)):
    """
    Accepts CSV/Excel files, performs header similarity matching,
    and returns parsed, normalized student rows.
    """
    filename = file.filename or ""
    try:
        # Read file into DataFrame
        if filename.endswith(".csv"):
            df = pd.read_csv(file.file)
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file.file)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a CSV or Excel spreadsheet.")
            
        columns = [str(c) for c in df.columns]
        mapping = map_headers(columns)
        
        # Parse records
        records = []
        for _, row in df.iterrows():
            student_data = {}
            
            # Map standard fields
            student_data["studentId"] = str(row[mapping["student_id"]]) if "student_id" in mapping and pd.notna(row[mapping["student_id"]]) else None
            student_data["name"] = str(row[mapping["name"]]) if "name" in mapping and pd.notna(row[mapping["name"]]) else "Unnamed Student"
            student_data["email"] = str(row[mapping["email"]]) if "email" in mapping and pd.notna(row[mapping["email"]]) else None
            student_data["class"] = str(row[mapping["class"]]) if "class" in mapping and pd.notna(row[mapping["class"]]) else "10"
            student_data["section"] = str(row[mapping["section"]]) if "section" in mapping and pd.notna(row[mapping["section"]]) else "A"
            student_data["gender"] = str(row[mapping["gender"]]) if "gender" in mapping and pd.notna(row[mapping["gender"]]) else "Other"
            
            # Map marks subjects
            marks_list = []
            for sub_col in mapping.get("subjects", []):
                score = row[sub_col]
                if pd.notna(score):
                    try:
                        marks_list.append({
                            "subject": str(sub_col).strip(),
                            "marks": float(score),
                            "maxMarks": 100.0
                        })
                    except ValueError:
                        pass
            
            student_data["marks"] = marks_list
            records.append(student_data)
            
        return {
            "success": True,
            "filename": filename,
            "columnMapping": {k: str(v) for k, v in mapping.items() if k != "subjects"},
            "subjectsMapped": [str(s) for s in mapping.get("subjects", [])],
            "data": records
        }
    except Exception as e:
        print(f"Error parsing spreadsheet: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse spreadsheet: {str(e)}")

def fallback_parse_transcript(text: str) -> Dict[str, Any]:
    """
    Fallback parser using regex to extract structure from standard transcript formats
    if Gemini API is unavailable or billing is not enabled.
    """
    data = {
        "name": "Unknown Student",
        "email": "",
        "class": "10",
        "section": "A",
        "gender": "Other",
        "academicMarks": [],
        "skills": [],
        "projects": []
    }
    
    # Extract simple fields
    name_match = re.search(r"Name:\s*([^\n]+)", text, re.IGNORECASE)
    if name_match:
        data["name"] = name_match.group(1).strip()
        
    email_match = re.search(r"Email:\s*([^\n]+)", text, re.IGNORECASE)
    if email_match:
        data["email"] = email_match.group(1).strip()
    else:
        # Generate email
        clean_name = re.sub(r"[^a-zA-Z0-9]", "", data["name"].lower())
        data["email"] = f"{clean_name}@demo.com"
        
    class_match = re.search(r"Class:\s*([^\n]+)", text, re.IGNORECASE)
    if class_match:
        data["class"] = class_match.group(1).strip()
        
    section_match = re.search(r"Section:\s*([^\n]+)", text, re.IGNORECASE)
    if section_match:
        data["section"] = section_match.group(1).strip()
        
    gender_match = re.search(r"Gender:\s*([^\n]+)", text, re.IGNORECASE)
    if gender_match:
        data["gender"] = gender_match.group(1).strip()
        
    # Extract marks
    marks_lines = re.findall(r"([a-zA-Z \t]+):\s*(\d+)(?:\s*/\s*\d+)?", text)
    exclude_keys = {"name", "email", "class", "section", "gender", "title", "description", "tech stack", "score", "skills", "projects", "academic marks", "student transcript"}
    for item, score in marks_lines:
        item_clean = item.strip()
        if item_clean.lower() not in exclude_keys and len(item_clean) < 30:
            try:
                data["academicMarks"].append({
                    "subject": item_clean,
                    "marks": float(score),
                    "max_marks": 100.0
                })
            except ValueError:
                pass
                
    # Extract skills
    skills_matches = re.findall(r"([a-zA-Z0-9 \t.+#]+)\s*\((beginner|intermediate|advanced)\)", text, re.IGNORECASE)
    for skill_name, level in skills_matches:
        data["skills"].append({
            "skillName": skill_name.strip(),
            "proficiencyLevel": level.lower().strip()
        })

        
    # Extract projects
    project_title = re.search(r"Title:\s*([^\n]+)", text, re.IGNORECASE)
    if project_title:
        proj = {
            "title": project_title.group(1).strip(),
            "description": "Ingested project",
            "techStack": "",
            "repoUrl": "",
            "score": 10.0
        }
        desc_match = re.search(r"Description:\s*([^\n]+)", text, re.IGNORECASE)
        if desc_match:
            proj["description"] = desc_match.group(1).strip()
        tech_match = re.search(r"Tech Stack:\s*([^\n]+)", text, re.IGNORECASE)
        if tech_match:
            proj["techStack"] = tech_match.group(1).strip()
        score_match = re.search(r"Score:\s*(\d+)", text, re.IGNORECASE)
        if score_match:
            proj["score"] = float(score_match.group(1).strip())
        data["projects"].append(proj)
        
    return data

@router.post("/transcript")
async def ingest_transcript(file: UploadFile = File(...)):
    """
    Accepts student transcript PDFs, extracts text, calls Gemini API
    to get structured JSON, and returns the normalized student data.
    """
    filename = file.filename or ""
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF transcripts are supported.")
        
    try:
        # Extract text from PDF
        reader = PdfReader(file.file)
        text_content = ""
        for i, page in enumerate(reader.pages):
            text_content += f"--- Page {i+1} ---\n"
            text_content += page.extract_text() or ""
            
        if not text_content.strip():
            raise HTTPException(status_code=400, detail="No readable text found in PDF transcript.")

        try:
            # Call Gemini API via Vertex AI GenerativeModel
            import vertexai
            from vertexai.generative_models import GenerativeModel
            
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT") or "gen-lang-client-0632178408"
            location = os.environ.get("GOOGLE_CLOUD_LOCATION") or "us-central1"
            
            vertexai.init(project=project_id, location=location)
            
            # Use gemini-1.5-flash for structured extraction
            model = GenerativeModel("gemini-1.5-flash")
            
            prompt = f"""
            You are an AI assistant that extracts structured academic data from student transcript PDFs.
            Extract the student demographics, exam marks, verified skills, and projects from the transcript text below.
            
            Transcript Text:
            {text_content}
            
            Return the response as a single, valid JSON object conforming exactly to this structure:
            {{
              "name": "Student's Full Name (default to 'Unknown Student' if not found)",
              "email": "Student's Email (or generate a valid email based on name, e.g. name@demo.com)",
              "class": "e.g. '10' (string, default to '10')",
              "section": "e.g. 'A' (string, default to 'A')",
              "gender": "'Male', 'Female', or 'Other' (default to 'Other')",
              "academicMarks": [
                 {{ "subject": "Math", "marks": 85.0, "max_marks": 100.0 }}
              ],
              "skills": [
                 {{ "skillName": "Python", "proficiencyLevel": "advanced" }}  // level must be 'beginner', 'intermediate', or 'advanced'
              ],
              "projects": [
                 {{
                    "title": "E-Commerce",
                    "description": "Short project summary",
                    "techStack": "React, Node.js",  // comma-separated list
                    "repoUrl": "Optional repo url or empty string",
                    "score": 15.0  // faculty-assigned score out of 20 (number, default to 10.0 if not listed)
                 }}
              ]
            }}
            
            Do not include any markdown format (like ```json), explanation, or leading/trailing text. Return ONLY the raw JSON block.
            """
            
            response = model.generate_content(prompt)
            cleaned_text = response.text.strip()
            
            # Clean markdown code block wraps if returned by the model
            if "```" in cleaned_text:
                cleaned_text = re.sub(r"```[a-zA-Z]*", "", cleaned_text).strip()
                
            parsed_json = json.loads(cleaned_text)
            
            return {
                "success": True,
                "filename": filename,
                "data": parsed_json,
                "parser": "gemini"
            }
        except Exception as api_err:
            print(f"Vertex AI failed: {api_err}. Falling back to regex parser...")
            parsed_json = fallback_parse_transcript(text_content)
            return {
                "success": True,
                "filename": filename,
                "data": parsed_json,
                "parser": "fallback"
            }
            
    except Exception as e:
        print(f"Error parsing PDF transcript: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF transcript: {str(e)}")

