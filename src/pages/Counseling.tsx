import { useEffect, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { counselingApi } from "@/lib/externalSystems";
import {
  Search, ArrowRight, CheckCircle2, Clock, AlertTriangle,
  Users, BarChart2, RefreshCw, TrendingUp,
} from "lucide-react";

// Maps counseling system lifecycle values to display labels and badge colours
const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:     { label: "Pending",    variant: "outline" },
  in_progress: { label: "In Progress", variant: "default" },
  completed:   { label: "Completed",  variant: "default" },
  cancelled:   { label: "Cancelled",  variant: "destructive" },
  // Counseling-system lifecycle labels (returned when proxy is live)
  PENDING:     { label: "Pending",    variant: "outline" },
  SENT:        { label: "Sent",       variant: "secondary" },
  ACCEPTED:    { label: "Accepted",   variant: "default" },
  COMPLETED:   { label: "Completed",  variant: "default" },
  DECLINED:    { label: "Declined",   variant: "destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const v = urgency?.toLowerCase();
  return (
    <Badge variant={v === "high" || v === "emergency" ? "destructive" : v === "medium" || v === "urgent" ? "default" : "secondary"}>
      {urgency}
    </Badge>
  );
}

export default function Counseling() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [frequentVisitors, setFrequentVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [frequentLoading, setFrequentLoading] = useState(false);

  // New referral form
  const [showForm, setShowForm] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [notes, setNotes] = useState("");

  // Session notes search
  const [searchPatientId, setSearchPatientId] = useState("");
  const [patientSessions, setPatientSessions] = useState<any[]>([]);
  const [visitFrequency, setVisitFrequency] = useState<any>(null);
  const [freqLoading, setFreqLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadFrequentVisitors();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [referralsData, sessionsData] = await Promise.all([
        counselingApi.getReferrals("to"),
        counselingApi.getSessions("all"),
      ]);
      setReferrals(Array.isArray(referralsData) ? referralsData : referralsData?.content ?? []);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch {
      toast.error("Failed to load counseling data");
    } finally {
      setLoading(false);
    }
  };

  const loadFrequentVisitors = async () => {
    setFrequentLoading(true);
    try {
      const data = await counselingApi.getFrequentVisitors(3, 90);
      setFrequentVisitors(Array.isArray(data) ? data : data?.visitors ?? []);
    } catch {
      // Silently ignore — counseling system may not be connected yet
    } finally {
      setFrequentLoading(false);
    }
  };

  const handleRefer = async () => {
    if (!patientId.trim() || !patientName.trim() || !reason.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await counselingApi.referToCounseling({
        patientId,
        patientName,
        patientType: "Patient",
        reason,
        urgency,
        referredBy: "Clinic Staff",
        notes,
      });
      toast.success("Patient referred to counseling");
      setShowForm(false);
      setPatientId("");
      setPatientName("");
      setReason("");
      setNotes("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to refer patient");
    }
  };

  const handleUpdateStatus = async (
    referralId: string,
    status: "pending" | "in_progress" | "completed" | "cancelled"
  ) => {
    try {
      await counselingApi.updateReferralStatus(referralId, { status });
      toast.success("Referral status updated");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const searchPatient = async () => {
    if (!searchPatientId.trim()) {
      toast.error("Please enter a patient ID");
      return;
    }
    setFreqLoading(true);
    try {
      const [sessionsData, freqData] = await Promise.all([
        counselingApi.getSessionNotes(searchPatientId),
        counselingApi.getVisitFrequency(searchPatientId).catch(() => null),
      ]);
      setPatientSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setVisitFrequency(freqData);
    } catch {
      toast.error("Failed to load patient counseling data");
    } finally {
      setFreqLoading(false);
    }
  };

  const activeReferrals = referrals.filter(
    (r) => !["completed", "COMPLETED", "cancelled", "DECLINED"].includes(r.status)
  );
  const closedReferrals = referrals.filter(
    (r) => ["completed", "COMPLETED", "cancelled", "DECLINED"].includes(r.status)
  );

  return (
    <div>
      <TopBar
        title="Counseling Integration"
        subtitle="Manage referrals to the counseling system and monitor client visit patterns"
      />

      <div className="p-6 space-y-6">

        {/* ── Frequent-Visitor Alerts ── */}
        {(frequentVisitors.length > 0 || frequentLoading) && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-semibold text-amber-800 dark:text-amber-300">
                  Frequent Visitor Alerts
                </h3>
                <Badge variant="destructive">{frequentVisitors.length}</Badge>
              </div>
              <Button size="sm" variant="outline" onClick={loadFrequentVisitors} disabled={frequentLoading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${frequentLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Clients who visited the clinic ≥ 3 times in the last 90 days — counseling follow-up may be needed.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {frequentVisitors.map((v, idx) => (
                <div key={idx} className="rounded-lg bg-white dark:bg-card border border-amber-200 dark:border-amber-700 p-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{v.clientName ?? v.name ?? `Client ${v.clientId}`}</p>
                    <p className="text-xs text-muted-foreground">ID: {v.clientId}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-amber-600">{v.visitCount ?? v.visits}</p>
                    <p className="text-xs text-muted-foreground">visits</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Refer Patient Section ── */}
        <div className="rounded-xl bg-card p-6 shadow-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">Refer Patient to Counseling</h3>
            <Button variant={showForm ? "outline" : "default"} onClick={() => setShowForm(!showForm)}>
              <ArrowRight className="h-4 w-4 mr-2" />
              {showForm ? "Cancel" : "New Referral"}
            </Button>
          </div>

          {showForm && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Patient ID *</label>
                  <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Enter patient ID" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Patient Name *</label>
                  <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Enter patient name" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason for Referral *</label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Anxiety, Depression, Trauma, Grief" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Urgency Level</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as const).map((level) => (
                    <Button key={level} variant={urgency === level ? "default" : "outline"} size="sm" onClick={() => setUrgency(level)}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Additional Notes</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any additional information for the counselor" />
              </div>

              <Button onClick={handleRefer} className="gradient-primary text-primary-foreground">
                <ArrowRight className="h-4 w-4 mr-2" />
                Send Referral to Counseling
              </Button>
            </div>
          )}
        </div>

        {/* ── Active Referrals ── */}
        <div className="rounded-xl bg-card p-6 shadow-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">
              Active Referrals
              {activeReferrals.length > 0 && (
                <Badge className="ml-2" variant="secondary">{activeReferrals.length}</Badge>
              )}
            </h3>
            <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading referrals…</p>
          ) : activeReferrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active referrals.</p>
          ) : (
            <div className="space-y-3">
              {activeReferrals.map((referral, idx) => (
                <div key={idx} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-card-foreground truncate">
                        {referral.patient_name ?? referral.clientName ?? "Unknown patient"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ID: {referral.patient_id ?? referral.clientId} &middot; {referral.reason}
                      </p>
                      {(referral.referralNumber ?? referral.referral_number) && (
                        <p className="text-xs font-mono text-muted-foreground">
                          Ref#: {referral.referralNumber ?? referral.referral_number}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <UrgencyBadge urgency={referral.urgency ?? "low"} />
                        <StatusBadge status={referral.status} />
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {["pending", "PENDING"].includes(referral.status) && (
                        <Button size="sm" onClick={() => handleUpdateStatus(referral.referral_id ?? referral.id, "in_progress")}>
                          <Clock className="h-4 w-4 mr-1" /> Send
                        </Button>
                      )}
                      {!["completed", "COMPLETED", "cancelled", "DECLINED"].includes(referral.status) && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(referral.referral_id ?? referral.id, "completed")}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Closed Referrals (collapsible) ── */}
        {closedReferrals.length > 0 && (
          <div className="rounded-xl bg-card p-6 shadow-card border border-border space-y-3">
            <h3 className="text-base font-semibold text-muted-foreground">
              Closed Referrals ({closedReferrals.length})
            </h3>
            <div className="space-y-2">
              {closedReferrals.map((referral, idx) => (
                <div key={idx} className="rounded-lg border p-3 flex items-center justify-between gap-3 opacity-70">
                  <div>
                    <p className="text-sm font-medium">{referral.patient_name ?? referral.clientName}</p>
                    <p className="text-xs text-muted-foreground">{referral.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <UrgencyBadge urgency={referral.urgency ?? "low"} />
                    <StatusBadge status={referral.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Patient Visit History & Frequency ── */}
        <div className="rounded-xl bg-card p-6 shadow-card border border-border space-y-4">
          <h3 className="text-lg font-semibold text-card-foreground">Patient Counseling History</h3>
          <p className="text-sm text-muted-foreground">
            Look up clinic visits recorded by the counseling system for any patient.
          </p>

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={searchPatientId}
                onChange={(e) => setSearchPatientId(e.target.value)}
                placeholder="Enter patient / client ID"
                onKeyDown={(e) => e.key === "Enter" && searchPatient()}
              />
            </div>
            <Button onClick={searchPatient} disabled={freqLoading}>
              {freqLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          {/* Visit frequency summary */}
          {visitFrequency && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-primary">{visitFrequency.totalVisits ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Visits</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">
                  {visitFrequency.frequentVisitor ? (
                    <span className="text-amber-600">Yes</span>
                  ) : (
                    <span className="text-green-600">No</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Frequent Visitor Flag</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{visitFrequency.visitsLast90Days ?? visitFrequency.recentVisits ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">Last 90 Days</p>
              </div>

              {visitFrequency.frequentVisitor && (
                <div className="sm:col-span-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 p-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    This client is flagged as a frequent visitor by the counseling system. Consider a proactive counseling follow-up.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Monthly breakdown */}
          {visitFrequency?.monthlyBreakdown?.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4" /> Monthly Breakdown
              </p>
              <div className="flex flex-wrap gap-2">
                {visitFrequency.monthlyBreakdown.map((m: any, i: number) => (
                  <div key={i} className="rounded-md border px-3 py-1.5 text-center min-w-[80px]">
                    <p className="text-xs text-muted-foreground">{m.month ?? m.yearMonth}</p>
                    <p className="text-sm font-semibold">{m.count ?? m.visits}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session / visit records */}
          {patientSessions.length > 0 && (
            <div className="space-y-3 mt-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> Clinic Visits Recorded by Counseling System
              </p>
              {patientSessions.map((session, idx) => (
                <div key={idx} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <p className="font-medium text-card-foreground text-sm">
                      {session.visitType ?? session.type ?? "Visit"} — {session.visitPurpose ?? session.purpose ?? session.notes?.slice(0, 60)}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {session.visitDate ?? session.session_date ?? session.date}
                    </Badge>
                  </div>
                  {session.notes && (
                    <p className="text-sm text-muted-foreground">{session.notes}</p>
                  )}
                  {session.counselor && (
                    <p className="text-xs text-muted-foreground mt-1">Counselor: {session.counselor}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {patientSessions.length === 0 && visitFrequency === null && !freqLoading && searchPatientId && (
            <p className="text-sm text-muted-foreground">No counseling records found for this patient.</p>
          )}
        </div>

      </div>
    </div>
  );
}
