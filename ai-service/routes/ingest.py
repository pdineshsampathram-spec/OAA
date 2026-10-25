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

def fallback_parse_transcript(text: str) -> List[Dict[str, Any]]:
    """
    Intelligent fallback parser that handles both:
    1. Multi-student tabular broadsheets / internal marks ledgers
    2. Single or multi-page key-value transcript blocks
    """
    students = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    
    METADATA_KEYS = {
        "sno", "s.no", "slno", "sl.no", "roll", "rollno", "roll no", "reg", "regno", 
        "usn", "htno", "id", "pin", "name", "student name", "student", "candidate", 
        "gender", "sex", "class", "section", "sec", "total", "percentage", "pct", 
        "cgpa", "sgpa", "result", "grade", "rank", "remarks", "signature"
    }

    # 1. Try Tabular Broadsheet format
    header_idx = -1
    subject_cols = []
    id_col = -1
    name_col = -1

    for idx, line in enumerate(lines[:30]):
        tokens = [t.strip() for t in re.split(r"[|\t]+|\s{2,}", line) if t.strip()]
        if len(tokens) >= 3:
            cur_subs = []
            f_id = -1
            f_name = -1
            for c_idx, t in enumerate(tokens):
                t_lower = t.lower()
                if any(k in t_lower for k in ["roll", "reg", "usn", "htno", "id", "pin"]):
                    f_id = c_idx
                elif "name" in t_lower:
                    f_name = c_idx
                elif len(t) >= 2 and len(t) <= 35 and not re.match(r"^\d+$", t) and t_lower not in METADATA_KEYS:
                    cur_subs.append((c_idx, t.strip().title()))
            if len(cur_subs) >= 2 and (f_name != -1 or f_id != -1):
                header_idx = idx
                subject_cols = cur_subs
                id_col = f_id
                name_col = f_name
                break

    if header_idx != -1 and subject_cols:
        for line in lines[header_idx + 1:]:
            if re.search(r"page \d+|total|average|mean|faculty", line, re.IGNORECASE):
                continue
            tokens = [t.strip() for t in re.split(r"[|\t]+|\s{2,}", line) if t.strip()]
            if len(tokens) < 2:
                continue

            s_id = tokens[id_col] if id_col != -1 and id_col < len(tokens) else ""
            s_name = tokens[name_col] if name_col != -1 and name_col < len(tokens) else ""

            if not s_name:
                for t in tokens:
                    if re.match(r"^[a-zA-Z\s.]{3,35}$", t) and t.lower() not in METADATA_KEYS:
                        s_name = t
                        break

            if not s_id:
                for t in tokens:
                    if re.match(r"^[0-9]{2}[A-Z0-9]{6,10}$", t, re.IGNORECASE) or re.match(r"^\d{3,6}$", t):
                        s_id = t
                        break

            if not s_name and not s_id:
                continue
            if not s_name:
                s_name = f"Student {s_id}"

            marks_list = []
            for col_idx, sub_name in subject_cols:
                if col_idx < len(tokens):
                    val_str = re.sub(r"[^0-9.]", "", tokens[col_idx])
                    try:
                        score = float(val_str)
                        max_m = 30.0 if score <= 30 else (50.0 if score <= 50 else 100.0)
                        marks_list.append({
                            "subject": sub_name,
                            "marks": score,
                            "maxMarks": max_m,
                            "max_marks": max_m,
                            "examType": "midterm"
                        })
                    except ValueError:
                        pass

            if marks_list:
                clean_name = re.sub(r"[^a-zA-Z0-9]", "", s_name.lower())
                students.append({
                    "studentId": s_id or None,
                    "name": s_name.strip(),
                    "email": f"{clean_name or 'student'}@demo.com",
                    "class": "10",
                    "section": "A",
                    "gender": "Other",
                    "marks": marks_list,
                    "academicMarks": marks_list,
                    "skills": [],
                    "projects": []
                })

    if students:
        return students

    # 2. Try Key-Value / Block Transcript format
    blocks = re.split(r"(?:(?=Name\s*:)|\n(?=Roll\s*No\s*:)|\n(?=--- Page \d+ ---))", text, flags=re.IGNORECASE)
    for block in blocks:
        if len(block.strip()) < 20:
            continue
        s_name = "Unknown Student"
        s_id = ""
        s_class = "10"
        s_sec = "A"
        s_gender = "Other"

        nm = re.search(r"(?:Name|Student\s*Name)[\s:]+([^\n,]+)", block, re.IGNORECASE)
        if nm:
            s_name = nm.group(1).strip()
        
        im = re.search(r"(?:Roll\s*No|Reg\s*No|USN|HT\s*No|ID)[\s:]+([A-Za-z0-9\-]+)", block, re.IGNORECASE)
        if im:
            s_id = im.group(1).strip()

        cm = re.search(r"(?:Class|Grade)[\s:]+([A-Za-z0-9]+)", block, re.IGNORECASE)
        if cm:
            s_class = cm.group(1).strip()

        sm = re.search(r"(?:Section|Sec)[\s:]+([A-Za-z0-9]+)", block, re.IGNORECASE)
        if sm:
            s_sec = sm.group(1).strip()

        gm = re.search(r"Gender[\s:]+([A-Za-z]+)", block, re.IGNORECASE)
        if gm:
            g_str = gm.group(1).lower()
            s_gender = "Female" if g_str.startswith("f") else ("Male" if g_str.startswith("m") else "Other")

        marks_list = []
        for item, score in re.findall(r"([a-zA-Z \t&]{3,30})[\s:]+(\d+(?:\.\d+)?)(?:\s*/\s*(\d+))?", block):
            item_clean = item.strip().title()
            if item_clean.lower() not in METADATA_KEYS and len(item_clean) < 30:
                try:
                    sc = float(score)
                    marks_list.append({
                        "subject": item_clean,
                        "marks": sc,
                        "maxMarks": 100.0,
                        "max_marks": 100.0,
                        "examType": "midterm"
                    })
                except ValueError:
                    pass

        clean_name = re.sub(r"[^a-zA-Z0-9]", "", s_name.lower())
        students.append({
            "studentId": s_id or None,
            "name": s_name,
            "email": f"{clean_name or 'student'}@demo.com",
            "class": s_class,
            "section": s_sec,
            "gender": s_gender,
            "marks": marks_list,
            "academicMarks": marks_list,
            "skills": [],
            "projects": []
        })

    return students or [{
        "name": "Unknown Student",
        "email": "student@demo.com",
        "class": "10",
        "section": "A",
        "gender": "Other",
        "academicMarks": [],
        "marks": [],
        "skills": [],
        "projects": []
    }]

@router.post("/transcript")
async def ingest_transcript(file: UploadFile = File(...)):
    """
    Accepts student marks PDF (single or multi-student internal marksheet),
    extracts text, and parses structured student records.
    """
    filename = file.filename or ""
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF transcripts are supported.")
        
    try:
        reader = PdfReader(file.file)
        text_content = ""
        for i, page in enumerate(reader.pages):
            text_content += f"--- Page {i+1} ---\n"
            text_content += page.extract_text() or ""
            
        if not text_content.strip():
            raise HTTPException(status_code=400, detail="No readable text found in PDF transcript.")

        parsed_students = []
        parser_used = "fallback"

        # Attempt Gemini AI extraction if key is present
        gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if gemini_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_api_key)
                model = genai.GenerativeModel("gemini-1.5-flash")
                
                prompt = f"""
                You are an AI academic data extractor. Extract ALL students and their internal marks from the text below.
                
                Transcript Text:
                {text_content}
                
                Return a valid JSON object matching this schema:
                {{
                  "students": [
                    {{
                      "studentId": "Roll No or ID",
                      "name": "Full Student Name",
                      "email": "name@demo.com",
                      "class": "10",
                      "section": "A",
                      "gender": "Male",
                      "marks": [
                         {{ "subject": "Mathematics", "marks": 28.0, "maxMarks": 30.0 }}
                      ]
                    }}
                  ]
                }}
                Return ONLY the raw JSON block without markdown formatting.
                """
                
                response = model.generate_content(prompt)
                cleaned_text = response.text.strip()
                if "```" in cleaned_text:
                    cleaned_text = re.sub(r"```[a-zA-Z]*", "", cleaned_text).strip()
                    
                parsed_json = json.loads(cleaned_text)
                if isinstance(parsed_json, dict) and "students" in parsed_json:
                    parsed_students = parsed_json["students"]
                elif isinstance(parsed_json, list):
                    parsed_students = parsed_json
                elif isinstance(parsed_json, dict):
                    parsed_students = [parsed_json]
                parser_used = "gemini"
            except Exception as gemini_err:
                print(f"Gemini API parse failed: {gemini_err}. Using smart fallback parser.")

        if not parsed_students:
            parsed_students = fallback_parse_transcript(text_content)

        return {
            "success": True,
            "filename": filename,
            "data": parsed_students,
            "studentsCount": len(parsed_students),
            "parser": parser_used
        }
            
    except Exception as e:
        print(f"Error parsing PDF transcript: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF transcript: {str(e)}")

