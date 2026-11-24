# PATENT SPECIFICATION DOCUMENT: COMPLETE DESCRIPTION

## TITLE OF THE INVENTION
**AN AUTONOMOUS EXAMINATION MANAGEMENT, ANONYMIZED DUMMY NUMBER MAPPING, AND ARTIFICIAL INTELLIGENCE-DRIVEN EVALUATION SCHEME GENERATION FRAMEWORK**

---

## 1. FIELD OF THE INVENTION
The present invention relates generally to educational technology, computerized examination administration, and academic audit systems. More specifically, the present invention relates to an autonomous, end-to-end examination evaluation platform integrating cryptographically secure dummy number barcode mapping, artificial intelligence-driven question paper semantic parsing and scoring rubric generation, role-based continuous assessment window locking, automated Choice Based Credit System (CBCS) grade point computation, and regulatory DLT-compliant parent communication telemetry.

---

## 2. BACKGROUND OF THE INVENTION
In higher education institutions, autonomous engineering colleges, and universities, the management of continuous internal assessments (CIA) and end-semester examinations is a mission-critical process demanding high academic rigor, zero-defect integrity, and absolute confidentiality. Conventional examination administration workflows suffer from several structural and technical vulnerabilities:

1. **Identity Bias in Evaluation**: In conventional valuation setups, candidate registration numbers and student identity markers are frequently visible or poorly concealed on answer booklets, introducing conscious or unconscious subjective bias during manual grading.
2. **Manual and Error-Prone Dummy Number Generation**: Conventional dummy numbering relies on manual ledger entry, paper counterfoil tearing, or offline spreadsheets, creating bottlenecks, reconciliation lag, and vulnerability to transcription errors or identity leaks.
3. **Absence of Standardized Solution Rubrics**: Evaluators frequently evaluate descriptive answer scripts without uniform, step-by-step partial-marking keys, resulting in high inter-evaluator scoring variances for identical student responses. Preparing comprehensive answer keys mapped to Bloom's Revised Taxonomy (K1–K6) and Course Outcomes (CO1–CO5) manually is labor-intensive and delayed.
4. **Post-Deadline Grade Tampering & Unauthorized Modifications**: Conventional portals lack strict administrative lock/unlock workflows, allowing retrospective grade edits without comprehensive audit logging or COE authorization.
5. **Delayed Stakeholder Communication**: Dispatching marks to parents and guardians typically requires manual compilation, leading to delayed academic intervention for students with attendance shortages (<75%) or poor academic trajectories.

Therefore, there exists an acute technological need for an integrated, autonomous examination platform that seamlessly couples blind cryptographic dummy mapping, generative AI question paper parsing, automated scheme creation, strict time-locked mark governance, and regulatory-compliant parent alert automation.

---

## 3. OBJECTIVE OF THE INVENTION
The primary objectives of the present invention are:
- To provide an automated, cryptographic **Dummy Number & Barcode Generation Engine** that guarantees complete anonymity during examination valuation while preserving 100% auditability for the Controller of Examinations (COE).
- To provide an **AI-Driven Question Paper Semantic Parser and Answer Key Generator** capable of parsing complex technical question papers, assigning Bloom's Taxonomy cognitive levels, linking Course Outcomes, and producing structured marking rubrics in standardized institutional formats.
- To implement an **Autonomous Continuous Assessment Window Lock/Unlock Controller** that enforces strict deadlines across academic years, semesters, and sections with cryptographic audit trails.
- To execute an **Autonomous Multi-Tier CBCS Grade Point Computation Engine** adhering to Anna University R-2021 regulations, automating SGPA/CGPA evaluation, normalization, and mark transcript production.
- To provide an automated **DLT-Registered Parent Communication Pipeline** that dispatches personalized SMS alerts for internal marks, class averages, and statutory attendance shortages.

---

## 4. SUMMARY OF THE INVENTION
The present invention provides an **Autonomous Examination Evaluation, Dummy Number Mapping, and AI-Driven Scheme Generation Framework (AEE-DMSGF)**. 

The framework comprises five core architectural components:
1. **Secure Optical Barcode & Dummy Number Mapping Engine**: Ingests student enrollment databases, generates non-reversible pseudorandom dummy sequences, prints tamper-evident barcodes on answer script counterfoils, and maintains a secure hash lookup table in an isolated COE repository.
2. **AI Question Paper Ingestion & Rubric Generation Engine**: Utilizes a Large Language Model (LLM) processor to tokenize uploaded question papers, detect syllabus modules, assign cognitive levels (K1–K6), map Course Outcomes, and synthesize comprehensive, step-by-step model answers and point-allocation rubrics directly into downloadable Word/PDF templates.
3. **Role-Based Mark Entry & COE Lock/Unlock Module**: Provides granular, role-based dashboards for Subject Faculty, HODs, and COE administrators. Incorporates an automated temporal lock that freezes mark entry upon schedule expiration and permits administrative overrides solely with cryptographic logging.
4. **Multi-Tier CBCS Calculation & Attainment Engine**: Automates the processing of Continuous Internal Assessments (CIA-1, CIA-2, Model Exams) and End Semester Examinations (ESE), calculating 10-point letter grades, credit-weighted SGPA/CGPA, and Outcome-Based Education (OBE) course attainment matrices.
5. **TRAI DLT-Compliant Institutional SMS & Telemetry Dispatcher**: Directly integrates with telecommunication gateways using verified institutional headers to automatically transmit multi-attribute performance reports, risk advisories, and real-time attendance warnings to guardians.

---

## 5. DETAILED DESCRIPTION OF THE INVENTION
The system architecture and functional workflows of the present invention are described in detail across the following operational modules:

### Module 1: Secure Optical Barcode & Dummy Number Anonymous Mapping Engine
- **Data Ingestion & Verification**: The engine ingests candidate master lists categorized by Academic Year, Department (e.g., Artificial Intelligence & Data Science), Semester, and Section. It validates attendance records against exam hall seat allocation registers.
- **Cryptographic Dummy Generation**: An asymmetric pseudonymization algorithm transforms each real student registration number into a randomized, high-entropy dummy code (e.g., `DM-2026-AIDS-4A-0842`).
- **Counterfoil Generation**: Generates high-density Code-128 / QR barcodes on detachable counterfoils. Evaluators grade only the dummy-coded main answer booklet. The mapping key remains locked inside an AES-256 encrypted COE vault until valuation completion.
- **Parity Reconciliation**: Automatically cross-checks total script counts against present/absent candidate flags, highlighting missing booklets or duplicate scans prior to distribution.

### Module 2: AI-Powered Question Paper Semantic Ingestion & Rubric Generator
- **Multi-Format Ingestion**: Ingests question papers in PDF, DOCX, or scanned high-resolution image formats.
- **Hierarchical Question Parsing**: Deconstructs the paper into Part A (short answer, fundamental concept questions), Part B (analytical, detailed derivations, algorithmic designs), and Part C (application-oriented case studies).
- **Cognitive Level & CO Alignment**: Leverages an integrated Gemini LLM instance to evaluate each question prompt against Bloom's Revised Taxonomy verbs, assigning cognitive domain ratings (K1: Remember, K2: Understand, K3: Apply, K4: Analyze, K5: Evaluate, K6: Create) and corresponding Course Outcomes (CO1 to CO5).
- **Dynamic Model Answer & Rubric Synthesis**: Generates authoritative solutions, step-by-step numerical calculations, circuit diagrams, and sub-mark allocations (e.g., formula: 2 marks, substitution: 4 marks, final result with units: 2 marks). The output is formatted directly into standard institutional Word templates for one-click faculty download.

### Module 3: Role-Based Continuous Assessment Lock/Unlock Governance
- **Role Differentiation**: Granular permission hierarchies differentiate COE Super-Admins, Department Chairs, Subject Staff, and External Examiners.
- **Automated Window Freezing**: Each assessment cycle (CIA-1, CIA-2, Model Exam, Lab Practical) is governed by strict opening and closing timestamps. Once closed, the user interface shifts to a read-only state.
- **Cryptographic Audit Trail**: Any request to reopen mark entry requires administrative approval. The system records the modifying user ID, timestamp, IP address, justification code, and a snapshot of previous marks to prevent silent tampering.

### Module 4: Multi-Tier CBCS Calculation & Course Attainment Engine
- **Grade Mapping Under R-2021 CBCS**: Automates mark aggregation across split question components and maps percentage aggregates into Anna University R-2021 grading scales:
  - `O` (Outstanding): 91–100% (Grade Point 10)
  - `A+` (Excellent): 81–90% (Grade Point 9)
  - `A` (Very Good): 71–80% (Grade Point 8)
  - `B+` (Good): 61–70% (Grade Point 7)
  - `B` (Above Average): 50–60% (Grade Point 6)
  - `C` (Pass): 45–49% (Grade Point 5)
  - `U` (Re-appear): <45% (Grade Point 0)
- **SGPA & CGPA Computation**: Calculates semester-wise SGPA through credit-weighted summation:
  $$\text{SGPA} = \frac{\sum (C_i \times GP_i)}{\sum C_i}$$
  and updates cumulative CGPA dynamically.
- **Outcome-Based Education (OBE) Attainment**: Aggregates question-level marks mapped to specific COs to calculate direct course attainment levels (Level 1: 50–60%, Level 2: 60–70%, Level 3: >70% attainment threshold).

### Module 5: DLT-Compliant Real-Time Institutional Telemetry & Alert Dispatcher
- **Regulatory DLT Integration**: Connects with telecom SMS infrastructure using pre-approved Principal Entity IDs and registered sender headers compliant with national telecom regulations.
- **Automated Trigger Pipeline**: Upon COE publication of marks or weekly attendance consolidation, the dispatcher compiles personalized student performance summaries.
- **Attendance Warning Automation**: Identifies students with attendance percentages below 75% and dispatches proactive regulatory warnings to parents detailing condonation and red-list thresholds.
- **Transmission Analytics**: Maintains delivery audit logs, retry queues, and confirmation receipts within the administrative telemetry console.

---

## 6. ADVANTAGES OF THE INVENTION
1. **Absolute Blind Valuation**: Eliminates evaluator bias and external influence by strictly decoupling student identity from answer scripts.
2. **Standardized Grading Quality**: AI-generated step-by-step rubrics ensure objective, uniform mark allocation across multiple evaluators and academic sections.
3. **Zero Post-Deadline Grade Tampering**: Cryptographic time-locking prevents retroactive score changes and ensures compliance with institutional accreditation bodies (NBA, NAAC).
4. **Significant Time Savings**: Automates hours of manual question paper alignment, syllabus mapping, answer key drafting, and mark compilation.
5. **Proactive Student Retention**: Instantaneous DLT-compliant parent notifications allow timely academic interventions before end-semester examinations.

---

## 7. CONCLUSION
The present invention provides a comprehensive, automated, and secure examination management ecosystem that resolves the operational vulnerabilities of conventional academic administration. By coupling cryptographic dummy barcode mapping, generative AI semantic parsing for answer key generation, strict window-locking governance, automated CBCS grading, and regulatory telecommunication alerts, the invention ensures peak integrity, transparency, and operational efficiency for autonomous higher educational institutions.
