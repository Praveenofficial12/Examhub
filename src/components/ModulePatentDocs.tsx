import React, { useState, useRef } from 'react';
import {
  FileText,
  Download,
  Copy,
  Printer,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  Share2,
  BookmarkCheck,
  FileCheck2,
  Eye
} from 'lucide-react';
import { printHtmlDocument } from '../utils/printService';

export const ModulePatentDocs: React.FC = () => {
  const [activeSubDoc, setActiveSubDoc] = useState<'claims' | 'description' | 'image'>('claims');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const patentPrintableRef = useRef<HTMLDivElement>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const claimsText = `AN AUTONOMOUS EXAMINATION MANAGEMENT, ANONYMIZED DUMMY NUMBER MAPPING, AND ARTIFICIAL INTELLIGENCE-DRIVEN EVALUATION SCHEME GENERATION FRAMEWORK

Claim 1
An autonomous examination management and evaluation system (AEE-DMSGF) comprising: an Optical Barcode & Dummy Number Anonymous Mapping Engine configured to ingest student examination registration numbers, validate attendance records, and generate non-reversible cryptographic pseudorandom dummy identifiers for answer scripts to facilitate blind valuation; an Artificial Intelligence-Powered Question Paper Analysis & Solution Rubric Generator coupled to a Large Language Model (LLM) processor, configured to extract structural question hierarchies, categorize questions according to Revised Bloom's Taxonomy cognitive levels, map questions to Course Outcomes (COs), and generate step-by-step model answer keys and rubric score distributions; an Autonomous Role-Based Continuous Assessment Lock/Unlock Controller configured to enforce strict temporal mark-entry windows for faculty across academic years, semesters, and sections, preventing post-deadline modification; a Multi-Tier Mark Computation & Autonomous Grading Engine configured to ingest internal assessment marks, practical marks, and end-semester scores, automatically computing weighted aggregates, 10-point Choice Based Credit System (CBCS) letter grades, SGPA, and CGPA; and a DLT-Compliant Real-Time Institutional Telemetry & Alert Dispatcher configured to automatically trigger SMS and messaging notifications for attendance shortages, Continuous Internal Assessment (CIA) marks, and end-semester results to registered guardian communication channels.

Claim 2
The system as claimed in claim 1, wherein the Optical Barcode & Dummy Number Anonymous Mapping Engine comprises a bidirectional cryptographic hash lookup table stored in an encrypted Controller of Examinations (COE) vault; replaces student roll numbers with dynamic pseudo-random alphanumeric barcodes on detachable answer sheet counterfoils prior to physical or digital distribution to evaluators; and includes an automated parity check module that identifies missing scripts, duplicate dummy allocations, or unmapped attendance mismatches prior to valuation dispatch.

Claim 3
The system as claimed in claim 1, wherein the feature extraction and rubric generation module utilizes a Large Language Model (LLM) to parse uploaded question papers in digital format, performing optical character recognition and semantic tokenization; programmatically assigns cognitive domain levels ranging from Level 1 (Remembering) to Level 6 (Creating) pursuant to Bloom's Revised Taxonomy; and produces a standardized evaluation key comprising sub-question breakdown, partial credit rules, alternate solution pathways, and syllabus module tagging formatted directly into an exportable institutional template.

Claim 4
The system as claimed in claim 1, wherein the Continuous Assessment Lock/Unlock Controller provides granular academic administrative access controls categorized into Admin (COE), Head of Department (HOD), Subject Faculty, and Examination Squad roles; executes an automated programmatic freeze on mark submission inputs upon timestamp expiration of an examination schedule; and permits selective administrative unlocking with mandatory digital audit trail logging, requiring reason specification, authorization timestamps, and prior score version archiving.

Claim 5
The system as claimed in claim 1, wherein the Multi-Tier Mark Computation & Autonomous Grading Engine executes dynamic normalization across multiple question parts and internal test cycles (CIA-1, CIA-2, Model Examination); maps raw percentage scores into categorical 10-point grade thresholds comprising Outstanding (O), Excellent (A+), Very Good (A), Good (B+), Above Average (B), Pass (C), Re-appear (U), Shortage of Attendance (SA), and Withdrawal (W); and calculates Semester Grade Point Average (SGPA) and Cumulative Grade Point Average (CGPA) according to course credit weightage matrices with automated fail-safe rounding and transcript generation.

Claim 6
The system as claimed in claim 1, wherein the system further comprises a Multimodal Discrepancy & Optical Verification Module configured to scan valuation marks sheets and optical mark recognition (OMR) response grids; cross-correlates digital mark entries submitted by evaluators against dummy barcode tallies; and flags statistical anomalies, out-of-bound marks, unanswered question over-allocations, and totaling discrepancies before unmasking student identities.

Claim 7
The system as claimed in claim 1, wherein the framework adapts to dynamic institutional regulations by continuously updating syllabus outcome targets, Anna University R-2021 CBCS credit mappings, and dynamic course attainment thresholds.

Claim 8
The system as claimed in claim 1, further comprising a decision support module configured to provide actionable insights, transparent OBE attainment scores, and explanation-based recommendations to assist institutional academic committees in accreditation and remedial teaching decision-making processes.`;

  const descriptionText = `AN AUTONOMOUS EXAMINATION MANAGEMENT, ANONYMIZED DUMMY NUMBER MAPPING, AND ARTIFICIAL INTELLIGENCE-DRIVEN EVALUATION SCHEME GENERATION FRAMEWORK

TITLE OF THE INVENTION
Autonomous Examination Management, Anonymized Dummy Number Mapping, and Artificial Intelligence-Driven Evaluation Scheme Generation Framework (AEE-DMSGF)

FIELD OF THE INVENTION
This invention lies at the intersection of Educational Technology (EdTech), Autonomous Academic Governance, and advanced Artificial Intelligence, particularly focusing on cryptographic pseudonymization, optical recognition, and Large Language Model (LLM) semantic reasoning. It addresses the growing need for end-to-end, tamper-evident examination evaluation platforms by combining multiple data layers, including student registries, question papers, invigilation attendance logs, and institutional regulatory frameworks. By leveraging the capabilities of Large Language Models (LLMs), the system is able to understand, deconstruct, and extract pedagogical insights from complex examination papers, automatically synthesizing Bloom's taxonomy mappings and step-by-step scoring rubrics. In addition, the use of cryptographically isolated dummy barcode mapping and strict assessment window locking ensures that the evaluation process is blind, objective, secure, and fully auditable for institutional accreditation.

BACKGROUND OF THE INVENTION
Traditional academic examination management methods have primarily depended on manual counterfoil separation, physical ledger entry, and unstructured descriptive answer valuation. While these methods have been widely used, they introduce severe systemic vulnerabilities including evaluator identity bias, transcription errors, high inter-evaluator grading variance, and post-deadline grade tampering. Because of these limitations, conventional systems are unable to ensure absolute fairness and real-time visibility across continuous internal assessments and end-semester evaluations.

In addition, many conventional academic portals are based on static, rule-based database tables without automated time-locking governance or immutable audit histories, making it difficult for the Controller of Examinations (COE) to detect retroactive grade alterations. Another major drawback is the complete absence of standardized, cognitive-level grading rubrics during descriptive paper valuation, leaving evaluators to grade arbitrarily without step-by-step mark distribution guides.

At the same time, autonomous higher education institutions today face stringent compliance requirements from national accreditation bodies (such as NBA and NAAC) requiring rigorous Course Outcome (CO) attainment calculation and transparent parent reporting. Most existing solutions still focus on basic data entry and do not integrate cryptographic dummying, generative AI answer key synthesis, and regulatory telecom alerts. This clearly highlights the need for a comprehensive, automated, and secure system that combines all examination workflows into an integrated, transparent pipeline.

OBJECTIVE OF THE INVENTION
The system aims to integrate multiple academic data sources, including student registration records, question papers, attendance manifests, and autonomous CBCS regulations. This helps provide a tamper-evident and complete view of the examination lifecycle.

It uses Large Language Models (LLMs) to understand examination question papers by extracting question hierarchies, classifying cognitive levels (K1 to K6), mapping Course Outcomes, and synthesizing step-by-step scoring rubrics, turning unstructured examination papers into standardized evaluation schemes.

The system guarantees blind valuation by generating high-entropy cryptographic dummy barcodes on answer sheet counterfoils, completely desensitizing student identity during grading.

It enforces institutional integrity by utilizing a temporal assessment lock engine that automatically freezes mark entry upon schedule expiration and permits administrative overrides solely with cryptographic audit logs.

The system automates multi-tier grade computation under Anna University R-2021 Choice Based Credit System (CBCS), calculating 10-point letter grades, SGPA, CGPA, and Course Outcome attainment.

It provides real-time automated parent communication compliant with national DLT telecommunication regulations, dispatching instant mark notifications and statutory attendance shortage warnings (<75%).

SUMMARY OF THE INVENTION
The proposed invention, known as the Autonomous Examination Evaluation, Dummy Number Mapping, and AI-Driven Scheme Generation Framework (AEE-DMSGF), is designed to transform the way academic assessments are administered and evaluated. Traditional setups depend on vulnerable manual workflows that expose student identities and permit arbitrary grading. To overcome this, the proposed framework takes a holistic, automated approach by coupling cryptographic dummy barcode mapping, generative AI question paper ingestion, strict time-locked mark governance, automated CBCS grading, and regulatory telecommunication alerts.

A key aspect of this system is the use of advanced artificial intelligence techniques, particularly Large Language Models, to analyze examination question papers. Instead of relying on manual answer key drafting, the system interprets the question semantics, determines Bloom's Taxonomy cognitive depths, and calculates exact partial-marking weightages. When combined with anonymized dummy number scripts, the framework ensures objective, uniform grading across faculty members and sections.

Another crucial feature of the invention is its rigorous governance and auditability. The system incorporates an automated window-lock controller that prevents unauthorized mark modifications while maintaining full traceability for the Controller of Examinations. This synergy between AI-driven pedagogical assistance, cryptographic privacy, and strict administrative control makes the framework uniquely suited for autonomous institutions seeking flawless operational compliance.

DETAILED DESCRIPTION OF THE INVENTION

1. DATA COLLECTION AND PREPROCESSING MODULE
The system collects academic records from multiple institutional repositories to establish an authoritative baseline for examination administration.
 Structured: student master records (registration numbers, AI&DS department batch, semester, section), course credit mappings, staff allocations
 Unstructured: digital question papers (Part A short-answer, Part B analytical/derivations, Part C case studies in DOCX/PDF formats)
 Real-Time Feeds: examination hall seating manifests, invigilator barcode attendance scans (Present, Absent, On-Duty)
 Processing:
   Validate student enrollment and verify eligibility thresholds
   Ingest and clean question text (tokenization, formula parsing, optical structure recognition)
   Generate high-density Code-128 and QR barcodes for detachable counterfoils

2. SECURE DUMMY MAPPING AND ANONYMIZATION ENGINE
The engine eliminates identity bias during evaluation by strictly decoupling student identity from answer scripts.
 Processes:
   Generates non-reversible pseudorandom dummy sequences (e.g., DM-2026-AIDS-4A-0842)
   Prints unique barcodes on detachable answer sheet counterfoils
   Stores mapping pairs inside an AES-256 encrypted Controller of Examinations vault
   Performs pre-valuation parity checks to reconcile physical script counts against attendance records
 Evaluators receive answer scripts displaying only the anonymized dummy identifier.

3. AI-POWERED SCHEME AND RUBRIC GENERATION MODULE
The Large Language Model (Gemini Pro) is used to deconstruct examination papers and formulate authoritative grading schemes.
 Extracts:
   Hierarchical question structure and question weightages
   Bloom's Taxonomy cognitive levels (K1: Remember, K2: Understand, K3: Apply, K4: Analyze, K5: Evaluate, K6: Create)
   Direct Course Outcome alignments (CO1 to CO5)
 Generates:
   Step-by-step model solutions and analytical derivations
   Point-allocation scoring rubrics (formula, substitution, intermediate steps, final answer with units)
   Formatted institutional Word/PDF documents for faculty reference

4. CONTINUOUS ASSESSMENT LOCK AND CBCS GRADING MODULE
The system governs mark uploads through strict temporal access controls and computes authoritative academic records.
 Access Governance:
   Role-based permissions differentiating COE Admin, HOD, and Subject Faculty
   Automated schedule-based window freezing (LOCKED state prevents post-deadline edits)
   Cryptographic audit trails logging user ID, timestamp, and justification for any administrative override
 Grade Computation:
   Aggregates internal components (CIA-1, CIA-2, Model Exam, Practicals) and End Semester marks
   Maps raw percentage scores to Anna University R-2021 10-point letter grades (O, A+, A, B+, B, C, U)
   Computes credit-weighted SGPA and CGPA with fail-safe rounding
   Calculates Course Outcome (CO) and Program Outcome (PO) direct attainment matrices

5. DLT-COMPLIANT TELEMETRY AND ALERT DISPATCHER
The system automatically compiles verified performance data and dispatches instant regulatory notifications to guardians.
 Dispatches:
   CIA test marks, subject-wise scores, and class averages
   Critical attendance alerts for students falling below the statutory 75% threshold
 Telecommunication Compliance:
   Utilizes pre-registered TRAI DLT template headers and Principal Entity IDs
   Maintains real-time transmission logs, retry queues, and delivery acknowledgments
   Delivers tamper-evident transcripts with verification QR codes for institutional publication

ADVANTAGES
 Eliminates identity bias through complete cryptographic dummy number anonymization
 Standardizes descriptive evaluation using AI-generated cognitive Bloom's taxonomy rubrics
 Eliminates post-deadline grade tampering with automated temporal window locking
 Drastically reduces faculty workload in answer key preparation and mark compilation
 Automates Anna University R-2021 CBCS grade point, SGPA, and CGPA calculation
 Enhances accreditation readiness with automated Course Outcome (CO) attainment metrics
 Facilitates proactive academic intervention via instant, regulatory DLT-compliant parent alerts

CONCLUSION
This specification presents an Autonomous Examination Management, Anonymized Dummy Number Mapping, and Artificial Intelligence-Driven Evaluation Scheme Generation Framework (AEE-DMSGF) that effectively combines cryptographic pseudonymization, generative AI semantic parsing, and strict window-locking governance to establish an unassailable examination ecosystem. By leveraging Large Language Models for automated question paper deconstruction and rubric synthesis alongside secure dummy barcode counterfoils, the system delivers objective, transparent, and reproducible evaluation. Furthermore, the integration of automated CBCS grade calculation and TRAI DLT-compliant parent messaging ensures that academic standards, institutional integrity, and stakeholder communication are maintained at the highest level of excellence.`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#781717] via-[#941d1d] to-[#1e3a8a] text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-sm border border-white/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Official Patent &amp; IP Specification
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-amber-950">
              Department of AI &amp; DS
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Autonomous Examination Evaluation &amp; AI Scheme Framework (AEE-DMSGF)
          </h2>
          <p className="text-sm text-red-100 max-w-2xl mt-1">
            Complete patent documentation matching the exact filing format of the uploaded reference PDFs (Claims, Detailed Description, and System Architecture).
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              const html = patentPrintableRef.current?.innerHTML;
              if (html) {
                printHtmlDocument('VSBEC AEE-DMSGF Patent Specification', html);
              } else {
                window.print();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-sm transition-all border border-white/20 cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button
            onClick={() =>
              handleDownload(
                'AEE_DMSGF_Patent_Complete_Specification.doc',
                `${claimsText}\n\n========================================\n\n${descriptionText}`,
                'application/msword'
              )
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download Complete Doc (.doc)
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubDoc('claims')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
            activeSubDoc === 'claims'
              ? 'bg-[#781717] text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" /> Document 1: Patent Claims (Claims 1 to 8)
        </button>
        <button
          onClick={() => setActiveSubDoc('description')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
            activeSubDoc === 'description'
              ? 'bg-[#781717] text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" /> Document 2: Complete Description (Modules 1 to 5)
        </button>
        <button
          onClick={() => setActiveSubDoc('architecture')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
            activeSubDoc === 'architecture'
              ? 'bg-[#781717] text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Document 3: Architecture Diagram (FIG. 1)
        </button>
        <button
          onClick={() => setActiveSubDoc('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
            activeSubDoc === 'all'
              ? 'bg-[#1e3a8a] text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Eye className="w-4 h-4" /> Full Patent Dossier (Combined View)
        </button>
      </div>

      {/* SUB-VIEW 1: CLAIMS DOCUMENT */}
      <div ref={patentPrintableRef} className="space-y-6">
      {(activeSubDoc === 'claims' || activeSubDoc === 'all') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#781717]" />
              <h3 className="font-bold text-slate-800 text-sm">
                PATENT CLAIMS SPECIFICATION (Claims 1 to 8)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(claimsText, 'claims')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                {copiedSection === 'claims' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Claims
                  </>
                )}
              </button>
              <button
                onClick={() =>
                  handleDownload(
                    'VSBEC_AEE_DMSGF_Claims.txt',
                    claimsText,
                    'text/plain'
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#781717] text-white text-xs font-semibold hover:bg-[#601212] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Claims
              </button>
            </div>
          </div>

          <div className="p-8 md:p-12 font-serif text-slate-900 leading-relaxed max-w-4xl mx-auto space-y-6 text-[15px]">
            <div className="text-center pb-4 border-b border-slate-200">
              <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
                AUTONOMOUS EXAMINATION MANAGEMENT, ANONYMIZED DUMMY NUMBER MAPPING, AND ARTIFICIAL INTELLIGENCE-DRIVEN EVALUATION SCHEME GENERATION FRAMEWORK
              </h2>
            </div>

            <div className="space-y-6 pt-2">
              <div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Claim 1</h4>
                <p className="text-justify leading-relaxed">
                  An autonomous examination management and evaluation system (AEE-DMSGF) for higher educational institutions, comprising: an Optical Barcode &amp; Dummy Number Anonymous Mapping Engine configured to ingest student examination registration numbers, validate attendance records, and generate non-reversible cryptographic pseudorandom dummy identifiers for answer scripts to facilitate blind valuation; an Artificial Intelligence-Powered Question Paper Analysis &amp; Solution Rubric Generator coupled to a Large Language Model (LLM) processor, configured to extract structural question hierarchies, categorize questions according to Revised Bloom's Taxonomy cognitive levels, map questions to Course Outcomes (COs), and generate step-by-step model answer keys and rubric score distributions; an Autonomous Role-Based Continuous Assessment Lock/Unlock Controller configured to enforce strict temporal mark-entry windows for faculty across academic years, semesters, and sections, preventing post-deadline modification; a Multi-Tier Mark Computation &amp; Autonomous Grading Engine configured to ingest internal assessment marks, practical marks, and end-semester scores, automatically computing weighted aggregates, 10-point Choice Based Credit System (CBCS) letter grades, SGPA, and CGPA; and a DLT-Compliant Real-Time Institutional Telemetry &amp; Alert Dispatcher configured to automatically trigger SMS and messaging notifications for attendance shortages, Continuous Internal Assessment (CIA) marks, and end-semester results to registered guardian communication channels.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Claim 2</h4>
                <p className="text-justify leading-relaxed">
                  The system as claimed in claim 1, wherein the Optical Barcode &amp; Dummy Number Anonymous Mapping Engine comprises a bidirectional cryptographic hash lookup table stored in an encrypted Controller of Examinations (COE) vault; replaces student roll numbers with dynamic pseudo-random alphanumeric barcodes on detachable answer sheet counterfoils prior to physical or digital distribution to evaluators; and includes an automated parity check module that identifies missing scripts, duplicate dummy allocations, or unmapped attendance mismatches prior to valuation dispatch.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Claim 3</h4>
                <p className="text-justify leading-relaxed">
                  The system as claimed in claim 1, wherein the feature extraction and rubric generation module utilizes a Large Language Model (LLM) to parse uploaded question papers in digital format, performing optical character recognition and semantic tokenization; programmatically assigns cognitive domain levels ranging from Level 1 (Remembering) to Level 6 (Creating) pursuant to Bloom's Revised Taxonomy; and produces a standardized evaluation key comprising sub-question breakdown, partial credit rules, alternate solution pathways, and syllabus module tagging formatted directly into an exportable institutional template.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Claim 4</h4>
                <p className="text-justify leading-relaxed">
                  The system as claimed in claim 1, wherein the Continuous Assessment Lock/Unlock Controller provides granular academic administrative access controls categorized into Admin (COE), Head of Department (HOD), Subject Faculty, and Examination Squad roles; executes an automated programmatic freeze on mark submission inputs upon timestamp expiration of an examination schedule; and permits selective administrative unlocking with mandatory digital audit trail logging, requiring reason specification, authorization timestamps, and prior score version archiving.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Claim 5</h4>
                <p className="text-justify leading-relaxed">
                  The system as claimed in claim 1, wherein the Multi-Tier Mark Computation &amp; Autonomous Grading Engine executes dynamic normalization across multiple question parts and internal test cycles (CIA-1, CIA-2, Model Examination); maps raw percentage scores into categorical 10-point grade thresholds comprising Outstanding (O), Excellent (A+), Very Good (A), Good (B+), Above Average (B), Pass (C), Re-appear (U), Shortage of Attendance (SA), and Withdrawal (W); and calculates Semester Grade Point Average (SGPA) and Cumulative Grade Point Average (CGPA) according to course credit weightage matrices with automated fail-safe rounding and transcript generation.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Claim 6</h4>
                <p className="text-justify leading-relaxed">
                  The system as claimed in claim 1, wherein the system further comprises a Multimodal Discrepancy &amp; Optical Verification Module configured to scan valuation marks sheets and optical mark recognition (OMR) response grids; cross-correlates digital mark entries submitted by evaluators against dummy barcode tallies; and flags statistical anomalies, out-of-bound marks, unanswered question over-allocations, and totaling discrepancies before unmasking student identities.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Claim 7</h4>
                <p className="text-justify leading-relaxed">
                  The system as claimed in claim 1, wherein the framework adapts to dynamic institutional regulations by continuously updating syllabus outcome targets, Anna University R-2021 CBCS credit mappings, and dynamic course attainment thresholds.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Claim 8</h4>
                <p className="text-justify leading-relaxed">
                  The system as claimed in claim 1, further comprising a decision support module configured to provide actionable insights, transparent OBE attainment scores, and explanation-based recommendations to assist institutional academic committees in accreditation and remedial teaching decision-making processes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: COMPLETE DESCRIPTION DOCUMENT */}
      {(activeSubDoc === 'description' || activeSubDoc === 'all') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#781717]" />
              <h3 className="font-bold text-slate-800 text-sm">
                COMPLETE PATENT SPECIFICATION: DETAILED DESCRIPTION
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(descriptionText, 'desc')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                {copiedSection === 'desc' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Description
                  </>
                )}
              </button>
              <button
                onClick={() =>
                  handleDownload(
                    'VSBEC_AEE_DMSGF_Description.txt',
                    descriptionText,
                    'text/plain'
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#781717] text-white text-xs font-semibold hover:bg-[#601212] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Description
              </button>
            </div>
          </div>

          <div className="p-8 md:p-12 font-serif text-slate-900 leading-relaxed max-w-4xl mx-auto space-y-6 text-[15px]">
            <div className="text-center pb-4 border-b border-slate-200">
              <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
                AUTONOMOUS EXAMINATION MANAGEMENT, ANONYMIZED DUMMY NUMBER MAPPING, AND ARTIFICIAL INTELLIGENCE-DRIVEN EVALUATION SCHEME GENERATION FRAMEWORK
              </h2>
            </div>

            <div>
              <h3 className="font-bold uppercase text-slate-900 text-sm tracking-wider mb-2">
                TITLE OF THE INVENTION
              </h3>
              <p className="text-justify">
                Autonomous Examination Management, Anonymized Dummy Number Mapping, and Artificial Intelligence-Driven Evaluation Scheme Generation Framework (AEE-DMSGF)
              </p>
            </div>

            <div>
              <h3 className="font-bold uppercase text-slate-900 text-sm tracking-wider mb-2">
                FIELD OF THE INVENTION
              </h3>
              <p className="text-justify">
                This invention lies at the intersection of Educational Technology (EdTech), Autonomous Academic Governance, and advanced Artificial Intelligence, particularly focusing on cryptographic pseudonymization, optical recognition, and Large Language Model (LLM) semantic reasoning. It addresses the growing need for end-to-end, tamper-evident examination evaluation platforms by combining multiple data layers, including student registries, question papers, invigilation attendance logs, and institutional regulatory frameworks. By leveraging the capabilities of Large Language Models (LLMs), the system is able to understand, deconstruct, and extract pedagogical insights from complex examination papers, automatically synthesizing Bloom's taxonomy mappings and step-by-step scoring rubrics. In addition, the use of cryptographically isolated dummy barcode mapping and strict assessment window locking ensures that the evaluation process is blind, objective, secure, and fully auditable for institutional accreditation.
              </p>
            </div>

            <div>
              <h3 className="font-bold uppercase text-slate-900 text-sm tracking-wider mb-2">
                BACKGROUND OF THE INVENTION
              </h3>
              <p className="text-justify mb-4">
                Traditional academic examination management methods have primarily depended on manual counterfoil separation, physical ledger entry, and unstructured descriptive answer valuation. While these methods have been widely used, they introduce severe systemic vulnerabilities including evaluator identity bias, transcription errors, high inter-evaluator grading variance, and post-deadline grade tampering. Because of these limitations, conventional systems are unable to ensure absolute fairness and real-time visibility across continuous internal assessments and end-semester evaluations.
              </p>
              <p className="text-justify mb-4">
                In addition, many conventional academic portals are based on static, rule-based database tables without automated time-locking governance or immutable audit histories, making it difficult for the Controller of Examinations (COE) to detect retroactive grade alterations. Another major drawback is the complete absence of standardized, cognitive-level grading rubrics during descriptive paper valuation, leaving evaluators to grade arbitrarily without step-by-step mark distribution guides.
              </p>
              <p className="text-justify">
                At the same time, autonomous higher education institutions today face stringent compliance requirements from national accreditation bodies (such as NBA and NAAC) requiring rigorous Course Outcome (CO) attainment calculation and transparent parent reporting. Most existing solutions still focus on basic data entry and do not integrate cryptographic dummying, generative AI answer key synthesis, and regulatory telecom alerts. This clearly highlights the need for a comprehensive, automated, and secure system that combines all examination workflows into an integrated, transparent pipeline.
              </p>
            </div>

            <div>
              <h3 className="font-bold uppercase text-slate-900 text-sm tracking-wider mb-2">
                OBJECTIVE OF THE INVENTION
              </h3>
              <div className="space-y-3 text-justify">
                <p>
                  The system aims to integrate multiple academic data sources, including student registration records, question papers, attendance manifests, and autonomous CBCS regulations. This helps provide a tamper-evident and complete view of the examination lifecycle.
                </p>
                <p>
                  It uses Large Language Models (LLMs) to understand examination question papers by extracting question hierarchies, classifying cognitive levels (K1 to K6), mapping Course Outcomes, and synthesizing step-by-step scoring rubrics, turning unstructured examination papers into standardized evaluation schemes.
                </p>
                <p>
                  The system guarantees blind valuation by generating high-entropy cryptographic dummy barcodes on answer sheet counterfoils, completely desensitizing student identity during grading.
                </p>
                <p>
                  It enforces institutional integrity by utilizing a temporal assessment lock engine that automatically freezes mark entry upon schedule expiration and permits administrative overrides solely with cryptographic audit logs.
                </p>
                <p>
                  The system automates multi-tier grade computation under Anna University R-2021 Choice Based Credit System (CBCS), calculating 10-point letter grades, SGPA, CGPA, and Course Outcome attainment.
                </p>
                <p>
                  It provides real-time automated parent communication compliant with national DLT telecommunication regulations, dispatching instant mark notifications and statutory attendance shortage warnings (&lt;75%).
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold uppercase text-slate-900 text-sm tracking-wider mb-2">
                SUMMARY OF THE INVENTION
              </h3>
              <p className="text-justify mb-4">
                The proposed invention, known as the Autonomous Examination Evaluation, Dummy Number Mapping, and AI-Driven Scheme Generation Framework (AEE-DMSGF), is designed to transform the way academic assessments are administered and evaluated. Traditional setups depend on vulnerable manual workflows that expose student identities and permit arbitrary grading. To overcome this, the proposed framework takes a holistic, automated approach by coupling cryptographic dummy barcode mapping, generative AI question paper ingestion, strict time-locked mark governance, automated CBCS grading, and regulatory telecommunication alerts.
              </p>
              <p className="text-justify mb-4">
                A key aspect of this system is the use of advanced artificial intelligence techniques, particularly Large Language Models, to analyze examination question papers. Instead of relying on manual answer key drafting, the system interprets the question semantics, determines Bloom's Taxonomy cognitive depths, and calculates exact partial-marking weightages. When combined with anonymized dummy number scripts, the framework ensures objective, uniform grading across faculty members and sections.
              </p>
              <p className="text-justify">
                Another crucial feature of the invention is its rigorous governance and auditability. The system incorporates an automated window-lock controller that prevents unauthorized mark modifications while maintaining full traceability for the Controller of Examinations. This synergy between AI-driven pedagogical assistance, cryptographic privacy, and strict administrative control makes the framework uniquely suited for autonomous institutions seeking flawless operational compliance.
              </p>
            </div>

            <div>
              <h3 className="font-bold uppercase text-slate-900 text-base tracking-wider mb-4 border-b border-slate-200 pb-2">
                DETAILED DESCRIPTION OF THE INVENTION
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">1. DATA COLLECTION AND PREPROCESSING MODULE</h4>
                  <p className="text-justify mb-3">
                    The system collects academic records from multiple institutional repositories to establish an authoritative baseline for examination administration.
                  </p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li><strong>Structured:</strong> student master records (registration numbers, AI&amp;DS department batch, semester, section), course credit mappings, staff allocations</li>
                    <li><strong>Unstructured:</strong> digital question papers (Part A short-answer, Part B analytical/derivations, Part C case studies in DOCX/PDF formats)</li>
                    <li><strong>Real-Time Feeds:</strong> examination hall seating manifests, invigilator barcode attendance scans (Present, Absent, On-Duty)</li>
                    <li>
                      <strong>Processing:</strong>
                      <ul className="list-[circle] pl-6 mt-1 space-y-1">
                        <li>Validate student enrollment and verify eligibility thresholds</li>
                        <li>Ingest and clean question text (tokenization, formula parsing, optical structure recognition)</li>
                        <li>Generate high-density Code-128 and QR barcodes for detachable counterfoils</li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-2">2. SECURE DUMMY MAPPING AND ANONYMIZATION ENGINE</h4>
                  <p className="text-justify mb-3">
                    The engine eliminates identity bias during evaluation by strictly decoupling student identity from answer scripts.
                  </p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li><strong>Processes:</strong>
                      <ul className="list-[circle] pl-6 mt-1 space-y-1">
                        <li>Generates non-reversible pseudorandom dummy sequences (e.g., DM-2026-AIDS-4A-0842)</li>
                        <li>Prints unique barcodes on detachable answer sheet counterfoils</li>
                        <li>Stores mapping pairs inside an AES-256 encrypted Controller of Examinations vault</li>
                        <li>Performs pre-valuation parity checks to reconcile physical script counts against attendance records</li>
                      </ul>
                    </li>
                    <li>Evaluators receive answer scripts displaying only the anonymized dummy identifier.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-2">3. AI-POWERED SCHEME AND RUBRIC GENERATION MODULE</h4>
                  <p className="text-justify mb-3">
                    The Large Language Model (Gemini Pro) is used to deconstruct examination papers and formulate authoritative grading schemes.
                  </p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li><strong>Extracts:</strong>
                      <ul className="list-[circle] pl-6 mt-1 space-y-1">
                        <li>Hierarchical question structure and question weightages</li>
                        <li>Bloom's Taxonomy cognitive levels (K1: Remember, K2: Understand, K3: Apply, K4: Analyze, K5: Evaluate, K6: Create)</li>
                        <li>Direct Course Outcome alignments (CO1 to CO5)</li>
                      </ul>
                    </li>
                    <li><strong>Generates:</strong>
                      <ul className="list-[circle] pl-6 mt-1 space-y-1">
                        <li>Step-by-step model solutions and analytical derivations</li>
                        <li>Point-allocation scoring rubrics (formula, substitution, intermediate steps, final answer with units)</li>
                        <li>Formatted institutional Word/PDF documents for faculty reference</li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-2">4. CONTINUOUS ASSESSMENT LOCK AND CBCS GRADING MODULE</h4>
                  <p className="text-justify mb-3">
                    The system governs mark uploads through strict temporal access controls and computes authoritative academic records.
                  </p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li><strong>Access Governance:</strong>
                      <ul className="list-[circle] pl-6 mt-1 space-y-1">
                        <li>Role-based permissions differentiating COE Admin, HOD, and Subject Faculty</li>
                        <li>Automated schedule-based window freezing (LOCKED state prevents post-deadline edits)</li>
                        <li>Cryptographic audit trails logging user ID, timestamp, and justification for any administrative override</li>
                      </ul>
                    </li>
                    <li><strong>Grade Computation:</strong>
                      <ul className="list-[circle] pl-6 mt-1 space-y-1">
                        <li>Aggregates internal components (CIA-1, CIA-2, Model Exam, Practicals) and End Semester marks</li>
                        <li>Maps raw percentage scores to Anna University R-2021 10-point letter grades (O, A+, A, B+, B, C, U)</li>
                        <li>Computes credit-weighted SGPA and CGPA with fail-safe rounding</li>
                        <li>Calculates Course Outcome (CO) and Program Outcome (PO) direct attainment matrices</li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-2">5. DLT-COMPLIANT TELEMETRY AND ALERT DISPATCHER</h4>
                  <p className="text-justify mb-3">
                    The system automatically compiles verified performance data and dispatches instant regulatory notifications to guardians.
                  </p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li><strong>Dispatches:</strong>
                      <ul className="list-[circle] pl-6 mt-1 space-y-1">
                        <li>CIA test marks, subject-wise scores, and class averages</li>
                        <li>Critical attendance alerts for students falling below the statutory 75% threshold</li>
                      </ul>
                    </li>
                    <li><strong>Telecommunication Compliance:</strong>
                      <ul className="list-[circle] pl-6 mt-1 space-y-1">
                        <li>Utilizes pre-registered TRAI DLT template headers and Principal Entity IDs</li>
                        <li>Maintains real-time transmission logs, retry queues, and delivery acknowledgments</li>
                        <li>Delivers tamper-evident transcripts with verification QR codes for institutional publication</li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold uppercase text-slate-900 text-sm tracking-wider mb-3">
                ADVANTAGES
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-justify">
                <li>Eliminates identity bias through complete cryptographic dummy number anonymization</li>
                <li>Standardizes descriptive evaluation using AI-generated cognitive Bloom's taxonomy rubrics</li>
                <li>Eliminates post-deadline grade tampering with automated temporal window locking</li>
                <li>Drastically reduces faculty workload in answer key preparation and mark compilation</li>
                <li>Automates Anna University R-2021 CBCS grade point, SGPA, and CGPA calculation</li>
                <li>Enhances accreditation readiness with automated Course Outcome (CO) attainment metrics</li>
                <li>Facilitates proactive academic intervention via instant, regulatory DLT-compliant parent alerts</li>
              </ul>
            </div>

            <div className="pt-2">
              <h3 className="font-bold uppercase text-slate-900 text-sm tracking-wider mb-2">
                CONCLUSION
              </h3>
              <p className="text-justify leading-relaxed">
                This specification presents an Autonomous Examination Management, Anonymized Dummy Number Mapping, and Artificial Intelligence-Driven Evaluation Scheme Generation Framework (AEE-DMSGF) that effectively combines cryptographic pseudonymization, generative AI semantic parsing, and strict window-locking governance to establish an unassailable examination ecosystem. By leveraging Large Language Models for automated question paper deconstruction and rubric synthesis alongside secure dummy barcode counterfoils, the system delivers objective, transparent, and reproducible evaluation. Furthermore, the integration of automated CBCS grade calculation and TRAI DLT-compliant parent messaging ensures that academic standards, institutional integrity, and stakeholder communication are maintained at the highest level of excellence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: SYSTEM ARCHITECTURE DIAGRAM */}
      {(activeSubDoc === 'architecture' || activeSubDoc === 'all') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#1e3a8a]" />
              <h3 className="font-bold text-slate-800 text-sm">
                FIGURE 1: SYSTEM ARCHITECTURE &amp; WORKFLOW PIPELINE
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/docs/system_architecture_diagram.svg"
                download="VSBEC_AEE_DMSGF_Architecture_Diagram.svg"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#152a65] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download SVG Diagram
              </a>
            </div>
          </div>

          <div className="p-6 md:p-10">
            {/* Visual SVG Embedded Diagram */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-50 p-2">
              <img
                src="/docs/system_architecture_diagram.svg"
                alt="System Architecture Diagram"
                className="w-full h-auto object-contain rounded-xl"
              />
            </div>

            {/* Structured 4-Column Component Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">
                  Tier 1
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Data Sources</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Student master records, AI&amp;DS curriculum regulations (R-2021 CBCS), digital question papers (Parts A/B/C), invigilation attendance manifests, and TRAI DLT-registered parent directories.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
                  Tier 2
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">LLM &amp; AI Analysis</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Gemini Pro semantic parser deconstructs question items, matches Revised Bloom's Taxonomy cognitive levels (K1–K6), aligns Course Outcomes (CO1–CO5), and synthesizes step-by-step scoring rubrics.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                  Tier 3
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Valuation &amp; Lock Core</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cryptographic dummy barcode mapping on detachable counterfoils ensures blind grading. Temporal assessment lock freezes inputs upon schedule deadline with immutable audit logging.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                  Tier 4
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Telemetry &amp; Delivery</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automated 10-point grade &amp; SGPA calculation, direct Course Outcome attainment matrices, and TRAI DLT-compliant parent SMS alerting for marks and &lt;75% attendance shortages.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
