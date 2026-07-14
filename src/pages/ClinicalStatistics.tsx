import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import {
  Activity, Users, Pill, Download, AlertTriangle, Calendar,
  ShieldCheck, FileText, Thermometer, Heart, FlaskConical, ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { getDiagnosisLabel } from "@/lib/clinical-coding";

type DiagnosisRecord = {
  id: string;
  date: string;
  patientId: string;
  patientName: string;
  age: string;
  sex: string;
  diagnosisCode: string;
  diagnosis: string;
  treatmentProgram: string;
  medicationClass: string;
  medications: string;
  source: string;
  programFlags: string[];
  ageGroup: string;
};

const PIE_COLORS = ["#007A3D", "#F2A900", "#0EA5E9", "#F97316", "#7C3AED", "#EC4899", "#14B8A6", "#EF4444"];

const ARV_KEYWORDS = ["arv", "art", "tenofovir", "lamivudine", "dolutegravir", "efavirenz", "nevirapine", "abacavir", "lopinavir", "ritonavir", "atazanavir", "emtricitabine"];
const TB_KEYWORDS = ["tb", "tuberculosis", "rifampicin", "isoniazid", "pyrazinamide", "ethambutol", "streptomycin", "rhze"];
const MALARIA_KEYWORDS = ["malaria", "artemether", "lumefantrine", "coartem", "quinine"];
const ANTIBIOTIC_KEYWORDS = ["amoxicillin", "ciprofloxacin", "ceftriaxone", "azithromycin", "doxycycline", "metronidazole", "antibiotic"];
const HYPERTENSION_KEYWORDS = ["hypertension", "bp", "amlodipine", "enalapril", "atenolol", "nifedipine", "lisinopril", "losartan"];
const DIABETES_KEYWORDS = ["diabetes", "diabetic", "metformin", "insulin", "hba1c", "glucose tolerance"];
const ASTHMA_KEYWORDS = ["asthma", "salbutamol", "wheeze", "bronchodilator", "inhaler"];
const MENTAL_HEALTH_KEYWORDS = ["depression", "anxiety", "psychosis", "mental", "psychiatric", "counseling", "suicidal"];
const EPILEPSY_KEYWORDS = ["epilepsy", "seizure", "convulsion", "phenobarbitone", "carbamazepine", "valproate"];
const ANC_PMTCT_KEYWORDS = ["antenatal", "pregnancy", "pmtct", "maternal", "obstetric", "bhcg", "gravindex"];
const ONCOLOGY_KEYWORDS = ["cancer", "oncology", "tumour", "tumor", "chemotherapy", "malignancy"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ClinicalStatistics() {
  const [forms, setForms] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [triage, setTriage] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [formData, encounterData, patientData, triageData, prescriptionData, admissionData, labData, referralData] = await Promise.all([
          api.clinicalForms.getAll(),
          api.encounters.getAll(),
          api.patients.getAll(),
          api.triage.getAll(),
          api.prescriptions.getAll(),
          api.admissions.getAll(),
          api.labTests.getAll().catch(() => []),
          api.referrals.getAll().catch(() => []),
        ]);
        setForms(formData || []);
        setEncounters(encounterData || []);
        setPatients(patientData || []);
        setTriage(triageData || []);
        setPrescriptions(prescriptionData || []);
        setAdmissions(admissionData || []);
        setLabTests(labData || []);
        setReferrals(referralData || []);
      } catch {
        toast.error("Failed to load clinical statistics");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const cutoffDate = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    switch (period) {
      case "week": cutoff.setDate(now.getDate() - 7); break;
      case "month": cutoff.setMonth(now.getMonth() - 1); break;
      case "quarter": cutoff.setMonth(now.getMonth() - 3); break;
      case "year": cutoff.setFullYear(now.getFullYear() - 1); break;
      default: cutoff.setFullYear(1970);
    }
    return cutoff;
  }, [period]);

  const inRange = (value?: string) => {
    if (!value) return false;
    const parsed = new Date(normalizeDate(value));
    return !Number.isNaN(parsed.getTime()) && parsed >= cutoffDate;
  };

  const filteredByPeriod = useMemo(() => ({
    forms: forms.filter((e) => inRange(e.createdAt)),
    encounters: encounters.filter((e) => inRange(e.createdAt)),
    triage: triage.filter((e) => inRange(e.arrivalTime)),
    prescriptions: prescriptions.filter((e) => inRange(e.date)),
    admissions: admissions.filter((e) => inRange(e.admittedOn)),
    labTests: labTests.filter((e) => inRange(e.date)),
    referrals: referrals.filter((e) => inRange(e.date)),
  }), [admissions, encounters, forms, labTests, period, prescriptions, referrals, triage, cutoffDate]);

  const patientMap = useMemo(() => {
    const map = new Map<string, any>();
    patients.forEach((p) => {
      [p.patient_id, p.patientId, p.clinic_number, p.student_id, p.man_number].filter(Boolean).forEach((k) => map.set(String(k), p));
    });
    return map;
  }, [patients]);

  const diagnosisRecords = useMemo<DiagnosisRecord[]>(() => {
    const records: DiagnosisRecord[] = [];

    filteredByPeriod.forms.forEach((form) => {
      const payload = safeParsePayload(form.payloadJson);
      const patient = patientMap.get(form.patientId) || null;
      const diagnosis = firstNonEmpty(getDiagnosisLabel(payload.diagnosis_code), payload.diagnosis, payload.assessment, payload.fitness_status === "UNFIT" ? payload.comments : "", payload.general_comments);
      const medications = firstNonEmpty(payload.medications_given, payload.treatment, payload.management_plan, payload.other_prescriptions, payload.drug_orders, payload.generic_names);
      if (!diagnosis && !medications) return;
      records.push({
        id: `form-${form.id}`,
        date: form.createdAt || "",
        patientId: String(form.patientId || patient?.patient_id || ""),
        patientName: String(form.patientName || patient?.name || "Unknown Patient"),
        age: String(firstNonEmpty(payload.age, payload.patient_age, patient?.age) || ""),
        sex: normalizeSex(String(firstNonEmpty(payload.sex, payload.gender, patient?.gender) || "")),
        diagnosisCode: String(payload.diagnosis_code || ""),
        diagnosis: cleanLabel(diagnosis || "Clinical assessment"),
        treatmentProgram: cleanLabel(String(payload.treatment_program || "")),
        medicationClass: cleanLabel(String(payload.medication_class || "")),
        medications: cleanLabel(medications || ""),
        source: form.title || form.formType || "Clinical Form",
        programFlags: detectProgramFlags(`${diagnosis} ${medications} ${payload.treatment_program || ""} ${payload.medication_class || ""}`),
        ageGroup: ageToGroup(firstNonEmpty(payload.age, payload.patient_age, patient?.age)),
      });
    });

    filteredByPeriod.triage.forEach((entry) => {
      const patient = patientMap.get(entry.patientId) || null;
      const diagnosis = cleanLabel(entry.chiefComplaint || "");
      if (!diagnosis) return;
      records.push({
        id: `triage-${entry.id}`,
        date: normalizeDate(entry.arrivalTime),
        patientId: String(entry.patientId || patient?.patient_id || ""),
        patientName: String(entry.patientName || patient?.name || "Unknown Patient"),
        age: String(patient?.age || ""),
        sex: normalizeSex(String(patient?.gender || "")),
        diagnosisCode: "",
        diagnosis,
        treatmentProgram: "",
        medicationClass: "",
        medications: "",
        source: "Triage Chief Complaint",
        programFlags: detectProgramFlags(diagnosis),
        ageGroup: ageToGroup(patient?.age),
      });
    });

    filteredByPeriod.admissions.forEach((entry) => {
      const patient = patientMap.get(entry.patientId) || null;
      const diagnosis = cleanLabel(entry.diagnosis || "");
      if (!diagnosis) return;
      records.push({
        id: `admission-${entry.id}`,
        date: normalizeDate(entry.admittedOn),
        patientId: String(entry.patientId || patient?.patient_id || ""),
        patientName: String(entry.patient || patient?.name || "Unknown Patient"),
        age: String(patient?.age || ""),
        sex: normalizeSex(String(patient?.gender || "")),
        diagnosisCode: "",
        diagnosis,
        treatmentProgram: "",
        medicationClass: "",
        medications: "",
        source: "Admission Diagnosis",
        programFlags: detectProgramFlags(diagnosis),
        ageGroup: ageToGroup(patient?.age),
      });
    });

    filteredByPeriod.prescriptions.forEach((entry) => {
      const patient = patientMap.get(entry.patientId) || null;
      const meds = cleanLabel(entry.items || "");
      if (!meds) return;
      records.push({
        id: `rx-${entry.id}`,
        date: normalizeDate(entry.date),
        patientId: String(entry.patientId || patient?.patient_id || ""),
        patientName: String(entry.patient || patient?.name || "Unknown Patient"),
        age: String(patient?.age || ""),
        sex: normalizeSex(String(patient?.gender || "")),
        diagnosisCode: "",
        diagnosis: "Medication Record",
        treatmentProgram: cleanLabel(String(entry.program || "")),
        medicationClass: cleanLabel(String(entry.medicationClass || "")),
        medications: meds,
        source: "Prescription",
        programFlags: detectProgramFlags(`${meds} ${entry.program || ""} ${entry.medicationClass || ""}`),
        ageGroup: ageToGroup(patient?.age),
      });
    });

    return deduplicateDiagnosisRecords(records).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [filteredByPeriod, patientMap]);

  const visibleDiagnosisRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return diagnosisRecords;
    return diagnosisRecords.filter((r) =>
      [r.patientId, r.patientName, r.diagnosisCode, r.diagnosis, r.treatmentProgram, r.medicationClass, r.medications, r.sex, r.source, r.programFlags.join(" ")]
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [diagnosisRecords, search]);

  // ── Demographics ────────────────────────────────────────────────────────────
  const demographicsStats = useMemo(() => {
    const male = patients.filter((p) => normalizeSex(p.gender) === "Male").length;
    const female = patients.filter((p) => normalizeSex(p.gender) === "Female").length;
    const ageGroups: Record<string, number> = { "0-4": 0, "5-14": 0, "15-24": 0, "25-49": 0, "50+": 0, Unknown: 0 };
    patients.forEach((p) => { ageGroups[ageToGroup(p.age)] = (ageGroups[ageToGroup(p.age)] || 0) + 1; });
    const byType: Record<string, number> = {};
    patients.forEach((p) => { const t = String(p.patient_type || p.patientType || "Other").trim(); byType[t] = (byType[t] || 0) + 1; });
    return { male, female, other: patients.length - male - female, ageGroups, byType, total: patients.length };
  }, [patients]);

  // ── Diagnosis ───────────────────────────────────────────────────────────────
  const topDiagnoses = useMemo(() => {
    const counts: Record<string, number> = {};
    diagnosisRecords.filter((r) => r.diagnosis && r.diagnosis !== "Medication Record")
      .forEach((r) => { counts[r.diagnosis] = (counts[r.diagnosis] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([diagnosis, count]) => ({ diagnosis, count }));
  }, [diagnosisRecords]);

  const medicationProgramStats = useMemo(() => [
    { program: "ARV / HIV", key: "ARV / HIV" },
    { program: "TB", key: "TB" },
    { program: "Malaria", key: "Malaria" },
    { program: "Antibiotics", key: "Antibiotics" },
    { program: "Hypertension", key: "Hypertension" },
    { program: "Diabetes", key: "Diabetes" },
    { program: "Asthma", key: "Asthma / Respiratory" },
    { program: "Mental Health", key: "Mental Health" },
    { program: "Epilepsy", key: "Epilepsy / Neurology" },
    { program: "ANC / PMTCT", key: "ANC / PMTCT" },
    { program: "Oncology", key: "Oncology" },
  ].map((p) => ({ program: p.program, count: diagnosisRecords.filter((r) => r.programFlags.includes(p.key)).length })), [diagnosisRecords]);

  const diagnosisBySex = useMemo(() => {
    const topSet = new Set(topDiagnoses.slice(0, 6).map((e) => e.diagnosis));
    const matrix = new Map<string, { diagnosis: string; Male: number; Female: number; Other: number }>();
    diagnosisRecords.filter((r) => topSet.has(r.diagnosis)).forEach((r) => {
      if (!matrix.has(r.diagnosis)) matrix.set(r.diagnosis, { diagnosis: r.diagnosis, Male: 0, Female: 0, Other: 0 });
      const b = matrix.get(r.diagnosis)!;
      const sex = r.sex === "Male" || r.sex === "Female" ? r.sex : "Other";
      b[sex] += 1;
    });
    return Array.from(matrix.values());
  }, [diagnosisRecords, topDiagnoses]);

  const ageSexBreakdown = useMemo(() => {
    return ["0-4", "5-14", "15-24", "25-49", "50+", "Unknown"].map((group) => ({
      ageGroup: group,
      Male: diagnosisRecords.filter((r) => r.ageGroup === group && r.sex === "Male").length,
      Female: diagnosisRecords.filter((r) => r.ageGroup === group && r.sex === "Female").length,
      Other: diagnosisRecords.filter((r) => r.ageGroup === group && !["Male", "Female"].includes(r.sex)).length,
    }));
  }, [diagnosisRecords]);

  // ── Record source distribution ───────────────────────────────────────────────
  const sourceDistribution = useMemo(() => {
    const fromForms = filteredByPeriod.forms.length;
    const fromTriage = filteredByPeriod.triage.length;
    const fromAdmissions = filteredByPeriod.admissions.length;
    const fromRx = filteredByPeriod.prescriptions.length;
    return [
      { source: "Clinical Forms", count: fromForms },
      { source: "Triage", count: fromTriage },
      { source: "Prescriptions", count: fromRx },
      { source: "Admissions", count: fromAdmissions },
    ];
  }, [filteredByPeriod]);

  // ── Monthly encounter trend ──────────────────────────────────────────────────
  const monthlyEncounterTrend = useMemo(() => {
    const now = new Date();
    return MONTHS.map((month, idx) => {
      const count = filteredByPeriod.encounters.filter((e) => {
        const d = new Date(normalizeDate(e.createdAt));
        return d.getFullYear() === now.getFullYear() && d.getMonth() === idx;
      }).length;
      const triageCount = filteredByPeriod.triage.filter((e) => {
        const d = new Date(normalizeDate(e.arrivalTime));
        return d.getFullYear() === now.getFullYear() && d.getMonth() === idx;
      }).length;
      return { month, encounters: count, triage: triageCount };
    });
  }, [filteredByPeriod]);

  // ── Encounter stage distribution ─────────────────────────────────────────────
  const encounterStageDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredByPeriod.encounters.forEach((e) => {
      const stage = String(e.currentStage || "Unknown").trim();
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([stage, count]) => ({ stage, count }));
  }, [filteredByPeriod]);

  // ── Triage vitals ────────────────────────────────────────────────────────────
  const triageVitals = useMemo(() => {
    const records = filteredByPeriod.triage;
    const parseNum = (v: any) => { const n = parseFloat(String(v)); return isFinite(n) && n > 0 ? n : null; };
    const parseBP = (bp: string) => {
      const m = String(bp || "").match(/(\d+)\s*\/\s*(\d+)/);
      return m ? { sys: parseInt(m[1]), dia: parseInt(m[2]) } : null;
    };

    const bpReadings = records.map((r) => parseBP(r.bloodPressure || r.blood_pressure || "")).filter(Boolean) as { sys: number; dia: number }[];
    const temps = records.map((r) => parseNum(r.temperature || r.temperatureC)).filter((v): v is number => v !== null);
    const pulses = records.map((r) => parseNum(r.pulseRate || r.pulse_rate)).filter((v): v is number => v !== null);
    const bmiVals = records.map((r) => parseNum(r.bmi)).filter((v): v is number => v !== null);
    const spo2Vals = records.map((r) => parseNum(r.oxygenSaturation || r.oxygen_saturation)).filter((v): v is number => v !== null);
    const glucoseVals = records.map((r) => parseNum(r.randomBloodSugar || r.random_blood_sugar)).filter((v): v is number => v !== null);
    const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "N/A";

    return {
      avgSystolic: bpReadings.length ? (bpReadings.reduce((a, b) => a + b.sys, 0) / bpReadings.length).toFixed(0) : "N/A",
      avgDiastolic: bpReadings.length ? (bpReadings.reduce((a, b) => a + b.dia, 0) / bpReadings.length).toFixed(0) : "N/A",
      avgTemp: avg(temps),
      avgPulse: avg(pulses),
      avgBmi: avg(bmiVals),
      avgSpo2: avg(spo2Vals),
      avgGlucose: avg(glucoseVals),
      triageCount: records.length,
    };
  }, [filteredByPeriod.triage]);

  const triageLevelDist = useMemo(() => {
    const counts: Record<string, number> = { "Level 1": 0, "Level 2": 0, "Level 3": 0, "Level 4": 0, Other: 0 };
    filteredByPeriod.triage.forEach((r) => {
      const lv = String(r.level || "").trim();
      if (counts[lv] !== undefined) counts[lv]++;
      else counts.Other++;
    });
    return Object.entries(counts).map(([level, count]) => ({ level, count }));
  }, [filteredByPeriod.triage]);

  // ── Lab tests ────────────────────────────────────────────────────────────────
  const labStats = useMemo(() => {
    const tests = filteredByPeriod.labTests;
    const pending = tests.filter((t) => t.status === "pending").length;
    const completed = tests.filter((t) => t.status === "completed").length;
    const byCategory: Record<string, number> = {};
    tests.forEach((t) => { const c = String(t.category || t.section || "Other").trim(); byCategory[c] = (byCategory[c] || 0) + 1; });
    const byCategoryList = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([category, count]) => ({ category, count }));
    return { total: tests.length, pending, completed, byCategoryList };
  }, [filteredByPeriod.labTests]);

  // ── Prescriptions ────────────────────────────────────────────────────────────
  const prescriptionStats = useMemo(() => {
    const rxList = filteredByPeriod.prescriptions;
    const dispensed = rxList.filter((r) => r.status === "dispensed").length;
    const drugCounts: Record<string, number> = {};
    rxList.forEach((rx) => {
      if (rx.drugItems && rx.drugItems.length > 0) {
        rx.drugItems.forEach((item: any) => {
          const name = String(item.drug_name || item.drugName || "Unknown").trim();
          drugCounts[name] = (drugCounts[name] || 0) + 1;
        });
      } else {
        (rx.items || "").split(",").map((s: string) => s.trim()).filter(Boolean).forEach((name: string) => {
          drugCounts[name] = (drugCounts[name] || 0) + 1;
        });
      }
    });
    const topMeds = Object.entries(drugCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([drug, count]) => ({ drug, count }));
    const classCounts: Record<string, number> = {};
    rxList.forEach((rx) => { const c = String(rx.medicationClass || "Unclassified").trim(); classCounts[c] = (classCounts[c] || 0) + 1; });
    const byClass = Object.entries(classCounts).sort((a, b) => b[1] - a[1]).map(([cls, count]) => ({ class: cls, count }));
    return { total: rxList.length, dispensed, pending: rxList.length - dispensed, topMeds, byClass };
  }, [filteredByPeriod.prescriptions]);

  // ── Admissions ───────────────────────────────────────────────────────────────
  const admissionStats = useMemo(() => {
    const adm = filteredByPeriod.admissions;
    const active = adm.filter((a) => !["discharged"].includes(String(a.status || "").toLowerCase())).length;
    const wardCounts: Record<string, number> = {};
    adm.forEach((a) => { const w = String(a.ward || "Unassigned").trim(); wardCounts[w] = (wardCounts[w] || 0) + 1; });
    const byWard = Object.entries(wardCounts).sort((a, b) => b[1] - a[1]).map(([ward, count]) => ({ ward, count }));
    const statusCounts: Record<string, number> = {};
    adm.forEach((a) => { const s = String(a.status || "unknown").trim(); statusCounts[s] = (statusCounts[s] || 0) + 1; });
    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
    return { total: adm.length, active, byWard, byStatus };
  }, [filteredByPeriod.admissions]);

  // ── Referrals ────────────────────────────────────────────────────────────────
  const referralStats = useMemo(() => {
    const refs = filteredByPeriod.referrals;
    const pending = refs.filter((r) => r.status === "pending").length;
    const deptCounts: Record<string, number> = {};
    refs.forEach((r) => { const d = String(r.toDept || r.to_dept || "Unspecified").trim(); deptCounts[d] = (deptCounts[d] || 0) + 1; });
    const byDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([dept, count]) => ({ dept, count }));
    const urgencyCounts: Record<string, number> = { Emergency: 0, Urgent: 0, Routine: 0 };
    refs.forEach((r) => { const u = String(r.urgency || "Routine").trim(); if (urgencyCounts[u] !== undefined) urgencyCounts[u]++; });
    const byUrgency = Object.entries(urgencyCounts).map(([urgency, count]) => ({ urgency, count }));
    return { total: refs.length, pending, byDept, byUrgency };
  }, [filteredByPeriod.referrals]);

  // ── Clinical form types ───────────────────────────────────────────────────────
  const formTypeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredByPeriod.forms.forEach((f) => { const t = String(f.formType || f.title || "Other").trim(); counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([form_type, count]) => ({ form_type, count }));
  }, [filteredByPeriod.forms]);

  // ── Table columns ────────────────────────────────────────────────────────────
  const diagnosisTableColumns: Column<DiagnosisRecord>[] = [
    { header: "Date", accessor: (r) => formatShortDate(r.date), minWidth: 110 },
    { header: "Patient", accessor: (r) => <div><p className="text-sm font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.patientId || "-"}</p></div>, minWidth: 190 },
    { header: "Age", accessor: (r) => r.age || "-", minWidth: 70 },
    { header: "Sex", accessor: (r) => r.sex || "Unknown", minWidth: 80 },
    { header: "Age Group", accessor: (r) => r.ageGroup, minWidth: 90 },
    { header: "Code", accessor: (r) => r.diagnosisCode || "-", minWidth: 100 },
    { header: "Diagnosis / Illness", accessor: (r) => r.diagnosis, minWidth: 220 },
    { header: "Program", accessor: (r) => r.treatmentProgram || "-", minWidth: 140 },
    { header: "Med. Class", accessor: (r) => r.medicationClass || "-", minWidth: 140 },
    { header: "Medications", accessor: (r) => r.medications || "-", minWidth: 220 },
    {
      header: "Program Flags",
      accessor: (r) => r.programFlags.length
        ? <div className="flex flex-wrap gap-1">{r.programFlags.map((f) => <Badge key={`${r.id}-${f}`} variant="outline">{f}</Badge>)}</div>
        : "-",
      minWidth: 180,
    },
    { header: "Source", accessor: (r) => r.source, minWidth: 140 },
  ];

  const exportCSV = () => {
    const rows: string[][] = [
      ["UNZA Clinic - Clinical Statistics & Morbidity Register"],
      ["Generated on", new Date().toLocaleString()],
      ["Period", period],
      [],
      ["=== SUMMARY ==="],
      ["Total Patients", String(patients.length)],
      ["Diagnosis Records", String(diagnosisRecords.length)],
      ["Encounters (period)", String(filteredByPeriod.encounters.length)],
      ["Triage Records (period)", String(filteredByPeriod.triage.length)],
      ["Prescriptions (period)", String(prescriptionStats.total)],
      ["Dispensed Prescriptions", String(prescriptionStats.dispensed)],
      ["Lab Tests (period)", String(labStats.total)],
      ["Lab Tests Pending", String(labStats.pending)],
      ["Admissions (period)", String(admissionStats.total)],
      ["Active Admissions", String(admissionStats.active)],
      ["Referrals (period)", String(referralStats.total)],
      ["Pending Referrals", String(referralStats.pending)],
      ["ARV/TB Flags", String(diagnosisRecords.filter((r) => r.programFlags.includes("ARV / HIV") || r.programFlags.includes("TB")).length)],
      [],
      ["=== TRIAGE VITALS (AVERAGES) ==="],
      ["Metric", "Average Value"],
      ["Blood Pressure (Systolic)", triageVitals.avgSystolic],
      ["Blood Pressure (Diastolic)", triageVitals.avgDiastolic],
      ["Temperature (°C)", triageVitals.avgTemp],
      ["Pulse Rate (bpm)", triageVitals.avgPulse],
      ["BMI", triageVitals.avgBmi],
      ["SpO2 (%)", triageVitals.avgSpo2],
      ["Random Blood Sugar (mmol/L)", triageVitals.avgGlucose],
      [],
      ["=== TOP DIAGNOSES ==="],
      ["Diagnosis", "Count"],
      ...topDiagnoses.map((e) => [e.diagnosis, String(e.count)]),
      [],
      ["=== PROGRAM FLAGS ==="],
      ["Program", "Count"],
      ...medicationProgramStats.map((e) => [e.program, String(e.count)]),
      [],
      ["=== TOP MEDICATIONS ==="],
      ["Drug", "Count"],
      ...prescriptionStats.topMeds.map((e) => [e.drug, String(e.count)]),
      [],
      ["=== PRESCRIPTION CLASSES ==="],
      ["Class", "Count"],
      ...prescriptionStats.byClass.map((e) => [e.class, String(e.count)]),
      [],
      ["=== LAB TESTS BY CATEGORY ==="],
      ["Category", "Count"],
      ...labStats.byCategoryList.map((e) => [e.category, String(e.count)]),
      [],
      ["=== ADMISSIONS BY WARD ==="],
      ["Ward", "Count"],
      ...admissionStats.byWard.map((e) => [e.ward, String(e.count)]),
      [],
      ["=== REFERRALS BY DESTINATION ==="],
      ["Department", "Count"],
      ...referralStats.byDept.map((e) => [e.dept, String(e.count)]),
      [],
      ["=== DIAGNOSIS REGISTER ==="],
      ["Date", "Patient ID", "Patient Name", "Age", "Sex", "Age Group", "Diagnosis Code", "Diagnosis", "Treatment Program", "Medication Class", "Medications", "Program Flags", "Source"],
      ...visibleDiagnosisRecords.map((r) => [
        formatShortDate(r.date), r.patientId, r.patientName, r.age, r.sex, r.ageGroup,
        sanitizeCsv(r.diagnosisCode), sanitizeCsv(r.diagnosis), sanitizeCsv(r.treatmentProgram),
        sanitizeCsv(r.medicationClass), sanitizeCsv(r.medications), sanitizeCsv(r.programFlags.join("; ")), sanitizeCsv(r.source),
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unza-clinical-statistics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Clinical statistics exported");
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Clinical Statistics" subtitle="Loading clinical data..." />
        <div className="p-6 text-center text-muted-foreground">Loading clinical statistics...</div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Clinical Statistics & Morbidity Register" subtitle="Diagnosis, vitals, medication, program flags, lab, admission, and referral data" />
      <div className="p-6 space-y-6">

        {/* Controls */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select period" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Search diagnosis, patient, medication, ARV, TB..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-[320px]" />
          </div>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export Full Statistics CSV</Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Diagnosis Records</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{diagnosisRecords.length}</div>
              <p className="text-xs text-muted-foreground">{visibleDiagnosisRecords.length} visible after filter</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patients.length}</div>
              <p className="text-xs text-muted-foreground">{demographicsStats.male} male · {demographicsStats.female} female</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ARV / TB Flags</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{diagnosisRecords.filter((r) => r.programFlags.includes("ARV / HIV") || r.programFlags.includes("TB")).length}</div>
              <p className="text-xs text-muted-foreground">HIV/ARV and TB records flagged</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Medication Records</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prescriptionStats.total}</div>
              <p className="text-xs text-muted-foreground">{prescriptionStats.dispensed} dispensed · {prescriptionStats.pending} pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Encounters</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredByPeriod.encounters.length}</div>
              <p className="text-xs text-muted-foreground">Walk-in encounters in period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Triage Records</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredByPeriod.triage.length}</div>
              <p className="text-xs text-muted-foreground">Vitals captured in period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lab Tests</CardTitle>
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{labStats.total}</div>
              <p className="text-xs text-muted-foreground">{labStats.pending} pending · {labStats.completed} completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Referrals</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referralStats.total}</div>
              <p className="text-xs text-muted-foreground">{referralStats.pending} pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Triage Vitals Averages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Thermometer className="h-4 w-4" /> Average Triage Vital Signs ({triageVitals.triageCount} records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {[
                { label: "Systolic BP", value: `${triageVitals.avgSystolic} mmHg` },
                { label: "Diastolic BP", value: `${triageVitals.avgDiastolic} mmHg` },
                { label: "Temperature", value: `${triageVitals.avgTemp} °C` },
                { label: "Pulse Rate", value: `${triageVitals.avgPulse} bpm` },
                { label: "BMI", value: triageVitals.avgBmi },
                { label: "SpO₂", value: `${triageVitals.avgSpo2}%` },
                { label: "Blood Glucose", value: `${triageVitals.avgGlucose} mmol/L` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold font-display mt-1">{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Encounter Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" /> Monthly Encounter & Triage Trend (Current Year)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyEncounterTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="encounters" stroke="#007A3D" strokeWidth={2} dot={{ r: 3 }} name="Encounters" />
                <Line type="monotone" dataKey="triage" stroke="#0EA5E9" strokeWidth={2} dot={{ r: 3 }} name="Triage" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Demographics & Age */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Gender Split</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={[{ name: "Male", value: demographicsStats.male }, { name: "Female", value: demographicsStats.female }, { name: "Other", value: demographicsStats.other }]} dataKey="value" nameKey="name" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {PIE_COLORS.slice(0, 3).map((color, i) => <Cell key={i} fill={color} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Age Group Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={Object.entries(demographicsStats.ageGroups).map(([group, count]) => ({ group, count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis dataKey="group" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#007A3D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Patient Type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={Object.entries(demographicsStats.byType).map(([type, count]) => ({ type, count }))} dataKey="count" nameKey="type" outerRadius={80} label={({ type, percent }) => percent > 0.05 ? `${type} ${(percent * 100).toFixed(0)}%` : ""}>
                    {Object.keys(demographicsStats.byType).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Diagnosis & Programs */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Top Diagnoses / Illnesses</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topDiagnoses} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <YAxis type="category" dataKey="diagnosis" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={180} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Pill className="h-4 w-4" /> Medication / Condition Program Tracking</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={medicationProgramStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis dataKey="program" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Diagnosis by sex / age-sex */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4" /> Diagnosis by Sex</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={diagnosisBySex}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis dataKey="diagnosis" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={90} stroke="hsl(210 10% 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <Tooltip /><Legend />
                  <Bar dataKey="Male" stackId="a" fill="#007A3D" />
                  <Bar dataKey="Female" stackId="a" fill="#F2A900" />
                  <Bar dataKey="Other" stackId="a" fill="#7C3AED" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Age/Sex Morbidity Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageSexBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis dataKey="ageGroup" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <Tooltip /><Legend />
                  <Bar dataKey="Male" fill="#007A3D" />
                  <Bar dataKey="Female" fill="#F2A900" />
                  <Bar dataKey="Other" fill="#7C3AED" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Triage levels & Encounter stages */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Triage Level Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={triageLevelDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis dataKey="level" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4" /> Encounter Stage Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={encounterStageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} stroke="hsl(210 10% 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#007A3D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Record source & Clinical form types */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Record Source Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sourceDistribution} dataKey="count" nameKey="source" outerRadius={80} label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}>
                    {sourceDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Clinical Forms by Type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={formTypeStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis dataKey="form_type" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={70} stroke="hsl(210 10% 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Prescriptions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Pill className="h-4 w-4" /> Top 10 Prescribed Medications</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={prescriptionStats.topMeds} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <YAxis type="category" dataKey="drug" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={140} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#14B8A6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Pill className="h-4 w-4" /> Prescriptions by Medication Class</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={prescriptionStats.byClass} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <YAxis type="category" dataKey="class" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={140} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7C3AED" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Lab tests & Admissions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Lab Tests by Category</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={labStats.byCategoryList} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Heart className="h-4 w-4" /> Admissions by Ward</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={admissionStats.byWard} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <YAxis type="category" dataKey="ward" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#EC4899" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Referrals */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Referrals by Destination</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={referralStats.byDept} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <YAxis type="category" dataKey="dept" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={130} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Referrals by Urgency</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={referralStats.byUrgency} dataKey="count" nameKey="urgency" outerRadius={90} label={({ urgency, percent }) => `${urgency} ${(percent * 100).toFixed(0)}%`}>
                    {referralStats.byUrgency.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Diagnosis Register Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Diagnosis and Medication Register
              <span className="ml-auto text-xs font-normal text-muted-foreground">{visibleDiagnosisRecords.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={diagnosisTableColumns} data={visibleDiagnosisRecords} getRowId={(r) => r.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeParsePayload(payloadJson?: string) {
  try { return JSON.parse(payloadJson || "{}"); } catch { return {}; }
}

function firstNonEmpty(...values: any[]) {
  for (const v of values) {
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function cleanLabel(value?: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeSex(value?: string) {
  const n = String(value || "").trim().toLowerCase();
  if (n === "m" || n === "male") return "Male";
  if (n === "f" || n === "female") return "Female";
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : "Unknown";
}

function ageToGroup(value?: string | number) {
  const age = Number(value);
  if (!Number.isFinite(age) || age <= 0) return "Unknown";
  if (age <= 4) return "0-4";
  if (age <= 14) return "5-14";
  if (age <= 24) return "15-24";
  if (age <= 49) return "25-49";
  return "50+";
}

function normalizeDate(value?: string) {
  if (!value) return "";
  const t = String(value).trim();
  if (/^\d{2}:\d{2}/.test(t)) return new Date().toISOString().split("T")[0];
  return t;
}

function formatShortDate(value?: string) {
  const d = new Date(normalizeDate(value));
  return Number.isNaN(d.getTime()) ? "-" : d.toISOString().split("T")[0];
}

function detectProgramFlags(text: string) {
  const h = text.toLowerCase();
  const flags: string[] = [];
  if (ARV_KEYWORDS.some((k) => h.includes(k))) flags.push("ARV / HIV");
  if (TB_KEYWORDS.some((k) => h.includes(k))) flags.push("TB");
  if (MALARIA_KEYWORDS.some((k) => h.includes(k))) flags.push("Malaria");
  if (ANTIBIOTIC_KEYWORDS.some((k) => h.includes(k))) flags.push("Antibiotics");
  if (HYPERTENSION_KEYWORDS.some((k) => h.includes(k))) flags.push("Hypertension");
  if (DIABETES_KEYWORDS.some((k) => h.includes(k))) flags.push("Diabetes");
  if (ASTHMA_KEYWORDS.some((k) => h.includes(k))) flags.push("Asthma / Respiratory");
  if (MENTAL_HEALTH_KEYWORDS.some((k) => h.includes(k))) flags.push("Mental Health");
  if (EPILEPSY_KEYWORDS.some((k) => h.includes(k))) flags.push("Epilepsy / Neurology");
  if (ANC_PMTCT_KEYWORDS.some((k) => h.includes(k))) flags.push("ANC / PMTCT");
  if (ONCOLOGY_KEYWORDS.some((k) => h.includes(k))) flags.push("Oncology");
  return flags;
}

function deduplicateDiagnosisRecords(records: DiagnosisRecord[]) {
  const seen = new Set<string>();
  return records.filter((r) => {
    const key = [r.date, r.patientId, r.diagnosis, r.medications, r.source].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sanitizeCsv(value: string) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}
