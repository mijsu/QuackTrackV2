import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * POST /api/seed — Resets the database and ensures only the admin account exists.
 * Query params:
 *   ?reset=true — Wipes existing data before seeding
 */
export async function GET(request: NextRequest) {
  return handleSeedReset(request)
}

export async function POST(request: NextRequest) {
  return handleSeedReset(request)
}

// ──────────────────────────────────────────────
// CURRICULUM DATA FROM EXCEL REFERENCES
// ──────────────────────────────────────────────

interface SubjectData {
  code: string
  name: string
  lec: number
  lab: number
  units: number
  year: number
  sem: string
}

// ── BSIT (Bachelor of Science in Information Technology) ──
const bsitCurriculum: SubjectData[] = [
  // 1st Year - 1st Semester
  { code: 'CC 101', name: 'IT Fundamentals', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'CC 102', name: 'Programming 1', lec: 2, lab: 3, units: 3, year: 1, sem: '1st' },
  { code: 'GECUTS', name: 'Understanding the Self', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'GECMMW', name: 'Math in the Modern World', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'FIL 1', name: 'Komunikasyon sa Akademikong Filipino', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'MS 101', name: 'Discrete Structure', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'NSTP 1', name: 'Civic Welfare & Training Services 1', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'PATHFIT 1', name: 'Physical Activities Toward Health and Fitness 1', lec: 2, lab: 0, units: 2, year: 1, sem: '1st' },
  { code: 'SAPATEROS', name: 'Pateros: History, Life and Culture', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  // 1st Year - 2nd Semester
  { code: 'WS 101', name: 'Introduction to Web Technologies', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  { code: 'CC 103', name: 'Programming 2', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  { code: 'GECARTA', name: 'Art Appreciation', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'GECSTS', name: 'Science, Technology and Society', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'FIL 2', name: 'Pagbasa at Pagsulat tungo sa Pananaliksik', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'GERPH', name: 'Readings in Philippine History', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'NSTP 2', name: 'Civic Welfare & Training Services 2', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PATHFIT 2', name: 'Advance Physical Fitness', lec: 2, lab: 0, units: 2, year: 1, sem: '2nd' },
  { code: 'GECPC', name: 'Purposive Communication', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  // 2nd Year - 1st Semester
  { code: 'DLD 1', name: 'Digital Logic Design', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'CC 104', name: 'Data Structure and Algorithm', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'PA 1', name: 'Principles of Accounting', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'GECTCW', name: 'The Contemporary World', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'GECETH', name: 'Professional Ethics', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'ICS 101', name: 'Introduction to Comp. System and Platform Technologies', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'GEEMST', name: 'Living in IT Era', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'IM 101', name: 'Database Management System', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'OOP 1', name: 'Object Oriented Programming', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'PATHFIT 3', name: 'Teamsports', lec: 2, lab: 0, units: 2, year: 2, sem: '1st' },
  // 2nd Year - 2nd Semester
  { code: 'OS', name: 'Operating System', lec: 2, lab: 3, units: 3, year: 2, sem: '2nd' },
  { code: 'CC 105', name: 'Information Management', lec: 3, lab: 0, units: 3, year: 2, sem: '2nd' },
  { code: 'CC 106', name: 'Application Development', lec: 2, lab: 3, units: 3, year: 2, sem: '2nd' },
  { code: 'SP 22', name: 'Statistics and Probability', lec: 3, lab: 0, units: 3, year: 2, sem: '2nd' },
  { code: 'HC 101', name: 'Human Computer Interaction', lec: 2, lab: 3, units: 3, year: 2, sem: '2nd' },
  { code: 'GEEAH', name: 'Reading in Visual Arts', lec: 3, lab: 0, units: 3, year: 2, sem: '2nd' },
  { code: 'ELEC1', name: 'IT Elective 1', lec: 2, lab: 3, units: 3, year: 2, sem: '2nd' },
  { code: 'IAS 101', name: 'Information Assurance and Security 1', lec: 3, lab: 0, units: 3, year: 2, sem: '2nd' },
  { code: 'CSS 101', name: 'Computer Systems Servicing', lec: 2, lab: 3, units: 3, year: 2, sem: '2nd' },
  { code: 'PATHFIT 4', name: 'Dance', lec: 2, lab: 0, units: 2, year: 2, sem: '2nd' },
  // 3rd Year - 1st Semester
  { code: 'ELEC2', name: 'IT Elective 2', lec: 2, lab: 3, units: 3, year: 3, sem: '1st' },
  { code: 'MRC 22', name: 'Methods of Research in Computing', lec: 3, lab: 0, units: 3, year: 3, sem: '1st' },
  { code: 'SAD 1', name: 'System Analysis and Design', lec: 2, lab: 3, units: 3, year: 3, sem: '1st' },
  { code: 'NET 101', name: 'Network Design and Management', lec: 2, lab: 3, units: 3, year: 3, sem: '1st' },
  { code: 'DBA 1', name: 'Database Administration', lec: 2, lab: 3, units: 3, year: 3, sem: '1st' },
  { code: 'SIA 101', name: 'System Integration and Architecture 1', lec: 3, lab: 0, units: 3, year: 3, sem: '1st' },
  { code: 'MS 102', name: 'Modelling and Simulation', lec: 3, lab: 0, units: 3, year: 3, sem: '1st' },
  { code: 'GEESSP', name: 'The Entrepreneurial Mind', lec: 3, lab: 0, units: 3, year: 3, sem: '1st' },
  { code: 'GEMRZL', name: 'Rizal Life Works and Writing', lec: 3, lab: 0, units: 3, year: 3, sem: '1st' },
  // 3rd Year - 2nd Semester
  { code: 'ELEC3', name: 'IT Elective 3', lec: 2, lab: 3, units: 3, year: 3, sem: '2nd' },
  { code: 'CAP 101', name: 'Capstone 1', lec: 2, lab: 3, units: 3, year: 3, sem: '2nd' },
  { code: 'WS 102', name: 'Web Programming', lec: 2, lab: 3, units: 3, year: 3, sem: '2nd' },
  { code: 'NET 102', name: 'Network Administration and Maintenance', lec: 2, lab: 3, units: 3, year: 3, sem: '2nd' },
  { code: 'IPT 101', name: 'Integrative Programming & Technologies', lec: 2, lab: 3, units: 3, year: 3, sem: '2nd' },
  { code: 'SIA 102', name: 'System Integration and Architecture 2', lec: 3, lab: 0, units: 3, year: 3, sem: '2nd' },
  { code: 'IAS 102', name: 'Information Assurance and Security 2', lec: 3, lab: 0, units: 3, year: 3, sem: '2nd' },
  { code: 'SP 101', name: 'Social Issues and Professional Practices', lec: 3, lab: 0, units: 3, year: 3, sem: '2nd' },
  // 4th Year - 1st Semester
  { code: 'SAM 41', name: 'System Administration & Maintenance', lec: 2, lab: 3, units: 3, year: 4, sem: '1st' },
  { code: 'ELEC4', name: 'IT Elective 4', lec: 2, lab: 3, units: 3, year: 4, sem: '1st' },
  { code: 'FDW 1', name: 'Fundamentals of Data Warehousing & Data Mining', lec: 2, lab: 3, units: 3, year: 4, sem: '1st' },
  { code: 'CAP 102', name: 'Capstone 2', lec: 2, lab: 3, units: 3, year: 4, sem: '1st' },
  { code: 'PM 1', name: 'IT Project Management', lec: 3, lab: 0, units: 3, year: 4, sem: '1st' },
  // 4th Year - 2nd Semester
  { code: 'OJT 1', name: 'On-The-Job Training (600 hrs)', lec: 3, lab: 3, units: 6, year: 4, sem: '2nd' },
  { code: 'ICR 1', name: 'IT Certification Review', lec: 3, lab: 0, units: 3, year: 4, sem: '2nd' },
]

// ── CCS (Certificate in Computer Science) ──
const ccsCurriculum: SubjectData[] = [
  // 1st Year - 1st Semester
  { code: 'CC 101', name: 'IT Fundamentals', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'CC 102', name: 'Programming 1', lec: 2, lab: 3, units: 3, year: 1, sem: '1st' },
  { code: 'GECUTS', name: 'Understanding the Self', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'GECMMW', name: 'Math in the Modern World', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'MS 101', name: 'Discrete Structure', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'FIL 1', name: 'Komunikasyon sa Akademikong Filipino', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'GEEMST', name: 'Living in IT Era', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'NSTP 1', name: 'Civic Welfare & Training Services 1', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'PATHFIT 1', name: 'Physical Activities Toward Health and Fitness 1', lec: 2, lab: 0, units: 2, year: 1, sem: '1st' },
  { code: 'SAPATEROS', name: 'Pateros: History, Life and Culture', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  // 1st Year - 2nd Semester
  { code: 'WS 101', name: 'Introduction to Web Technologies', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  { code: 'CC 103', name: 'Programming 2', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  { code: 'GECARTA', name: 'Art Appreciation', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'GECSTS', name: 'Science, Technology and Society', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'DLD 1', name: 'Digital Logic Design', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  { code: 'PA 1', name: 'Principles of Accounting', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'GECPC', name: 'Purposive Communication', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'NSTP 2', name: 'Civic Welfare & Training Services 2', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PATHFIT 2', name: 'Physical Activities Toward Health and Fitness 2', lec: 2, lab: 0, units: 2, year: 1, sem: '2nd' },
  { code: 'OS', name: 'Operating Systems Concepts', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  // 2nd Year - 1st Semester
  { code: 'GECETH', name: 'Ethics', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'OOP 1', name: 'Programming 4 (OOP)', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'NET 101', name: 'Network Design and Management', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'FIL 2', name: 'Pagbasa at Pagsulat tungo sa Pananaliksik', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'CC 104', name: 'Data Structures and Algorithm', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'ICS 101', name: 'Introduction to Comp. System and Platform Technologies', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'GECTCW', name: 'The Contemporary World', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'IM 101', name: 'Database Management System', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'CSS 101', name: 'Computer Systems Servicing', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'PATHFIT 3', name: 'Physical Activities Toward Health and Fitness 3', lec: 2, lab: 0, units: 2, year: 2, sem: '1st' },
  // 2nd Year - 2nd Semester
  { code: 'WS 102', name: 'WEB Programming 2', lec: 2, lab: 3, units: 3, year: 2, sem: '2nd' },
  { code: 'HC 101', name: 'Human Computer Interaction', lec: 2, lab: 3, units: 3, year: 2, sem: '2nd' },
  { code: 'PATHFIT 4', name: 'Physical Activities Toward Health and Fitness 4', lec: 2, lab: 0, units: 2, year: 2, sem: '2nd' },
  { code: 'PRAC', name: 'Practicum (300 Hrs)', lec: 6, lab: 0, units: 6, year: 2, sem: '2nd' },
  // Summer Term
  { code: 'CC 106', name: 'Application Development', lec: 2, lab: 3, units: 3, year: 2, sem: 'summer' },
  { code: 'CC 105', name: 'Information Management', lec: 3, lab: 0, units: 3, year: 2, sem: 'summer' },
  { code: 'SP 22', name: 'Statistics and Probability', lec: 3, lab: 0, units: 3, year: 2, sem: 'summer' },
  { code: 'ELEC1', name: 'IT Elective 1', lec: 2, lab: 3, units: 3, year: 2, sem: 'summer' },
  { code: 'IAS 101', name: 'Information Assurance and Security 1', lec: 3, lab: 0, units: 3, year: 2, sem: 'summer' },
]

// ── BSOA (Bachelor of Science in Office Administration) ──
const bsoaCurriculum: SubjectData[] = [
  // 1st Year - 1st Semester
  { code: 'GECUTS', name: 'Understanding the Self', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'GECMMW', name: 'Mathematics in the Modern World', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'KB 1', name: 'Keyboarding with Intro to Computing', lec: 2, lab: 3, units: 3, year: 1, sem: '1st' },
  { code: 'PERDEV 1', name: 'Personality Development', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'PA 1', name: 'Principles of Accounting 1', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'PATHFIT 1', name: 'Movement Competency Training', lec: 2, lab: 0, units: 2, year: 1, sem: '1st' },
  { code: 'NSTP 1', name: 'Civic and Social Welfare Training 1', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'SAPATEROS', name: 'Pateros History, Life & Culture', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  // 1st Year - 2nd Semester
  { code: 'GECRPH', name: 'Reading in Phil. History', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'GEESSP', name: 'The Entrepreneurial Mind', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'KB 2', name: 'Keyboarding & Document Processing', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  { code: 'PERDEV 2', name: 'Advance Personality and Professional Development', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PA 2', name: 'Principles of Accounting 2', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PATHFIT 2', name: 'Exercise Based Fitness Activities', lec: 2, lab: 0, units: 2, year: 1, sem: '2nd' },
  { code: 'NSTP 2', name: 'Civic and Social Welfare Training 2', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'BUSMNT', name: 'Business Organization & Management', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  // 2nd Year - 1st Semester
  { code: 'GECPC', name: 'Purposive Communication', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'GECTCW', name: 'The Contemporary World', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'GECARTA', name: 'Art Appreciation', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'ST 1', name: 'Foundation of Shorthand', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'OFFPROD', name: 'Administrative Office Procedure & Management', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'OA 101', name: 'Business Report Writing', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'FIL 1', name: 'Komunikasyon sa Akademikong Filipino', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'PATHFIT 3', name: 'Sports', lec: 2, lab: 0, units: 2, year: 2, sem: '1st' },
  // 2nd Year - 2nd Semester
  { code: 'GECSTS', name: 'Science, Technology & Society', lec: 3, lab: 0, units: 3, year: 2, sem: '2nd' },
  { code: 'GEEMST', name: 'Living in IT Era', lec: 3, lab: 0, units: 3, year: 2, sem: '2nd' },
  { code: 'COMP 1', name: 'Introduction to Programming', lec: 2, lab: 3, units: 3, year: 2, sem: '2nd' },
  { code: 'ST 2', name: 'Advance Shorthand', lec: 2, lab: 3, units: 3, year: 2, sem: '2nd' },
  { code: 'HBO', name: 'Human Behavior in Organization', lec: 3, lab: 0, units: 3, year: 2, sem: '2nd' },
  { code: 'OA 102', name: 'Internet Research for Business', lec: 3, lab: 0, units: 3, year: 2, sem: '2nd' },
  { code: 'FIL 2', name: 'Pagbasa at Pagsulat tungo sa Pananaliksik', lec: 3, lab: 0, units: 3, year: 2, sem: '2nd' },
  { code: 'PATHFIT 4', name: 'Dance', lec: 2, lab: 0, units: 2, year: 2, sem: '2nd' },
  // 3rd Year - 1st Semester
  { code: 'ST 3', name: 'Transcription and Speedbuilding 1 w/ Machine Shorthand Integration', lec: 2, lab: 3, units: 3, year: 3, sem: '1st' },
  { code: 'GECETH', name: 'Ethics', lec: 3, lab: 0, units: 3, year: 3, sem: '1st' },
  { code: 'GEMRZL', name: "Rizal's Life and Works", lec: 3, lab: 0, units: 3, year: 3, sem: '1st' },
  { code: 'GEAAH', name: 'Philippine Popular Culture', lec: 3, lab: 0, units: 3, year: 3, sem: '1st' },
  { code: 'EVMNGT', name: 'Events Management (NC II)', lec: 3, lab: 0, units: 3, year: 3, sem: '1st' },
  { code: 'COMP 2', name: 'Database Management System', lec: 2, lab: 3, units: 3, year: 3, sem: '1st' },
  { code: 'STAT', name: 'Applied Statistics', lec: 3, lab: 0, units: 3, year: 3, sem: '1st' },
  { code: 'RESEARCH 1', name: 'Methods of Research', lec: 3, lab: 0, units: 3, year: 3, sem: '1st' },
  // 3rd Year - 2nd Semester
  { code: 'ST 4', name: 'Transcription and Speedbuilding 2 w/ Machine Shorthand Integration', lec: 2, lab: 3, units: 3, year: 3, sem: '2nd' },
  { code: 'OALM', name: 'Legal Office and Medical Procedure', lec: 3, lab: 0, units: 3, year: 3, sem: '2nd' },
  { code: 'OA 103', name: 'Customer Analytics', lec: 3, lab: 0, units: 3, year: 3, sem: '2nd' },
  { code: 'OPMAN', name: 'Operations Management', lec: 3, lab: 0, units: 3, year: 3, sem: '2nd' },
  { code: 'OA 104', name: 'Introduction to Project Management', lec: 3, lab: 0, units: 3, year: 3, sem: '2nd' },
  { code: 'COMP 3', name: 'Integrated Software Application', lec: 2, lab: 3, units: 3, year: 3, sem: '2nd' },
  { code: 'OA 105', name: 'Human Anatomy and Physiology', lec: 3, lab: 0, units: 3, year: 3, sem: '2nd' },
  { code: 'RESEARCH 2', name: 'Thesis Writing 2', lec: 2, lab: 0, units: 3, year: 3, sem: '2nd' },
  // Summer
  { code: 'IOA', name: 'Office Administration Internship (300 Hrs.)', lec: 2, lab: 3, units: 3, year: 3, sem: 'summer' },
  { code: 'STRAMA', name: 'Strategic Management', lec: 3, lab: 0, units: 3, year: 3, sem: 'summer' },
  { code: 'COMP 4', name: 'E-Learning with Webpage', lec: 3, lab: 0, units: 3, year: 3, sem: 'summer' },
  // 4th Year - 1st Semester
  { code: 'COMP 5', name: 'Web Design', lec: 2, lab: 3, units: 3, year: 4, sem: '1st' },
  { code: 'FIN', name: 'Business Finance', lec: 3, lab: 0, units: 3, year: 4, sem: '1st' },
  { code: 'PPCR', name: 'Principles of Public & Customer Relation', lec: 3, lab: 0, units: 3, year: 4, sem: '1st' },
  { code: 'ILOA', name: 'Legal Office Admin Internship (200 hrs)', lec: 3, lab: 0, units: 3, year: 4, sem: '1st' },
  // 4th Year - 2nd Semester
  { code: 'TAX', name: 'Taxation', lec: 2, lab: 3, units: 3, year: 4, sem: '2nd' },
  { code: 'OA 106', name: 'International Studies', lec: 3, lab: 0, units: 3, year: 4, sem: '2nd' },
  { code: 'LAW', name: 'Business Law', lec: 3, lab: 0, units: 3, year: 4, sem: '2nd' },
  { code: 'IMOA', name: 'Medical Office Admin Internship (100 hrs)', lec: 3, lab: 0, units: 3, year: 4, sem: '2nd' },
  { code: 'ENTRE', name: 'Entrepreneurship Behavior & Competence', lec: 3, lab: 0, units: 3, year: 4, sem: '2nd' },
]

// ── COA (Certificate in Office Administration) ──
const coaCurriculum: SubjectData[] = [
  // 1st Year - 1st Semester
  { code: 'GECUTS', name: 'Understanding the Self', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'GECMMW', name: 'Mathematics in the Modern World', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'KB 1', name: 'Keyboarding with Intro to Computing', lec: 2, lab: 3, units: 3, year: 1, sem: '1st' },
  { code: 'PERDEV 1', name: 'Personality Development', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'PA 1', name: 'Principles of Accounting 1', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'PATHFIT 1', name: 'Movement Competency Training', lec: 2, lab: 0, units: 2, year: 1, sem: '1st' },
  { code: 'NSTP 1', name: 'Civic and Social Welfare Training 1', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'GECPC', name: 'Purposive Communication', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'SAPATEROS', name: 'Pateros History, Life & Culture', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  // 1st Year - 2nd Semester
  { code: 'GECRPH', name: 'Reading in Phil. History', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'ST 1', name: 'Foundation of Shorthand', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'KB 2', name: 'Keyboarding with Intro to Computing (Speed Typing 2)', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  { code: 'PERDEV 2', name: 'Advance Personality and Professional Development', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PA 2', name: 'Principles of Accounting 2', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PATHFIT 2', name: 'Exercise Based Fitness Activities', lec: 2, lab: 0, units: 2, year: 1, sem: '2nd' },
  { code: 'NSTP 2', name: 'Civic and Social Welfare Training 2', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'OP 1', name: 'Office Productivity (Ms Office)', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  { code: 'BUSMNT', name: 'Business Organization & Management', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  // 2nd Year - 1st Semester
  { code: 'GEESSP', name: 'The Entrepreneurial Mind', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'GECTCW', name: 'The Contemporary World', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'GECARTA', name: 'Art Appreciation', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'ST 2', name: 'Advance Shorthand', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'OFFPROD', name: 'Administrative Office Procedure & Management', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'OA 101', name: 'Business Report Writing', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'FOM', name: 'Front Office Management (NC II)', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'PATHFIT 3', name: 'Sports', lec: 2, lab: 0, units: 2, year: 2, sem: '1st' },
  { code: 'GECSTS', name: 'Science, Technology & Society', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  // 2nd Year - 2nd Semester
  { code: 'OA 102', name: 'Internet Research for Business', lec: 3, lab: 0, units: 3, year: 2, sem: '2nd' },
  { code: 'PRAC', name: 'Office Practicum (300 hrs)', lec: 3, lab: 0, units: 6, year: 2, sem: '2nd' },
  { code: 'PATHFIT 4', name: 'Dance', lec: 2, lab: 0, units: 2, year: 2, sem: '2nd' },
]

// ── AHRT (Associate in Hotel and Restaurant Technology) ──
const ahrtCurriculum: SubjectData[] = [
  // 1st Year - 1st Semester
  { code: 'GEC-PC', name: 'Purposive Communication', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'HME-101', name: 'Introduction to Quick Food Service', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'HPC-101', name: 'Kitchen Essentials and Basic Food Preparation', lec: 2, lab: 3, units: 3, year: 1, sem: '1st' },
  { code: 'THC-101', name: 'Macro Perspective to Tourism and Hospitality', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'THC-501', name: 'Personal and Professional Development', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'HPC-301', name: 'Applied Business Tools and Technologies', lec: 2, lab: 3, units: 3, year: 1, sem: '1st' },
  { code: 'HME-201', name: 'Recreation and Leisure Management', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'PATHFIT 1', name: 'Movement Competency Training', lec: 2, lab: 0, units: 2, year: 1, sem: '1st' },
  { code: 'SAPATEROS', name: 'Pateros: History, Life and Culture', lec: 0, lab: 0, units: 0, year: 1, sem: '1st' },
  // 1st Year - 2nd Semester
  { code: 'RMS', name: 'Risk Management as Applied to Food Safety, Security and Sanitation in Hotels and Restaurants', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'GEC-UTS', name: 'Understanding the Self', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PRC', name: 'Philippine Regional Cuisine', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  { code: 'FT 1', name: 'Food Processing Technology', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  { code: 'HME-401', name: 'Food and Beverage Services', lec: 2, lab: 3, units: 3, year: 1, sem: '2nd' },
  { code: 'HPC-401', name: 'Fundamentals of Lodging Operations', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'HPC-201', name: 'Introduction to Management, Incentives, Conferences and Event Management', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PA 1', name: 'Principles of Accounting', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PATHFIT 2', name: 'Exercise Based Fitness Activities', lec: 2, lab: 0, units: 2, year: 1, sem: '2nd' },
  // 2nd Year - 1st Semester
  { code: 'GEC-ARTA', name: 'Art Appreciation', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'THC-401', name: 'Entrepreneurship in Tourism and Hospitality', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'HME-601', name: 'Bar and Beverage Management', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'HME-701', name: 'International Cuisine', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'HME-801', name: 'Catering Service Management', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'HME-901', name: 'Front Office Operations', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'HME-1001', name: 'Housekeeping Operations', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'HME-1101', name: 'Bread and Pastry Production', lec: 2, lab: 3, units: 3, year: 2, sem: '1st' },
  { code: 'PATHFIT 3', name: 'Sports', lec: 2, lab: 0, units: 2, year: 2, sem: '1st' },
  // 2nd Year - 2nd Semester
  { code: 'PRAC', name: 'Practicum: Work Integrated Learning (600 Hrs)', lec: 6, lab: 0, units: 6, year: 2, sem: '2nd' },
  { code: 'PATHFIT 4', name: 'Dance', lec: 2, lab: 0, units: 2, year: 2, sem: '2nd' },
]

// ── AAIS (Associate in Accounting Information System) ──
const aaisCurriculum: SubjectData[] = [
  // 1st Year - 1st Semester
  { code: 'AIS 101', name: 'Financial Accounting and Reporting', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'AIS 102', name: 'Conceptual Framework and Accounting Standard', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'AIS 103', name: 'Accounting Information Systems', lec: 2, lab: 3, units: 3, year: 1, sem: '1st' },
  { code: 'AIS 104', name: 'Management Science', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'GEC-UTS', name: 'Understanding Self', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'GEC-PC', name: 'Purposive Communication', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'CEC-MMW', name: 'Math in the Modern World', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'PATHFIT 1', name: 'Movement Competency Training', lec: 2, lab: 0, units: 2, year: 1, sem: '1st' },
  { code: 'SAPATEROS', name: 'Pateros: History, Life and Culture', lec: 0, lab: 0, units: 0, year: 1, sem: '1st' },
  // 1st Year - 2nd Semester
  { code: 'AIS105', name: 'International Business and Trade', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'AIS106', name: 'Economic Development', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'OPMAN', name: 'Operations Management and TQM', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'GEE-MST', name: 'Math, Science & Technology (Living in IT Era)', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'AIS107', name: 'Financial Management', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'GEC-ARTA', name: 'Arts Appreciation', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'AIS109', name: 'Income Taxation', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PATHFIT 2', name: 'Exercise Based Fitness Activities', lec: 2, lab: 0, units: 2, year: 1, sem: '2nd' },
  // 2nd Year - 1st Semester
  { code: 'STRAMA', name: 'Strategic Management', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'AIS112', name: 'Financial Markets', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'AIS 108', name: 'Statistical Analysis with Software Application', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'AIS 113', name: 'Business Taxation', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'AIS 110', name: 'Cost Accounting and Control', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'PATHFIT 3', name: 'Sports', lec: 2, lab: 0, units: 2, year: 2, sem: '1st' },
  { code: 'GECRPH', name: 'Reading in Philippine History', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'AIS14', name: 'IT Applications Tools in Business', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'AIS15', name: 'Law on Obligations and Contracts', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  // 2nd Year - 2nd Semester
  { code: 'PATHFIT 4', name: 'Dance', lec: 2, lab: 0, units: 2, year: 2, sem: '2nd' },
  { code: 'PRAC', name: 'Practicum: Work Integrated Learning (300 Hrs)', lec: 3, lab: 0, units: 5, year: 2, sem: '2nd' },
]

// ── AHRD (Associate in Human Resource Development) ──
const ahrdCurriculum: SubjectData[] = [
  // 1st Year - 1st Semester
  { code: 'GEC-UTS', name: 'Understanding The Self', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'GEC-MMW', name: 'Mathematics in the Modern World', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'GEC-RPH', name: 'Readings in Phil. History', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'GEC-PC', name: 'Purposive Communication', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'HRD 101', name: 'Human Resources Management', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'PA 1', name: 'Principles of Accounting 1', lec: 3, lab: 0, units: 3, year: 1, sem: '1st' },
  { code: 'OP 1', name: 'Office Productivity 1 (MS Office)', lec: 2, lab: 3, units: 3, year: 1, sem: '1st' },
  { code: 'PATHFIT 1', name: 'Movement Competency Training', lec: 2, lab: 0, units: 2, year: 1, sem: '1st' },
  { code: 'SAPATEROS', name: 'Pateros: History, Life and Culture', lec: 0, lab: 0, units: 0, year: 1, sem: '1st' },
  // 1st Year - 2nd Semester
  { code: 'GEM-RZL', name: 'Rizal Life and Works', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'GEC-TCW', name: 'The Contemporary World', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'GEC-ETH', name: 'Ethics', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'HRD 102', name: 'Business Report Writing', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'HRD 103', name: 'Organizational Development', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'LAW 101', name: 'Law on Obligation and Contracts', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PA 2', name: 'Principles of Accounting 2', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'HRD 108', name: 'Good Governance and Social Responsibility', lec: 3, lab: 0, units: 3, year: 1, sem: '2nd' },
  { code: 'PATHFIT2', name: 'Exercise Based Fitness Activities', lec: 2, lab: 0, units: 2, year: 1, sem: '2nd' },
  // 2nd Year - 1st Semester
  { code: 'GEC-STS', name: 'Science, Technology and Society', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'HRD 104', name: 'Recruitment and Selection', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'HRD 105', name: 'Training and Development', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'ECO 1', name: 'Basic Microeconomics', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'HRD 106', name: 'Operations Management', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'HRD 107', name: 'Logistics Management', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'HRD 109', name: 'Administrative and Office Management', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  { code: 'PATHFIT 3', name: 'Sports', lec: 2, lab: 0, units: 2, year: 2, sem: '1st' },
  { code: 'HRD 110', name: 'Environmental Management Systems', lec: 3, lab: 0, units: 3, year: 2, sem: '1st' },
  // 2nd Year - 2nd Semester
  { code: 'PATHFIT 4', name: 'Dance', lec: 2, lab: 0, units: 2, year: 2, sem: '2nd' },
  { code: 'PRCTUM', name: 'Practicum: Work Integrated Learning (300 Hrs)', lec: 3, lab: 0, units: 3, year: 2, sem: '2nd' },
]
// ──────────────────────────────────────────────
// PROGRAM DEFINITIONS
// ──────────────────────────────────────────────

interface SectionDef {
  year: number
  sem: string
  sectionLetters: string[]
}

interface ProgramDef {
  name: string
  code: string
  description: string
  curriculum: SubjectData[]
  sections: SectionDef[]
}

// ── Section definitions per program/year/semester ──
const sectionDefs: Record<string, SectionDef[]> = {
  BSIT: [
    { year: 1, sem: '1st', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y'] },
    { year: 1, sem: '2nd', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y'] },
    { year: 2, sem: '1st', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R'] },
    { year: 2, sem: '2nd', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R'] },
    { year: 3, sem: '1st', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','OL'] },
    { year: 3, sem: '2nd', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','OL'] },
    { year: 4, sem: '1st', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','QL','RL','SL','TL'] },
    { year: 4, sem: '2nd', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','QL','RL','SL','TL'] },
  ],
  CCS: [
    { year: 1, sem: '1st', sectionLetters: ['A','B','C','D','E','F','G','H','I'] },
    { year: 1, sem: '2nd', sectionLetters: ['A','B','C','D','E','F','G','H','I'] },
    { year: 2, sem: '1st', sectionLetters: ['A','B','C','D','E','F','G','H'] },
    { year: 2, sem: '2nd', sectionLetters: ['A','B','C','D','E','F','G','H'] },
  ],
  BSOA: [
    { year: 1, sem: '1st', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'] },
    { year: 1, sem: '2nd', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'] },
    { year: 2, sem: '1st', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'] },
    { year: 2, sem: '2nd', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'] },
    { year: 3, sem: '1st', sectionLetters: ['A','B','C','D','E','F','G','HL'] },
    { year: 3, sem: '2nd', sectionLetters: ['A','B','C','D','E','F','G','HL'] },
    { year: 4, sem: '1st', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','NL','OL','PL'] },
    { year: 4, sem: '2nd', sectionLetters: ['A','B','C','D','E','F','G','H','I','J','K','L','M','NL','OL','PL'] },
  ],
  COA: [
    { year: 1, sem: '1st', sectionLetters: ['A','B','C','D','E','F'] },
    { year: 1, sem: '2nd', sectionLetters: ['A','B','C','D','E','F'] },
    { year: 2, sem: '1st', sectionLetters: ['A','B','C','D'] },
    { year: 2, sem: '2nd', sectionLetters: ['A','B','C','D'] },
  ],
  AHRT: [
    { year: 1, sem: '1st', sectionLetters: ['A'] },
    { year: 1, sem: '2nd', sectionLetters: ['A'] },
    { year: 2, sem: '1st', sectionLetters: ['A','B','C','D','E','F','G','H'] },
    { year: 2, sem: '2nd', sectionLetters: ['A','B','C','D','E','F','G','H'] },
  ],
  AAIS: [
    { year: 1, sem: '1st', sectionLetters: ['A'] },
    { year: 1, sem: '2nd', sectionLetters: ['A'] },
    { year: 2, sem: '1st', sectionLetters: ['A'] },
    { year: 2, sem: '2nd', sectionLetters: ['A'] },
  ],
  AHRD: [
    { year: 1, sem: '1st', sectionLetters: ['A','B','C','D','E'] },
    { year: 1, sem: '2nd', sectionLetters: ['A','B','C','D','E'] },
    { year: 2, sem: '1st', sectionLetters: ['A'] },
    { year: 2, sem: '2nd', sectionLetters: ['A'] },
  ],
}

const iictPrograms: ProgramDef[] = [
  {
    name: 'Bachelor of Science in Information Technology',
    code: 'BSIT',
    description: 'A comprehensive program in information technology focusing on computer and communication services',
    curriculum: bsitCurriculum,
    sections: sectionDefs.BSIT,
  },
  {
    name: 'Certificate in Computer Science',
    code: 'CCS',
    description: 'A two-year certificate program in computer science',
    curriculum: ccsCurriculum,
    sections: sectionDefs.CCS,
  },
]

const iboaPrograms: ProgramDef[] = [
  {
    name: 'Bachelor of Science in Office Administration',
    code: 'BSOA',
    description: 'A comprehensive program in office administration focusing on computer and office automation',
    curriculum: bsoaCurriculum,
    sections: sectionDefs.BSOA,
  },
  {
    name: 'Certificate in Office Administration',
    code: 'COA',
    description: 'A two-year certificate program in office administration',
    curriculum: coaCurriculum,
    sections: sectionDefs.COA,
  },
  {
    name: 'Associate in Hotel and Restaurant Technology',
    code: 'AHRT',
    description: 'A two-year associate program in hotel and restaurant technology',
    curriculum: ahrtCurriculum,
    sections: sectionDefs.AHRT,
  },
  {
    name: 'Associate in Accounting Information System',
    code: 'AAIS',
    description: 'A two-year associate program in accounting information system',
    curriculum: aaisCurriculum,
    sections: sectionDefs.AAIS,
  },
  {
    name: 'Associate in Human Resource Development',
    code: 'AHRD',
    description: 'A two-year associate program in human resource development',
    curriculum: ahrdCurriculum,
    sections: sectionDefs.AHRD,
  },
]

// ──────────────────────────────────────────────
// SPECIALIZATIONS FOR FACULTY
// ──────────────────────────────────────────────

const specializations = [
  'Programming & Software Development',
  'Networks & Communications',
  'Database Systems & Data Management',
  'Web Development & Technologies',
  'Information Security',
  'System Administration',
  'Business Administration',
  'Office Management',
  'Accounting',
  'Human Resources',
  'Hospitality Management',
  'Tourism Management',
]

// ──────────────────────────────────────────────
// MAIN SEED HANDLER
// ──────────────────────────────────────────────

async function handleSeedReset(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const forceReset = url.searchParams.get('reset') === 'true'
    const skipDemoData = url.searchParams.get('skipDemoData') === 'true'

    if (!forceReset) {
      const existingDepartments = await db.department.count()
      if (existingDepartments > 0) {
        return NextResponse.json(
          { error: 'Database already has data. Use ?reset=true to force re-seed.' },
          { status: 400 }
        )
      }
    }

    if (forceReset) {
      console.log(`🗑️ Force reset requested — wiping all data... (NODE_ENV: "${process.env.NODE_ENV}", skipDemoData: ${skipDemoData})`)
      // Delete in dependency order
      // Delete all data using TRUNCATE CASCADE for reliable wipe
      await db.$executeRawUnsafe('TRUNCATE TABLE "Conflict", "Schedule", "ScheduleResponse", "ScheduleLog", "AuditLog", "Notification", "Announcement", "FacultyPreference", "ScheduleVersion", "GenerationSession", "GenerationConfig", "Section", "Subject", "User", "Program", "Department" CASCADE;')
      console.log('✅ All data wiped')

      if (process.env.NODE_ENV === 'production' || skipDemoData) {
        const hashedAdminPassword = await bcrypt.hash('password123', 10)
        await db.user.create({
          data: {
            uid: 'ADMIN001',
            name: 'System Administrator',
            email: 'admin@quacktrack.com',
            password: hashedAdminPassword,
            role: 'admin',
            status: 'active',
            maxUnits: 0,
          },
        })
        return NextResponse.json({
          message: 'Database cleared. Admin user created.',
          credentials: { email: 'admin@quacktrack.com', password: 'password123' },
        })
      }
    }

    const hashedAdminPassword = await bcrypt.hash('password123', 10)

    const admin = await db.user.upsert({
      where: { email: 'admin@quacktrack.com' },
      update: {
        uid: 'ADMIN001',
        name: 'System Administrator',
        password: hashedAdminPassword,
        role: 'admin',
        status: 'active',
        maxUnits: 0,
      },
      create: {
        uid: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@quacktrack.com',
        password: hashedAdminPassword,
        role: 'admin',
        status: 'active',
        maxUnits: 0,
      },
    })

    // Create demo data only in development mode
    if (process.env.NODE_ENV !== 'production' && !skipDemoData) {
      console.log('📦 Creating all curriculum data from Excel references...')

      // ── Create Departments ──
      const iictDept = await db.department.create({
        data: {
          name: 'Institute of Information and Communications Technology',
          code: 'IICT',
          college: 'Institute of Information and Communications Technology',
          classType: 'regular',
        },
      })

      const iboaDept = await db.department.create({
        data: {
          name: 'Institute of Business and Office Administration',
          code: 'IBOA',
          college: 'Institute of Business and Office Administration',
          classType: 'regular',
        },
      })

      // ── Helper to create subjects for a program ──
      async function createSubjects(programId: string, departmentId: string, programCode: string, curriculum: SubjectData[]) {
        console.log(`  Creating subjects for program ${programCode} (id: ${programId})...`)
        for (const course of curriculum) {
          const prefixedCode = `${programCode}-${course.code}`
          await db.subject.create({
            data: {
              subjectCode: prefixedCode,
              subjectName: course.name,
              units: course.units,
              programId,
              departmentId,
              subjectType: course.lab > 0 ? 'lecture_and_lab' : 'lecture',
              classType: 'regular',
              yearLevel: course.year,
              semester: course.sem,
              lectureHours: course.lec,
              labHours: course.lab,
              isActive: true,
            },
          })
        }
      }

      // ── Helper to create sections for a program ──
      async function createSections(
        programId: string,
        departmentId: string,
        programCode: string,
        sections: SectionDef[]
      ) {
        for (const sec of sections) {
          for (const letter of sec.sectionLetters) {
            await db.section.create({
              data: {
                sectionName: `${programCode} Year ${sec.year} - ${sec.sem} Sem - Section ${letter}`,
                programId,
                departmentId,
                yearLevel: sec.year,
                semester: sec.sem,
                population: 40,
                classType: 'regular',
                isActive: true,
              },
            })
          }
        }
      }

      // ── Create IICT Programs ──
      for (const prog of iictPrograms) {
        const program = await db.program.create({
          data: {
            name: prog.name,
            code: prog.code,
            description: prog.description,
            departmentId: iictDept.id,
            classType: 'regular',
            isActive: true,
          },
        })
        await createSubjects(program.id, iictDept.id, prog.code, prog.curriculum)
        await createSections(program.id, iictDept.id, prog.code, prog.sections)
      }

      // ── Create IBOA Programs ──
      for (const prog of iboaPrograms) {
        const program = await db.program.create({
          data: {
            name: prog.name,
            code: prog.code,
            description: prog.description,
            departmentId: iboaDept.id,
            classType: 'regular',
            isActive: true,
          },
        })
        await createSubjects(program.id, iboaDept.id, prog.code, prog.curriculum)
        await createSections(program.id, iboaDept.id, prog.code, prog.sections)
      }

      // ── Create 100 Faculty Members (Instructor 1-100) ──
      // 30 full-time (maxUnits: 24), 70 part-time (maxUnits: 18)
      // Evenly distributed across both departments (15 FT + 35 PT each)
      const fullTimeIds = new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65])
      for (let i = 1; i <= 100; i++) {
        const isFullTime = fullTimeIds.has(i)
        const spec = specializations[(i - 1) % specializations.length]
        const deptId = i <= 50 ? iictDept.id : iboaDept.id
        await db.user.create({
          data: {
            uid: `FAC${String(i).padStart(3, '0')}`,
            name: `Instructor ${i}`,
            email: `instructor${i}@quacktrack.com`,
            password: hashedAdminPassword,
            role: 'faculty',
            facultyType: isFullTime ? 'regular' : 'regular',
            departmentId: deptId,
            contractType: isFullTime ? 'permanent' : 'part_time',
            maxUnits: isFullTime ? 24 : 18,
            specialization: spec,
            status: 'active',
            isActivated: true,
          },
        })
      }

      // ── Count totals ──
      const totalSubjects =
        bsitCurriculum.length + ccsCurriculum.length +
        bsoaCurriculum.length + coaCurriculum.length +
        ahrtCurriculum.length + aaisCurriculum.length +
        ahrdCurriculum.length

      const totalSections =
        iictPrograms.reduce((acc, p) => acc + p.sections.reduce((a, s) => a + s.sectionLetters.length, 0), 0) +
        iboaPrograms.reduce((acc, p) => acc + p.sections.reduce((a, s) => a + s.sectionLetters.length, 0), 0)

      console.log('✅ All curriculum data created successfully!')
      return NextResponse.json({
        message: 'Database seeded successfully with all PTC curriculum data',
        admin: { email: 'admin@quacktrack.com', password: 'password123' },
        demoData: {
          departments: 2,
          programs: iictPrograms.length + iboaPrograms.length,
          subjects: totalSubjects,
          sections: totalSections,
          faculty: 100,
        },
      }, { status: 201 })
    }

    console.log('✅ Database seeded successfully: admin only', { admin: admin.email })

    return NextResponse.json({
      message: 'Database seeded successfully',
      admin: { email: 'admin@quacktrack.com', password: 'password123' },
    }, { status: 201 })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
