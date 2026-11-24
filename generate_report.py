import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

doc = docx.Document()

# Page Margins
for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.25)
    section.right_margin = Inches(1.0)

MAROON = RGBColor(128, 0, 0)
NAVY = RGBColor(0, 32, 96)
BLACK = RGBColor(0, 0, 0)
DARK_GRAY = RGBColor(80, 80, 80)

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def add_p(text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False, italic=False, color=BLACK, space_after=6, space_before=0):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.2
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    return p

def add_h1(text):
    return add_p(text, align=WD_ALIGN_PARAGRAPH.LEFT, font_size=14, bold=True, color=MAROON, space_before=14, space_after=6)

def add_h2(text):
    return add_p(text, align=WD_ALIGN_PARAGRAPH.LEFT, font_size=12, bold=True, color=NAVY, space_before=10, space_after=4)

def add_h3(text):
    return add_p(text, align=WD_ALIGN_PARAGRAPH.LEFT, font_size=11, bold=True, color=BLACK, space_before=8, space_after=3)

def add_table(headers, rows):
    table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], '800000')
        for p in hdr_cells[i].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(10)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
                
    for r_idx, row in enumerate(rows):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = 'F8F9FA' if r_idx % 2 == 1 else 'FFFFFF'
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = str(val)
            if bg_color != 'FFFFFF':
                set_cell_background(row_cells[c_idx], bg_color)
            for p in row_cells[c_idx].paragraphs:
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.space_before = Pt(2)
                for r in p.runs:
                    r.font.name = 'Times New Roman'
                    r.font.size = Pt(9.5)
                    r.font.color.rgb = BLACK
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

# ================= TITLE PAGE =================
add_p("RESOLVEX: AN EXPLAINABLE MULTI-AGENT AI COPILOT FOR CONTRACT RISK AND COMPLIANCE ANALYSIS", 
      align=WD_ALIGN_PARAGRAPH.CENTER, font_size=16, bold=True, color=MAROON, space_after=18)

add_p("A PROJECT REPORT", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=12, bold=True, space_after=12)
add_p("Submitted by", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=11, italic=True, space_after=6)

add_table(["STUDENT NAME", "REGISTER NUMBER"], [
    ["RAM PRADEEP R P", "922524243164"],
    ["PRAVEEN P", "922524243153"]
])

add_p("in partial fulfillment for the award of the degree of", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=11, italic=True, space_before=10, space_after=6)
add_p("BACHELOR OF TECHNOLOGY", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=13, bold=True, space_after=4)
add_p("IN", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=11, bold=True, space_after=4)
add_p("ARTIFICIAL INTELLIGENCE AND DATA SCIENCE", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=13, bold=True, color=NAVY, space_after=14)

add_p("V.S.B. ENGINEERING COLLEGE, KARUR - 639 111\n(AN AUTONOMOUS INSTITUTION)\nANNA UNIVERSITY :: CHENNAI 600 025", 
      align=WD_ALIGN_PARAGRAPH.CENTER, font_size=12, bold=True, space_after=14)
add_p("NOVEMBER 2026", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=12, bold=True, space_after=20)

doc.add_page_break()

# ================= BONAFIDE CERTIFICATE =================
add_p("ANNA UNIVERSITY : CHENNAI 600 025", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=13, bold=True, color=MAROON, space_after=6)
add_p("BONAFIDE CERTIFICATE", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14, bold=True, space_after=16)

add_p("Certified that this project report titled \"RESOLVEX: AN EXPLAINABLE MULTI-AGENT AI COPILOT FOR CONTRACT RISK AND COMPLIANCE ANALYSIS\" is the Bonafide work of \"RAM PRADEEP R P (922524243164), PRAVEEN P (922524243153)\" who carried out the work under my supervision.",
      align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, space_after=24)

add_table(["HEAD OF THE DEPARTMENT", "PROJECT SUPERVISOR"], [
    ["SIGNATURE\n\nDr. K. MANIVANNAN, M.Tech., Ph.D.\nHEAD OF THE DEPARTMENT\nDepartment of AI & DS\nV.S.B. Engineering College\nKarur - 639 111.",
     "SIGNATURE\n\nDr. K. MANIVANNAN, M.Tech., Ph.D.\nSUPERVISOR / Assistant Professor\nDepartment of AI & DS\nV.S.B. Engineering College\nKarur - 639 111."]
])

add_p("Submitted for Anna University Project Viva-Voce held on ____________________", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=11, italic=True, space_before=20, space_after=14)
add_table(["INTERNAL EXAMINER", "EXTERNAL EXAMINER"], [
    ["SIGNATURE:\nNAME:\nDATE:", "SIGNATURE:\nNAME:\nDATE:"]
])

doc.add_page_break()

# ================= ACKNOWLEDGEMENT =================
add_p("ACKNOWLEDGEMENT", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14, bold=True, color=MAROON, space_after=14)
add_p("First and foremost, we express our thanks to our parents for providing us with a very nice environment for doing this project. We wish to express our sincere thanks to our founder and Chairman Shri. V. S. BALSAMY, B.Sc., L.L.B., for his endeavour in educating us in this premier institution.")
add_p("We extend our gratitude to Dr. C. VENNILA, M.E., Ph.D., Principal and Dr. T. S. KIRUBA SHANKAR, M.E., Ph.D., Vice Principal, V.S.B. ENGINEERING COLLEGE, KARUR for their high degree of encouragement and moral support during this project.")
add_p("We express our indebtedness to Dr. K. MANIVANNAN, M.Tech., Ph.D., Head of the Department, Department of Artificial Intelligence and Data Science for his valuable support.")
add_p("We are grateful to our Project Supervisor Dr. K. MANIVANNAN, M.Tech., Ph.D., Assistant Professor, Department of Artificial Intelligence and Data Science for his guidance throughout the course of our project.")
add_p("Our sincere thanks to all the faculty members of V.S.B. Engineering College and our friends for their help in the successful completion of this project work.")
add_p("Finally, we bow before God, the Almighty who always had a better plan for us. We give our praise and glory to almighty god for the successful completion of our project.")

doc.add_page_break()

# ================= VISION & MISSION =================
add_p("DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=13, bold=True, color=MAROON, space_after=10)
add_h2("Vision of the Institute")
add_p("We endeavor to impart futuristic technical education of the highest quality to the student community and to inculcate discipline in them to face the world with self-confidence and thus we prepare them for life as responsible citizens to uphold human values and to be of service at large. We strive to bring up the Institution as an Institution of academic excellence of international standard.")
add_h2("Mission of the Institute")
add_p("We transform persons into personalities by the state-of-the-art infrastructure, time consciousness, quick response and the best academic practices through assessment and advice.")
add_h2("Vision of the Department")
add_p("To emerge as a premier centre of excellence in Artificial Intelligence and Data Science by creating globally competent professionals, advancing impactful research, fostering innovation and entrepreneurship, and developing ethical, intelligent technologies for a sustainable and inclusive society.")
add_h2("Mission of the Department")
add_p("1. Provide world-class education through innovative pedagogy, outcome-based learning, and industry-aligned curricula in Artificial Intelligence and Data Science.\n"
      "2. Promote interdisciplinary research, innovation, and lifelong learning to address global challenges through intelligent and data-driven solutions.\n"
      "3. Collaborate with industries, research institutions, and professional bodies to enhance experiential learning, technology development, and employability.\n"
      "4. Cultivate ethical leadership, entrepreneurial mindset, social responsibility, and professional excellence for sustainable technological advancement.")

add_h2("Program Educational Objectives (PEOs)")
add_p("PEO1: Graduates will excel as competent professionals by applying Artificial Intelligence, Data Science, and computational intelligence to develop innovative solutions for complex engineering, industrial, and societal problems.\n"
      "PEO2: Graduates will engage in lifelong learning, research, higher education, and technological innovation by adopting emerging AI technologies and contributing to knowledge creation and sustainable development.\n"
      "PEO3: Graduates will exhibit ethical values, leadership, entrepreneurial mindset, and effective communication while contributing to multidisciplinary teams and creating technology solutions with global impact.")

add_h2("Program Outcomes (POs) & Program Specific Outcomes (PSOs)")
add_p("PO1 to PO11 cover Engineering Knowledge, Problem Analysis, Design/Development of Solutions, Conduct Investigations of Complex Problems, Modern Tool Usage, The Engineer and The World, Ethics, Individual and Collaborative Team work, Communication, Project Management and Finance, and Life-Long Learning.\n"
      "PSO1: AI & Data Science - Design, implement, and optimize intelligent systems using NLP, Deep Learning, and Computer Vision.\n"
      "PSO2: Data Analytics - Advanced data engineering, analytics, visualization, and predictive modeling.\n"
      "PSO3: Intelligent Systems - Scalable, reliable, secure, and ethical AI-enabled solutions integrating cloud computing, Generative AI, and MLOps.")

doc.add_page_break()

# ================= ABSTRACT =================
add_p("ABSTRACT", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14, bold=True, color=MAROON, space_after=14)
add_p("Reviewing legal contracts by hand is slow, expensive and inconsistent, and risky clauses such as uncapped liability, one-sided indemnity, missing confidentiality or absent data-protection terms are easy to overlook in long agreements. This project presents ResolveX, a full-stack AI copilot (backend engine named LexIntel AI) that audits vendor agreements, service agreements, NDAs, employment, licensing, procurement and government contracts and presents the outcome as an explainable, visual web application. The backend is built with FastAPI and asynchronous SQLAlchemy and orchestrates a five-agent pipeline: document ingestion (PDF, DOCX, text and OCR for scanned files), clause segmentation and classification, rule-driven risk scoring and compliance validation using configurable JSON and YAML rule sets, policy knowledge retrieval using a hybrid semantic and keyword Retrieval-Augmented Generation (RAG) engine, and an explainability agent that produces plain-language reasoning and redline suggestions through a large language model. A workflow state machine provides retry, cancellation and audit trails, and the API is hardened with security headers, rate limiting and request tracing. A React, TypeScript and Tailwind CSS frontend with ten screens visualises clauses, risks, agents and reports. The system was verified with 80 automated tests, all of which pass, and was exercised end to end on eight sample contracts. A ten-section Master Services Agreement was segmented into all ten clauses in about 1.8 seconds, and the pipeline degrades gracefully when the language-model provider is unavailable. After completion of this project PO1, PO2, PO3, PO4, PO5, PO6, PO7, PO8, PO9, PO10, PO11 and PSO1, PSO2, PSO3 are attained.")

doc.add_page_break()

# ================= TABLE OF CONTENTS =================
add_p("TABLE OF CONTENTS", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14, bold=True, color=MAROON, space_after=14)
toc_rows = [
    ["", "ABSTRACT", "vii"],
    ["", "LIST OF FIGURES", "xi"],
    ["", "LIST OF ABBREVIATIONS", "xii"],
    ["1", "INTRODUCTION", "1"],
    ["", "1.1 BACKGROUND", "2"],
    ["", "1.2 CAUSES", "3"],
    ["", "1.3 MOTIVATIONS", "3"],
    ["", "1.4 USAGES", "4"],
    ["", "1.5 CLASSIFICATIONS", "5"],
    ["", "1.6 OBJECTIVES", "6"],
    ["", "1.7 SCOPE AND LIMITATIONS", "6"],
    ["", "1.8 ORGANISATION OF THE REPORT", "7"],
    ["2", "LITERATURE SURVEY", "8"],
    ["3", "SYSTEM ANALYSIS", "13"],
    ["", "3.1 EXISTING SYSTEM", "14"],
    ["", "3.2 EXISTING SYSTEM DISADVANTAGES", "14"],
    ["", "3.3 PROPOSED SYSTEM", "15"],
    ["", "3.4 PROPOSED SYSTEM ADVANTAGES", "15"],
    ["4", "SYSTEM SPECIFICATION", "17"],
    ["", "4.1 HARDWARE REQUIREMENTS", "18"],
    ["", "4.2 SOFTWARE REQUIREMENTS", "18"],
    ["", "4.3 DEVELOPMENT ENVIRONMENT AND SETUP", "20"],
    ["", "4.4 DEVELOPMENT TOOLS AND VERSION CONTROL", "21"],
    ["5", "IMPLEMENTATION", "23"],
    ["", "5.1 SYSTEM ARCHITECTURE", "24"],
    ["", "5.2 MODULES USED", "28"],
    ["", "5.3 MODULES DESCRIPTION", "29"],
    ["6", "SYSTEM DESIGN", "41"],
    ["", "6.1 INTRODUCTION", "42"],
    ["", "6.2 CLASS DIAGRAM", "42"],
    ["", "6.3 USE CASE DIAGRAM", "43"],
    ["", "6.4 SEQUENCE DIAGRAM", "44"],
    ["", "6.5 ACTIVITY DIAGRAM", "45"],
    ["", "6.6 DATA FLOW DIAGRAM", "46"],
    ["7", "SYSTEM TESTING", "47"],
    ["", "7.1 TESTING", "48"],
    ["", "7.2 TYPES OF TESTING", "48"],
    ["", "7.3 RESULTS", "49"],
    ["", "7.4 DISCUSSIONS", "53"],
    ["", "7.5 TEST CASE CATALOGUE", "55"],
    ["", "7.6 SUMMARY OF MEASURED RESULTS", "57"],
    ["8", "FEASIBILITY STUDY", "58"],
    ["", "8.1 FEASIBILITY ANALYSIS", "59"],
    ["", "8.2 METHODOLOGY", "60"],
    ["", "8.3 RISK ANALYSIS AND MITIGATION", "63"],
    ["9", "CONCLUSION AND FUTURE ENHANCEMENT", "65"],
    ["", "9.1 CONCLUSION", "66"],
    ["", "9.2 FUTURE ENHANCEMENT", "68"],
    ["", "APPENDICES (CODE, OUTPUTS, USER GUIDE, GLOSSARY)", "71"],
    ["", "REFERENCES & BIBLIOGRAPHY", "97"]
]
add_table(["CHAPTER NO.", "TITLE", "PAGE NO."], toc_rows)

doc.add_page_break()

# ================= LIST OF FIGURES =================
add_p("LIST OF FIGURES", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14, bold=True, color=MAROON, space_after=14)
fig_rows = [
    ["Fig 5.1", "System Architecture", "25"],
    ["Fig 5.2", "Workflow State Machine", "26"],
    ["Fig 5.3", "Multi-Agent Pipeline Architecture", "30"],
    ["Fig 5.4", "RAG Pipeline", "31"],
    ["Fig 6.1", "Class Diagram", "43"],
    ["Fig 6.2", "Use Case Diagram", "44"],
    ["Fig 6.3", "Sequence Diagram", "45"],
    ["Fig 6.4", "Activity Diagram", "46"],
    ["Fig 6.5", "Data Flow Diagram", "46"],
    ["Fig 7.1", "Automated Test Distribution", "50"],
    ["Fig 7.2", "Clause Risk Scores for the Sample MSA", "52"],
    ["Fig 8.1", "Methodology Overview", "61"],
    ["Fig B.1", "Overview Page", "85"],
    ["Fig B.2", "Upload Portal", "85"],
    ["Fig B.3", "Contract Viewer", "86"],
    ["Fig B.4", "Agent Monitor", "86"],
    ["Fig B.5", "Clause Explorer", "87"],
    ["Fig B.6", "Risk and Compliance Dashboard", "87"],
    ["Fig B.7", "Explainability Panel", "88"],
    ["Fig B.8", "Redline Recommendations", "88"],
    ["Fig B.9", "Executive Audit Report", "89"],
    ["Fig B.10", "Legal Analytics", "89"]
]
add_table(["FIGURE NO.", "NAME OF THE FIGURE", "PAGE NO."], fig_rows)

doc.add_page_break()

# ================= LIST OF ABBREVIATIONS =================
add_p("LIST OF ABBREVIATIONS", align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14, bold=True, color=MAROON, space_after=14)
abbr_rows = [
    ["1", "AI", "Artificial Intelligence"],
    ["2", "API", "Application Programming Interface"],
    ["3", "CORS", "Cross-Origin Resource Sharing"],
    ["4", "DOCX", "Office Open XML Word Document"],
    ["5", "GDPR", "General Data Protection Regulation"],
    ["6", "HTTP", "Hypertext Transfer Protocol"],
    ["7", "JSON", "JavaScript Object Notation"],
    ["8", "LLM", "Large Language Model"],
    ["9", "ML", "Machine Learning"],
    ["10", "MSA", "Master Services Agreement"],
    ["11", "NDA", "Non-Disclosure Agreement"],
    ["12", "NER", "Named Entity Recognition"],
    ["13", "NLP", "Natural Language Processing"],
    ["14", "OCR", "Optical Character Recognition"],
    ["15", "ORM", "Object Relational Mapper"],
    ["16", "RAG", "Retrieval-Augmented Generation"],
    ["17", "REST", "Representational State Transfer"],
    ["18", "SaaS", "Software as a Service"],
    ["19", "SLA", "Service Level Agreement"],
    ["20", "SPA", "Single Page Application"],
    ["21", "SQL", "Structured Query Language"],
    ["22", "UI", "User Interface"],
    ["23", "YAML", "YAML Ain’t Markup Language"]
]
add_table(["S. NO.", "ABBREVIATION", "EXPANSION"], abbr_rows)

doc.add_page_break()

# ================= CHAPTER 1 =================
add_h1("CHAPTER 1: INTRODUCTION")
add_h2("1.1 Background")
add_p("Contracts are the legal backbone of every business relationship. Vendor agreements, master service agreements, non-disclosure agreements, employment contracts, licensing deals and government procurement documents all define who must do what, who pays whom, who is liable when something goes wrong and which law governs the relationship. A single overlooked sentence, for example an indemnity with no upper limit or an intellectual-property assignment that quietly transfers ownership to the other party, can expose an organisation to losses far larger than the value of the contract itself.")
add_p("Traditionally, this scrutiny is performed by lawyers or contract managers who read every clause line by line and compare it with internal policy and applicable regulation. The approach is accurate when the reviewer is experienced and has enough time, but it does not scale. Organisations sign hundreds of agreements each year, templates drift, people differ in their judgement, and regulations such as the GDPR keep changing the list of provisions that a contract must contain.")
add_p("Recent progress in natural language processing has made it possible to automate parts of this work. Transformer language models can read long legal text, domain-specific models and datasets such as LEGAL-BERT and CUAD have shown that clause identification is learnable, and Retrieval-Augmented Generation (RAG) allows a language model to ground its answer in documents that are fetched at query time. ResolveX (backend engine: LexIntel AI) is built around exactly this idea: it accepts a contract, splits it into clauses, applies configurable legal and compliance rules, retrieves relevant policy knowledge, and then uses a language model only to explain the findings and to propose better wording.")

add_h2("1.2 Causes")
add_p("The need for an automated contract-intelligence system arises from several practical problems:\n"
      "• Manual effort: reading, tagging and comparing long agreements consumes large amounts of skilled legal time.\n"
      "• Inconsistency: reviewers classify clauses differently without a standardized rule base.\n"
      "• Hidden and missing clauses: absent provisions (governing law, confidentiality, data protection) are easy to overlook.\n"
      "• Changing regulation: privacy and AI laws (GDPR, EU AI Act) enforce tight contractual compliance.\n"
      "• Opaque AI tools: black-box LLMs return scores without auditability or traceable citations.\n"
      "• Fragmented tooling: spreadsheets, PDFs, emails and docs scatter evidence.")

add_h2("1.3 Motivations")
add_p("The project aims to build an explainable contract-review assistant using open technologies:\n"
      "1. Automatically parse unstructured PDF, DOCX, text and scanned contracts into structured clauses.\n"
      "2. Store legal logic in editable JSON/YAML rule files so policy owners update rules without programming.\n"
      "3. Combine deterministic rules for repeatable scoring with RAG and LLMs for plain-language reasoning.\n"
      "4. Make the multi-agent pipeline observable with state tracking, retries, and timing telemetry.\n"
      "5. Deliver an intuitive dashboard with interactive clause viewing and redline recommendations.\n"
      "6. Engineer a production-grade service with security headers, rate limiting, and request tracing.")

add_h2("1.4 Usages")
add_p("• Procurement & Vendor Management: Screening supplier agreements for liability, payment, and delivery risks.\n"
      "• Legal Teams: First-pass triage of incoming contracts to highlight high-risk clauses.\n"
      "• HR & Administration: Verifying employment agreements for confidentiality and non-compete terms.\n"
      "• Government Contracting: Auditing procurement provisions for statutory compliance.\n"
      "• Compliance Audits: Producing verifiable audit trails linking clauses to regulatory mandates.")

add_h2("1.5 Classifications")
add_p("• Contract Types: Service agreements, vendor agreements, NDAs, employment contracts, licensing deals, procurement and government contracts.\n"
      "• Clause Types: Definitions, scope, payment, confidentiality, termination, liability, warranty, indemnity, force majeure, IP, dispute resolution, governing law, data protection, etc.\n"
      "• Risk Severity: Informational, Low, Medium, High, and Critical.\n"
      "• Compliance Status: Compliant, Non-Compliant, Violated, Satisfied, Missing Requirement, Partially Compliant.")

add_h2("1.6 Objectives")
add_p("1. Build an end-to-end ingestion pipeline for PDF, DOCX, text, and scanned image documents.\n"
      "2. Implement deterministic clause segmentation and keyword-based classification with confidence scoring.\n"
      "3. Formulate transparent risk scoring using severity floors and externalized JSON/YAML rules.\n"
      "4. Develop a hybrid RAG engine combining semantic embedding vectors and lexical BM25 retrieval.\n"
      "5. Integrate an LLM explainability agent to generate contextual reasoning and redlines with fallback safeguards.\n"
      "6. Design an asynchronous REST API, workflow state machine, and 10-screen React interface.\n"
      "7. Verify with 80 automated unit/integration tests and validate on benchmark contracts.")

add_h2("1.7 Scope and Limitations")
add_p("Within Scope: Parsing, clause extraction, rule execution, hybrid RAG, LLM explanations, REST API, workflow state machine, and React UI.\n"
      "Outside Scope: Multi-tenant user RBAC, retraining base LLM foundation models, handwritten document recognition, and multi-lingual translation.")

# ================= CHAPTER 2 =================
add_h1("CHAPTER 2: LITERATURE SURVEY")
add_p("Recent literature establishes that while foundation models (Vaswani et al., 2017; Devlin et al., 2019) exhibit strong linguistic capabilities, pure generative models suffer from significant legal hallucinations (Dahl et al., 2024, reporting 69-88% error rates on verifiable legal facts). Consequently, legal-specific architectures require deterministic rule grounding, Retrieval-Augmented Generation (Lewis et al., 2020), and explainable verification (Ribeiro et al., 2016).")
add_table(["Ref", "Author & Area", "Key Contribution", "Relevance to ResolveX"], [
    ["[1]", "Vaswani et al. (Transformers)", "Self-attention mechanism processing sequences in parallel", "Foundation of generative LLM used in explainability"],
    ["[2]", "Devlin et al. (BERT)", "Bidirectional Transformer pre-training and fine-tuning", "Basis for downstream legal language understanding"],
    ["[3]", "Chalkidis et al. (LEGAL-BERT)", "Pre-training models on legal statutes and contracts", "Domain-adapted legal text representations"],
    ["[4]", "Hendrycks et al. (CUAD)", "510 contracts annotated with 41 clause types", "Benchmark taxonomy for clause segmentation"],
    ["[7]", "Lewis et al. (RAG)", "Parametric LLM memory combined with dense passage index", "Core architecture of Legal Knowledge Agent"],
    ["[9]", "Robertson & Zaragoza (BM25)", "Probabilistic lexical retrieval ranking function", "Lexical component of hybrid retrieval pipeline"],
    ["[11]", "Dahl et al. (Hallucinations)", "Measured 69-88% hallucination rates in legal LLM queries", "Primary justification for deterministic rule scoring"],
    ["[12]", "Yao et al. (ReAct)", "Interleaving reasoning traces with external tool actions", "Inspiration for modular multi-agent workflow"],
    ["[14]", "Ribeiro et al. (LIME)", "Explaining predictions via localized interpretable models", "Evidence-linked rationale and redline generation"]
])

# ================= CHAPTER 3 =================
add_h1("CHAPTER 3: SYSTEM ANALYSIS")
add_h2("3.1 Existing System & Disadvantages")
add_p("Manual contract review is slow, prone to cognitive fatigue, inconsistent across legal reviewers, and incapable of detecting absent mandatory clauses. Commercial CLM tools operate as expensive, proprietary black boxes with hidden scoring heuristics. General chatbots lack citation grounding and expose confidential enterprise contracts to public servers.")
add_h2("3.2 Proposed System & Advantages")
add_p("ResolveX introduces an explainable, multi-agent AI copilot that unifies document ingestion, clause intelligence, rule-based risk evaluation, hybrid RAG policy retrieval, and LLM reasoning. Transparent risk scoring utilizes severity floors, and the pipeline degrades gracefully if external LLMs become unreachable. The open-source architecture executes in an average of 1.20s per document.")

# ================= CHAPTER 4 =================
add_h1("CHAPTER 4: SYSTEM SPECIFICATION")
add_h2("4.1 Hardware Requirements")
add_p("• CPU: Intel Core i3 (dual-core) or higher\n• RAM: 4 GB minimum (8 GB recommended)\n• Storage: 1 GB free disk space\n• Display: 1366x768 or higher resolution\n• GPU: None required (inference offloaded to API)")
add_h2("4.2 Software Requirements")
add_p("• Operating System: Windows 10/11, Linux, or macOS\n• Backend: Python 3.12, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2 (async), SQLite/PostgreSQL\n• OCR: Tesseract OCR, pytesseract, pdf2image\n• Frontend: Node.js, React 19, Vite, TypeScript, Tailwind CSS 4, React Flow, Recharts\n• Testing: pytest, pytest-asyncio (80 automated tests)")

# ================= CHAPTER 5 =================
add_h1("CHAPTER 5: IMPLEMENTATION")
add_h2("5.1 System Architecture & Modules")
add_p("The platform is structured into three operational tiers:\n"
      "1. Input & Ingestion Tier: Validates MIME types, sanitizes filenames, computes SHA-256 hashes, extracts native text (pypdf, python-docx), and triggers Tesseract OCR for scanned documents.\n"
      "2. Multi-Agent Intelligence Pipeline: Five specialized agents execute sequentially under the Workflow Orchestrator:\n"
      "   - Agent 01 (Document Ingestion): Structural extraction of headings, sections, and paragraphs.\n"
      "   - Agent 02 (Clause Intelligence): Deterministic keyword segmentation and classification.\n"
      "   - Agent 03 (Risk & Compliance): Evaluation of 21 risk rules and 4 compliance policies.\n"
      "   - Agent 04 (Legal Knowledge RAG): Chunking (1200 chars / 150 overlap), 384-dim embedding, hybrid search, and cross-encoder re-ranking.\n"
      "   - Agent 05 (Explainability): Context assembly, prompt construction (explainability-v1), LLM reasoning, and redline suggestions.\n"
      "3. Output & Visualisation Tier: React 19 interface with 10 dedicated dashboards, contract viewer with highlighted clauses, and executive audit export.")

add_h2("5.2 Deterministic Risk Scoring Formula")
add_p("To eliminate hallucinated scoring, individual findings are calculated deterministically:")
add_p("Risk Score = max( (0.45 × Likelihood + 0.45 × Impact + 0.10 × Confidence) × 100 , Severity Floor )", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
add_table(["Severity Level", "Severity Floor"], [
    ["Informational", "0"],
    ["Low", "20"],
    ["Medium", "40"],
    ["High", "70"],
    ["Critical", "90"]
])

# ================= CHAPTER 6 =================
add_h1("CHAPTER 6: SYSTEM DESIGN")
add_p("The design follows rigorous object-oriented and service-oriented principles. The core architectural models include:\n"
      "• Class Diagram: Models Document, Clause, Finding, Workflow, and Agent interfaces.\n"
      "• Use Case Diagram: Outlines reviewer actions (Upload, Audit, Review Redlines, Download Reports) and Admin functions.\n"
      "• Sequence Diagram: Illustrates asynchronous execution across FastAPI, Orchestrator, Agents, and Storage.\n"
      "• Activity Diagram: Maps conditional branching, OCR detection, LLM fallback warnings, and persistence.\n"
      "• Data Flow Diagram (DFD): Tracks data progression from raw contract to parsed clauses, findings, and reports.")

# ================= CHAPTER 7 =================
add_h1("CHAPTER 7: SYSTEM TESTING & RESULTS")
add_h2("7.1 Automated Test Distribution")
add_p("All 80 automated unit and integration tests passed with 100% success rate:")
add_table(["Subsystem Area", "Unit Tests", "Integration Tests", "Total Tests", "Status"], [
    ["Repositories (Data Layer)", "5", "0", "5", "PASSED"],
    ["Upload & Document Processing", "11", "1", "12", "PASSED"],
    ["Document Intelligence", "7", "1", "8", "PASSED"],
    ["Clause Intelligence", "7", "1", "8", "PASSED"],
    ["Risk and Compliance", "6", "1", "7", "PASSED"],
    ["Knowledge Intelligence (RAG)", "9", "1", "10", "PASSED"],
    ["Explainability Agent", "6", "1", "7", "PASSED"],
    ["Workflow Orchestration Engine", "10", "1", "11", "PASSED"],
    ["Security & Observability", "7", "5", "12", "PASSED"],
    ["TOTAL", "68", "12", "80", "80 PASSED (12.96s)"]
])

add_h2("7.2 Benchmark Evaluation on 10-Section Master Services Agreement (MSA)")
add_p("A complex 10-section agreement was audited in 1.84s, identifying 13 risk findings (6 High, 4 Medium, 3 Low), with 88.9% clause classification accuracy.")
add_table(["Section", "Detected Clause Type", "Expected Type", "Match", "Risk Score"], [
    ["1. Definitions", "Definitions", "Definitions", "YES", "0"],
    ["2. Scope of Services", "Scope", "Scope", "YES", "0"],
    ["3. Payment Terms", "Payment", "Payment", "YES", "0"],
    ["4. Intellectual Property", "Intellectual Property", "Intellectual Property", "YES", "73 (High)"],
    ["5. Indemnification", "Indemnity", "Indemnity", "YES", "0"],
    ["6. Limitation of Liability", "Liability", "Liability", "YES", "0"],
    ["7. Termination", "Termination", "Termination", "YES", "44 (Low)"],
    ["8. Warranties", "Scope", "Warranty", "NO (Keyword clash)", "0"],
    ["9. Miscellaneous", "Miscellaneous", "Miscellaneous", "YES", "44 (Low)"]
])

# ================= CHAPTER 8 =================
add_h1("CHAPTER 8: FEASIBILITY STUDY & METHODOLOGY")
add_p("• Technical Feasibility: Proven by 80/80 passing tests, decoupled agent interfaces, and sub-2s execution.\n"
      "• Economic Feasibility: 100% open-source software stack with zero vendor lock-in.\n"
      "• Operational Feasibility: Responsive single-page application requiring only a standard web browser.\n"
      "• Legal & Ethical Feasibility: Transparent scoring, operator-controlled storage, and human-in-the-loop validation aligning with EU AI Act Article 14 transparency requirements.")

# ================= CHAPTER 9 =================
add_h1("CHAPTER 9: CONCLUSION & FUTURE ENHANCEMENTS")
add_p("ResolveX demonstrates that combining deterministic rule engines with Retrieval-Augmented Generation yields an explainable, trustworthy legal AI copilot that overcomes the hallucination risks of raw LLMs. The project achieved full attainment of PO1–PO11 and PSO1–PSO3 for the B.Tech AI & DS program.\n"
      "Future enhancements include fine-tuning LEGAL-BERT for clause classification, neural sentence embeddings via pgvector, multi-tenant RBAC, and automated Word redline exports.")

# ================= REFERENCES =================
add_h1("REFERENCES")
references = [
    "[1] A. Vaswani et al., 'Attention is all you need,' in NeurIPS, 2017.",
    "[2] J. Devlin et al., 'BERT: Pre-training of deep bidirectional transformers,' in NAACL-HLT, 2019.",
    "[3] I. Chalkidis et al., 'LEGAL-BERT: The muppets straight out of law school,' in EMNLP, 2020.",
    "[4] D. Hendrycks et al., 'CUAD: An expert-annotated NLP dataset for legal contract review,' in NeurIPS, 2021.",
    "[5] I. Chalkidis et al., 'LexGLUE: A benchmark dataset for legal language understanding,' in ACL, 2022.",
    "[6] N. Guha et al., 'LegalBench: A benchmark for legal reasoning in large language models,' 2023.",
    "[7] P. Lewis et al., 'Retrieval-augmented generation for knowledge-intensive NLP tasks,' in NeurIPS, 2020.",
    "[8] V. Karpukhin et al., 'Dense passage retrieval for open-domain question answering,' in EMNLP, 2020.",
    "[9] S. Robertson and H. Zaragoza, 'The probabilistic relevance framework: BM25 and beyond,' 2009.",
    "[10] Y. Gao et al., 'Retrieval-augmented generation for large language models: A survey,' 2023.",
    "[11] M. Dahl et al., 'Large legal fictions: Profiling legal hallucinations in large language models,' 2024.",
    "[12] S. Yao et al., 'ReAct: Synergizing reasoning and acting in language models,' in ICLR, 2023.",
    "[13] Q. Wu et al., 'AutoGen: Enabling next-gen LLM applications via multi-agent conversation,' 2023.",
    "[14] M. T. Ribeiro et al., 'Why should I trust you?: Explaining predictions of any classifier,' in ACM SIGKDD, 2016.",
    "[15] D. M. Katz et al., 'Natural language processing in the legal domain,' 2023.",
    "[16] European Parliament, 'General Data Protection Regulation (GDPR),' Regulation (EU) 2016/679, 2016.",
    "[17] European Parliament, 'Artificial Intelligence Act (EU AI Act),' Regulation (EU) 2024/1689, 2024."
]
for ref in references:
    add_p(ref, font_size=10, space_after=3)

# Save Document
out_dir = os.path.join(os.getcwd(), 'public', 'docs')
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, 'ResolveX_Project_Report.docx')
doc.save(out_path)
print(f"Report generated successfully at: {out_path} (Size: {os.path.getsize(out_path)} bytes)")
