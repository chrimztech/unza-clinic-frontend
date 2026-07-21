// External system integration for UNZA Clinic
// Integrates with Student Information System (SIS), HR System, and Counseling System

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const COUNSELING_API =
  import.meta.env.VITE_COUNSELING_API_URL || `${API_BASE.replace(/\/$/, "")}/external/counseling`;
const AUTH_STORAGE_KEY = "unza-user";

function getAuthHeaders() {
  try {
    const rawUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawUser) return {};
    const user = JSON.parse(rawUser);
    return user?.accessToken
      ? { Authorization: `${user.tokenType || "Bearer"} ${user.accessToken}` }
      : {};
  } catch {
    return {};
  }
}

async function fetchExternal(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...(options?.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `Request failed: ${response.status}` }));
    throw new Error(error.error || `External system error: ${response.status}`);
  }
  return response.json();
}

// Student Information System integration
export const sisApi = {
  // Search student by student number. Instance is optional — UG, PG, GSB, IDE, ZOU, ecampus.
  // When omitted, the backend tries every instance and returns the first match.
  searchByStudentNumber: async (studentNumber: string, instance?: string) => {
    const query = instance ? `?instance=${encodeURIComponent(instance)}` : "";
    return fetchExternal(`${API_BASE}/external/sis/students/${encodeURIComponent(studentNumber.trim())}${query}`);
  },

  // Search students by name
  searchByName: async (name: string) => {
    return fetchExternal(`${API_BASE}/external/sis/students/search?name=${encodeURIComponent(name.trim())}`);
  },

  // Get student medical examination status
  getMedicalExamStatus: async (studentNumber: string) => {
    return fetchExternal(`${API_BASE}/external/sis/students/${encodeURIComponent(studentNumber.trim())}/medical-status`);
  },

  // Update student medical record status
  updateMedicalRecord: async (studentNumber: string, data: { examined: boolean; examDate: string; notes?: string }) => {
    return fetchExternal(`${API_BASE}/external/sis/students/${encodeURIComponent(studentNumber.trim())}/medical-record`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Get student dependents (if applicable)
  getDependents: async (studentNumber: string) => {
    return fetchExternal(`${API_BASE}/external/sis/students/${encodeURIComponent(studentNumber.trim())}/dependents`);
  },
};

// HR System integration
export const hrApi = {
  // Search staff by staff number
  searchByStaffNumber: async (staffNumber: string) => {
    return fetchExternal(`${API_BASE}/external/hr/staff/${encodeURIComponent(staffNumber.trim())}`);
  },

  // Search staff by name
  searchByName: async (name: string) => {
    return fetchExternal(`${API_BASE}/external/hr/staff/search?name=${encodeURIComponent(name.trim())}`);
  },

  // Get staff metadata including spouse and dependents
  getStaffDetails: async (staffNumber: string) => {
    return fetchExternal(`${API_BASE}/external/hr/staff/${encodeURIComponent(staffNumber.trim())}/details`);
  },

  // Get staff spouse info
  getSpouse: async (staffNumber: string) => {
    return fetchExternal(`${API_BASE}/external/hr/staff/${encodeURIComponent(staffNumber.trim())}/spouse`);
  },

  // Get staff dependents
  getDependents: async (staffNumber: string) => {
    return fetchExternal(`${API_BASE}/external/hr/staff/${encodeURIComponent(staffNumber.trim())}/dependents`);
  },

  // Update staff medical record status
  getMedicalExamStatus: async (staffNumber: string) => {
    return fetchExternal(`${API_BASE}/external/hr/staff/${encodeURIComponent(staffNumber.trim())}/medical-status`);
  },

  // Update staff medical record status
  updateMedicalRecord: async (staffNumber: string, data: { examined: boolean; examDate: string; notes?: string }) => {
    return fetchExternal(`${API_BASE}/external/hr/staff/${encodeURIComponent(staffNumber.trim())}/medical-record`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// Counseling System integration
export const counselingApi = {
  // Refer a patient TO counseling system
  referToCounseling: async (data: {
    patientId: string;
    patientName: string;
    patientType: string;
    reason: string;
    urgency: "low" | "medium" | "high";
    referredBy: string;
    notes?: string;
  }) => {
    return fetchExternal(`${COUNSELING_API}/referrals`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Receive referred clients FROM counseling system
  receiveFromCounseling: async (referralId: string) => {
    return fetchExternal(`${COUNSELING_API}/referrals/${encodeURIComponent(referralId)}`);
  },

  // Get all referrals to/from counseling
  getReferrals: async (direction: "to" | "from" = "to") => {
    return fetchExternal(`${COUNSELING_API}/referrals?direction=${direction}`);
  },

  // Get recent counseling sessions or sessions for a specific patient id
  getSessions: async (patientId = "all") => {
    return fetchExternal(`${COUNSELING_API}/sessions?patientId=${encodeURIComponent(patientId)}`);
  },

  // Update referral status
  updateReferralStatus: async (referralId: string, data: {
    status: "pending" | "in_progress" | "completed" | "cancelled";
    notes?: string;
  }) => {
    return fetchExternal(`${COUNSELING_API}/referrals/${encodeURIComponent(referralId)}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Get counseling session notes for a patient (maps to clinic visit records)
  getSessionNotes: async (patientId: string) => {
    return fetchExternal(`${COUNSELING_API}/sessions?patientId=${encodeURIComponent(patientId)}`);
  },

  // Visit frequency stats for a specific client
  getVisitFrequency: async (clientId: string) => {
    return fetchExternal(`${COUNSELING_API}/visits/frequency?clientId=${encodeURIComponent(clientId)}`);
  },

  // Frequent-visitor alert list (clients who visited >= threshold times within withinDays)
  getFrequentVisitors: async (threshold = 3, withinDays = 90) => {
    return fetchExternal(
      `${COUNSELING_API}/visits/frequent-visitors?threshold=${threshold}&withinDays=${withinDays}`
    );
  },

  // Push a clinic visit to the counseling system (closes the referral feedback loop)
  pushClinicVisit: async (data: {
    clientId: string;
    referralId?: number;
    visitDate: string;
    visitType: "GENERAL" | "MENTAL_HEALTH" | "FOLLOW_UP" | "EMERGENCY" | "REFERRAL_FOLLOW_UP";
    visitPurpose?: string;
    notes?: string;
  }) => {
    return fetchExternal(`${COUNSELING_API}/inbound/visit`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// Patient type detection and metadata enrichment
export type PatientSource = "student" | "staff" | "dependent" | "spouse" | "guest";

export interface EnrichedPatient {
  source: PatientSource;
  patientId: string;
  name: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  address?: string;
  program?: string; // For students
  yearOfStudy?: number; // For students
  department?: string; // For staff
  position?: string; // For staff
  staffNumber?: string; // For staff
  studentNumber?: string; // For students
  spouseInfo?: { name: string; dateOfBirth?: string; phone?: string };
  dependents?: Array<{ name: string; dateOfBirth?: string; relationship?: string }>;
  requiresMedicalExam?: boolean;
  medicalExamStatus?: "pending" | "completed" | "exempted";
  isNewGuest?: boolean;
}

// Search across all systems
export async function searchPatient(identifier: string): Promise<EnrichedPatient | null> {
  const trimmed = identifier.trim();
  
  // Try student number format (usually numeric or alphanumeric like "2023123456")
  if (/^\d{8,12}$/.test(trimmed)) {
    try {
      const student = await sisApi.searchByStudentNumber(trimmed);
      return {
        source: "student",
        patientId: student.student_number || trimmed,
        name: student.full_name || `${student.first_name} ${student.last_name}`,
        dateOfBirth: student.date_of_birth,
        gender: student.gender,
        email: student.email,
        phone: student.phone,
        address: student.address,
        program: student.program,
        yearOfStudy: student.year_of_study,
        studentNumber: student.student_number,
        requiresMedicalExam: student.requires_medical_exam !== false,
        medicalExamStatus: student.medical_exam_status || "pending",
      };
    } catch {
      // Not a student, try staff
    }
  }

  // Try staff number format (often starts with "EMP" or similar)
  if (/^(EMP|STAFF)?\d{4,8}$/i.test(trimmed) || /^[A-Z]{2,4}\/\d{4,8}$/.test(trimmed)) {
    try {
      const staff = await hrApi.searchByStaffNumber(trimmed);
      return {
        source: "staff",
        patientId: staff.staff_number || trimmed,
        name: staff.full_name || `${staff.first_name} ${staff.last_name}`,
        dateOfBirth: staff.date_of_birth,
        gender: staff.gender,
        email: staff.email,
        phone: staff.phone,
        address: staff.address,
        department: staff.department,
        position: staff.position,
        staffNumber: staff.staff_number,
        requiresMedicalExam: staff.requires_medical_exam !== false,
        medicalExamStatus: staff.medical_exam_status || "pending",
      };
    } catch {
      // Not staff
    }
  }

  // Search by name in both systems
  if (trimmed.length >= 3) {
    try {
      const [students, staff] = await Promise.all([
        sisApi.searchByName(trimmed).catch(() => []),
        hrApi.searchByName(trimmed).catch(() => []),
      ]);
      
      if (students.length > 0) {
        const student = students[0];
        return {
          source: "student",
          patientId: student.student_number,
          name: student.full_name,
          dateOfBirth: student.date_of_birth,
          gender: student.gender,
          email: student.email,
          phone: student.phone,
          program: student.program,
          studentNumber: student.student_number,
          requiresMedicalExam: student.requires_medical_exam !== false,
          medicalExamStatus: student.medical_exam_status || "pending",
        };
      }
      
      if (staff.length > 0) {
        const staffMember = staff[0];
        return {
          source: "staff",
          patientId: staffMember.staff_number,
          name: staffMember.full_name,
          dateOfBirth: staffMember.date_of_birth,
          gender: staffMember.gender,
          email: staffMember.email,
          phone: staffMember.phone,
          department: staffMember.department,
          position: staffMember.position,
          staffNumber: staffMember.staff_number,
          requiresMedicalExam: staffMember.requires_medical_exam !== false,
          medicalExamStatus: staffMember.medical_exam_status || "pending",
        };
      }
    } catch {
      // Search failed
    }
  }

  return null;
}

// Guest patient registration
export function createGuestPatient(data: {
  name: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  reasonForVisit?: string;
}): EnrichedPatient {
  const guestId = `GUEST-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  return {
    source: "guest",
    patientId: guestId,
    name: data.name,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    phone: data.phone,
    address: data.address,
    isNewGuest: true,
    requiresMedicalExam: false,
    medicalExamStatus: "exempted",
  };
}
