const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const AUTH_STORAGE_KEY = "unza-user";

type SessionUser = {
  accessToken?: string;
  tokenType?: string;
  expiresAt?: string;
  id?: number;
  role?: string;
};

function getStoredUser(): SessionUser | null {
  try {
    const rawUser = localStorage.getItem(AUTH_STORAGE_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("unza:auth:logout"));
}

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

async function request(endpoint: string, options: RequestInit = {}) {
  const storedUser = getStoredUser();
  const authHeaders: Record<string, string> = {};
  if (storedUser?.accessToken) {
    authHeaders.Authorization = `${storedUser.tokenType || "Bearer"} ${storedUser.accessToken}`;
  }
  if (storedUser?.id) {
    authHeaders["X-Clinic-User-Id"] = String(storedUser.id);
  }
  if (storedUser?.role) {
    authHeaders["X-Clinic-User-Role"] = String(storedUser.role);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...authHeaders, ...options.headers },
    ...options,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") ?? "60", 10);
      throw new RateLimitError(data?.error || "Too many attempts. Please wait before trying again.", retryAfter);
    }
    if (response.status === 401 && !endpoint.startsWith("/login")) {
      clearStoredSession();
    }
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }
  return data;
}

const mapAppointment = (entry: any) => ({
  ...entry,
  appointmentId: entry.appointment_id,
  patientId: entry.patient_id,
  patientName: entry.patient_name,
  doctorId: entry.doctor_id,
  doctorName: entry.doctor_name,
});

const mapPrescription = (entry: any) => ({
  ...entry,
  rxId: entry.rx_id,
  patient: entry.patient_name,
  patientId: entry.patient_id,
  drugName: entry.drug_name,
  quantity: entry.quantity,
  dosage: entry.dosage,
  duration: entry.duration,
  instructions: entry.instructions,
  medicationClass: entry.medication_class,
  program: entry.program,
  drugItems: (entry.drug_items || []) as Array<{
    id: number;
    drug_name: string;
    quantity: number;
    dosage: string;
    duration: string;
    instructions: string;
    medication_class: string;
  }>,
});

const mapAdmission = (entry: any) => ({
  ...entry,
  admissionId: entry.admission_id,
  patient: entry.patient_name,
  patientId: entry.patient_id,
  admittedOn: entry.admitted_on,
});

const mapLabTest = (entry: any) => ({
  ...entry,
  testId: entry.test_id,
  patient: entry.patient_name,
  patientId: entry.patient_id,
  category: entry.category,
  section: entry.section,
  sampleType: entry.sample_type,
  clinicalNotes: entry.clinical_notes,
  requestedBy: entry.requested_by,
  reportedBy: entry.reported_by,
  completedAt: entry.completed_at,
  interpretation: entry.interpretation,
  referenceRange: entry.reference_range,
  abnormalFlag: entry.abnormal_flag,
  specimenCollectedAt: entry.specimen_collected_at,
  approvedBy: entry.approved_by,
  approvedAt: entry.approved_at,
});

const mapInvoice = (entry: any) => ({
  ...entry,
  invoiceId: entry.invoice_id,
  patient: entry.patient_name,
  patientId: entry.patient_id,
  service: entry.items,
  lineItems: entry.line_items || [],
  amount: `K ${Number(entry.total || 0).toFixed(2)}`,
  method: entry.payment_method,
  date: entry.paid_date || entry.due_date,
});

const mapTariff = (entry: any) => ({
  ...entry,
  tariffCode: entry.tariff_code,
  serviceName: entry.service_name,
  unitLabel: entry.unit_label,
});

const mapInventory = (entry: any) => ({
  ...entry,
  itemCode: entry.item_code,
  minStock: entry.min_stock,
  lastRestocked: entry.last_restocked,
});

const mapSupplier = (entry: any) => ({
  ...entry,
  supplierId: entry.supplier_id,
  lastOrder: entry.last_order,
});

const mapUser = (entry: any) => ({
  ...entry,
  userId: entry.userId ?? entry.user_id,
  staffId: entry.staffId ?? entry.staff_id,
  manNumber: entry.manNumber ?? entry.man_number,
  lastLogin: entry.last_login || "Never",
  forcePasswordChange: Boolean(entry.forcePasswordChange ?? entry.force_password_change),
  permissions: entry.permissions || [],
  passwordChangedAt: entry.passwordChangedAt ?? entry.password_changed_at,
  passwordVersion: entry.passwordVersion ?? entry.password_version,
});

const mapDrug = (entry: any) => ({
  ...entry,
  drugId: entry.drug_id,
  drugType: entry.drug_type,
  batchNumber: entry.batch_number,
  reorderLevel: entry.reorder_level,
  storageLocation: entry.storage_location,
});

const mapImaging = (entry: any) => ({
  ...entry,
  requestId: entry.request_id,
  patientId: entry.patient_id,
  patientName: entry.patient_name,
  bodyPart: entry.body_part,
  requestedBy: entry.requested_by,
  requestDate: entry.request_date,
});

const mapClaim = (entry: any) => ({
  ...entry,
  claimId: entry.claim_id,
  amount: `K ${Number(entry.amount || 0).toFixed(2)}`,
});

const mapReferral = (entry: any) => ({
  ...entry,
  referralId: entry.referral_id,
  patientId: entry.patient_id,
  patientName: entry.patient_name,
  fromDept: entry.from_dept,
  toDept: entry.to_dept,
  referredBy: entry.referred_by,
});

const mapTriage = (entry: any) => ({
  ...entry,
  patientId: entry.patient_id,
  patientName: entry.patient_name,
  chiefComplaint: entry.chief_complaint,
  vitalSigns: entry.vital_signs,
  bloodPressure: entry.blood_pressure,
  temperature: entry.temperature,
  pulseRate: entry.pulse_rate,
  respiratoryRate: entry.respiratory_rate,
  oxygenSaturation: entry.oxygen_saturation,
  weightKg: entry.weight_kg,
  heightCm: entry.height_cm,
  bmi: entry.bmi,
  randomBloodSugar: entry.random_blood_sugar,
  painScore: entry.pain_score,
  consciousnessLevel: entry.consciousness_level,
  notes: entry.notes,
  nurseName: entry.nurse_name,
  arrivalTime: entry.arrival_time,
});

const mapEmergency = (entry: any) => ({
  ...entry,
  caseId: entry.case_id,
  patientName: entry.patient_name,
  chiefComplaint: entry.chief_complaint,
  arrivalMode: entry.arrival_mode,
  arrivalTime: entry.arrival_time,
  attendingDoctor: entry.attending_doctor,
  nurseOnDuty: entry.nurse_on_duty,
});

const mapBloodUnit = (entry: any) => ({
  ...entry,
  unitId: entry.unit_id,
  bloodType: entry.blood_type,
  expiryDate: entry.expiry_date,
  donorName: entry.donor_name,
  collectionDate: entry.collection_date,
});

const mapDonation = (entry: any) => ({
  ...entry,
  donorName: entry.donor_name,
  bloodType: entry.blood_type,
});

const mapNotification = (entry: any) => ({ ...entry });

const mapAuditLog = (entry: any) => ({
  ...entry,
  ipAddress: entry.ip_address,
});

const mapAttendance = (entry: any) => ({
  ...entry,
  staffId: entry.staff_id,
  checkIn: entry.check_in,
  checkOut: entry.check_out,
});

const mapWard = (entry: any) => ({
  ...entry,
  totalBeds: entry.total_beds,
  bedBoard: entry.bed_board || [],
});

const mapSchedule = (entry: any) => ({
  ...entry,
  scheduleId: entry.schedule_id,
  staffId: entry.staff_id,
  dayOfWeek: entry.day_of_week,
  shiftName: entry.shift_name,
  startTime: entry.start_time,
  endTime: entry.end_time,
});

const mapBillingSummary = (entry: any) => ({
  ...entry,
  patientId: entry.patient_id,
  patientName: entry.patient_name,
  invoiceCount: entry.invoice_count,
  totalAmount: entry.total_amount,
  pendingAmount: entry.pending_amount,
  lastInvoice: entry.last_invoice,
  paymentStatus: entry.payment_status,
});

const mapClinicalForm = (entry: any) => ({
  ...entry,
  formId: entry.form_id,
  formType: entry.form_type,
  patientId: entry.patient_id,
  patientName: entry.patient_name,
  encounterId: entry.encounter_id,
  createdBy: entry.created_by,
  createdAt: entry.created_at,
  updatedAt: entry.updated_at,
  payloadJson: entry.payload_json,
});

const mapEncounter = (entry: any) => ({
  ...entry,
  encounterId: entry.encounter_id,
  patientId: entry.patient_id,
  patientName: entry.patient_name,
  patientType: entry.patient_type,
  currentStage: entry.current_stage,
  paymentStatus: entry.payment_status,
  checkoutEligible: entry.checkout_eligible,
  checkedOut: entry.checked_out,
  createdAt: entry.created_at,
  updatedAt: entry.updated_at,
  createdBy: entry.created_by,
  checkoutTime: entry.checkout_time,
  pendingActions: entry.pending_actions || [],
  completedActions: entry.completed_actions || [],
});

export const api = {
   health: () => request("/health"),

   appointments: {
     getAll: async () => (await request("/appointments")).map(mapAppointment),
     create: async (data: Record<string, unknown>) => mapAppointment((await request("/appointments", { method: "POST", body: JSON.stringify(data) })).entry),
   },

  patients: {
    getAll: () => request("/patients"),
    getById: (id: string) => request(`/patients/${encodeURIComponent(id.trim())}`),
    getHistory: (id: string) => request(`/patients/${encodeURIComponent(id.trim())}/history`),
    getDocuments: (id: string) => request(`/patients/${encodeURIComponent(id.trim())}/documents`),
    deleteDocument: (docId: string) => request(`/documents/${encodeURIComponent(docId)}`, { method: "DELETE" }),
    uploadDocument: async (patientId: string, file: File, meta: { documentType: string; description?: string }) => {
      const storedUser = getStoredUser();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", meta.documentType);
      if (meta.description) formData.append("description", meta.description);
      const headers: Record<string, string> = {};
      if (storedUser?.accessToken) headers.Authorization = `${storedUser.tokenType || "Bearer"} ${storedUser.accessToken}`;
      const res = await fetch(`${API_BASE}/patients/${encodeURIComponent(patientId.trim())}/documents`, {
        method: "POST", headers, body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Upload failed: ${res.status}`);
      return data;
    },
    create: (data: Record<string, unknown>) => request("/patients", { method: "POST", body: JSON.stringify(data) }),
    update: async (id: string, data: Record<string, unknown>) => (await request(`/patients/${encodeURIComponent(id.trim())}`, { method: "PUT", body: JSON.stringify(data) })).entry,
    graduate: async (id: string) => (await request(`/patients/${encodeURIComponent(id.trim())}/graduate`, { method: "PUT" })).entry,
    remove: (id: string) => request(`/patients/${encodeURIComponent(id.trim())}`, { method: "DELETE" }),
  },

   staff: {
     getAll: () => request("/staff"),
     create: async (data: Record<string, unknown>) => {
       const response = await request("/staff", { method: "POST", body: JSON.stringify(data) });
       return response.entry ?? response;
     },
     graduate: async (staffId: string) => (await request(`/staff/${encodeURIComponent(staffId.trim())}/graduate`, { method: "PUT" })).entry,
     remove: (staffId: string) => request(`/staff/${encodeURIComponent(staffId.trim())}`, { method: "DELETE" }),
     lookupByManNumber: (manNumber: string) => request(`/staff/lookup/man-number/${encodeURIComponent(manNumber.trim())}`),
   },

  sis: {
    lookupStudent: (studentId: string) => request(`/patients/lookup/student-id/${encodeURIComponent(studentId.trim())}`),
  },

  departments: {
    getAll: () => request("/departments"),
    create: async (data: Record<string, unknown>) => {
      const response = await request("/departments", { method: "POST", body: JSON.stringify(data) });
      return response.entry ?? response;
    },
    update: async (code: string, data: Record<string, unknown>) => {
      const response = await request(`/departments/${encodeURIComponent(code.trim())}`, { method: "PUT", body: JSON.stringify(data) });
      return response.entry ?? response;
    },
  },

  prescriptions: {
     getAll: async () => (await request("/prescriptions")).map(mapPrescription),
     create: async (data: Record<string, unknown>) => mapPrescription((await request("/prescriptions", { method: "POST", body: JSON.stringify(data) })).entry),
     dispense: async (id: number) => mapPrescription((await request(`/prescriptions/${id}/dispense`, { method: "POST" })).entry),
   },

   admissions: {
     getAll: async () => (await request("/admissions")).map(mapAdmission),
     create: async (data: Record<string, unknown>) => mapAdmission((await request("/admissions", { method: "POST", body: JSON.stringify(data) })).entry),
     discharge: async (id: number) => mapAdmission((await request(`/admissions/${id}/discharge`, { method: "PUT" })).entry),
     transfer: async (id: number, data: Record<string, unknown>) =>
       mapAdmission((await request(`/admissions/${id}/transfer`, { method: "PUT", body: JSON.stringify(data) })).entry),
   },

   labTests: {
     getAll: async () => (await request("/lab-tests")).map(mapLabTest),
     create: async (data: Record<string, unknown>) => mapLabTest((await request("/lab-tests", { method: "POST", body: JSON.stringify(data) })).entry),
     saveResults: async (id: number, data: Record<string, unknown>) =>
       mapLabTest((await request(`/lab-tests/${id}/results`, { method: "PUT", body: JSON.stringify(data) })).entry),
     approve: async (id: number) => mapLabTest((await request(`/lab-tests/${id}/approve`, { method: "PUT" })).entry),
   },

   billing: {
     getAll: async () => (await request("/billing")).map(mapInvoice),
     getById: async (id: string) => mapInvoice(await request(`/billing/${id}`)),
     getSummary: async () => (await request("/billing/summary")).map(mapBillingSummary),
     create: async (data: Record<string, unknown>) => mapInvoice((await request("/billing", { method: "POST", body: JSON.stringify(data) })).entry),
     updateStatus: async (invoiceId: string, data: Record<string, unknown>) =>
       mapInvoice((await request(`/billing/${invoiceId}/status`, { method: "PUT", body: JSON.stringify(data) })).entry),
   },

   tariffs: {
     getAll: async () => (await request("/tariffs")).map(mapTariff),
     create: async (data: Record<string, unknown>) => mapTariff((await request("/tariffs", { method: "POST", body: JSON.stringify(data) })).entry),
     update: async (tariffCode: string, data: Record<string, unknown>) =>
       mapTariff((await request(`/tariffs/${tariffCode}`, { method: "PUT", body: JSON.stringify(data) })).entry),
   },

   inventory: {
     getAll: async () => (await request("/inventory")).map(mapInventory),
     create: async (data: Record<string, unknown>) => mapInventory((await request("/inventory", { method: "POST", body: JSON.stringify(data) })).entry),
   },

   suppliers: {
     getAll: async () => (await request("/suppliers")).map(mapSupplier),
     create: async (data: Record<string, unknown>) => mapSupplier((await request("/suppliers", { method: "POST", body: JSON.stringify(data) })).entry),
   },

   users: {
     getAll: async () => (await request("/users")).map(mapUser),
     getById: async (id: number) => mapUser(await request(`/users/${id}`)),
     update: async (id: number, data: Record<string, unknown>) => mapUser((await request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) })).entry),
     create: async (data: Record<string, unknown>) => mapUser((await request("/users", { method: "POST", body: JSON.stringify(data) })).entry),
     remove: (id: number) => request(`/users/${id}`, { method: "DELETE" }),
     changePassword: async (data: { email: string; currentPassword: string; newPassword: string }) => {
       const response = await request("/change-password", { method: "POST", body: JSON.stringify(data) });
       return mapUser(response.user);
     },
     resetPassword: async (id: number, newPassword: string) =>
       request(`/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword }) }),
   },

  drugs: {
    getAll: async () => (await request("/drugs")).map(mapDrug),
    create: async (data: Record<string, unknown>) => mapDrug((await request("/drugs", { method: "POST", body: JSON.stringify(data) })).entry),
    restock: async (id: number, quantity: number) =>
      mapDrug((await request(`/drugs/${id}/restock`, { method: "POST", body: JSON.stringify({ quantity }) })).entry),
  },

  imaging: {
    getAll: async () => (await request("/imaging")).map(mapImaging),
    create: async (data: Record<string, unknown>) => mapImaging((await request("/imaging", { method: "POST", body: JSON.stringify(data) })).entry),
  },

  insuranceClaims: {
    getAll: async () => (await request("/insurance-claims")).map(mapClaim),
    create: async (data: Record<string, unknown>) => mapClaim((await request("/insurance-claims", { method: "POST", body: JSON.stringify(data) })).entry),
    updateStatus: async (claimId: string, data: Record<string, unknown>) =>
      mapClaim((await request(`/insurance-claims/${encodeURIComponent(claimId)}/status`, { method: "PUT", body: JSON.stringify(data) })).entry),
  },

  referrals: {
    getAll: async () => (await request("/referrals")).map(mapReferral),
    create: async (data: Record<string, unknown>) => mapReferral((await request("/referrals", { method: "POST", body: JSON.stringify(data) })).entry),
  },

  triage: {
    getAll: async () => (await request("/triage")).map(mapTriage),
    create: async (data: Record<string, unknown>) => mapTriage((await request("/triage", { method: "POST", body: JSON.stringify(data) })).entry),
  },

  emergency: {
    getAll: async () => (await request("/emergency")).map(mapEmergency),
    create: async (data: Record<string, unknown>) => mapEmergency((await request("/emergency", { method: "POST", body: JSON.stringify(data) })).entry),
    updateStatus: async (id: number, status: string) => mapEmergency((await request(`/emergency/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) })).entry),
  },

  bloodBank: {
    getStock: async () => (await request("/blood-bank/stock")).map(mapBloodUnit),
    getDonations: async () => (await request("/blood-bank/donations")).map(mapDonation),
    createDonation: async (data: Record<string, unknown>) => mapDonation((await request("/blood-bank/donations", { method: "POST", body: JSON.stringify(data) })).entry),
    issueUnits: async (id: number, data: Record<string, unknown>) =>
      mapBloodUnit((await request(`/blood-bank/stock/${id}/issue`, { method: "POST", body: JSON.stringify(data) })).entry),
  },

  notifications: {
    getAll: async () => (await request("/notifications")).map(mapNotification),
    update: async (id: number, data: Record<string, unknown>) => mapNotification((await request(`/notifications/${id}`, { method: "PUT", body: JSON.stringify(data) })).entry),
    markAllRead: () => request("/notifications/read-all", { method: "PUT" }),
    remove: (id: number) => request(`/notifications/${id}`, { method: "DELETE" }),
  },

  vitalAlerts: {
    getAll: () => request("/vital-alerts"),
    getByPatient: (patientId: string) => request(`/patients/${encodeURIComponent(patientId)}/vital-alerts`),
    acknowledge: (alertId: string) => request(`/vital-alerts/${encodeURIComponent(alertId)}/acknowledge`, { method: "PUT" }),
  },

  labReferenceRanges: {
    getAll: () => request("/lab/reference-ranges"),
    lookup: (testName: string, gender?: string, age?: number) => {
      const qs = new URLSearchParams({ testName });
      if (gender) qs.set("gender", gender);
      if (age != null) qs.set("age", String(age));
      return request(`/lab/reference-ranges/lookup?${qs}`);
    },
    create: async (data: Record<string, unknown>) => (await request("/lab/reference-ranges", { method: "POST", body: JSON.stringify(data) })).entry,
    update: async (rangeId: string, data: Record<string, unknown>) =>
      (await request(`/lab/reference-ranges/${encodeURIComponent(rangeId)}`, { method: "PUT", body: JSON.stringify(data) })).entry,
    delete: (rangeId: string) => request(`/lab/reference-ranges/${encodeURIComponent(rangeId)}`, { method: "DELETE" }),
  },

  drugInteractions: {
    getAll: () => request("/drugs/interactions"),
    create: async (data: Record<string, unknown>) => (await request("/drugs/interactions", { method: "POST", body: JSON.stringify(data) })).entry,
    delete: (id: string) => request(`/drugs/interactions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },

  prescriptionSafetyCheck: (data: { patientId: string; drugs: string[] }) =>
    request("/prescriptions/safety-check", { method: "POST", body: JSON.stringify(data) }),

  auth: {
    refresh: (refreshToken: string) => request("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
    logout: (refreshToken?: string) => request("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  },

  exports: {
    downloadFile: async (endpoint: string, filename: string) => {
      const storedUser = getStoredUser();
      const headers: Record<string, string> = {};
      if (storedUser?.accessToken) headers.Authorization = `${storedUser.tokenType || "Bearer"} ${storedUser.accessToken}`;
      const res = await fetch(`${API_BASE}${endpoint}`, { headers });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    },
    patientsXlsx: () => api.exports.downloadFile("/export/patients.xlsx", "patients.xlsx"),
    billingXlsx: () => api.exports.downloadFile("/export/billing.xlsx", "billing.xlsx"),
    inventoryXlsx: () => api.exports.downloadFile("/export/inventory.xlsx", "inventory.xlsx"),
    labResultsXlsx: () => api.exports.downloadFile("/export/lab-results.xlsx", "lab-results.xlsx"),
    invoicePdf: (invoiceId: string) => api.exports.downloadFile(`/export/billing/${encodeURIComponent(invoiceId)}.pdf`, `invoice-${invoiceId}.pdf`),
    patientSummaryPdf: (patientId: string) => api.exports.downloadFile(`/export/patients/${encodeURIComponent(patientId)}/summary.pdf`, `patient-${patientId}-summary.pdf`),
  },

  auditLogs: {
    getAll: async () => (await request("/audit-logs")).map(mapAuditLog),
    getLoginLogs: (params?: { email?: string; page?: number; size?: number }) => {
      const qs = new URLSearchParams();
      if (params?.email) qs.set("email", params.email);
      if (params?.page != null) qs.set("page", String(params.page));
      if (params?.size != null) qs.set("size", String(params.size));
      const q = qs.toString();
      return request(`/audit/login${q ? "?" + q : ""}`);
    },
  },

  attendance: {
    getAll: async () => (await request("/attendance")).map(mapAttendance),
    checkout: async (id: number) => mapAttendance((await request(`/attendance/${id}/checkout`, { method: "PUT" })).entry),
  },

  staffSchedules: {
    getAll: async (weekOf?: string) => {
      const url = weekOf ? `/staff-schedules?weekOf=${weekOf}` : "/staff-schedules";
      return (await request(url)).map(mapSchedule);
    },
    create: async (data: Record<string, unknown>) => mapSchedule((await request("/staff-schedules", { method: "POST", body: JSON.stringify(data) })).entry),
    bulkCreate: async (data: Record<string, unknown>): Promise<any[]> => {
      const res = await request("/staff-schedules/bulk", { method: "POST", body: JSON.stringify(data) });
      return (res.entries as any[]).map(mapSchedule);
    },
    delete: async (id: number) => request(`/staff-schedules/${id}`, { method: "DELETE" }),
  },

  wards: {
    getAll: async () => (await request("/wards")).map(mapWard),
    create: async (data: Record<string, unknown>) => mapWard((await request("/wards", { method: "POST", body: JSON.stringify(data) })).entry),
    updateBeds: async (id: number, totalBeds: number) =>
      mapWard((await request(`/wards/${id}/beds`, { method: "PUT", body: JSON.stringify({ totalBeds }) })).entry),
    addBed: async (id: number) => mapWard((await request(`/wards/${id}/beds/add`, { method: "POST" })).entry),
    removeBed: async (id: number) => mapWard((await request(`/wards/${id}/beds/remove`, { method: "POST" })).entry),
  },

  encounters: {
    getAll: async () => (await request("/encounters")).map(mapEncounter),
    create: async (data: Record<string, unknown>) => mapEncounter((await request("/encounters", { method: "POST", body: JSON.stringify(data) })).entry),
    updateStage: async (id: number, data: Record<string, unknown>) => mapEncounter((await request(`/encounters/${id}/stage`, { method: "PUT", body: JSON.stringify(data) })).entry),
    checkout: async (id: number, data: Record<string, unknown>) => mapEncounter((await request(`/encounters/${id}/checkout`, { method: "PUT", body: JSON.stringify(data) })).entry),
  },

  dashboard: {
    get: () => request("/dashboard"),
  },

  reports: {
    get: () => request("/reports"),
    getMorbidity: (top = 20) => request(`/reports/morbidity?top=${top}`),
    getFinancial: () => request("/reports/financial"),
    getOutstanding: () => request("/reports/outstanding"),
  },

  pharmacy: {
    getExpiringDrugs: (days = 30) => request(`/pharmacy/expiring-drugs?days=${days}`),
  },

  settings: {
    get: () => request("/settings"),
    update: async (data: Record<string, unknown>) => (await request("/settings", {
      method: "PUT",
      body: JSON.stringify({
        hospitalName: data.hospital_name,
        contactPhone: data.contact_phone,
        address: data.address,
        emailNotifications: data.email_notifications,
        smsNotifications: data.sms_notifications,
        lowStockAlerts: data.low_stock_alerts,
        twoFactorAuth: data.two_factor_auth,
        auditLogging: data.audit_logging,
        autoLogout: data.auto_logout,
        backupEnabled: data.backup_enabled,
        backupFrequency: data.backup_frequency,
        backupLocation: data.backup_location,
        lastBackupAt: data.last_backup_at,
      }),
    })).entry,
  },

  admin: {
    clearSeededData: (data: Record<string, unknown>) => request("/admin/clear-seeded-data", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  },

  backup: {
    getSnapshot: () => request("/system-backup"),
    getFull: () => request("/backup/full"),
    manualTrigger: () => request("/backup/manual", { method: "POST" }),
    restore: (data: Record<string, unknown>) => request("/backup/restore", { method: "POST", body: JSON.stringify(data) }),
  },

  clinicalForms: {
    getAll: async () => (await request("/clinical-forms")).map(mapClinicalForm),
    create: async (data: Record<string, unknown>) => mapClinicalForm((await request("/clinical-forms", { method: "POST", body: JSON.stringify(data) })).entry),
    generateMedicalFitnessCertificate: async (data: Record<string, unknown>) =>
      mapClinicalForm((await request("/clinical-forms/generate-medical-fitness-certificate", {
        method: "POST",
        body: JSON.stringify(data),
      })).entry),
  },

  mch: {
    getAll: async () => request("/mch"),
    getAntenatal: async () => request("/mch/antenatal"),
    createAntenatal: async (data: Record<string, unknown>) => (await request("/mch/antenatal", { method: "POST", body: JSON.stringify(data) })).entry,
    getImmunization: async () => request("/mch/immunization"),
    createImmunization: async (data: Record<string, unknown>) => (await request("/mch/immunization", { method: "POST", body: JSON.stringify(data) })).entry,
    getFamilyPlanning: async () => request("/mch/family-planning"),
    createFamilyPlanning: async (data: Record<string, unknown>) => (await request("/mch/family-planning", { method: "POST", body: JSON.stringify(data) })).entry,
  },

  art: {
    getPatients: async () => request("/art/patients"),
    createPatient: async (data: Record<string, unknown>) => (await request("/art/patients", { method: "POST", body: JSON.stringify(data) })).entry,
    getVisits: async () => request("/art/visits"),
    createVisit: async (data: Record<string, unknown>) => (await request("/art/visits", { method: "POST", body: JSON.stringify(data) })).entry,
  },

  dental: {
    getAll: async () => request("/dental"),
    create: async (data: Record<string, unknown>) => (await request("/dental", { method: "POST", body: JSON.stringify(data) })).entry,
  },

  eyeClinic: {
    getAll: async () => request("/eye-clinic"),
    create: async (data: Record<string, unknown>) => (await request("/eye-clinic", { method: "POST", body: JSON.stringify(data) })).entry,
  },

  sti: {
    getAll: async () => request("/sti"),
    create: async (data: Record<string, unknown>) => (await request("/sti", { method: "POST", body: JSON.stringify(data) })).entry,
  },

  physio: {
    getReferrals: async () => request("/physio/referrals"),
    createReferral: async (data: Record<string, unknown>) => (await request("/physio/referrals", { method: "POST", body: JSON.stringify(data) })).entry,
    getSessions: async () => request("/physio/sessions"),
    createSession: async (data: Record<string, unknown>) => (await request("/physio/sessions", { method: "POST", body: JSON.stringify(data) })).entry,
  },

  pharmacyDispensing: {
    getQueue: async () => request("/pharmacy/dispensing-queue"),
    getLogs: async () => request("/pharmacy/dispensing-log"),
    createLog: async (data: Record<string, unknown>) => (await request("/pharmacy/dispensing-log", { method: "POST", body: JSON.stringify(data) })).entry,
    getControlledRegister: async () => request("/pharmacy/controlled-register"),
    createControlledEntry: async (data: Record<string, unknown>) =>
      (await request("/pharmacy/controlled-register", { method: "POST", body: JSON.stringify(data) })).entry,
    dispense: async (rxId: string, data: Record<string, unknown>) =>
      (await request(`/pharmacy/dispense/${encodeURIComponent(rxId)}`, { method: "POST", body: JSON.stringify(data) })).entry,
  },

  login: (email: string, password: string) => request("/login", { method: "POST", body: JSON.stringify({ email, password }) }),
};

export default api;
