import TopBar from "@/components/layout/TopBar";
import StatCard from "@/components/dashboard/MUIStatCard";
import { Users, CalendarDays, BedDouble, Activity, ArrowRight, UserPlus, Receipt, FlaskConical, Cross, Building2, AlertTriangle, FileText, CheckCircle } from "lucide-react";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/mui-button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import { useClinicWebSocket } from "@/hooks/useClinicWebSocket";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Divider,
  Card,
  CardContent,
} from "@mui/material";

interface DashboardPatient {
  id: number;
  name: string;
  patientId: string;
  department: string;
  status: string;
  date: string;
}

const COLORS = ["#16641D", "#D4AF37", "#2E8B57", "#4B5563", "#B8860B"];

const SECTION_ROUTES: Record<string, string> = {
  Reception: "/patients/register",
  Triage: "/triage",
  Consultation: "/medical-records",
  Laboratory: "/laboratory",
  Pharmacy: "/pharmacy",
  Billing: "/billing",
  Wards: "/wards",
  Emergency: "/emergency",
};

const columns: Column<DashboardPatient>[] = [
  { header: "Patient ID", accessor: "patientId", width: 140 },
  { header: "Name", accessor: "name", width: 180, minWidth: 150 },
  { header: "Department", accessor: "department", width: 140 },
  {
    header: "Status",
    accessor: (row) => <StatusBadge status={row.status} />,
    width: 120,
  },
  { header: "Date", accessor: "date", width: 120 },
];

function openablePatientId(row: DashboardPatient) {
  return row.patientId && row.patientId !== "N/A" && row.patientId !== "null" ? row.patientId : null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 2, boxShadow: 3, borderRadius: "12px", border: "1px solid rgba(0,0,0,0.08)" }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, fontSize: "0.875rem" }}>
          {label}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Typography key={index} variant="body2" sx={{ color: entry.color, fontSize: "0.8rem" }}>
            {entry.name}: {entry.value}
          </Typography>
        ))}
      </Paper>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [lowStockDrugs, setLowStockDrugs] = useState<any[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<{ id: number; message: string; type: string; time: string }[]>([]);
  const [wardStatus, setWardStatus] = useState<any>(null);
  const { user } = useAuth();

  const { status: wsStatus } = useClinicWebSocket({
    onVitalAlert: (data) => {
      const msg = data.message || data.alert || JSON.stringify(data);
      setLiveAlerts((prev) => [
        { id: Date.now(), message: msg, type: "vital", time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9),
      ]);
      toast.warning("Vital Alert", { description: msg });
    },
    onWardStatus: (data) => {
      setWardStatus(data);
    },
    onNotification: (data) => {
      const msg = data.message || data.text || JSON.stringify(data);
      setLiveAlerts((prev) => [
        { id: Date.now(), message: msg, type: "info", time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9),
      ]);
    },
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        setData(await api.dashboard.get());
      } catch (error) {
        toast.error("Failed to load dashboard");
      }
    }
    async function loadLowStock() {
      try {
        const drugs = await api.drugs.getAll();
        setLowStockDrugs((drugs || []).filter((d: any) => (d.stock ?? 0) <= 10).slice(0, 6));
      } catch { /* non-critical */ }
    }
    loadDashboard();
    loadLowStock();
  }, []);

  const totals = data?.totals ?? { patients: 0, walkInsToday: 0, activeEncounters: 0, bedsOccupied: 0, totalBeds: 0, availableBeds: 0, formsToday: 0 };
  const recentPatients: DashboardPatient[] = data?.recentPatients ?? [];
  const weeklyData = data?.weeklyPatientFlow ?? [];
  const departmentData = data?.departmentDistribution ?? [];
  const sectionSummaries = data?.sectionSummaries ?? [];

  const statCards = [
    { title: "Total Patients", value: String(totals.patients), icon: Users },
    { title: "Today's Walk-Ins", value: String(totals.walkInsToday), icon: Cross },
    { title: "Active Visits", value: String(totals.activeEncounters), icon: Activity },
    { title: "Beds Occupied", value: `${totals.bedsOccupied}/${totals.totalBeds}`, icon: BedDouble, change: "80%", changeType: "neutral" as const },
    { title: "Beds Available", value: String(totals.availableBeds || 0), icon: CheckCircle, changeType: "positive" as const },
    { title: "Awaiting Triage", value: String(totals.awaitingTriage || 0), icon: AlertTriangle, changeType: "neutral" as const },
    { title: "Lab Pending", value: String(totals.labPending || 0), icon: FlaskConical, changeType: "neutral" as const },
    { title: "Pending Billing", value: String(totals.pendingBilling || 0), icon: Receipt, changeType: "negative" as const },
    { title: "Forms Today", value: String(totals.formsToday || 0), icon: FileText, changeType: "positive" as const },
  ];

  const allQuickActions = [
    { label: "Register Walk-In", icon: UserPlus, path: "/patients/register", perms: ["walkin.view"] },
    { label: "Triage", icon: CalendarDays, path: "/triage", perms: ["triage.view"] },
    { label: "Walk-In Flow", icon: Cross, path: "/patient-flow", perms: ["walkin.view"] },
    { label: "Clinic Sections", icon: Building2, path: "/clinic-sections", perms: ["sections.view"] },
    { label: "Invoice", icon: Receipt, path: "/billing", perms: ["billing.view", "billing.create"] },
    { label: "Lab Test", icon: FlaskConical, path: "/laboratory", perms: ["laboratory.view"] },
    { label: "Prescription", icon: Activity, path: "/prescriptions", perms: ["prescriptions.view"] },
  ];
  const quickActions = allQuickActions.filter((a) => hasPermission(user, a.perms));

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name || "Clinic User"}. Here is what is happening today.`}
      />

      <Box sx={{ mt: 2 }}>
        {/* Stats Grid */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {statCards.map((stat, index) => (
             <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={index}>
              <StatCard
                title={stat.title}
                value={stat.value}
                change={stat.change}
                changeType={stat.changeType}
                icon={stat.icon}
              />
            </Grid>
          ))}
        </Grid>

        {/* Quick Actions */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "16px",
            border: "1px solid rgba(0,0,0,0.08)",
            mb: 4,
            background: "linear-gradient(135deg, rgba(22, 100, 29, 0.02) 0%, rgba(212, 175, 55, 0.02) 100%)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
              Quick Actions:
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="small"
                startIcon={<action.icon className="h-4 w-4" />}
                onClick={() => navigate(action.path)}
                sx={{
                  borderRadius: "8px",
                  borderColor: "rgba(22, 100, 29, 0.2)",
                  color: "primary.main",
                  "&:hover": {
                    borderColor: "primary.main",
                    backgroundColor: "rgba(22, 100, 29, 0.08)",
                  }
                }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        </Paper>

        {/* Clinic Sections */}
        <Paper elevation={0} sx={{ p: 4, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "1.125rem" }}>
                Clinic Sections
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Live workload by walk-in service point
              </Typography>
            </Box>
            <Button variant="outline" size="small" onClick={() => navigate("/clinic-sections")}>
              Open Modules
            </Button>
          </Box>

          <Grid container spacing={2}>
            {sectionSummaries.map((section: any) => (
              <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={section.id}>
                <Card
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border: "1px solid rgba(0,0,0,0.08)",
                    "&:hover": {
                      borderColor: "primary.main",
                      backgroundColor: "rgba(22, 100, 29, 0.04)",
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
                    },
                  }}
                  onClick={() => navigate(SECTION_ROUTES[section.name] || "/clinic-sections")}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body1" fontWeight={600}>
                        {section.name}
                      </Typography>
                      <Badge variant="primary">{section.activeCount || 0} active</Badge>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {section.description || "No description"}
                    </Typography>

                    <Grid container spacing={1}>
                      <Grid size={{ xs: 4 }}>
                         <Paper elevation={0} sx={{ p: 1.5, borderRadius: "8px", bgcolor: "secondary.main", opacity: 0.1 }}>
                           <Typography variant="caption" color="text.secondary" display="block">
                             Active
                           </Typography>
                           <Typography variant="h6" fontWeight={700} color="primary.main">
                             {section.activeCount || 0}
                           </Typography>
                         </Paper>
                       </Grid>
                       <Grid size={{ xs: 4 }}>
                         <Paper elevation={0} sx={{ p: 1.5, borderRadius: "8px", bgcolor: "rgba(220, 38, 38, 0.08)" }}>
                           <Typography variant="caption" color="text.secondary" display="block">
                             Pending
                           </Typography>
                           <Typography variant="h6" fontWeight={700} color="error.main">
                             {section.pendingCount || 0}
                           </Typography>
                         </Paper>
                       </Grid>
                       <Grid size={{ xs: 4 }}>
                         <Paper elevation={0} sx={{ p: 1.5, borderRadius: "8px", bgcolor: "rgba(0,0,0,0.05)" }}>
                           <Typography variant="caption" color="text.secondary" display="block">
                             Forms
                           </Typography>
                           <Typography variant="h6" fontWeight={700}>
                             {section.formCount || 0}
                           </Typography>
                         </Paper>
                       </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Weekly Patient Flow */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)" }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "1.125rem" }}>
                  Weekly Patient Flow
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Live walk-in encounters across the last 7 days
                </Typography>
              </Box>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="patients" fill="#16641D" radius={[6, 6, 0, 0]} name="Patients" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Section Load Pie Chart */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)" }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "1.125rem" }}>
                  Section Load
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current live demand by clinic service point
                </Typography>
              </Box>

              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={departmentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {departmentData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <Box sx={{ mt: 2 }}>
                {departmentData.map((dept: any, i: number) => (
                  <Box
                    key={dept.name}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 1,
                      px: 1.5,
                      borderRadius: "8px",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: COLORS[i % COLORS.length],
                        }}
                      />
                      <Typography variant="body2" color="text.primary">
                        {dept.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600}>
                      {dept.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Low Stock Alert */}
        {lowStockDrugs.length > 0 && (
          <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(220,38,38,0.25)", bgcolor: "rgba(220,38,38,0.03)" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <AlertTriangle className="h-5 w-5" style={{ color: "#dc2626" }} />
                <Typography variant="h6" fontWeight={700} color="error.main" sx={{ fontSize: "1rem" }}>
                  Low Stock Alert — {lowStockDrugs.length} drug{lowStockDrugs.length > 1 ? "s" : ""} need reordering
                </Typography>
              </Box>
              <Button variant="outline" size="small" onClick={() => navigate("/pharmacy")} sx={{ color: "#dc2626", borderColor: "#dc2626" }}>
                Manage Inventory
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {lowStockDrugs.map((drug: any) => (
                <Box key={drug.drugId || drug.name} sx={{
                  px: 2, py: 1, borderRadius: "8px",
                  bgcolor: drug.stock === 0 ? "rgba(220,38,38,0.15)" : "rgba(245,158,11,0.1)",
                  border: `1px solid ${drug.stock === 0 ? "rgba(220,38,38,0.3)" : "rgba(245,158,11,0.3)"}`,
                  display: "flex", alignItems: "center", gap: 1,
                }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.8rem" }}>{drug.name}</Typography>
                  <Typography variant="caption" sx={{ color: drug.stock === 0 ? "#dc2626" : "#d97706", fontWeight: 700 }}>
                    {drug.stock === 0 ? "OUT" : `${drug.stock} left`}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* Live Vital Alerts Feed */}
        {liveAlerts.length > 0 && (
          <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(220,38,38,0.25)", bgcolor: "rgba(220,38,38,0.02)", mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <AlertTriangle className="h-5 w-5" style={{ color: "#dc2626" }} />
              <Typography variant="h6" fontWeight={700} color="error.main" sx={{ fontSize: "1rem" }}>
                Live Vital Alerts
              </Typography>
              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: wsStatus === "connected" ? "#16a34a" : "#9ca3af", animation: wsStatus === "connected" ? "pulse 2s infinite" : "none" }} />
                <Typography variant="caption" color="text.secondary">{wsStatus}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {liveAlerts.map((alert) => (
                <Box key={alert.id} sx={{ display: "flex", gap: 2, alignItems: "flex-start", p: 1.5, borderRadius: "8px", bgcolor: alert.type === "vital" ? "rgba(220,38,38,0.06)" : "rgba(0,0,0,0.03)", border: "1px solid", borderColor: alert.type === "vital" ? "rgba(220,38,38,0.15)" : "rgba(0,0,0,0.08)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, pt: 0.2 }}>{alert.time}</Typography>
                  <Typography variant="body2" sx={{ color: alert.type === "vital" ? "error.main" : "text.primary" }}>{alert.message}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* Ward Status (WebSocket push) */}
        {wardStatus && (
          <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(22,100,29,0.2)", bgcolor: "rgba(22,100,29,0.02)", mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <BedDouble className="h-5 w-5" style={{ color: "#16641D" }} />
              <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ fontSize: "1rem" }}>
                Live Ward Status
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>Real-time push</Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {(wardStatus.wards || []).map((ward: any, i: number) => (
                <Box key={i} sx={{ px: 2, py: 1, borderRadius: "8px", border: "1px solid rgba(22,100,29,0.2)", bgcolor: "rgba(22,100,29,0.06)" }}>
                  <Typography variant="body2" fontWeight={600}>{ward.ward || ward.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{ward.occupied ?? ward.active}/{ward.total ?? ward.capacity} beds</Typography>
                </Box>
              ))}
              {wardStatus.totalOccupied !== undefined && (
                <Box sx={{ px: 2, py: 1, borderRadius: "8px", border: "1px solid rgba(22,100,29,0.3)", bgcolor: "rgba(22,100,29,0.1)" }}>
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    Total: {wardStatus.totalOccupied}/{wardStatus.totalBeds} occupied
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        )}

        {/* Recent Patients Table */}
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <Box sx={{ p: 4, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "1.125rem" }}>
                  Recent Patients
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Latest patient records from the backend
                </Typography>
              </Box>
                <Button
                  variant="outline"
                  size="small"
                  endIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate("/patients")}
                  sx={{
                    color: "#16641D",
                    borderColor: "#16641D",
                    "&:hover": {
                      borderColor: "#16641D",
                      backgroundColor: "rgba(22, 100, 29, 0.08)",
                    }
                  }}
                >
                  View All
                </Button>
            </Box>
          </Box>

          <Box sx={{ p: { xs: 2, md: 4 } }}>
            <DataTable
              columns={columns}
              data={recentPatients}
              onRowClick={(row) => {
                const identifier = openablePatientId(row);
                if (!identifier) {
                  toast.error("This patient record is missing an identifier");
                  return;
                }
                navigate(`/patients/${identifier}`);
              }}
            />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
