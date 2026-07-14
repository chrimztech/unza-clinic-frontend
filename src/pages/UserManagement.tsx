import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Shield, Trash2, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/navigation";

interface UserEntry {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  staff_id?: string;
  man_number?: string;
  lastLogin: string;
  status: "active" | "inactive";
  forcePasswordChange?: boolean;
  permissions?: string[];
}

const roleBadgeColors: Record<string, string> = {
  Admin: "bg-destructive/10 text-destructive",
  Doctor: "bg-primary/10 text-primary",
  Nurse: "bg-info/10 text-info",
  Receptionist: "bg-warning/10 text-warning",
  Pharmacist: "bg-success/10 text-success",
  "Lab Technician": "bg-accent/10 text-accent",
};

const roles = ["Admin", "Doctor", "Nurse", "MCH Nurse", "Receptionist", "Cashier", "Records Clerk", "Pharmacist", "Lab Technician", "Radiographer", "Counselor", "Dentist", "Optometrist", "Physiotherapist"];
const departments = ["Reception", "Accounts", "Clinical", "Nursing", "Pharmacy", "Laboratory", "Eye Clinic", "Mother and Child Health", "Radiology", "Inpatient", "IT"];
const permissionLabels: Record<string, string> = {
  "dashboard.view": "Dashboard",
  "sections.view": "Clinic sections",
  "notifications.view": "Notifications",
  "patients.view": "Patients",
  "walkin.view": "Walk-in flow",
  "triage.view": "Triage",
  "emergency.view": "Emergency",
  "staff.view": "Doctors & staff",
  "schedules.view": "Schedules",
  "records.view": "Medical records",
  "forms.view": "Clinical forms",
  "prescriptions.view": "Prescriptions",
  "referrals.view": "Referrals",
  "laboratory.view": "Laboratory",
  "radiology.view": "Radiology",
  "bloodbank.view": "Blood bank",
  "pharmacy.view": "Pharmacy",
  "pharmacy.dispense": "Dispense prescriptions",
  "suppliers.view": "Suppliers",
  "inventory.view": "Inventory",
  "wards.view": "Wards",
  "admissions.view": "Admissions",
  "billing.view": "Billing",
  "billing.create": "Create invoices",
  "billing.payments": "Post payments",
  "insurance.view": "Insurance",
  "counseling.view": "Counseling",
  "mch.view": "MCH Clinic",
  "art.view": "ART/HIV Clinic",
  "dental.view": "Dental Clinic",
  "eye.view": "Eye Clinic",
  "sti.view": "STI Clinic",
  "physio.view": "Physiotherapy",
  "departments.manage": "Departments",
  "attendance.view": "Staff attendance",
  "users.manage": "User management",
  "users.reset_password": "Reset user passwords",
  "patients.manage": "Manage patients",
  "staff.manage": "Manage staff records",
  "audit.view": "Audit logs",
  "audit.export": "Export audit logs",
  "reports.view": "Reports",
  "settings.view": "Settings",
  "settings.manage": "Manage clinic settings",
  "backup.export": "Export backups",
  "tariffs.manage": "Tariff manager",
};

const rolePermissionPresets: Record<string, string[]> = {
  Admin: Object.keys(permissionLabels),
  Doctor: ["dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view", "triage.view", "emergency.view", "staff.view", "schedules.view", "records.view", "forms.view", "prescriptions.view", "referrals.view", "counseling.view", "laboratory.view", "radiology.view", "bloodbank.view", "wards.view", "admissions.view", "mch.view", "art.view", "dental.view", "eye.view", "sti.view", "physio.view", "reports.view"],
  Nurse: ["dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view", "triage.view", "emergency.view", "staff.view", "records.view", "forms.view", "counseling.view", "wards.view", "admissions.view", "mch.view"],
  Receptionist: ["dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view", "schedules.view", "forms.view", "billing.view", "billing.create", "billing.payments", "insurance.view"],
  Pharmacist: ["dashboard.view", "sections.view", "notifications.view", "patients.view", "forms.view", "pharmacy.view", "pharmacy.dispense", "suppliers.view", "inventory.view", "billing.view", "billing.create", "billing.payments"],
  "Lab Technician": ["dashboard.view", "sections.view", "notifications.view", "patients.view", "forms.view", "laboratory.view", "radiology.view", "bloodbank.view", "reports.view"],
  "MCH Nurse": ["dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view", "triage.view", "records.view", "forms.view", "mch.view", "referrals.view"],
  Radiographer: ["dashboard.view", "sections.view", "notifications.view", "patients.view", "forms.view", "radiology.view", "reports.view"],
  Counselor: ["dashboard.view", "sections.view", "notifications.view", "patients.view", "records.view", "forms.view", "counseling.view", "referrals.view", "art.view", "sti.view"],
  Dentist: ["dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view", "records.view", "forms.view", "prescriptions.view", "referrals.view", "dental.view"],
  Optometrist: ["dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view", "records.view", "forms.view", "prescriptions.view", "referrals.view", "eye.view"],
  Physiotherapist: ["dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view", "records.view", "forms.view", "referrals.view", "physio.view"],
  Cashier: ["dashboard.view", "sections.view", "notifications.view", "patients.view", "billing.view", "billing.create", "billing.payments", "insurance.view", "tariffs.manage"],
  "Records Clerk": ["dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view", "records.view", "forms.view", "schedules.view"],
};

const emptyForm = {
  name: "",
  email: "",
  role: "",
  department: "",
  staffId: "",
  manNumber: "",
  password: "changeme123",
  status: "active",
  forcePasswordChange: true,
  permissions: [] as string[],
};

export default function UserManagement() {
  const { user: currentUser, updateUser } = useAuth();
  const canManageUsers = hasPermission(currentUser, ["users.manage"]);
  const canResetPasswords = hasPermission(currentUser, ["users.reset_password"]);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserEntry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserEntry | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const loadUsers = () => {
    api.users.getAll().then(setUsers).catch(() => toast.error("Failed to load users"));
  };

  useEffect(() => {
    loadUsers();
    api.staff.getAll().then(setStaff).catch(() => setStaff([]));
  }, []);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (entry: UserEntry) => {
    setEditingUser(entry);
    setForm({
      name: entry.name,
      email: entry.email,
      role: entry.role,
      department: entry.department,
      staffId: entry.staff_id || "",
      manNumber: entry.man_number || "",
      password: "",
      status: entry.status || "active",
      forcePasswordChange: Boolean(entry.forcePasswordChange),
      permissions: entry.permissions || rolePermissionPresets[entry.role] || [],
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        department: form.department,
        staffId: form.staffId || "",
        manNumber: form.manNumber || "",
        password: form.password,
        status: form.status,
        forcePasswordChange: form.forcePasswordChange,
        permissions: form.permissions,
      };
      const saved = editingUser
        ? await api.users.update(editingUser.id, payload)
        : await api.users.create(payload);

      setUsers((prev) => editingUser ? prev.map((entry) => entry.id === saved.id ? saved : entry) : [saved, ...prev]);

      if (editingUser?.id === currentUser?.id) {
        updateUser({
          role: saved.role,
          department: saved.department,
          status: saved.status,
          forcePasswordChange: saved.forcePasswordChange,
          permissions: saved.permissions,
        });
      }

      toast.success(
        editingUser
          ? `User "${saved.name}" updated successfully`
          : `User "${saved.name}" added. They will be prompted to change their password on first login.`
      );
      setShowDialog(false);
      setEditingUser(null);
      setForm(emptyForm);
    } catch {
      toast.error(`Failed to ${editingUser ? "update" : "add"} user`);
    }
  };

  const togglePermission = (permission: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      permissions: checked
        ? [...new Set([...current.permissions, permission])]
        : current.permissions.filter((entry) => entry !== permission),
    }));
  };

  const openResetPassword = (entry: UserEntry) => {
    setResetTarget(entry);
    setResetNewPassword("");
    setShowResetDialog(true);
  };

  const handleResetPassword = async () => {
    if (!resetTarget || resetNewPassword.length < 6) return;
    setResetting(true);
    try {
      await api.users.resetPassword(resetTarget.id, resetNewPassword);
      toast.success(`Password reset for ${resetTarget.name}. They will be required to change it on next login.`);
      setShowResetDialog(false);
      setResetTarget(null);
      setResetNewPassword("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  const deleteUser = async (entry: UserEntry) => {
    if (!window.confirm(`Delete user account for ${entry.name}?`)) return;
    try {
      await api.users.remove(entry.id);
      setUsers((current) => current.filter((user) => user.id !== entry.id));
      toast.success(`${entry.name} deleted`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete user");
    }
  };

  const columns: Column<UserEntry>[] = [
    { header: "Name", accessor: "name" },
    { header: "Email", accessor: "email" },
    { header: "Role", accessor: (r) => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeColors[r.role] || ""}`}><Shield className="h-3 w-3 mr-1" />{r.role}</span> },
    { header: "Department", accessor: "department" },
    { header: "Staff Link", accessor: (r) => r.staff_id || r.man_number || "-" },
    { header: "Last Login", accessor: "lastLogin" },
    { header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <TopBar title="User Management" subtitle="Manage staff accounts, rights, permissions, and activation status." />
      <div className="pl-0 pr-6 pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users or roles..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openCreate} disabled={!canManageUsers}><Plus className="h-4 w-4 mr-1" /> Add User</Button>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {roles.map((role) => (
            <div key={role} className="rounded-lg bg-card p-3 shadow-card border border-border text-center">
              <p className="text-lg font-bold font-display text-card-foreground">{users.filter((u) => u.role === role).length}</p>
              <p className="text-xs text-muted-foreground">{role}s</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card border border-border">
          <h3 className="text-sm font-semibold font-display text-card-foreground mb-4">Role Permission Presets</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => (
              <div key={role} className="rounded-lg border border-border p-4">
                <p className="font-medium text-card-foreground mb-2">{role}</p>
                <div className="flex flex-wrap gap-2">
                  {(rolePermissionPresets[role] || []).map((permission) => (
                    <span key={permission} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">{permissionLabels[permission]}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          actions={(row) => (canManageUsers || canResetPasswords) ? (
            <div className="flex gap-2 flex-wrap">
              {canManageUsers && <Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button>}
              {canResetPasswords && (
                <Button size="sm" variant="outline" onClick={() => openResetPassword(row)} title="Reset password">
                  <KeyRound className="h-4 w-4 mr-1" /> Reset PW
                </Button>
              )}
              {canManageUsers && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteUser(row)}
                  disabled={currentUser?.id === row.id}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
            </div>
          ) : null}
        />
      </div>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Set a new temporary password for <strong>{resetTarget?.name}</strong>. They will be required to change it on next login.
            </p>
            <div className="space-y-1.5">
              <Label>New Password *</Label>
              <Input
                type="password"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                autoFocus
              />
              {resetNewPassword.length > 0 && resetNewPassword.length < 6 && (
                <p className="text-xs text-destructive">Password must be at least 6 characters</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetNewPassword.length < 6 || resetting}
              className="gradient-primary text-primary-foreground"
            >
              {resetting ? "Resetting…" : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle className="font-display">{editingUser ? "Edit User" : "Add New User"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Link Staff Record</Label>
              <Select
                value={form.staffId}
                onValueChange={(value) => {
                  const member = staff.find((entry) => entry.staff_id === value);
                  setForm((current) => ({
                    ...current,
                    staffId: value,
                    manNumber: member?.man_number || "",
                    name: member?.name || current.name,
                    email: member?.email || current.email,
                    department: member?.department || current.department,
                    role: member?.role || current.role,
                    permissions: rolePermissionPresets[member?.role || current.role] || current.permissions,
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{staff.map((entry) => <SelectItem key={entry.staff_id} value={entry.staff_id}>{entry.name} ({entry.staff_id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Man Number</Label>
                <Input value={form.manNumber} onChange={(e) => setForm((f) => ({ ...f, manNumber: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{editingUser ? "Reset Password" : "Temporary Password"} {editingUser ? "" : "*"}</Label>
                <Input
                  value={form.password}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    password: e.target.value,
                    forcePasswordChange: e.target.value ? true : f.forcePasswordChange,
                  }))}
                  required={!editingUser}
                  placeholder={editingUser ? "Leave blank to keep existing password" : ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={(value) => setForm((f) => ({ ...f, role: value, permissions: rolePermissionPresets[value] || f.permissions }))}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>{roles.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department *</Label>
                <Select value={form.department} onValueChange={(value) => setForm((f) => ({ ...f, department: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                  <SelectContent>{departments.map((department) => <SelectItem key={department} value={department}>{department}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status *</Label>
                <Select value={form.status} onValueChange={(value) => setForm((f) => ({ ...f, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.forcePasswordChange} onCheckedChange={(checked) => setForm((f) => ({ ...f, forcePasswordChange: checked === true }))} />
                  <span>Require password change at next login</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid gap-2 sm:grid-cols-2 max-h-60 overflow-y-auto rounded-md border border-border p-3">
                {Object.entries(permissionLabels).map(([permission, label]) => (
                  <label key={permission} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.permissions.includes(permission)} onCheckedChange={(checked) => togglePermission(permission, checked === true)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground" disabled={!canManageUsers}>{editingUser ? "Save Changes" : "Add User"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
