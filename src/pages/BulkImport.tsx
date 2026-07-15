import { useRef, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/ui/data-table";
import { toast } from "sonner";
import {
  Upload, FileText, CheckCircle2, AlertTriangle, Download, RefreshCw, Users
} from "lucide-react";
import api from "@/lib/api";

type ImportType = "students" | "staff" | "public";

interface ParsedRow {
  id: number;
  index: number;
  raw: Record<string, string>;
  errors: string[];
  status: "ready" | "error" | "imported" | "skipped";
  clinicNumber?: string;
}

const COMMON_COLUMNS = ["phone", "email", "dob", "gender", "blood_group", "allergies", "address", "emergency_contact", "emergency_phone"];
const STUDENT_COLUMNS = ["student_id", "name", "school", "year", ...COMMON_COLUMNS];
const STAFF_COLUMNS = ["man_number", "name", "department", "role", ...COMMON_COLUMNS];
const PUBLIC_COLUMNS = ["name", ...COMMON_COLUMNS];

const COLUMNS_BY_TYPE: Record<ImportType, string[]> = {
  students: STUDENT_COLUMNS,
  staff: STAFF_COLUMNS,
  public: PUBLIC_COLUMNS,
};

const SAMPLE_STUDENTS = [
  STUDENT_COLUMNS.join(","),
  ["23001234", "Jane Banda", "School of Medicine", "1", "0977123456", "jane@student.unza.zm", "2004-03-15", "Female", "O+", "None", "Lusaka", "Mary Banda", "0977998877"].join(","),
  ["23001235", "Chanda Mwale", "School of Engineering", "2", "0966234567", "chanda@student.unza.zm", "2003-07-20", "Male", "A+", "Penicillin", "Ndola", "Peter Mwale", "0966887766"].join(","),
].join("\n");

const SAMPLE_STAFF = [
  STAFF_COLUMNS.join(","),
  ["UNZA-001", "Dr. Mwansa Phiri", "Clinical", "Doctor", "0955001122", "mwansa@unza.zm", "1978-05-10", "Male", "B+", "None", "Lusaka", "Grace Phiri", "0955112233"].join(","),
  ["UNZA-002", "Nurse Chipo Zulu", "Nursing", "Nurse", "0977002233", "chipo@unza.zm", "1985-11-22", "Female", "AB+", "Aspirin", "Lusaka", "James Zulu", "0977223344"].join(","),
].join("\n");

const SAMPLE_PUBLIC = [
  PUBLIC_COLUMNS.join(","),
  ["John Tembo", "0966112233", "john.tembo@example.com", "1990-02-11", "Male", "O-", "None", "\"Kabulonga, Lusaka\"", "Ruth Tembo", "0966334455"].join(","),
  ["Agnes Mumba", "0977445566", "", "1975-09-30", "Female", "B-", "Sulfa drugs", "Kitwe", "Moses Mumba", "0977556677"].join(","),
].join("\n");

const SAMPLES_BY_TYPE: Record<ImportType, string> = {
  students: SAMPLE_STUDENTS,
  staff: SAMPLE_STAFF,
  public: SAMPLE_PUBLIC,
};

const IMPORT_TYPE_LABELS: Record<ImportType, string> = {
  students: "Students (SIS)",
  staff: "Staff (HR)",
  public: "General Public",
};

// Splits a single CSV line into fields, respecting double-quoted values that
// may contain commas (e.g. "Kabulonga, Lusaka") or escaped ("") quotes.
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

function validateRow(row: Record<string, string>, type: ImportType): string[] {
  const errors: string[] = [];
  if (type === "students" && !row.student_id) errors.push("student_id required");
  if (type === "staff" && !row.man_number) errors.push("man_number required");
  if (!row.name) errors.push("name required");
  if (!row.phone) errors.push("phone required");
  if (!row.address) errors.push("address required");
  if (!row.emergency_contact) errors.push("emergency_contact required");
  if (!row.emergency_phone) errors.push("emergency_phone required");
  return errors;
}

export default function BulkImport() {
  const [importType, setImportType] = useState<ImportType>("students");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error("No data rows found. Check the CSV format.");
        return;
      }
      const validated = parsed.map((raw, index) => {
        const errors = validateRow(raw, importType);
        return { id: index, index, raw, errors, status: errors.length > 0 ? "error" : "ready" } as ParsedRow;
      });
      setRows(validated);
      setProgress(0);
      toast.info(`${parsed.length} rows loaded. ${validated.filter((r) => r.status === "error").length} validation errors.`);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    const ready = rows.filter((r) => r.status === "ready");
    if (ready.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    setImporting(true);
    let imported = 0;
    const updated = [...rows];

    for (const row of ready) {
      try {
        const age = row.raw.dob ? new Date().getFullYear() - new Date(row.raw.dob).getFullYear() : undefined;
        const base = {
          name: row.raw.name,
          phone: row.raw.phone,
          email: row.raw.email,
          address: row.raw.address,
          bloodGroup: row.raw.blood_group,
          allergies: row.raw.allergies,
          gender: row.raw.gender,
          dob: row.raw.dob,
          age,
          emergencyContact: row.raw.emergency_contact,
          emergencyPhone: row.raw.emergency_phone,
        };
        const payload = importType === "students"
          ? {
              ...base,
              patientType: "STUDENT",
              studentId: row.raw.student_id,
              school: row.raw.school,
              year: row.raw.year ? Number(row.raw.year) : null,
            }
          : importType === "staff"
          ? {
              ...base,
              patientType: "STAFF",
              manNumber: row.raw.man_number,
              department: row.raw.department,
              role: row.raw.role,
            }
          : {
              ...base,
              patientType: "GENERAL",
            };

        const result = await api.patients.create(payload);
        updated[row.index] = { ...row, status: "imported", clinicNumber: result?.clinic_number };
        imported++;
        setProgress(Math.round((imported / ready.length) * 100));
      } catch (err: any) {
        const msg = err?.message || "Unknown error";
        updated[row.index] = { ...row, status: msg.includes("duplicate") || msg.includes("already") ? "skipped" : "error", errors: [msg] };
      }
      setRows([...updated]);
    }

    setImporting(false);
    const skipped = updated.filter((r) => r.status === "skipped").length;
    const failed = updated.filter((r) => r.status === "error").length;
    toast.success(`Import complete: ${imported} imported, ${skipped} skipped (duplicates), ${failed} errors`);
  };

  const downloadSample = () => {
    const csv = SAMPLES_BY_TYPE[importType];
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample-${importType}-import.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge: Record<string, string> = {
    ready: "bg-blue-100 text-blue-800",
    error: "bg-red-100 text-red-800",
    imported: "bg-green-100 text-green-800",
    skipped: "bg-amber-100 text-amber-800",
  };

  const columns: Column<ParsedRow>[] = [
    { header: "#", accessor: (r) => `${r.index + 1}`, width: 50 },
    { header: "ID", accessor: (r) => r.raw.student_id || r.raw.man_number || "—", width: 120 },
    { header: "Name", accessor: (r) => r.raw.name || "—", width: 180 },
    { header: "Clinic No.", accessor: (r) => r.clinicNumber || "—", width: 130 },
    {
      header: "Status",
      accessor: (r) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[r.status]}`}>
          {r.status}
        </span>
      ),
      width: 90,
    },
    {
      header: "Issues",
      accessor: (r) => r.errors.length > 0
        ? <span className="text-xs text-destructive">{r.errors.join("; ")}</span>
        : <span className="text-xs text-green-600">OK</span>,
      width: 220,
    },
  ];

  const ready = rows.filter((r) => r.status === "ready").length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const importedCount = rows.filter((r) => r.status === "imported").length;

  return (
    <div>
      <TopBar title="Bulk Import" subtitle="Import existing students, staff, or general public patient records from CSV" />
      <div className="p-6 space-y-6">

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label>Import Type:</Label>
            <Select value={importType} onValueChange={(v) => { setImportType(v as ImportType); setRows([]); setProgress(0); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(IMPORT_TYPE_LABELS) as ImportType[]).map((type) => (
                  <SelectItem key={type} value={type}>{IMPORT_TYPE_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={downloadSample}>
            <Download className="h-4 w-4 mr-1" /> Sample CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setRows([]); setProgress(0); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Reset
          </Button>
        </div>

        {/* Drop Zone */}
        <div
          className="rounded-2xl border-2 border-dashed border-border bg-muted/20 p-12 text-center cursor-pointer transition-colors hover:bg-muted/40"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm font-medium text-muted-foreground">Drag & drop a CSV file here, or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">
            Expected columns: {COLUMNS_BY_TYPE[importType].join(", ")}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {/* Stats */}
        {rows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Rows", value: rows.length, icon: FileText, color: "text-blue-600" },
              { label: "Ready", value: ready, icon: CheckCircle2, color: "text-green-600" },
              { label: "Validation Errors", value: errorCount, icon: AlertTriangle, color: "text-red-600" },
              { label: "Imported", value: importedCount, icon: Users, color: "text-emerald-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-card border border-border p-4 shadow-card">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        {importing && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Importing...</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Preview Table */}
        {rows.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Import Preview</h3>
                <Badge variant="secondary">{rows.length} rows</Badge>
              </div>
              <Button
                className="gradient-primary text-primary-foreground"
                onClick={handleImport}
                disabled={importing || ready === 0}
              >
                <Upload className="h-4 w-4 mr-1" />
                {importing ? "Importing..." : `Import ${ready} Patient${ready !== 1 ? "s" : ""}`}
              </Button>
            </div>
            <DataTable columns={columns} data={rows} />
          </div>
        )}
      </div>
    </div>
  );
}
