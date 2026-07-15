import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Search, FlaskConical, Clock, CheckCircle, AlertCircle, Download, ShieldCheck, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import StatCard from "@/components/dashboard/StatCard";
import { useEffect, useMemo, useState } from "react";
import RequestLabTestDialog, { LabTestEntry } from "@/components/dialogs/RequestLabTestDialog";
import LabResultDialog from "@/components/dialogs/LabResultDialog";
import DepartmentFormsPanel from "@/components/clinical/DepartmentFormsPanel";
import api from "@/lib/api";
import { toast } from "sonner";
import { getGroupedLabTests } from "@/lib/lab-tests";
import { generateLabReportPDF } from "@/lib/pdf-export";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";

export default function Laboratory() {
  const { user } = useAuth();
  const canEnterResults = hasPermission(user, ["laboratory.view"]) &&
    (user?.role === "Lab Technician" || user?.role === "Admin");
  const canRequestTest = hasPermission(user, ["laboratory.view"]);
  const [search, setSearch] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [tests, setTests] = useState<LabTestEntry[]>([]);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [catalogueSearch, setCatalogueSearch] = useState("");

  const loadTests = () => api.labTests.getAll().then(setTests).catch(() => toast.error("Failed to load lab tests"));

  useEffect(() => {
    loadTests();
  }, []);

  const approveTest = async (test: LabTestEntry) => {
    setApprovingId(test.id);
    try {
      await api.labTests.approve(test.id);
      toast.success(`Test ${test.testId} approved`);
      await loadTests();
    } catch {
      toast.error("Failed to approve test");
    } finally {
      setApprovingId(null);
    }
  };

  const filtered = tests.filter((t) =>
    t.patient.toLowerCase().includes(search.toLowerCase()) || t.test.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<LabTestEntry>[] = [
    { header: "Test ID", accessor: "testId" },
    { header: "Patient", accessor: "patient" },
    {
      header: "Test",
      accessor: (row) => (
        <div>
          <p className="font-medium text-card-foreground">{row.test}</p>
          <p className="text-xs text-muted-foreground">{row.category || "General"}{row.sampleType ? ` | ${row.sampleType}` : ""}</p>
        </div>
      ),
    },
    { header: "Requested By", accessor: "requestedBy" },
    { header: "Date", accessor: "date" },
    { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
    {
      header: "Ref Range",
      accessor: (row) => row.referenceRange ? (
        <span className="text-xs text-muted-foreground">{row.referenceRange}</span>
      ) : "-",
    },
    {
      header: "Actions",
      accessor: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.status === "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateLabReportPDF({
                patientName: row.patient,
                patientId: row.patientId || "",
                testId: row.testId,
                testName: row.test,
                category: row.category || "",
                section: row.section || "",
                sampleType: row.sampleType || "",
                requestedBy: row.requestedBy,
                reportedBy: row.reportedBy || "",
                approvedBy: row.approvedBy || "",
                requestedDate: row.date,
                specimenCollectedAt: row.specimenCollectedAt || "",
                completedAt: row.completedAt || "",
                results: row.results || "",
                interpretation: row.interpretation || "",
                referenceRange: row.referenceRange || "",
                abnormalFlag: row.abnormalFlag || "",
                filename: `lab-report-${row.testId}`,
              })}
            >
              <Download className="mr-1 h-3.5 w-3.5" /> Print
            </Button>
          )}
          {row.status === "completed" && !row.approvedBy && canEnterResults && (
            <Button
              size="sm"
              className="gradient-primary text-primary-foreground text-xs"
              disabled={approvingId === row.id}
              onClick={() => approveTest(row)}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              {approvingId === row.id ? "..." : "Approve"}
            </Button>
          )}
          {row.approvedBy && (
            <Badge variant="outline" className="border-success/20 bg-success/10 text-success text-xs font-medium gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Approved
            </Badge>
          )}
          {row.status !== "completed" && !row.approvedBy && "-"}
        </div>
      ),
    },
  ];

  const pending = tests.filter((t) => t.status === "pending").length;
  const completed = tests.filter((t) => t.status === "completed").length;
  const inProgress = tests.filter((t) => t.status === "in-progress").length;
  const groupedLabTests = getGroupedLabTests();
  const filteredCatalogue = useMemo(() => {
    const needle = catalogueSearch.trim().toLowerCase();
    if (!needle) return groupedLabTests;
    return groupedLabTests
      .map((section) => ({ ...section, tests: section.tests.filter((item) => item.name.toLowerCase().includes(needle)) }))
      .filter((section) => section.tests.length > 0);
  }, [groupedLabTests, catalogueSearch]);

  return (
    <div>
      <TopBar title="Laboratory" subtitle="Manage lab tests and results" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FlaskConical} title="Total Tests" value={String(tests.length)} />
          <StatCard icon={Clock} title="Pending" value={String(pending)} changeType="neutral" />
          <StatCard icon={CheckCircle} title="Completed" value={String(completed)} changeType="positive" />
          <StatCard icon={AlertCircle} title="In Progress" value={String(inProgress)} changeType="neutral" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tests..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => api.exports.labResultsXlsx().catch(() => toast.error("Export failed"))}>
              <Download className="h-4 w-4 mr-1" /> Export XLSX
            </Button>
            {canEnterResults && (
              <Button variant="outline" size="sm" onClick={() => setShowResult(true)}>
                <CheckCircle className="h-4 w-4 mr-1" /> Enter Results
              </Button>
            )}
            {canRequestTest && (
              <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowRequest(true)}>
                <Plus className="h-4 w-4 mr-1" /> Request Test
              </Button>
            )}
          </div>
        </div>
        <DepartmentFormsPanel
          title="Laboratory Forms"
          description="Use the lab request, slip, and register forms without leaving the laboratory workflow."
          templateKeys={["laboratory_request", "laboratory_slip", "laboratory_register_entry"]}
          triggerLabel="Open Lab Forms"
        />
        <DataTable columns={columns} data={filtered} />

        <div className="rounded-xl bg-card p-5 shadow-card border border-border space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold font-display text-card-foreground">Institutional Lab Test Catalogue</h3>
              <p className="text-xs text-muted-foreground">Ordered to match the paper laboratory request form sections.</p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={catalogueSearch} onChange={(e) => setCatalogueSearch(e.target.value)} placeholder="Search tests..." className="pl-9" />
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredCatalogue.map((section) => {
              const isOpen = Boolean(expandedSections[section.key]) || catalogueSearch.trim().length > 0;
              return (
                <Collapsible
                  key={section.key}
                  open={isOpen}
                  onOpenChange={(open) => setExpandedSections((prev) => ({ ...prev, [section.key]: open }))}
                  className="rounded-xl border border-border p-4"
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
                    <div>
                      <h4 className="font-semibold text-card-foreground">{section.label}</h4>
                      <p className="text-xs text-muted-foreground">{section.tests[0]?.category || "Laboratory"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{section.tests.length} test{section.tests.length === 1 ? "" : "s"}</span>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 flex flex-wrap gap-2">
                    {section.tests.map((item) => (
                      <span key={item.key} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                        {item.name}
                      </span>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
            {filteredCatalogue.length === 0 && (
              <p className="text-sm text-muted-foreground xl:col-span-2">No tests match your search.</p>
            )}
          </div>
        </div>
      </div>
      <RequestLabTestDialog open={showRequest} onOpenChange={setShowRequest} onSubmit={(entry) => setTests((prev) => [entry, ...prev])} />
      <LabResultDialog
        open={showResult}
        onOpenChange={setShowResult}
        onResultSaved={loadTests}
      />
    </div>
  );
}
