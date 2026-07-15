import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Printer, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { clinicalFormTemplates, type ClinicalTemplateKey } from "@/lib/clinical-form-templates";
import { generateClinicalFormPDF, generateMedicalFitnessCertificate } from "@/lib/pdf-export";
import {
  buildMedicalFitnessCertificateValues,
  buildPatientFormDefaults,
  parseClinicalPayload,
} from "@/lib/medical-exam";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type DepartmentFormsPanelProps = {
  title: string;
  description: string;
  templateKeys: ClinicalTemplateKey[];
  fixedPatientId?: string;
  triggerLabel?: string;
};

export default function DepartmentFormsPanel({
  title,
  description,
  templateKeys,
  fixedPatientId,
  triggerLabel = "Open Forms",
}: DepartmentFormsPanelProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [patientId, setPatientId] = useState(fixedPatientId || "");
  const [templateKey, setTemplateKey] = useState<ClinicalTemplateKey>(templateKeys[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const templates = useMemo(
    () => templateKeys.map((key) => [key, clinicalFormTemplates[key]] as const),
    [templateKeys],
  );
  const template = clinicalFormTemplates[templateKey];

  useEffect(() => {
    if (fixedPatientId) {
      setPatientId(fixedPatientId);
    }
  }, [fixedPatientId]);

  useEffect(() => {
    setTemplateKey(templateKeys[0]);
  }, [templateKeys]);

  useEffect(() => {
    async function loadRecentForms() {
      try {
        const formData = await api.clinicalForms.getAll();
        setForms(formData || []);
      } catch {
        // Keep the page usable even if the summary list fails.
      }
    }

    loadRecentForms();
  }, []);

  useEffect(() => {
    if (!open) return;

    async function loadWorkspace() {
      try {
        setLoading(true);
        const [patientData, encounterData, formData] = await Promise.all([
          api.patients.getAll(),
          api.encounters.getAll(),
          api.clinicalForms.getAll(),
        ]);
        setPatients(patientData || []);
        setEncounters(encounterData || []);
        setForms(formData || []);
      } catch {
        toast.error("Failed to load department forms");
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [open]);

  const selectablePatients = useMemo(() => {
    const uniquePatients = new Map<string, any>();
    patients.forEach((patient) => {
      const identifier = getPatientIdentifier(patient);
      if (!identifier || identifier === "null" || uniquePatients.has(identifier)) {
        return;
      }
      uniquePatients.set(identifier, patient);
    });
    return Array.from(uniquePatients.values());
  }, [patients]);

  const selectedPatient = useMemo(
    () => selectablePatients.find((entry) => getPatientIdentifier(entry) === patientId),
    [patientId, selectablePatients],
  );

  const selectedEncounter = useMemo(
    () => encounters.find((entry) => entry.patientId === patientId && !entry.checkedOut) ?? null,
    [encounters, patientId],
  );

  const recentForms = useMemo(
    () => forms
      .filter((entry) => templateKeys.includes(entry.formType as ClinicalTemplateKey))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 4),
    [forms, templateKeys],
  );

  const latestExamForm = useMemo(
    () => forms
      .filter((entry) => entry.patientId === patientId && entry.formType === "student_medical_exam")
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] ?? null,
    [forms, patientId],
  );

  const latestCertificateForm = useMemo(
    () => forms
      .filter((entry) => entry.patientId === patientId && entry.formType === "medical_fitness_certificate")
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] ?? null,
    [forms, patientId],
  );

  const bmiSummary = useMemo(() => {
    if (templateKey !== "student_medical_exam") {
      return null;
    }
    const heightCm = parseMetricNumber(values.height);
    const weightKg = parseMetricNumber(values.weight);
    if (!heightCm || !weightKg) {
      return null;
    }
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    const category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
    const recommendation = category === "Normal" ? "FIT" : category === "Underweight" ? "FIT WITH NUTRITION REVIEW" : "FIT WITH FOLLOW-UP";
    return { bmi: bmi.toFixed(1), category, recommendation };
  }, [templateKey, values.height, values.weight]);

  useEffect(() => {
    if (!template) {
      setValues({});
      return;
    }

    const nextValues: Record<string, string> = {};
    template.fields.forEach((field) => {
      nextValues[field.key] = "";
    });

    if (selectedPatient) {
      Object.assign(nextValues, buildPatientFormDefaults(selectedPatient));
    }

    if (templateKey === "student_medical_exam" && latestExamForm) {
      Object.assign(nextValues, parseClinicalPayload(latestExamForm.payloadJson));
    }

    if (templateKey === "medical_fitness_certificate") {
      if (latestCertificateForm) {
        Object.assign(nextValues, parseClinicalPayload(latestCertificateForm.payloadJson));
      } else if (selectedPatient) {
        Object.assign(
          nextValues,
          buildMedicalFitnessCertificateValues({
            patient: selectedPatient,
            examValues: latestExamForm ? parseClinicalPayload(latestExamForm.payloadJson) : nextValues,
            examinerName: user?.name || "",
          }),
        );
      }
    }

    setValues(nextValues);
  }, [latestCertificateForm, latestExamForm, selectedPatient, template, templateKey, user?.name]);

  useEffect(() => {
    if (!bmiSummary) return;

    setValues((prev) => ({
      ...prev,
      bmi: bmiSummary.bmi,
      bmi_category: bmiSummary.category,
      fitness_recommendation: bmiSummary.recommendation,
    }));
  }, [bmiSummary]);

  const saveForm = async (overrides?: {
    formType?: ClinicalTemplateKey;
    title?: string;
    department?: string;
    payloadValues?: Record<string, string>;
  }) => {
    if (!selectedPatient || !template) {
      toast.error("Select a patient first");
      return null;
    }

    try {
      const payloadValues = overrides?.payloadValues || values;
      const created = await api.clinicalForms.create({
        formType: overrides?.formType || templateKey,
        title: overrides?.title || template.title,
        patientId: getPatientIdentifier(selectedPatient),
        patientName: selectedPatient.name,
        department: overrides?.department || template.department,
        encounterId: selectedEncounter?.encounterId || "",
        status: "completed",
        createdBy: user?.name || "Clinic User",
        payloadJson: JSON.stringify(payloadValues, null, 2),
      });
      setForms((prev) => [created, ...prev]);
      window.dispatchEvent(new CustomEvent("unza:patients:changed"));
      return created;
    } catch {
      toast.error("Failed to save form");
      return null;
    }
  };

  const handleSave = async () => {
    if (!selectedPatient || !template) {
      toast.error("Select a patient first");
      return;
    }

    try {
      setSaving(true);
      const created = await saveForm();
      if (!created) {
        return;
      }
      toast.success(`${template.title} saved`);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const generateCertificateFromExam = async () => {
    if (!selectedPatient || templateKey !== "student_medical_exam") {
      toast.error("Open a student medical exam first");
      return;
    }

    try {
      setSaving(true);
      const savedExam = await saveForm({
        formType: "student_medical_exam",
        title: clinicalFormTemplates.student_medical_exam.title,
        department: clinicalFormTemplates.student_medical_exam.department,
        payloadValues: values,
      });
      if (!savedExam) {
        return;
      }

      const created = await api.clinicalForms.generateMedicalFitnessCertificate({
        patientId: getPatientIdentifier(selectedPatient),
        encounterId: selectedEncounter?.encounterId || "",
        sourceExamFormId: savedExam.formId || savedExam.id,
        createdBy: user?.name || "Clinic User",
      });
      setForms((prev) => [created, savedExam, ...prev.filter((entry) => entry.id !== savedExam.id)]);
      setValues(parseClinicalPayload(created.payloadJson));
      setTemplateKey("medical_fitness_certificate");
      toast.success("Medical fitness certificate generated");
    } catch {
      toast.error("Failed to generate certificate");
    } finally {
      setSaving(false);
    }
  };

  const downloadFormPDF = async (formType: ClinicalTemplateKey, payloadValues: Record<string, string>, formMeta?: { formId?: string; createdBy?: string; createdAt?: string }) => {
    if (!selectedPatient) {
      toast.error("Select a patient first");
      return;
    }
    try {
      if (formType === "medical_fitness_certificate") {
        await generateMedicalFitnessCertificate({
          name: payloadValues.name || selectedPatient.name || "",
          school: payloadValues.school || selectedPatient.school || "",
          compNo: payloadValues.comp_no || selectedPatient.student_id || selectedPatient.clinic_number || "",
          fitnessStatus: payloadValues.fitness_status || payloadValues.fitness_recommendation || "PENDING",
          comments: payloadValues.comments || "",
          examinerName: payloadValues.examiner_name || user?.name || "Medical Examiner",
          officialDate: payloadValues.official_date || new Date().toISOString().slice(0, 10),
          filename: `fitness-certificate-${getPatientIdentifier(selectedPatient)}`,
        });
      } else {
        const formTemplate = clinicalFormTemplates[formType];
        await generateClinicalFormPDF({
          title: formTemplate.title,
          department: formTemplate.department,
          patientName: selectedPatient.name || "",
          patientId: getPatientIdentifier(selectedPatient),
          formId: formMeta?.formId,
          createdBy: formMeta?.createdBy || user?.name || "",
          createdAt: formMeta?.createdAt ? new Date(formMeta.createdAt).toLocaleString() : "",
          fields: formTemplate.fields.map((field) => ({ label: field.label, value: payloadValues[field.key] || "" })),
          filename: `${formType}-${getPatientIdentifier(selectedPatient)}`,
        });
      }
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const downloadSavedFormPDF = async (entry: any) => {
    try {
      const payloadValues = parseClinicalPayload(entry.payloadJson);
      const formType = entry.formType as ClinicalTemplateKey;
      if (formType === "medical_fitness_certificate") {
        await generateMedicalFitnessCertificate({
          name: payloadValues.name || entry.patientName || "",
          school: payloadValues.school || "",
          compNo: payloadValues.comp_no || "",
          fitnessStatus: payloadValues.fitness_status || payloadValues.fitness_recommendation || "PENDING",
          comments: payloadValues.comments || "",
          examinerName: payloadValues.examiner_name || entry.createdBy || "Medical Examiner",
          officialDate: payloadValues.official_date || new Date(entry.createdAt).toISOString().slice(0, 10),
          filename: `fitness-certificate-${entry.patientId}`,
        });
      } else {
        const formTemplate = clinicalFormTemplates[formType];
        await generateClinicalFormPDF({
          title: entry.title || formTemplate?.title || "Clinical Form",
          department: entry.department || formTemplate?.department || "",
          patientName: entry.patientName || "",
          patientId: entry.patientId || "",
          formId: entry.formId,
          createdBy: entry.createdBy,
          createdAt: entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "",
          fields: (formTemplate?.fields || Object.keys(payloadValues).map((key) => ({ key, label: key }))).map((field) => ({ label: field.label, value: payloadValues[field.key] || "" })),
          filename: `${formType}-${entry.patientId}`,
        });
      }
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-bold font-display text-card-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button className="gradient-primary text-primary-foreground" onClick={() => setOpen(true)}>
          <FileText className="mr-2 h-4 w-4" /> {triggerLabel}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {templates.map(([key, entry]) => (
          <Badge key={key} variant="outline">
            {entry.title}
          </Badge>
        ))}
      </div>

      <div className="grid gap-3">
        {recentForms.length > 0 ? recentForms.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-card-foreground">{entry.title}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.patientName} | {entry.patientId}
                </p>
              </div>
              <Badge variant="secondary">{entry.department}</Badge>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Saved by {entry.createdBy} on {new Date(entry.createdAt).toLocaleString()}
              </p>
              <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 text-xs" onClick={() => downloadSavedFormPDF(entry)}>
                <Download className="mr-1 h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </div>
        )) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No saved department forms yet.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-sm text-muted-foreground">Loading forms workspace...</div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                {!fixedPatientId ? (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Patient</label>
                    <Select value={patientId} onValueChange={setPatientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectablePatients.map((patient) => {
                          const patientIdentifier = getPatientIdentifier(patient);
                          return (
                            <SelectItem key={patientIdentifier} value={patientIdentifier}>
                              {patient.name} - {patient.clinic_number || patientIdentifier}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Patient</label>
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-card-foreground">
                      {selectedPatient?.name || fixedPatientId}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Form Template</label>
                  <Select value={templateKey} onValueChange={(value) => setTemplateKey(value as ClinicalTemplateKey)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(([key, entry]) => (
                        <SelectItem key={key} value={key}>
                          {entry.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{template.department}</Badge>
                {selectedEncounter ? <Badge variant="secondary">{selectedEncounter.currentStage}</Badge> : null}
                <span className="text-sm text-muted-foreground">{template.title}</span>
              </div>

              {bmiSummary ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">BMI</p>
                    <p className="text-2xl font-bold font-display text-card-foreground">{bmiSummary.bmi}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Category</p>
                    <p className="text-lg font-semibold text-card-foreground">{bmiSummary.category}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Recommendation</p>
                    <p className="text-lg font-semibold text-card-foreground">{bmiSummary.recommendation}</p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                {template.fields.map((field) => (
                  <div key={field.key} className={field.type === "textarea" ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
                    <label className="text-sm font-medium">{field.label}</label>
                    {field.type === "textarea" ? (
                      <Textarea
                        rows={4}
                        value={values[field.key] || ""}
                        placeholder={field.placeholder}
                        onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      />
                    ) : (
                      <Input
                        type={field.type || "text"}
                        value={values[field.key] || ""}
                        placeholder={field.placeholder}
                        onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {templateKey === "student_medical_exam" ? (
              <Button type="button" variant="outline" onClick={generateCertificateFromExam} disabled={saving}>
                <Sparkles className="mr-2 h-4 w-4" /> Generate Certificate
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => downloadFormPDF(templateKey, values)}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button type="button" className="gradient-primary text-primary-foreground" onClick={handleSave} disabled={saving || loading}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getPatientIdentifier(patient: any) {
  return patient?.patient_id || patient?.patientId || "";
}

function parseMetricNumber(value?: string) {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.]/g, "");
  return cleaned ? Number(cleaned) : 0;
}
