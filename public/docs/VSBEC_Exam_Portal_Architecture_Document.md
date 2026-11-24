# PATENT SPECIFICATION DOCUMENT: DRAWINGS & ARCHITECTURAL SPECIFICATION

## TITLE OF THE INVENTION
**AN AUTONOMOUS EXAMINATION MANAGEMENT, ANONYMIZED DUMMY NUMBER MAPPING, AND ARTIFICIAL INTELLIGENCE-DRIVEN EVALUATION SCHEME GENERATION FRAMEWORK**

---

## LIST OF FIGURES
- **FIG. 1**: High-Level System Architecture and End-to-End Pipeline of the Autonomous Examination Evaluation, Dummy Number Mapping, and AI-Driven Scheme Generation Framework (AEE-DMSGF).
- **FIG. 2**: Flowchart of the Optical Barcode & Anonymized Dummy Number Lifecycle from Candidate Seating to Post-Valuation De-Anonymization.
- **FIG. 3**: Sequence Flow of the AI-Powered Question Paper Semantic Parsing, Bloom's Taxonomy Cognitive Classification, and Institutional Rubric Generation.
- **FIG. 4**: Temporal State-Transition Diagram of the Autonomous Continuous Assessment Lock/Unlock Governance Protocol.
- **FIG. 5**: Multi-Tier Anna University R-2021 CBCS 10-Point Grade Point, SGPA/CGPA, and Outcome-Based Education (OBE) Attainment Pipeline.

---

## DETAILED DESCRIPTION OF DRAWINGS

### FIG. 1: HIGH-LEVEL ARCHITECTURAL PIPELINE
Referring to **FIG. 1**, the system comprises four interconnected operational tiers:
1. **Data Ingestion Tier (100)**:
   - *Student Master Database (101)*: Contains departmental records for Artificial Intelligence and Data Science (AI&DS), academic years (Years I to IV), semesters (Semesters 1 to 8), sections, and candidate registration numbers.
   - *Question Paper Repository (102)*: Encrypted digital question papers partitioned into Part A, Part B, and Part C formats.
   - *Examination Attendance Feeds (103)*: Real-time invigilator seating manifests flagging Present, Absent, and On-Duty (OD) candidates.
   - *Curriculum & OBE Regulation Base (104)*: Anna University Regulation 2021 CBCS credit mappings and Course Outcome (CO1–CO5) matrices.
   - *Parent Directory (105)*: Telecom Regulatory Authority of India (TRAI) Distributed Ledger Technology (DLT) registered mobile contacts.

2. **Secure Processing & AI Engine Tier (200)**:
   - *Optical Barcode & Dummy Number Mapper (201)*: Asymmetric pseudo-random hash generator creating high-entropy dummy codes (`DM-XXXX-AIDS-XX`) and printing Code-128 / QR barcodes on detachable counterfoils.
   - *COE Cryptographic Hash Vault (202)*: Hardware/database security module storing the isolated de-anonymization lookup table inaccessible to evaluators.
   - *AI Scheme & Rubrics Generator (203)*: Integrated Large Language Model (Gemini Pro) tokenizer performing hierarchical question deconstruction, Bloom's Taxonomy classification (K1–K6), and step-by-step mark rubric calculation.
   - *Discrepancy & Optical Verifier (204)*: Automated parity reconciliation engine identifying missing scripts, duplicate scans, out-of-bounds mark allocations, and totaling errors.

3. **Valuation & Governance Tier (300)**:
   - *Continuous Assessment Lock/Unlock Controller (301)*: Dynamic schedule window monitor enforcing automatic mark entry freezing upon deadline expiration with cryptographic audit logging.
   - *Faculty Valuation & Mark Upload Portal (302)*: Subject staff portal with automated dropdowns for Year, Semester, Section, Subject Code, Subject Name, and assigned staff mapping.
   - *Autonomous CBCS Grading Core (303)*: Weighted internal (CIA-1, CIA-2, Model) and external mark aggregation with 10-point letter scale classification (`O`, `A+`, `A`, `B+`, `B`, `C`, `U`).
   - *Cryptographic Re-Identification Module (304)*: Post-valuation safe unmasking linking verified dummy scores back to student registration numbers.

4. **Telemetry & Output Tier (400)**:
   - *COE Official Transcripts (401)*: Autonomous grade cards, semester mark sheets, and QR-verified institutional transcripts.
   - *DLT SMS Alert Engine (402)*: Automated messaging pipeline dispatching personalized CIA mark notifications and class statistics.
   - *Attendance Risk Telemetry (403)*: Automated warning dispatch for cumulative attendance under 75% to prevent exam condonation penalties.
   - *Department Analytics Console (404)*: NBA/NAAC outcome-based education attainment metrics and pass percentage telemetry for AI&DS leadership.

---

### FIG. 2: DUMMY NUMBER LIFECYCLE & DESENSITIZATION FLOW
```
[Student Registration No.] 
        │
        ▼
[Cryptographic Hash Algorithm] ──────► [AES-256 COE Secure Vault] (LOCKED)
        │
        ▼
[Anonymized Dummy Code (e.g., DM-2026-AIDS-4A-0842)]
        │
        ▼
[Print Code-128 Barcode on Answer Script Counterfoil]
        │
        ▼
[Detachable Counterfoil Separated at COE Office]
        │
        ▼
[Evaluator Receives ONLY Anonymized Script + AI Rubric]
        │
        ▼
[Marks Entered Against Dummy ID]
        │
        ▼
[Automated Parity & Bounds Check Passed]
        │
        ▼
[COE Authorized Re-Identification via Encrypted Hash Key]
        │
        ▼
[Official Consolidated Gazette Published]
```

---

### FIG. 3: AI QUESTION PAPER PARSING & RUBRIC GENERATION PIPELINE
```
[Uploaded Question Paper (PDF / DOCX)]
        │
        ▼
[Optical Tokenization & Section Segmentation (Part A / B / C)]
        │
        ▼
[Semantic Analysis via Gemini LLM Engine]
  ├── Identify Core Topic & Syllabus Unit
  ├── Match Action Verbs (Define, Explain, Design, Compute)
  ├── Categorize Bloom's Cognitive Level (K1 to K6)
  └── Link Course Outcome (CO1 to CO5)
        │
        ▼
[Model Solution & Mark Allocation Synthesis]
  ├── Step-by-Step Derivation / Analytical Answer
  ├── Intermediate Formula & Point Allocation Rubric
  └── Alternate Solution Recognition
        │
        ▼
[Direct Export to Formatted Institutional Word/PDF Template]
```

---

### FIG. 4: TEMPORAL CONTINUOUS ASSESSMENT LOCK/UNLOCK STATE MACHINE
```
       [SCHEDULE DEFINED BY COE]
                  │
                  ▼
          ┌───────────────┐
          │  STATE: OPEN  │ ◄──────────┐
          │ Staff Enter   │            │
          │ Upload Marks  │            │ COE Authorized
          └───────┬───────┘            │ Override with
                  │ Deadline Reached   │ Justification &
                  │ (Timestamp Expiry) │ Audit Snapshot
                  ▼                    │
          ┌───────────────┐            │
          │ STATE: LOCKED │ ───────────┘
          │ Read-Only     │
          │ Freeze Active │
          └───────┬───────┘
                  │
                  ▼
     [COE Final Approval & Gazette Release]
```

---

### FIG. 5: MULTI-TIER CBCS GRADING & OBE ATTAINMENT FLOW
```
[Internal Assessment Marks (CIA-1, CIA-2, Model, Assignments)]
                          │
                          ▼
            [Weighted Aggregation Matrix]
                          │
                          ▼
   [Anna University R-2021 Grade Point Conversion (0 to 10)]
       O: 91-100 (10)  │  A+: 81-90 (9)  │  A: 71-80 (8)
      B+: 61-70  (7)   │   B: 50-60 (6)  │  C: 45-49 (5)
                       U: <45 (0)
                          │
                          ▼
           [SGPA = Σ(Ci × GPi) / Σ(Ci)]
                          │
                          ▼
             [Cumulative CGPA Calculation]
                          │
                          ├──► [Official Autonomous Grade Card]
                          ├──► [CO-PO Attainment Calculation (Levels 1-3)]
                          └──► [DLT SMS Dispatch to Registered Parents]
```
