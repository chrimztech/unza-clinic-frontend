import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Search, Download, CreditCard, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import StatCard from "@/components/dashboard/StatCard";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NewInvoiceDialog, { InvoiceEntry } from "@/components/dialogs/NewInvoiceDialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { exportToPDF } from "@/lib/pdf-export";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";

const columns: Column<InvoiceEntry>[] = [
  { header: "Invoice", accessor: "invoiceId" },
  { header: "Patient", accessor: "patient" },
  { header: "Service", accessor: "service" },
  { header: "Amount", accessor: "amount" },
  { header: "Payment Method", accessor: "method" },
  { header: "Date", accessor: "date" },
  { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
];

export default function Billing() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceEntry[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [departmentFilter, setDepartmentFilter] = useState(searchParams.get("department") || "all");
  const [tariffSearch, setTariffSearch] = useState("");
  const navigate = useNavigate();
  const canCreateInvoices = hasPermission(user, ["billing.create", "billing.view"]);
  const canPostPayments = hasPermission(user, ["billing.payments"]);

  const loadBilling = () => {
    api.billing.getAll().then(setInvoices).catch(() => toast.error("Failed to load invoices"));
    api.billing.getSummary().then(setSummary).catch(() => setSummary([]));
  };

  useEffect(() => {
    loadBilling();
    api.tariffs.getAll().then(setTariffs).catch(() => setTariffs([]));
  }, []);

  useEffect(() => {
    const value = searchParams.get("department") || "all";
    setDepartmentFilter(value);
  }, [searchParams]);

  const filtered = invoices.filter((i) =>
    i.patient.toLowerCase().includes(search.toLowerCase()) || i.invoiceId.toLowerCase().includes(search.toLowerCase())
  );

  const pending = invoices.filter((i) => i.status === "pending").length;
  const completed = invoices.filter((i) => i.status === "completed").length;
  const revenue = invoices.reduce((sum, item) => sum + Number(String(item.amount).replace(/[^\d.]/g, "") || 0), 0);
  const summaryFiltered = summary.filter((entry) =>
    entry.patientName.toLowerCase().includes(search.toLowerCase()) || entry.patientId.toLowerCase().includes(search.toLowerCase())
  );
  const departments = useMemo(
    () => ["all", ...new Set(tariffs.map((tariff) => tariff.department).filter(Boolean))],
    [tariffs]
  );
  const tariffFiltered = tariffs.filter((tariff) => {
    const matchesDepartment = departmentFilter === "all" || tariff.department === departmentFilter;
    const matchesSearch = !tariffSearch
      || tariff.serviceName.toLowerCase().includes(tariffSearch.toLowerCase())
      || tariff.tariffCode.toLowerCase().includes(tariffSearch.toLowerCase())
      || tariff.category.toLowerCase().includes(tariffSearch.toLowerCase());
    return matchesDepartment && matchesSearch;
  });

  const setDepartmentFilterAndUrl = (value: string) => {
    setDepartmentFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === "all") {
      next.delete("department");
    } else {
      next.set("department", value);
    }
    setSearchParams(next, { replace: true });
  };

  const markPaid = async (invoice: InvoiceEntry) => {
    try {
      await api.billing.updateStatus(invoice.invoiceId, {
        status: "completed",
        paymentMethod: invoice.method || "Cash",
        paidDate: new Date().toISOString().split("T")[0],
      });
      toast.success(`Marked ${invoice.invoiceId} as paid`);
      loadBilling();
    } catch {
      toast.error("Failed to post payment");
    }
  };

  const handleExport = async () => {
    await exportToPDF({
      title: "Clinic Invoices Report",
      filename: "invoices-report",
      columns: [
        { header: "Invoice ID", dataKey: "invoiceId" },
        { header: "Patient", dataKey: "patient" },
        { header: "Service", dataKey: "service" },
        { header: "Amount", dataKey: "amount" },
        { header: "Method", dataKey: "method" },
        { header: "Date", dataKey: "date" },
        { header: "Status", dataKey: "status" }
      ],
      data: filtered,
      subtitle: `Search: ${search || 'None'} | Total Revenue: K ${revenue.toFixed(2)}`,
    });
  };

  return (
    <div>
      <TopBar title="Billing & Payments" subtitle="Manage invoices and payment records" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={CreditCard} title="Total Revenue" value={`K ${revenue.toFixed(2)}`} changeType="positive" />
          <StatCard icon={TrendingUp} title="Invoices" value={String(invoices.length)} />
          <StatCard icon={Clock} title="Pending Payments" value={String(pending)} changeType="negative" />
          <StatCard icon={CheckCircle} title="Paid Invoices" value={String(completed)} changeType="positive" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoices..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => api.exports.billingXlsx().catch(() => toast.error("Export failed"))}>
              <Download className="h-4 w-4 mr-1" /> XLSX
            </Button>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowNew(true)} disabled={!canCreateInvoices}>
              <Plus className="h-4 w-4 mr-1" /> New Invoice
            </Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => navigate(`/billing/invoice/${row.invoiceId}`)}
          actions={(row) => (
            row.status !== "completed" && canPostPayments ? (
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  markPaid(row);
                }}
              >
                Post Payment
              </Button>
            ) : null
          )}
        />

        <div className="rounded-xl bg-card p-5 shadow-card border border-border space-y-4">
          <div>
            <h3 className="text-sm font-semibold font-display text-card-foreground">Cumulative Patient Accounts</h3>
            <p className="text-xs text-muted-foreground">Running totals for all services accessed per patient.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4">Invoices</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Pending</th>
                  <th className="py-2 pr-4">Last Invoice</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {summaryFiltered.map((entry) => (
                  <tr key={entry.patientId} className="border-b border-border/60">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-card-foreground">{entry.patientName}</div>
                      <div className="text-xs text-muted-foreground">{entry.patientId}</div>
                    </td>
                    <td className="py-3 pr-4">{entry.invoiceCount}</td>
                    <td className="py-3 pr-4">K {Number(entry.totalAmount || 0).toFixed(2)}</td>
                    <td className="py-3 pr-4">K {Number(entry.pendingAmount || 0).toFixed(2)}</td>
                    <td className="py-3 pr-4">{entry.lastInvoice || "-"}</td>
                    <td className="py-3 pr-4"><StatusBadge status={entry.paymentStatus} /></td>
                  </tr>
                ))}
                {summaryFiltered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">No cumulative accounts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card border border-border space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold font-display text-card-foreground">UNZA Approved Tariff Browser</h3>
              <p className="text-xs text-muted-foreground">Reference fees by clinic section for lab, OPD, pharmacy, eye clinic, MCH, inpatient, and medical exams.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="w-full sm:w-52">
                  <Select value={departmentFilter} onValueChange={setDepartmentFilterAndUrl}>
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department === "all" ? "All Departments" : department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-72">
                <Input
                  placeholder="Search service or tariff code..."
                  value={tariffSearch}
                  onChange={(e) => setTariffSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Service</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2 pr-4">Fee</th>
                </tr>
              </thead>
              <tbody>
                {tariffFiltered.slice(0, 80).map((tariff) => (
                  <tr key={tariff.tariffCode} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium text-card-foreground">{tariff.tariffCode}</td>
                    <td className="py-3 pr-4">{tariff.department}</td>
                    <td className="py-3 pr-4">{tariff.category}</td>
                    <td className="py-3 pr-4">{tariff.serviceName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{tariff.unitLabel}</td>
                    <td className="py-3 pr-4 font-medium text-card-foreground">K {Number(tariff.price || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {tariffFiltered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">No matching tariffs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {tariffFiltered.length > 80 && (
            <p className="text-xs text-muted-foreground">Showing first 80 matching tariffs. Narrow the search or department filter to view a smaller subset.</p>
          )}
        </div>
      </div>
      <NewInvoiceDialog open={showNew} onOpenChange={setShowNew} onSubmit={() => loadBilling()} />
    </div>
  );
}
