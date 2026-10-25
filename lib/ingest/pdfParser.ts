export interface ParsedMark {
  subject: string;
  marks: number;
  maxMarks: number;
  examType?: "unit_test" | "midterm" | "final" | "assignment";
}

export interface ParsedSkill {
  skillName: string;
  proficiencyLevel: "beginner" | "intermediate" | "advanced";
}

export interface ParsedProject {
  title: string;
  description?: string;
  techStack?: string;
  repoUrl?: string;
  score?: number;
}

export interface ParsedStudent {
  studentId?: string;
  name: string;
  email?: string;
  class: string;
  section: string;
  gender: string;
  marks: ParsedMark[];
  academicMarks?: ParsedMark[]; // Compatibility alias
  skills?: ParsedSkill[];
  projects?: ParsedProject[];
}

export interface PDFParseResult {
  success: boolean;
  students: ParsedStudent[];
  subjectsIdentified: string[];
  examTypeDetected: "unit_test" | "midterm" | "final" | "assignment";
  parserUsed: "gemini" | "tabular_heuristic" | "block_heuristic";
  filename?: string;
}

// Common academic subject aliases for normalization
const SUBJECT_ALIASES: Record<string, string> = {
  math: "Mathematics",
  maths: "Mathematics",
  m1: "Mathematics I",
  m2: "Mathematics II",
  m3: "Mathematics III",
  phy: "Physics",
  chem: "Chemistry",
  eng: "English",
  cs: "Computer Science",
  cse: "Computer Science",
  ds: "Data Structures",
  dsa: "Data Structures & Algorithms",
  os: "Operating Systems",
  dbms: "Database Management Systems",
  db: "Database Systems",
  cn: "Computer Networks",
  se: "Software Engineering",
  ai: "Artificial Intelligence",
  ml: "Machine Learning",
  wt: "Web Technologies",
  flat: "Formal Languages & Automata",
  daa: "Design & Analysis of Algorithms",
  oops: "Object Oriented Programming",
  java: "Java Programming",
  python: "Python Programming",
  dld: "Digital Logic Design",
  co: "Computer Organization",
  coa: "Computer Organization & Architecture",
};

// Words that indicate non-subject metadata columns
const METADATA_KEYWORDS = new Set([
  "sno", "s.no", "slno", "sl.no", "s no", "sl no",
  "roll", "rollno", "roll no", "reg", "regno", "reg no", "register", "registration",
  "usn", "htno", "ht no", "hallticket", "hall ticket", "pin", "id", "uid",
  "student", "name", "student name", "studentname", "candidate", "father", "mother",
  "gender", "sex", "class", "grade", "sec", "section", "sem", "semester", "branch", "dept", "department",
  "total", "grand total", "total marks", "tot", "sum",
  "percentage", "percent", "pct", "%", "cgpa", "sgpa", "gpa",
  "result", "res", "status", "pass", "fail", "promoted", "detained",
  "grade", "rank", "position", "remarks", "signature", "sign", "date", "attendance", "att"
]);

/**
 * Normalizes subject string into proper title-cased or canonical form
 */
export function normalizeSubjectName(raw: string): string {
  const clean = raw.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
  const lower = clean.toLowerCase();

  if (SUBJECT_ALIASES[lower]) {
    return SUBJECT_ALIASES[lower];
  }

  // Title case each word
  return clean
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Checks if a string likely represents an academic subject name
 */
function isPotentialSubject(str: string): boolean {
  const clean = str.trim().toLowerCase();
  if (!clean || clean.length < 2 || clean.length > 40) return false;
  if (/^\d+$/.test(clean)) return false; // purely numbers
  if (METADATA_KEYWORDS.has(clean)) return false;

  // Check if string contains any strict metadata keyword as a standalone word
  const words = clean.split(/[^a-z0-9]+/);
  if (words.some((w) => ["roll", "reg", "name", "usn", "htno", "hallticket", "pin", "id", "class", "section", "gender", "total"].includes(w))) {
    return false;
  }

  // If it's a known course code (e.g. CS101, 21CS41)
  if (/^[a-z]{2,4}\d{2,4}[a-z]?$/i.test(clean)) return true;

  // Check if it has any alpha characters
  return /[a-z]/i.test(clean);
}

/**
 * Main parser entry point: Parses PDF buffer into structured student records.
 */
export async function parseMarksPDF(buffer: Buffer, filename: string = "transcript.pdf"): Promise<PDFParseResult> {
  // Step 1: Extract raw text from PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfModule: any = await import("pdf-parse");
  const parser = typeof pdfModule === "function" ? pdfModule : (pdfModule.default || pdfModule);
  const pdfData = await parser(buffer);
  const rawText = pdfData?.text || "";

  if (!rawText.trim()) {
    throw new Error("No readable text found in PDF document. Please verify the PDF contains selectable text.");
  }

  // Step 2: Try Gemini AI extraction if key is present
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      const geminiResult = await parseWithGemini(rawText, geminiKey);
      if (geminiResult && geminiResult.students.length > 0) {
        return {
          ...geminiResult,
          filename,
        };
      }
    } catch (geminiErr) {
      console.warn("Gemini PDF parsing failed, falling back to heuristic engine:", geminiErr);
    }
  }

  // Step 3: Heuristic Parsing (Tabular broadsheet or transcript blocks)
  return parseWithHeuristics(rawText, filename);
}

/**
 * Gemini AI parser for structured multi-student extraction
 */
async function parseWithGemini(rawText: string, apiKey: string): Promise<PDFParseResult | null> {
  const prompt = `You are an expert AI academic data extraction system.
Analyze the following student marks text extracted from a school/college PDF (e.g. internal marks sheet, broadsheet, or student transcripts).
It may contain multiple students or a single student.

Extract ALL students, identify their student ID/Roll number, student name, class, section, gender, and ALL subjects with their corresponding marks.

Text content:
${rawText}

Return a valid JSON object matching this schema strictly:
{
  "examType": "midterm", // or "unit_test", "final", "assignment"
  "maxMarksDefault": 100, // or detected max marks like 20, 25, 30, 40, 50, 100
  "students": [
    {
      "studentId": "21B91A0501", // or roll number, or null if not found
      "name": "Full Student Name",
      "email": "student@demo.com", // or generate from name
      "class": "10",
      "section": "A",
      "gender": "Male", // "Male", "Female", or "Other"
      "marks": [
        {
          "subject": "Mathematics",
          "marks": 28.5,
          "maxMarks": 30.0,
          "examType": "midterm"
        }
      ]
    }
  ]
}

Return ONLY raw JSON. No markdown code wraps, no explanations.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: "application/json", temperature: 0.1 },
    }),
  });

  if (!resp.ok) {
    throw new Error(`Gemini API error: ${resp.status} ${await resp.text()}`);
  }

  const json = await resp.json();
  const textOut = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOut) return null;

  const parsed = JSON.parse(textOut);
  const studentsList: ParsedStudent[] = Array.isArray(parsed.students) ? parsed.students : [];

  const allSubjects = new Set<string>();
  for (const s of studentsList) {
    if (Array.isArray(s.marks)) {
      for (const m of s.marks) {
        if (m.subject) {
          m.subject = normalizeSubjectName(m.subject);
          allSubjects.add(m.subject);
        }
      }
      s.academicMarks = s.marks;
    }
  }

  return {
    success: true,
    students: studentsList,
    subjectsIdentified: Array.from(allSubjects),
    examTypeDetected: parsed.examType || "midterm",
    parserUsed: "gemini",
  };
}

/**
 * Intelligent deterministic heuristic parser for internal marks sheets
 */
export function parseWithHeuristics(rawText: string, filename: string): PDFParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Detect exam type from document header
  let examTypeDetected: "unit_test" | "midterm" | "final" | "assignment" = "midterm";
  const lowerAll = rawText.toLowerCase();
  if (lowerAll.includes("unit test") || lowerAll.includes("unit_test") || lowerAll.includes("slip test")) {
    examTypeDetected = "unit_test";
  } else if (lowerAll.includes("final") || lowerAll.includes("semester end") || lowerAll.includes("annual")) {
    examTypeDetected = "final";
  } else if (lowerAll.includes("assignment")) {
    examTypeDetected = "assignment";
  }

  // Detect global max marks if mentioned (e.g. "Max Marks: 30", "Out of 50")
  let defaultMaxMarks = 100;
  const maxMatch = rawText.match(/(?:max\s*marks|maximum\s*marks|out\s*of|marks\s*out\s*of)[\s:]*(\d+)/i);
  if (maxMatch) {
    defaultMaxMarks = Number(maxMatch[1]) || 100;
  } else if (lowerAll.includes("mid-1") || lowerAll.includes("mid-2") || lowerAll.includes("internal")) {
    // Typical college internal marks are out of 30 or 25
    defaultMaxMarks = 30;
  }

  // Detect default class & section from header if available
  let docClass = "10";
  let docSection = "A";
  const classMatch = rawText.match(/(?:class|grade|year|branch)[\s:]*([A-Za-z0-9\-]+)/i);
  if (classMatch) docClass = classMatch[1].trim();
  const secMatch = rawText.match(/(?:section|sec)[\s:]*([A-Za-z0-9]+)/i);
  if (secMatch) docSection = secMatch[1].trim();

  // Try Table Broadsheet Parser first
  const tableResult = tryParseTableBroadsheet(lines, defaultMaxMarks, examTypeDetected, docClass, docSection);
  if (tableResult.students.length > 0) {
    return {
      success: true,
      students: tableResult.students,
      subjectsIdentified: tableResult.subjects,
      examTypeDetected,
      parserUsed: "tabular_heuristic",
      filename,
    };
  }

  // Try Block / Individual Transcript Parser
  const blockResult = tryParseBlockTranscript(rawText, defaultMaxMarks, examTypeDetected, docClass, docSection);
  return {
    success: true,
    students: blockResult.students,
    subjectsIdentified: blockResult.subjects,
    examTypeDetected,
    parserUsed: "block_heuristic",
    filename,
  };
}

/**
 * Parses multi-student table format (broadsheet, internal marks matrix)
 */
function tryParseTableBroadsheet(
  lines: string[],
  defaultMaxMarks: number,
  examType: "unit_test" | "midterm" | "final" | "assignment",
  defaultClass: string,
  defaultSection: string
): { students: ParsedStudent[]; subjects: string[] } {
  const students: ParsedStudent[] = [];
  const subjectsSet = new Set<string>();

  // Look for header row: line containing Roll/Reg/Name and at least 2 potential subjects
  let headerIndex = -1;
  let subjectColumns: { index: number; name: string }[] = [];
  let nameColIndex = -1;
  let idColIndex = -1;

  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i];
    // Split by pipe, tab, or multi-space
    const tokens = line.split(/[|\t]+|\s{2,}/).map((t) => t.trim()).filter(Boolean);

    if (tokens.length >= 3) {
      let foundId = -1;
      let foundName = -1;
      const detectedSubs: { index: number; name: string }[] = [];

      tokens.forEach((t, idx) => {
        const lower = t.toLowerCase();
        if (["roll", "roll no", "reg", "reg no", "usn", "htno", "pin", "id", "student id"].some((k) => lower.includes(k))) {
          foundId = idx;
        } else if (["student name", "candidate name", "name"].some((k) => lower === k || lower.startsWith("name"))) {
          foundName = idx;
        } else if (isPotentialSubject(t)) {
          detectedSubs.push({ index: idx, name: normalizeSubjectName(t) });
        }
      });

      // If we found a name column (or ID column) and at least 2 subject columns
      if (detectedSubs.length >= 2 && (foundName !== -1 || foundId !== -1)) {
        headerIndex = i;
        idColIndex = foundId;
        nameColIndex = foundName;
        subjectColumns = detectedSubs;
        break;
      }
    }
  }

  // If header row found with subject columns
  if (headerIndex !== -1 && subjectColumns.length > 0) {
    subjectColumns.forEach((s) => subjectsSet.add(s.name));

    // Parse subsequent rows
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/page \d+|total|average|mean|faculty/i.test(line)) continue;

      const tokens = line.split(/[|\t]+|\s{2,}/).map((t) => t.trim()).filter(Boolean);
      if (tokens.length < 2) continue;

      // Extract roll/studentId
      let studentId = "";
      let name = "";
      if (idColIndex !== -1 && tokens[idColIndex]) {
        studentId = tokens[idColIndex];
      }
      if (nameColIndex !== -1 && tokens[nameColIndex]) {
        name = tokens[nameColIndex];
      }

      // If columns were somewhat shifted or split by single spaces
      if (!name) {
        // Find first token that looks like a name (letters with space)
        const nameToken = tokens.find((t) => /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(t) || /^[A-Z\s.]{4,30}$/.test(t));
        if (nameToken) name = nameToken;
      }

      // If still no name, check if any token contains alphabetic characters and not numbers
      if (!name) {
        for (const t of tokens) {
          if (/^[a-zA-Z\s.]{3,35}$/.test(t) && !METADATA_KEYWORDS.has(t.toLowerCase())) {
            name = t;
            break;
          }
        }
      }

      if (!studentId) {
        // Match standard roll number pattern (alphanumeric, like 22B91A0501 or 101)
        const idToken = tokens.find((t) => /^[0-9]{2}[A-Z0-9]{8,10}$/i.test(t) || /^[A-Z]{1,3}\d{3,6}$/i.test(t) || /^\d{3,6}$/.test(t));
        if (idToken) studentId = idToken;
      }

      if (!name && !studentId) continue;
      if (!name) name = `Student ${studentId}`;

      // Extract marks corresponding to subject columns
      const marksList: ParsedMark[] = [];
      for (const sub of subjectColumns) {
        const valToken = tokens[sub.index];
        if (valToken) {
          const num = parseFloat(valToken.replace(/[^0-9.]/g, ""));
          if (!isNaN(num)) {
            // Adjust maxMarks if score exceeds defaultMaxMarks
            const maxM = num > defaultMaxMarks ? (num > 50 ? 100 : 50) : defaultMaxMarks;
            marksList.push({
              subject: sub.name,
              marks: num,
              maxMarks: maxM,
              examType,
            });
          }
        }
      }

      // If marks were extracted or we have scores on the line
      if (marksList.length === 0) {
        // Fallback: extract all numbers in the line as scores for the subjects
        const numbers = tokens
          .map((t) => parseFloat(t.replace(/[^0-9.]/g, "")))
          .filter((n) => !isNaN(n) && n <= 100);

        if (numbers.length >= subjectColumns.length) {
          subjectColumns.forEach((sub, sIdx) => {
            const score = numbers[sIdx];
            if (score !== undefined) {
              const maxM = score > defaultMaxMarks ? 100 : defaultMaxMarks;
              marksList.push({
                subject: sub.name,
                marks: score,
                maxMarks: maxM,
                examType,
              });
            }
          });
        }
      }

      if (marksList.length > 0) {
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        students.push({
          studentId: studentId || undefined,
          name: name.trim(),
          email: `${cleanName || "student"}@demo.com`,
          class: defaultClass,
          section: defaultSection,
          gender: "Other",
          marks: marksList,
          academicMarks: marksList,
        });
      }
    }
  }

  return { students, subjects: Array.from(subjectsSet) };
}

/**
 * Parses block/transcript format (e.g. Name: ..., Marks: Subject: 85)
 */
function tryParseBlockTranscript(
  rawText: string,
  defaultMaxMarks: number,
  examType: "unit_test" | "midterm" | "final" | "assignment",
  defaultClass: string,
  defaultSection: string
): { students: ParsedStudent[]; subjects: string[] } {
  const students: ParsedStudent[] = [];
  const subjectsSet = new Set<string>();

  // Split into student blocks if multiple students exist
  const nameOccurrences = (rawText.match(/(?:^|\n)\s*(?:Student\s+)?Name\s*:/gi) || []).length;
  let blocks: string[] = [];

  if (nameOccurrences > 1) {
    blocks = rawText.split(/(?:\n(?=(?:Student\s+)?Name\s*:)|(?=\n--- Page \d+ ---))/i);
  } else {
    blocks = [rawText];
  }
  blocks = blocks.filter((b) => b.trim().length > 20);

  for (const block of blocks) {
    let name = "Unknown Student";
    let studentId = "";
    let sClass = defaultClass;
    let sSection = defaultSection;
    let sGender = "Other";

    // Extract basic fields
    const nameMatch = block.match(/(?:Name|Student\s*Name)[\s:]+([^\n,]+)/i);
    if (nameMatch) name = nameMatch[1].trim();

    const idMatch = block.match(/(?:Roll\s*No|Reg\s*No|USN|HT\s*No|Student\s*ID|ID)[\s:]+([A-Za-z0-9\-]+)/i);
    if (idMatch) studentId = idMatch[1].trim();

    const classMatch = block.match(/(?:Class|Grade)[\s:]+([A-Za-z0-9]+)/i);
    if (classMatch) sClass = classMatch[1].trim();

    const secMatch = block.match(/(?:Section|Sec)[\s:]+([A-Za-z0-9]+)/i);
    if (secMatch) sSection = secMatch[1].trim();

    const genderMatch = block.match(/Gender[\s:]+([A-Za-z]+)/i);
    if (genderMatch) {
      const g = genderMatch[1].toLowerCase();
      sGender = g.startsWith("f") ? "Female" : g.startsWith("m") ? "Male" : "Other";
    }

    // Extract Marks line-by-line to avoid multiline token bleed
    const marksList: ParsedMark[] = [];
    const blockLines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const bLine of blockLines) {
      if (/^(?:name|student|roll|reg|usn|ht|id|class|grade|sec|section|gender|sex|total|academic|internal|performance|record)/i.test(bLine)) {
        continue;
      }
      const lineMatch = bLine.match(/^([a-zA-Z0-9\s&]{2,35})[\s:]+(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+))?$/);
      if (lineMatch) {
        const candidateSub = lineMatch[1].trim();
        const score = parseFloat(lineMatch[2]);
        const maxM = lineMatch[3] ? parseFloat(lineMatch[3]) : defaultMaxMarks;

        if (isPotentialSubject(candidateSub) && !isNaN(score)) {
          const normSub = normalizeSubjectName(candidateSub);
          subjectsSet.add(normSub);
          marksList.push({
            subject: normSub,
            marks: score,
            maxMarks: maxM,
            examType,
          });
        }
      }
    }

    if (marksList.length > 0) {
      if (name === "Unknown Student" && studentId) {
        name = `Student ${studentId}`;
      }
      const cleanName = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      students.push({
        studentId: studentId || undefined,
        name: name.trim(),
        email: `${cleanName || "student"}@demo.com`,
        class: sClass,
        section: sSection,
        gender: sGender,
        marks: marksList,
        academicMarks: marksList,
      });
    }
  }

  return { students, subjects: Array.from(subjectsSet) };
}
