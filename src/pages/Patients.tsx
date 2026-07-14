import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/mui-button";
import { Input } from "@/components/ui/mui-input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Plus, Search, Filter, GraduationCap, Trash2, Download } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";
import {
  Grid,
  Paper,
  Typography,
  Box,
  TableSortLabel,
} from "@mui/material";

interface Patient {
  id: number;
  patient_id: string;
  clinic_number?: string;
  patient_type?: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  department?: string;
  status: string;
  student_id: string;
  man_number?: string;
  email?: string;
  blood_group?: string;
  program?: string;
  school?: string;
  created_by?: string;
  created_at?: string;
}

export default function Patients() {
  const { user } = useAuth();
  const canManagePatients = hasPermission(user, ["patients.manage"]);
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadPatients() {
      try {
        const [patientsData, staffData] = await Promise.all([
          api.patients.getAll(),
          api.staff.getAll()
        ]);
        setPatients(patientsData || []);
        setStaffList(staffData || []);
      } catch (e) {
        toast.error("Failed to load patients");
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  // Build a map of staff names to details for enrichment
  const staffMap = useMemo(() => {
    const map = new Map<string, any>();
    staffList.forEach((staff) => {
      map.set(staff.name, staff);
    });
    return map;
  }, [staffList]);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.student_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.man_number?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const openPatient = (row: Patient) => {
    const identifier = getPatientIdentifier(row);
    if (!identifier || identifier === "null") {
      toast.error("This patient record is missing an identifier");
      return;
    }
    navigate(`/patients/${identifier}`);
  };

  const registerNew = () => {
    navigate("/patients/register");
  };

  const markGraduated = async (row: Patient) => {
    const identifier = getPatientIdentifier(row);
    if (!identifier) {
      toast.error("This patient record is missing an identifier");
      return;
    }
    if (!canGraduatePatient(row)) {
      toast.error("Only student patient records can be graduated");
      return;
    }
    if (!window.confirm(`Mark ${row.name} as graduated?`)) return;
    try {
      const updated = await api.patients.graduate(identifier);
      setPatients((current) => current.map((entry) => getPatientIdentifier(entry) === identifier ? updated : entry));
      toast.success(`${row.name} marked as graduated`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update patient status");
    }
  };

  const deletePatient = async (row: Patient) => {
    const identifier = getPatientIdentifier(row);
    if (!identifier) {
      toast.error("This patient record is missing an identifier");
      return;
    }
    if (!window.confirm(`Delete patient ${row.name}? This cannot be undone.`)) return;
    try {
      await api.patients.remove(identifier);
      setPatients((current) => current.filter((entry) => getPatientIdentifier(entry) !== identifier));
      toast.success(`${row.name} deleted`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete patient");
    }
  };

  const columns: Column<Patient>[] = [
    { header: "Clinic No.", accessor: (r) => r.clinic_number || r.patient_id, width: 140 },
    { header: "Name", accessor: "name", width: 180, minWidth: 150 },
    {
      header: "Type",
      accessor: (r) => {
        const colors: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "error"> = {
          "STUDENT": "success",
          "FIRST_TIME_STUDENT": "primary",
          "STAFF_DEPENDANT": "secondary",
          "NON_UNZA": "default",
        };
        return <Typography variant="body2" color={colors[String(r.patient_type || "").toUpperCase()] || "text.primary"}>{formatPatientType(r.patient_type)}</Typography>;
      },
      width: 150,
    },
    { header: "Age", accessor: "age", width: 80 },
    { header: "Gender", accessor: "gender", width: 100 },
    { header: "External ID", accessor: (r) => r.student_id || r.man_number || "-", width: 140 },
    { header: "Phone", accessor: "phone", width: 140 },
    {
      header: "Status",
      accessor: (r) => <StatusBadge status={r.status} />,
      width: 120,
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title="Patient Management" subtitle="Register and manage patient records" />

      <Box sx={{ mt: 2 }}>
        {/* Filters & Actions */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            borderRadius: "12px",
            border: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ maxWidth: 400, flex: 1 }}>
            <Input
              placeholder="Search patients by name, ID, or student number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startAdornment={<Search className="h-4 w-4" style={{ color: "text.secondary" }} />}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button variant="outline" size="small" startIcon={<Filter className="h-4 w-4" />}>
              Filter
            </Button>
            <Button
              variant="outline"
              size="small"
              startIcon={<Download className="h-4 w-4" />}
              onClick={() => api.exports.patientsXlsx().catch(() => toast.error("Export failed"))}
            >
              Export XLSX
            </Button>
            {hasPermission(user, ["walkin.view"]) && (
              <Button
                variant="contained"
                size="small"
                startIcon={<Plus className="h-4 w-4" />}
                onClick={registerNew}
                sx={{
                  backgroundColor: "primary.main",
                  "&:hover": { backgroundColor: "primary.dark" },
                }}
              >
                Register Patient
              </Button>
            )}
          </Box>
        </Paper>

        {/* Data Table */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: "16px",
            border: "1px solid rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <DataTable
              columns={columns}
              data={paginated}
              onRowClick={openPatient}
              getRowId={(row) => row.id}
              actions={
                canManagePatients
                  ? (row) => (
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(event) => {
                            event.stopPropagation();
                            markGraduated(row);
                          }}
                          disabled={row.status === "graduated" || !canGraduatePatient(row)}
                          sx={{
                            borderColor: "secondary.main",
                            color: "secondary.main",
                            "&:hover": { borderColor: "secondary.dark", backgroundColor: "rgba(212, 175, 55, 0.08)" },
                          }}
                        >
                          <GraduationCap className="h-4 w-4" />
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(event) => {
                            event.stopPropagation();
                            deletePatient(row);
                          }}
                          sx={{
                            borderColor: "error.main",
                            color: "error.main",
                            "&:hover": { borderColor: "error.dark", backgroundColor: "rgba(220, 38, 38, 0.08)" },
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Box>
                    )
                  : undefined
              }
            />
            <Box sx={{ px: 1 }}>
              <PaginationControls
                page={page}
                totalPages={totalPages}
                totalElements={filtered.length}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
              />
            </Box>
          </Box>
        </Paper>

        {/* Loading skeleton - show when loading */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <Typography color="text.secondary">Loading patients...</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function getPatientIdentifier(row: Patient) {
  const identifier = row.patient_id || row.clinic_number || String(row.id || "");
  if (!identifier || identifier === "null") {
    return "";
  }
  return String(identifier).trim();
}

function canGraduatePatient(row: Patient) {
  const patientType = String(row.patient_type || "").toUpperCase();
  return patientType === "STUDENT" || patientType === "FIRST_TIME_STUDENT";
}

function formatPatientType(patientType?: string) {
  const normalized = String(patientType || "GENERAL").toUpperCase();
  switch (normalized) {
    case "FIRST_TIME_STUDENT":
      return "First-Time Student";
    case "STAFF_DEPENDANT":
      return "Staff Dependant";
    case "NON_UNZA":
      return "Non-UNZA";
    default:
      return normalized.charAt(0) + normalized.slice(1).toLowerCase();
  }
}
