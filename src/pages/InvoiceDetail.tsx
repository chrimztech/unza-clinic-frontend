import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Phone, Mail, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { generateInvoicePDF } from "@/lib/pdf-export";

type InvoiceData = {
  invoiceId: string;
  patientId: string;
  patient: string;
  service: string;
  lineItems?: Array<{
    tariff_code?: string;
    service_name: string;
    department?: string;
    quantity?: number;
    unit_price?: number;
    line_total?: number;
  }>;
  amount: string;
  method: string;
  date: string;
  status: "pending" | "completed" | "cancelled";
  subtotal?: number;
  tax?: number;
  total?: number;
};

export default function InvoiceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [patient, setPatient] = useState<any>(null);
  const [cumulative, setCumulative] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoice() {
      if (!id) return;
      try {
        const invoiceData = await api.billing.getById(id);
        setInvoice(invoiceData);

        if (invoiceData.patientId) {
          try {
            const patientData = await api.patients.getById(invoiceData.patientId);
            setPatient(patientData);
            const summary = await api.billing.getSummary();
            setCumulative(summary.find((entry: any) => entry.patientId === invoiceData.patientId) ?? null);
          } catch {
            setPatient(null);
          }
        }
      } catch {
        toast.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }

    loadInvoice();
  }, [id]);

  const lineItems = useMemo(() => {
    if (invoice?.lineItems?.length) {
      return invoice.lineItems.map((item) => ({
        description: item.service_name,
        qty: Number(item.quantity || 1),
        unitPrice: Number(item.unit_price || 0),
        total: Number(item.line_total || ((item.quantity || 1) * (item.unit_price || 0))),
      }));
    }
    if (!invoice?.service) return [];
    const items = invoice.service.split(",").map((entry) => entry.trim()).filter(Boolean);
    const total = Number(invoice.total ?? (String(invoice.amount).replace(/[^\d.]/g, "") || 0));
    const unitPrice = items.length > 0 ? total / items.length : total;
    return items.map((description) => ({ description, qty: 1, unitPrice, total: unitPrice }));
  }, [invoice]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-6 text-sm text-muted-foreground">Invoice not found.</div>;
  }

  const subtotal = invoice.subtotal ?? Number(invoice.amount.replace(/[^\d.]/g, "") || 0);
  const tax = invoice.tax ?? 0;
  const grandTotal = invoice.total ?? subtotal + tax;

  const downloadInvoicePDF = async () => {
    try {
      await generateInvoicePDF({
        invoiceId: invoice.invoiceId,
        patientName: invoice.patient,
        patientId: invoice.patientId,
        studentId: patient?.student_id,
        manNumber: patient?.man_number,
        phone: patient?.phone,
        email: patient?.email,
        address: patient?.address,
        invoiceDate: invoice.date,
        paymentMethod: invoice.method,
        status: invoice.status,
        cumulativeSummary: cumulative ? `K ${Number(cumulative.totalAmount || 0).toFixed(2)} across ${cumulative.invoiceCount} invoice(s)` : undefined,
        lineItems,
        subtotal,
        tax,
        total: grandTotal,
        filename: `invoice-${invoice.invoiceId}`,
      });
      toast.success("Invoice PDF downloaded");
    } catch {
      toast.error("Failed to generate invoice PDF");
    }
  };

  return (
    <div>
      <TopBar title="Invoice Details" subtitle={invoice.invoiceId} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/billing")} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Billing
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadInvoicePDF}>
              <Download className="h-4 w-4 mr-1" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto rounded-xl bg-card shadow-elevated border border-border p-8 space-y-8">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-border overflow-hidden">
                <img src="/logo.png" alt="UNZA Clinic logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-card-foreground">UNZA Clinic</h2>
                <p className="text-xs text-muted-foreground">Great East Road, Lusaka, Zambia</p>
                <p className="text-xs text-muted-foreground">+260 211 290000 • clinic@unza.zm</p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold font-display text-card-foreground">INVOICE</h3>
              <p className="text-sm font-semibold text-primary mt-1">{invoice.invoiceId}</p>
              <StatusBadge status={invoice.status} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-border">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
              <p className="text-sm font-semibold text-card-foreground">{invoice.patient}</p>
              <p className="text-xs text-muted-foreground">
                {invoice.patientId}
                {patient?.student_id ? ` • ${patient.student_id}` : ""}
                {patient?.man_number ? ` • ${patient.man_number}` : ""}
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {patient?.phone || "Not recorded"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {patient?.email || "Not recorded"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {patient?.address || "Not recorded"}</p>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Invoice Date</p>
                <p className="text-sm font-medium text-card-foreground">{invoice.date}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Method</p>
                <p className="text-sm font-medium text-card-foreground">{invoice.method}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cumulative Account</p>
                <p className="text-sm font-medium text-card-foreground">
                  {cumulative ? `K ${Number(cumulative.totalAmount || 0).toFixed(2)} across ${cumulative.invoiceCount} invoice(s)` : "Not available"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_60px_100px_100px] bg-secondary/50 px-4 py-3 text-xs font-semibold text-muted-foreground">
              <span>Description</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Total</span>
            </div>
            {lineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_100px_100px] px-4 py-3 border-t border-border text-sm">
                <span className="text-card-foreground">{item.description}</span>
                <span className="text-center text-muted-foreground">{item.qty}</span>
                <span className="text-right text-muted-foreground">K {item.unitPrice.toFixed(2)}</span>
                <span className="text-right font-medium text-card-foreground">K {item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-card-foreground">K {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-card-foreground">K {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                <span className="text-card-foreground">Total</span>
                <span className="text-primary">K {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
            <p>Thank you for visiting the UNZA Clinic.</p>
            <p className="mt-1">For billing queries, contact the finance desk.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
