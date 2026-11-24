import { DepartmentCode, ExamCategory, QuestionKey } from '../types';

export interface DepartmentSubject {
  code: string;
  name: string;
  semester: number;
  department: DepartmentCode;
  regulation: string;
  credits: number;
  type: 'Theory' | 'Theory + Lab' | 'Integrated';
}

export const DEPARTMENT_SUBJECTS: Record<DepartmentCode, DepartmentSubject[]> = {
  'AI&DS': [
    // Semester 1 (Year I)
    { code: 'GE3151', name: 'Problem Solving and Python Programming', semester: 1, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'MA3151', name: 'Matrices and Calculus', semester: 1, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'PH3151', name: 'Engineering Physics', semester: 1, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'CY3151', name: 'Engineering Chemistry', semester: 1, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    // Semester 2 (Year I)
    { code: 'AD3251', name: 'Data Structures and Algorithms', semester: 2, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'MA3251', name: 'Statistics and Numerical Methods', semester: 2, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'GE3251', name: 'Engineering Graphics & CAD', semester: 2, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory + Lab' },
    // Semester 3 (Year II)
    { code: 'AD3351', name: 'Design and Analysis of Algorithms', semester: 3, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'AD3391', name: 'Database Design and Management', semester: 3, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'CS3351', name: 'Digital Principles and Computer Organization', semester: 3, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'MA3391', name: 'Probability and Statistics for AI', semester: 3, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    // Semester 4 (Year II)
    { code: 'AD3491', name: 'Fundamentals of Machine Learning', semester: 4, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'AD3401', name: 'Operating Systems & System Software', semester: 4, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'CS3491', name: 'Artificial Intelligence and Expert Systems', semester: 4, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    // Semester 5 (Year III)
    { code: 'AD3501', name: 'Deep Neural Networks & Architectures', semester: 5, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'AD6301', name: 'Deep Learning & Computer Vision', semester: 5, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'AD3511', name: 'Big Data Analytics & Cloud MLOps', semester: 5, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'CS3591', name: 'Computer Networks and Protocols', semester: 5, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    // Semester 6 (Year III)
    { code: 'AD3601', name: 'Natural Language Processing & Transformers', semester: 6, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'AD3611', name: 'Reinforcement Learning & Generative AI', semester: 6, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'AD3651', name: 'Cognitive Computing & Knowledge Graphs', semester: 6, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    // Semester 7 (Year IV)
    { code: 'AD3701', name: 'Computer Vision & Real-time Perception', semester: 7, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'AD3711', name: 'Cognitive Computing & Edge AI', semester: 7, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'AD3751', name: 'MLOps and Model Deployment in Cloud', semester: 7, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    // Semester 8 (Year IV)
    { code: 'AD3811', name: 'Autonomous Capstone Project & Internship', semester: 8, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 10, type: 'Integrated' },
    { code: 'AD3851', name: 'Professional Ethics and AI Safety', semester: 8, department: 'AI&DS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' }
  ],
  'CSE': [
    { code: 'CS3351', name: 'Digital Principles and Computer Organization', semester: 3, department: 'CSE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CS3391', name: 'Object Oriented Programming with Java', semester: 3, department: 'CSE', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'CS3401', name: 'Algorithms & Data Structures Analysis', semester: 4, department: 'CSE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CS3491', name: 'Artificial Intelligence & Machine Learning', semester: 4, department: 'CSE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CS3591', name: 'Computer Networks and Protocols', semester: 5, department: 'CSE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CS3691', name: 'Compiler Design & Formal Languages', semester: 6, department: 'CSE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CS3701', name: 'Cloud Computing & Distributed Systems', semester: 7, department: 'CSE', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' }
  ],
  'ECE': [
    { code: 'EC3351', name: 'Control Systems Engineering', semester: 3, department: 'ECE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'EC3452', name: 'Electromagnetic Fields & Waveguides', semester: 4, department: 'ECE', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'EC3501', name: 'Wireless Communication & 5G Systems', semester: 5, department: 'ECE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'EC3552', name: 'VLSI Design & CMOS Architectures', semester: 5, department: 'ECE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'EC3601', name: 'Embedded Systems and Internet of Things', semester: 6, department: 'ECE', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' }
  ],
  'EEE': [
    { code: 'EE3301', name: 'Electromagnetic Field Theory', semester: 3, department: 'EEE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'EE3401', name: 'Transmission and Distribution of Power', semester: 4, department: 'EEE', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'EE3501', name: 'Power System Analysis & Smart Grid', semester: 5, department: 'EEE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'EE3601', name: 'Solid State Electric Drives & Controls', semester: 6, department: 'EEE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' }
  ],
  'IT': [
    { code: 'IT3301', name: 'Data Structures and Algorithms in C++', semester: 3, department: 'IT', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'IT3401', name: 'Web Technologies and Full-Stack Frameworks', semester: 4, department: 'IT', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'IT3501', name: 'Information Security and Cryptography', semester: 5, department: 'IT', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'IT3601', name: 'Mobile Computing & Cloud Application Dev', semester: 6, department: 'IT', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' }
  ],
  'MECH': [
    { code: 'ME3351', name: 'Engineering Thermodynamics', semester: 3, department: 'MECH', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'ME3491', name: 'Theory of Machines & Mechanisms', semester: 4, department: 'MECH', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'ME3591', name: 'Design of Machine Elements', semester: 5, department: 'MECH', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'ME3691', name: 'Finite Element Analysis and Simulation', semester: 6, department: 'MECH', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' }
  ],
  'CIVIL': [
    { code: 'CE3301', name: 'Fluid Mechanics and Hydraulic Machinery', semester: 3, department: 'CIVIL', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CE3401', name: 'Strength of Materials & Structural Mechanics', semester: 4, department: 'CIVIL', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CE3501', name: 'Design of Reinforced Concrete Structures', semester: 5, department: 'CIVIL', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CE3601', name: 'Foundation Engineering & Soil Dynamics', semester: 6, department: 'CIVIL', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' }
  ],
  'CSE(AIML)': [
    { code: 'AL3301', name: 'Foundations of Artificial Intelligence', semester: 3, department: 'CSE(AIML)', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'AL3401', name: 'Statistical Machine Learning Models', semester: 4, department: 'CSE(AIML)', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'AL3501', name: 'Neural Networks & Reinforcement Learning', semester: 5, department: 'CSE(AIML)', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' }
  ],
  'CSBS': [
    { code: 'CB3301', name: 'Fundamentals of Economics & Financial Mgmt', semester: 3, department: 'CSBS', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'CB3401', name: 'Enterprise Design Thinking & Software Eng', semester: 4, department: 'CSBS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CB3501', name: 'Business Analytics & Predictive Modeling', semester: 5, department: 'CSBS', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' }
  ],
  'CCE': [
    { code: 'CC3301', name: 'Signals, Systems and Network Theory', semester: 3, department: 'CCE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CC3401', name: 'Modern Communication Systems & Modulation', semester: 4, department: 'CCE', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'CC3501', name: 'Broadband Wireless Networks & Protocols', semester: 5, department: 'CCE', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' }
  ],
  'BME': [
    { code: 'BM3301', name: 'Human Anatomy and Physiology', semester: 3, department: 'BME', regulation: 'R-2021 Autonomous', credits: 3, type: 'Theory' },
    { code: 'BM3401', name: 'Biomedical Sensors and Instrumentation', semester: 4, department: 'BME', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'BM3501', name: 'Medical Diagnostic Imaging & Ultrasound', semester: 5, department: 'BME', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' }
  ],
  'BIOTECH': [
    { code: 'BT3301', name: 'Biochemistry and Enzymology', semester: 3, department: 'BIOTECH', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'BT3401', name: 'Microbiology and Genetic Engineering', semester: 4, department: 'BIOTECH', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'BT3501', name: 'Bioreactor Design and Bioprocess Tech', semester: 5, department: 'BIOTECH', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' }
  ],
  'CHEM': [
    { code: 'CH3301', name: 'Chemical Process Calculations & Stoichiometry', semester: 3, department: 'CHEM', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CH3401', name: 'Fluid Mechanics in Chemical Processing', semester: 4, department: 'CHEM', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' },
    { code: 'CH3501', name: 'Mass Transfer Operations & Distillation', semester: 5, department: 'CHEM', regulation: 'R-2021 Autonomous', credits: 4, type: 'Theory' }
  ]
};

export interface StandardExamSchema {
  category: ExamCategory;
  title: string;
  totalMarks: number;
  duration: string;
  parts: {
    partA: { count: number; marksEach: number; total: number; blooms: string; description: string };
    partB: { count: number; marksEach: number; total: number; blooms: string; description: string };
    partC: { count: number; marksEach: number; total: number; blooms: string; description: string };
  };
}

export const STANDARD_EXAM_SCHEMAS: Record<ExamCategory, StandardExamSchema> = {
  Internal: {
    category: 'Internal',
    title: 'Internal Assessment Test (IAT 1-3)',
    totalMarks: 50,
    duration: '1.5 Hours',
    parts: {
      partA: { count: 5, marksEach: 2, total: 10, blooms: 'K1 - K2', description: '5 Short Questions (Definitions, Formulae, Principles)' },
      partB: { count: 2, marksEach: 13, total: 26, blooms: 'K3 - K4', description: '2 Either/Or Analytical/Derivation Questions with Step Rubrics' },
      partC: { count: 1, marksEach: 14, total: 14, blooms: 'K5 - K6', description: '1 Comprehensive Application / Case Study Question' }
    }
  },
  Model: {
    category: 'Model',
    title: 'Autonomous Pre-Semester Model Examination',
    totalMarks: 100,
    duration: '3.0 Hours',
    parts: {
      partA: { count: 10, marksEach: 2, total: 20, blooms: 'K1 - K2', description: '10 Short Questions covering all 5 Syllabus Units' },
      partB: { count: 5, marksEach: 13, total: 65, blooms: 'K3 - K4', description: '5 Either/Or Questions (11 to 15) with Step-by-Step Mark Rubrics' },
      partC: { count: 1, marksEach: 15, total: 15, blooms: 'K5 - K6', description: '1 Application-oriented / Complex Problem Solving Question (Q16)' }
    }
  },
  Semester: {
    category: 'Semester',
    title: 'Autonomous End Semester Examination (ESE)',
    totalMarks: 100,
    duration: '3.0 Hours',
    parts: {
      partA: { count: 10, marksEach: 2, total: 20, blooms: 'K1 - K2', description: '10 Compulsory Short Questions (All Units covered)' },
      partB: { count: 5, marksEach: 13, total: 65, blooms: 'K3 - K4', description: '5 Either/Or Descriptive Questions (Q11-Q15) mapped to CO1-CO5' },
      partC: { count: 1, marksEach: 15, total: 15, blooms: 'K5 - K6', description: '1 Comprehensive Evaluation Question (Q16) mapped to CO6' }
    }
  }
};
