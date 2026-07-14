import TopBar from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/mui-input";
import { Button } from "@/components/ui/mui-button";
import {
  Search as SearchIcon,
  Download,
  Visibility,
  Edit,
  Delete,
  Login,
  Logout,
  PersonAdd,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Paper,
  Typography,
  Grid,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";

type AuditAction = "login" | "logout" | "create" | "update" | "delete" | "view" | "settings";

const actionIcons: Record<AuditAction, React.ElementType> = {
  login: Login,
  logout: Logout,
  create: PersonAdd,
  update: Edit,
  delete: Delete,
  view: Visibility,
  settings: SettingsIcon,
};

const actionColors: Record<AuditAction, string> = {
  login: "#22c55e",
  logout: "#6b7280",
  create: "#3b82f6",
  update: "#06b6d4",
  delete: "#ef4444",
  view: "#6b7280",
  settings: "#eab308",
};

export default function AuditLogs() {
  const { user } = useAuth();
  const canExportAuditLogs = hasPermission(user, ["audit.export", "audit.view"]);
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState("all");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [loginLogsVisible, setLoginLogsVisible] = useState(false);
  const [loginLogsLoading, setLoginLogsLoading] = useState(false);
  const [loginEmailFilter, setLoginEmailFilter] = useState("");

  const staffMap = useMemo(() => {
    const map = new Map<string, any>();
    staffList.forEach((staff) => {
      map.set(staff.name, staff);
    });
    return map;
  }, [staffList]);

  const renderUser = (userName: string, role: string) => {
    const staff = staffMap.get(userName);
    if (staff) {
      return (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {staff.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {staff.role} • {staff.department}
          </Typography>
        </Box>
      );
    }
    return (
      <Box>
        <Typography variant="body2" fontWeight={500}>
          {userName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {role}
        </Typography>
      </Box>
    );
  };

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await api.auditLogs.getAll();
        setLogs(
          data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        );
      } catch {
        toast.error("Failed to load audit logs");
      }
    }
    loadLogs();
  }, []);

  useEffect(() => {
    async function loadStaff() {
      try {
        const data = await api.staff.getAll();
        setStaffList(data || []);
      } catch (error) {
        console.error("Failed to load staff", error);
      }
    }
    loadStaff();
  }, []);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return logs.filter((log) => {
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      if (!matchesAction) return false;
      if (!search) return true;
      return (
        log.user.toLowerCase().includes(lower) ||
        log.description.toLowerCase().includes(lower) ||
        log.action.toLowerCase().includes(lower)
      );
    });
  }, [actionFilter, logs, search]);

  const columns: Column<any>[] = [
    {
      header: "Timestamp",
      accessor: "timestamp",
      width: 170,
      minWidth: 150,
    },
    {
      header: "User",
      accessor: (row) => renderUser(row.user, row.role),
      width: 200,
      minWidth: 180,
    },
    {
      header: "Action",
      accessor: (row) => {
        const action = row.action as AuditAction;
        const Icon = actionIcons[action] || Visibility;
        const color = actionColors[action] || "#6b7280";
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Icon sx={{ fontSize: 16, color }} />
            <Typography
              variant="body2"
              sx={{ color, fontWeight: 500, textTransform: "capitalize" }}
            >
              {row.action}
            </Typography>
          </Box>
        );
      },
      width: 140,
      minWidth: 120,
    },
    {
      header: "Description",
      accessor: "description",
      minWidth: 250,
    },
    {
      header: "IP Address",
      accessor: "ipAddress",
      width: 140,
      minWidth: 120,
    },
  ];

  const exportLogs = () => {
    if (!canExportAuditLogs) {
      toast.error("You do not have permission to export audit logs");
      return;
    }
    const csvHeader = "Timestamp,User,Role,Action,Description,IP Address";
    const csvData = filtered
      .map((log) => `${log.timestamp},${log.user},${log.role},${log.action},"${log.description}",${log.ipAddress}`)
      .join("\n");
    const blob = new Blob([`${csvHeader}\n${csvData}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    anchor.click();
    toast.success("Audit logs exported");
  };

  const totalEvents = logs.length;
  const loginsCount = logs.filter((log) => log.action === "login").length;
  const updatesCount = logs.filter((log) => log.action === "update" || log.action === "settings").length;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <TopBar title="Audit Logs" subtitle="Track all system activities for security and compliance" />

      <Box sx={{ mt: 3 }}>
        {/* Stats Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
           <Grid size={{ xs: 12, sm: 4 }}>
             <Paper sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
               <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                 Total Events
               </Typography>
               <Typography variant="h4" fontWeight={700} color="text.primary">
                 {totalEvents}
               </Typography>
             </Paper>
           </Grid>
           <Grid size={{ xs: 12, sm: 4 }}>
             <Paper sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
               <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                 Logins
               </Typography>
               <Typography variant="h4" fontWeight={700} color="success.main">
                 {loginsCount}
               </Typography>
             </Paper>
           </Grid>
           <Grid size={{ xs: 12, sm: 4 }}>
             <Paper sx={{ p: 3, borderRadius: "16px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
               <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                 Updates
               </Typography>
               <Typography variant="h4" fontWeight={700} color="info.main">
                 {updatesCount}
               </Typography>
             </Paper>
           </Grid>
         </Grid>

        {/* Filters */}
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 3, alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 2, flex: 1, maxWidth: 500 }}>
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startAdornment={<SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="action-filter-label">Filter Action</InputLabel>
              <Select
                labelId="action-filter-label"
                value={actionFilter}
                label="Filter Action"
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <MenuItem value="all">All actions</MenuItem>
                <MenuItem value="login">Login</MenuItem>
                <MenuItem value="create">Create</MenuItem>
                <MenuItem value="update">Update</MenuItem>
                <MenuItem value="settings">Settings</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="outline"
            size="small"
            onClick={exportLogs}
            disabled={!canExportAuditLogs}
            startIcon={<Download sx={{ fontSize: 16 }} />}
          >
            Export Logs
          </Button>
        </Box>

        {/* Data Table */}
        <DataTable columns={columns} data={filtered} />

        {/* Login Audit Trail */}
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 2, flexWrap: "wrap" }}>
            <Typography variant="h6" fontWeight={600}>Login Audit Trail</Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Input
                placeholder="Filter by email..."
                value={loginEmailFilter}
                onChange={(e: any) => setLoginEmailFilter(e.target.value)}
                startAdornment={<SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />}
                sx={{ width: 220 }}
              />
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  const show = !loginLogsVisible;
                  setLoginLogsVisible(show);
                  if (show && loginLogs.length === 0) {
                    setLoginLogsLoading(true);
                    api.auditLogs.getLoginLogs({ email: loginEmailFilter || undefined })
                      .then((res: any) => setLoginLogs(Array.isArray(res) ? res : (res.data ?? [])))
                      .catch(() => toast.error("Failed to load login audit logs"))
                      .finally(() => setLoginLogsLoading(false));
                  }
                }}
              >
                {loginLogsVisible ? "Hide" : "Show Login Audit"}
              </Button>
              {loginLogsVisible && (
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    setLoginLogsLoading(true);
                    api.auditLogs.getLoginLogs({ email: loginEmailFilter || undefined })
                      .then((res: any) => setLoginLogs(Array.isArray(res) ? res : (res.data ?? [])))
                      .catch(() => toast.error("Failed to load login audit logs"))
                      .finally(() => setLoginLogsLoading(false));
                  }}
                >
                  Refresh
                </Button>
              )}
            </Box>
          </Box>
          {loginLogsVisible && (
            loginLogsLoading
              ? <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>Loading login audit logs...</Typography>
              : <Paper sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
                  <Box sx={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "rgba(0,0,0,0.04)" }}>
                          {["Time", "Email", "IP Address", "Result", "Failure Reason", "Role", "User Agent"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#555", borderBottom: "1px solid rgba(0,0,0,0.08)", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loginLogs.length === 0
                          ? <tr><td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "#999" }}>No login audit records found.</td></tr>
                          : loginLogs.map((l: any, i: number) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                              <td style={{ padding: "8px 14px", whiteSpace: "nowrap" }}>{l.loggedAt ? new Date(l.loggedAt).toLocaleString() : "—"}</td>
                              <td style={{ padding: "8px 14px" }}>{l.email || "—"}</td>
                              <td style={{ padding: "8px 14px", fontFamily: "monospace" }}>{l.ipAddress || "—"}</td>
                              <td style={{ padding: "8px 14px" }}>
                                <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: l.success ? "#dcfce7" : "#fee2e2", color: l.success ? "#16a34a" : "#dc2626" }}>
                                  {l.success ? "SUCCESS" : "FAILED"}
                                </span>
                              </td>
                              <td style={{ padding: "8px 14px", color: "#ef4444" }}>{l.failureReason || "—"}</td>
                              <td style={{ padding: "8px 14px" }}>{l.role || "—"}</td>
                              <td style={{ padding: "8px 14px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#888", fontSize: 11 }}>{l.userAgent || "—"}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </Box>
                </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}
