import TopBar from "@/components/layout/TopBar";
import DepartmentFormsPanel from "@/components/clinical/DepartmentFormsPanel";
import { FileText, ShieldCheck, Stethoscope } from "lucide-react";

export default function MedicalExams() {
  return (
    <div>
      <TopBar title="Medical Exams" subtitle="Run student and general medical examination workflows with certificate generation" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <Stethoscope className="mb-3 h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-card-foreground">Student Medical Exams</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Capture the examination, vitals, BMI, findings, and clinical recommendation for admitted students and other medical exam cases.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-card-foreground">Fitness Certificates</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate the medical fitness certificate directly from a saved exam instead of preparing it outside the system.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <FileText className="mb-3 h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-card-foreground">Centralized Records</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              All exam records are stored as clinical forms, so they remain linked to the patient and available for later review.
            </p>
          </div>
        </div>

        <DepartmentFormsPanel
          title="Medical Examination Workspace"
          description="Open the medical exam form, save the clinical assessment, and generate the certificate of medical fitness from the same workflow."
          templateKeys={["student_medical_exam", "medical_fitness_certificate"]}
          triggerLabel="Open Medical Exams"
        />
      </div>
    </div>
  );
}
