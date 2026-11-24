import { DepartmentCode } from '../types';

export interface DepartmentMeta {
  code: DepartmentCode;
  name: string;
  alias: string;
  description: string;
}

export const DEPARTMENT_LIST: DepartmentMeta[] = [
  { code: 'AI&DS', name: 'Artificial Intelligence & Data Science', alias: 'aids', description: 'Machine Learning, Deep Learning, Predictive Analytics & Autonomous AI Systems' },
  { code: 'CSE', name: 'Computer Science & Engineering', alias: 'cse', description: 'Software Systems, Distributed Computing, Cloud & Information Architectures' },
  { code: 'ECE', name: 'Electronics & Communication Engineering', alias: 'ece', description: 'VLSI Systems, Embedded IoT, Wireless Signal Processing & Microelectronics' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering', alias: 'eee', description: 'Smart Grid Power Systems, Power Electronics & Renewable Energy' },
  { code: 'IT', name: 'Information Technology', alias: 'it', description: 'Full-Stack Systems, Cybersecurity, Network Engineering & Software Design' },
  { code: 'MECH', name: 'Mechanical Engineering', alias: 'mech', description: 'CAD/CAM Robotics, Thermal Engineering, Fluid Dynamics & Mechatronics' },
  { code: 'CIVIL', name: 'Civil Engineering', alias: 'civil', description: 'Structural Engineering, Geotechnical Dynamics, Surveying & Urban Design' },
  { code: 'CSE(AIML)', name: 'CSE (AI & Machine Learning)', alias: 'cseaiml', description: 'Deep Learning, Computer Vision, Generative AI & Autonomous Systems' },
  { code: 'CSBS', name: 'Computer Science & Business Systems', alias: 'csbs', description: 'Enterprise Architecture, Financial Analytics, Cloud & Business Intelligence' },
  { code: 'CCE', name: 'Computer & Communication Engineering', alias: 'cce', description: 'Next-Gen Wireless, Computer Networking & Digital Communications' },
  { code: 'BME', name: 'Biomedical Engineering', alias: 'bme', description: 'Medical Device Instrumentation, Bio-Signals & Healthcare Imaging' },
  { code: 'BIOTECH', name: 'Biotechnology', alias: 'biotech', description: 'Genetic Engineering, Bioprocess Engineering & Bioinformatics' },
  { code: 'CHEM', name: 'Chemical Engineering', alias: 'chem', description: 'Process Engineering, Thermodynamics, Reaction Dynamics & Polymers' }
];
