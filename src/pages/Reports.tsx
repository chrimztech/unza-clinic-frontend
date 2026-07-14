import TopBar from "@/components/layout/TopBar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const PIE_COLORS = ["#007A3D", "#F2A900", "#0EA5E9", "#F97316", "#7C3AED", "#EC4899", "#14B8A6", "#F59E0B"];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-card border border-border">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold font-display text-card-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, span2 = false }: { title: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={`rounded-xl bg-card p-5 shadow-card border border-border${span2 ? " lg:col-span-2" : ""}`}>
      <h3 className="text-sm font-semibold font-display text-card-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function Reports() {
  const [data, setData] = useState<any>({
    summary: {},
    monthlyPatients: [], revenueData: [], drugUsage: [], workflowByStage: [], payerMix: [],
    clinicalFormsByType: [], bmiDistribution: [], diagnosisDistribution: [],
    labTestsByCategory: [], labTestStatus: [], admissionsByWard: [], prescriptionsByClass: [],
    referralsByDept: [], referralsByUrgency: [], triageLevels: [], emergencyBySeverity: [],
    patientsByGender: [], patientsByType: [], patientAgeGroups: [], bloodBankStock: [],
  });
  const [morbidity, setMorbidity] = useState<any>(null);
  const [morbidityLoading, setMorbidityLoading] = useState(false);
  const [financial, setFinancial] = useState<any>(null);
  const [outstanding, setOutstanding] = useState<any[]>([]);

  useEffect(() => {
    api.reports.get().then(setData).catch(() => toast.error("Failed to load reports"));
    setMorbidityLoading(true);
    api.reports.getMorbidity(20)
      .then(setMorbidity)
      .catch(() => {})
      .finally(() => setMorbidityLoading(false));
    api.reports.getFinancial().then(setFinancial).catch(() => {});
    api.reports.getOutstanding().then((d: any) => setOutstanding(Array.isArray(d) ? d : d?.invoices || [])).catch(() => {});
  }, []);

  const s = data.summary;

  const handleExport = () => {
    const rows: string[][] = [
      ["UNZA Clinic Institutional Report Export"],
      ["Generated At", new Date().toISOString()],
      [],
      ["=== SUMMARY METRICS ==="],
      ["Metric", "Value"],
      ["Total Patients", String(s.patients ?? 0)],
      ["Revenue (K)", String(Number(s.revenue ?? 0).toFixed(2))],
      ["Active Users", String(s.activeUsers ?? 0)],
      ["Active Encounters", String(s.activeEncounters ?? 0)],
      ["Checked Out Today", String(s.checkedOutToday ?? 0)],
      ["Saved Clinical Forms", String(s.savedForms ?? 0)],
      ["Total Lab Tests", String(s.totalLabTests ?? 0)],
      ["Pending Lab Tests", String(s.pendingLabTests ?? 0)],
      ["Completed Lab Tests", String(s.completedLabTests ?? 0)],
      ["Total Admissions", String(s.totalAdmissions ?? 0)],
      ["Active Admissions", String(s.activeAdmissions ?? 0)],
      ["Total Prescriptions", String(s.totalPrescriptions ?? 0)],
      ["Dispensed Prescriptions", String(s.dispensedPrescriptions ?? 0)],
      ["Pending Prescriptions", String(s.pendingPrescriptions ?? 0)],
      ["Total Referrals", String(s.totalReferrals ?? 0)],
      ["Pending Referrals", String(s.pendingReferrals ?? 0)],
      ["Triage Records", String(s.totalTriageRecords ?? 0)],
      ["Emergency Cases", String(s.emergencyCases ?? 0)],
      ["Total Drugs in Formulary", String(s.totalDrugs ?? 0)],
      ["Low Stock Drugs", String(s.lowStockDrugs ?? 0)],
      [],
      ["=== MONTHLY PATIENT VOLUME ==="],
      ["Month", "Patients"],
      ...(data.monthlyPatients || []).map((e: any) => [String(e.month ?? ""), String(e.patients ?? 0)]),
      [],
      ["=== REVENUE TREND ==="],
      ["Month", "Revenue (K)"],
      ...(data.revenueData || []).map((e: any) => [String(e.month ?? ""), String(e.revenue ?? 0)]),
      [],
      ["=== DRUG DISPENSING ==="],
      ["Drug", "Dispensed"],
      ...(data.drugUsage || []).map((e: any) => [String(e.drug ?? ""), String(e.dispensed ?? 0)]),
      [],
      ["=== WORKFLOW BY STAGE ==="],
      ["Stage", "Count"],
      ...(data.workflowByStage || []).map((e: any) => [String(e.stage ?? ""), String(e.count ?? 0)]),
      [],
      ["=== PAYER MIX ==="],
      ["Scheme", "Count"],
      ...(data.payerMix || []).map((e: any) => [String(e.scheme ?? ""), String(e.count ?? 0)]),
      [],
      ["=== LAB TESTS BY CATEGORY ==="],
      ["Category", "Count"],
      ...(data.labTestsByCategory || []).map((e: any) => [String(e.category ?? ""), String(e.count ?? 0)]),
      [],
      ["=== ADMISSIONS BY WARD ==="],
      ["Ward", "Count"],
      ...(data.admissionsByWard || []).map((e: any) => [String(e.ward ?? ""), String(e.count ?? 0)]),
      [],
      ["=== PRESCRIPTIONS BY MEDICATION CLASS ==="],
      ["Class", "Count"],
      ...(data.prescriptionsByClass || []).map((e: any) => [String(e.class ?? ""), String(e.count ?? 0)]),
      [],
      ["=== REFERRALS BY DESTINATION ==="],
      ["Department", "Count"],
      ...(data.referralsByDept || []).map((e: any) => [String(e.dept ?? ""), String(e.count ?? 0)]),
      [],
      ["=== TRIAGE LEVEL DISTRIBUTION ==="],
      ["Level", "Count"],
      ...(data.triageLevels || []).map((e: any) => [String(e.level ?? ""), String(e.count ?? 0)]),
      [],
      ["=== EMERGENCY CASES BY SEVERITY ==="],
      ["Severity", "Count"],
      ...(data.emergencyBySeverity || []).map((e: any) => [String(e.severity ?? ""), String(e.count ?? 0)]),
      [],
      ["=== PATIENT DEMOGRAPHICS — GENDER ==="],
      ["Gender", "Count"],
      ...(data.patientsByGender || []).map((e: any) => [String(e.gender ?? ""), String(e.count ?? 0)]),
      [],
      ["=== PATIENT DEMOGRAPHICS — TYPE ==="],
      ["Type", "Count"],
      ...(data.patientsByType || []).map((e: any) => [String(e.type ?? ""), String(e.count ?? 0)]),
      [],
      ["=== PATIENT AGE GROUPS ==="],
      ["Age Group", "Count"],
      ...(data.patientAgeGroups || []).map((e: any) => [String(e.group ?? ""), String(e.count ?? 0)]),
      [],
      ["=== BLOOD BANK STOCK ==="],
      ["Blood Type", "Units Available", "Status"],
      ...(data.bloodBankStock || []).map((e: any) => [String(e.bloodType ?? ""), String(e.quantity ?? 0), String(e.status ?? "")]),
      [],
      ["=== CLINICAL FORMS BY TYPE ==="],
      ["Form Type", "Count"],
      ...(data.clinicalFormsByType || []).map((e: any) => [String(e.form_type ?? ""), String(e.count ?? 0)]),
      [],
      ["=== BMI DISTRIBUTION ==="],
      ["Category", "Count"],
      ...(data.bmiDistribution || []).map((e: any) => [String(e.category ?? ""), String(e.count ?? 0)]),
      [],
      ["=== TOP DIAGNOSES ==="],
      ["Diagnosis", "Count"],
      ...(data.diagnosisDistribution || []).map((e: any) => [String(e.diagnosis ?? ""), String(e.count ?? 0)]),
    ];
    const csv = rows.map((row) => row.map((cell) => {
      const v = String(cell ?? "");
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unza-clinic-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported as CSV");
  };

  return (
    <div>
      <TopBar title="Reports & Analytics" subtitle="Comprehensive clinic performance, clinical, and operational data" />
      <div className="p-6 space-y-6">

        {/* Summary KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <StatCard label="Patients" value={s.patients ?? 0} />
          <StatCard label="Revenue" value={`K ${Number(s.revenue ?? 0).toFixed(0)}`} />
          <StatCard label="Active Encounters" value={s.activeEncounters ?? 0} sub={`${s.checkedOutToday ?? 0} checked out today`} />
          <StatCard label="Lab Tests" value={s.totalLabTests ?? 0} sub={`${s.pendingLabTests ?? 0} pending`} />
          <StatCard label="Admissions" value={s.totalAdmissions ?? 0} sub={`${s.activeAdmissions ?? 0} active`} />
          <StatCard label="Prescriptions" value={s.totalPrescriptions ?? 0} sub={`${s.dispensedPrescriptions ?? 0} dispensed`} />
          <StatCard label="Referrals" value={s.totalReferrals ?? 0} sub={`${s.pendingReferrals ?? 0} pending`} />
          <StatCard label="Emergency Cases" value={s.emergencyCases ?? 0} />
          <StatCard label="Triage Records" value={s.totalTriageRecords ?? 0} />
          <StatCard label="Clinical Forms" value={s.savedForms ?? 0} />
          <StatCard label="Drugs in Formulary" value={s.totalDrugs ?? 0} sub={`${s.lowStockDrugs ?? 0} low stock`} />
          <StatCard label="Active Users" value={s.activeUsers ?? 0} />
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Export Full Report CSV</Button>
        </div>

        {/* Patient Volume & Revenue */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Monthly Patient Volume">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.monthlyPatients}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <Tooltip />
                <Bar dataKey="patients" fill="hsl(174 62% 38%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Revenue Trend (K)">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="hsl(199 89% 48%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Patient Demographics */}
        <div className="grid gap-6 lg:grid-cols-3">
          <ChartCard title="Patients by Gender">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.patientsByGender} dataKey="count" nameKey="gender" outerRadius={80} label={({ gender, percent }) => `${gender} ${(percent * 100).toFixed(0)}%`}>
                  {(data.patientsByGender || []).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Patients by Type">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.patientsByType} dataKey="count" nameKey="type" outerRadius={80} label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}>
                  {(data.patientsByType || []).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Patient Age Groups">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.patientAgeGroups}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis dataKey="group" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(174 62% 38%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Clinical Flow */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Workflow by Stage">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.workflowByStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} stroke="hsl(210 10% 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(174 62% 38%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Triage Level Distribution">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.triageLevels}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis dataKey="level" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(16 85% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Lab Tests */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Lab Tests by Category">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.labTestsByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(199 89% 48%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Lab Test Status">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.labTestStatus} dataKey="count" nameKey="status" outerRadius={90} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}>
                  {(data.labTestStatus || []).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Admissions & Prescriptions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Admissions by Ward">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.admissionsByWard} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <YAxis type="category" dataKey="ward" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(152 60% 40%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Prescriptions by Medication Class">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.prescriptionsByClass} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <YAxis type="category" dataKey="class" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={130} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(262 83% 58%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Referrals & Emergency */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Referrals by Destination Department">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.referralsByDept} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <YAxis type="category" dataKey="dept" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={130} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(174 62% 38%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="grid gap-6">
            <ChartCard title="Referrals by Urgency">
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={data.referralsByUrgency}>
                  <XAxis dataKey="urgency" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(16 85% 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Emergency Cases by Severity">
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={data.emergencyBySeverity}>
                  <XAxis dataKey="severity" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* Pharmacy & Blood Bank */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Drug Dispensing (Top Drugs)" span2={false}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.drugUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <YAxis type="category" dataKey="drug" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={130} />
                <Tooltip />
                <Bar dataKey="dispensed" fill="hsl(152 60% 40%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Blood Bank Stock by Type">
            <div className="overflow-auto max-h-60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Blood Type</th>
                    <th className="pb-2 font-medium text-right">Units</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.bloodBankStock || []).map((row: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 font-semibold text-card-foreground">{row.bloodType}</td>
                      <td className="py-2 text-right text-card-foreground">{row.quantity}</td>
                      <td className="py-2 text-right">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${row.status === "adequate" ? "bg-success/10 text-success" : row.status === "low" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                  {(!data.bloodBankStock || data.bloodBankStock.length === 0) && (
                    <tr><td colSpan={3} className="py-4 text-center text-muted-foreground text-xs">No blood bank data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* Payer Mix & Insurance */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Payer Mix">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.payerMix} dataKey="count" nameKey="scheme" outerRadius={90} label={({ scheme, percent }) => percent > 0.03 ? `${scheme} ${(percent * 100).toFixed(0)}%` : ""}>
                  {(data.payerMix || []).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="BMI Distribution">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.bmiDistribution} dataKey="count" nameKey="category" outerRadius={90} label={({ category, percent }) => percent > 0 ? `${category} ${(percent * 100).toFixed(0)}%` : ""}>
                  {(data.bmiDistribution || []).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Clinical Forms & Diagnoses */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Clinical Forms by Type">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.clinicalFormsByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis dataKey="form_type" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={70} stroke="hsl(210 10% 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Top Diagnoses / Clinical Impressions">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.diagnosisDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                <YAxis type="category" dataKey="diagnosis" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={180} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(16 85% 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Financial Reports */}
        {financial && (
          <div className="rounded-xl bg-card p-5 shadow-card border border-border space-y-4">
            <h3 className="text-sm font-semibold font-display text-card-foreground">Financial Summary</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Invoiced", value: `K ${Number(financial.totalInvoiced ?? 0).toFixed(2)}` },
                { label: "Total Collected", value: `K ${Number(financial.totalCollected ?? 0).toFixed(2)}` },
                { label: "Outstanding", value: `K ${Number(financial.totalOutstanding ?? 0).toFixed(2)}` },
                { label: "Collection Rate", value: `${Number(financial.collectionRate ?? 0).toFixed(1)}%` },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{c.label}</p>
                  <p className="text-xl font-bold font-display text-card-foreground mt-1">{c.value}</p>
                </div>
              ))}
            </div>
            {financial.revenueByService && financial.revenueByService.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue by Service</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={financial.revenueByService} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                    <YAxis type="category" dataKey="service" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={130} />
                    <Tooltip formatter={(v) => [`K ${Number(v).toFixed(2)}`, "Revenue"]} />
                    <Bar dataKey="amount" fill="hsl(152 60% 40%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Outstanding Invoices */}
        {outstanding.length > 0 && (
          <div className="rounded-xl bg-card p-5 shadow-card border border-border">
            <h3 className="text-sm font-semibold font-display text-card-foreground mb-4">Outstanding Invoices</h3>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Invoice #</th>
                    <th className="pb-2 font-medium">Patient</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium text-right">Paid</th>
                    <th className="pb-2 font-medium text-right">Balance</th>
                    <th className="pb-2 font-medium text-right">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.slice(0, 15).map((inv: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 font-mono text-xs">{inv.invoiceNumber || inv.id}</td>
                      <td className="py-2">{inv.patientName || inv.patient}</td>
                      <td className="py-2 text-right">K {Number(inv.totalAmount ?? inv.amount ?? 0).toFixed(2)}</td>
                      <td className="py-2 text-right">K {Number(inv.amountPaid ?? inv.paid ?? 0).toFixed(2)}</td>
                      <td className="py-2 text-right font-semibold text-destructive">K {Number(inv.balance ?? (inv.totalAmount - inv.amountPaid) ?? 0).toFixed(2)}</td>
                      <td className="py-2 text-right text-muted-foreground">{inv.dueDate || inv.date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {outstanding.length > 15 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Showing 15 of {outstanding.length} outstanding invoices</p>
              )}
            </div>
          </div>
        )}

        {/* Morbidity Report */}
        <div className="rounded-xl bg-card p-5 shadow-card border border-border">
          <h3 className="text-sm font-semibold font-display text-card-foreground mb-4">
            Morbidity Report — Top Chief Complaints (Triage)
          </h3>
          {morbidityLoading && <p className="text-sm text-muted-foreground py-4 text-center">Loading morbidity data...</p>}
          {!morbidityLoading && morbidity && (
            <>
              <div className="flex gap-6 text-sm mb-4 text-muted-foreground">
                <span>Total triage records: <strong className="text-card-foreground">{morbidity.totalTriageRecords}</strong></span>
                <span>Records with complaint: <strong className="text-card-foreground">{morbidity.totalWithComplaint}</strong></span>
                <span>Report date: <strong className="text-card-foreground">{morbidity.reportDate}</strong></span>
              </div>
              {(morbidity.topDiagnoses as any[]).length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={morbidity.topDiagnoses} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 18% 90%)" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210 10% 46%)" />
                    <YAxis type="category" dataKey="complaint" tick={{ fontSize: 11 }} stroke="hsl(210 10% 46%)" width={200} />
                    <Tooltip formatter={(v) => [v, "Cases"]} />
                    <Bar dataKey="count" fill="#007A3D" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No triage complaint data available yet.</p>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
