export function parseClinicalPayload(payloadJson?: string | null): Record<string, string> {
  if (!payloadJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(payloadJson) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, value == null ? "" : String(value)]),
    );
  } catch {
    return {};
  }
}

export function splitPatientName(name?: string | null) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return { surname: "", forenames: "" };
  }

  const parts = trimmed.split(/\s+/);
  return {
    surname: parts[0] || "",
    forenames: parts.slice(1).join(" "),
  };
}

export function buildPatientFormDefaults(patient?: any) {
  if (!patient) {
    return {};
  }

  const today = new Date().toISOString().slice(0, 10);
  const { surname, forenames } = splitPatientName(patient.name);
  const patientIdentifier = patient.patient_id || patient.patientId || "";

  return {
    surname,
    forenames,
    name: patient.name || "",
    patient_name: patient.name || "",
    comp_no: patient.student_id || patient.man_number || patientIdentifier || "",
    computer_number: patient.student_id || "",
    school: patient.school || "",
    mobile_number: patient.phone || "",
    telephone: patient.phone || "",
    sex: patient.gender || "",
    gender: patient.gender || "",
    age: String(patient.age || ""),
    patient_age: String(patient.age || ""),
    clinic_number: patient.clinic_number || patientIdentifier || "",
    clinic_no: patient.clinic_number || patientIdentifier || "",
    file_no: patient.clinic_number || patientIdentifier || "",
    dept_school: patient.school || patient.program || "",
    school_or_department: patient.school || patient.program || patient.man_number || "",
    man_number: patient.man_number || "",
    patient_category: patient.patient_type || "",
    next_of_kin_name: patient.emergency_contact || "",
    next_of_kin_phone: patient.emergency_phone || "",
    relationship: patient.emergency_relation || "",
    allergies: patient.allergies || "",
    current_illness: patient.conditions || "",
    residential_address: patient.address || "",
    dob: patient.dob || "",
    registration_date: today,
    visit_date: today,
    date: today,
    official_date: today,
    date_of_admission: today,
    admission_date: today,
  };
}

export function deriveFitnessStatus(values: Record<string, string>) {
  const raw = String(values.fitness_status || values.fitness_recommendation || "").trim();
  if (!raw) {
    return "PENDING";
  }

  const normalized = raw.toUpperCase();
  if (normalized.startsWith("FIT")) {
    return "FIT";
  }
  if (normalized.includes("UNFIT")) {
    return "UNFIT";
  }
  return normalized;
}

export function buildMedicalFitnessCertificateValues(args: {
  patient?: any;
  examValues?: Record<string, string>;
  examinerName?: string;
  officialDate?: string;
}) {
  const patient = args.patient;
  const examValues = args.examValues || {};
  const officialDate = args.officialDate || examValues.official_date || new Date().toISOString().slice(0, 10);

  return {
    name: patient?.name || examValues.name || examValues.patient_name || "",
    school: examValues.school || patient?.school || "",
    comp_no: examValues.comp_no || examValues.computer_number || patient?.student_id || patient?.man_number || patient?.patient_id || "",
    fitness_status: deriveFitnessStatus(examValues),
    comments: examValues.comments || examValues.diagnosis || examValues.general_comments || "",
    examiner_name: args.examinerName || examValues.examiner_name || "",
    official_date: officialDate,
  };
}
