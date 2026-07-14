import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  BedDouble,
  Bell,
  Boxes,
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  CreditCard,
  Droplets,
  FileText,
  FileSearch,
  FlaskConical,
  GitBranchPlus,
  FileBadge2,
  Heart,
  Image,
  LayoutDashboard,
  Pill,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Siren,
  Stethoscope,
  Truck,
  Users,
  Baby,
  Eye,
  Smile,
  Activity,
  ShieldAlert,
  PackageCheck,
  Dumbbell,
  Upload,
  UserCheck,
} from "lucide-react";

export type AppRole =
  | "Admin"
  | "Doctor"
  | "Nurse"
  | "Receptionist"
  | "Pharmacist"
  | "Lab Technician"
  | "Counselor"
  | "Radiographer"
  | "Dentist"
  | "Optometrist"
  | "MCH Nurse"
  | "Physiotherapist"
  | "Cashier"
  | "Records Clerk";

export interface AuthUser {
  id: number;
  userId: string;
  name: string;
  email: string;
  role: AppRole | string;
  department: string;
  staffId?: string;
  manNumber?: string;
  status?: string;
  forcePasswordChange?: boolean;
  permissions?: string[];
  accessToken?: string;
  tokenType?: string;
  expiresAt?: string;
}

type StaffWorkspaceProfile = {
  sections: string[];
  actions: string[];
  tasks: string[];
};

const rolePermissionFallback: Record<string, string[]> = {
  Admin: [
    "dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view",
    "triage.view", "emergency.view", "staff.view", "schedules.view", "records.view",
    "forms.view", "prescriptions.view", "referrals.view", "laboratory.view", "radiology.view",
    "bloodbank.view", "pharmacy.view", "pharmacy.dispense", "suppliers.view", "inventory.view", "wards.view",
    "admissions.view", "billing.view", "billing.create", "billing.payments", "insurance.view",
    "counseling.view", "mch.view", "art.view", "dental.view", "eye.view", "sti.view", "physio.view",
    "departments.manage", "attendance.view", "users.manage", "users.reset_password",
    "patients.manage", "staff.manage",
    "audit.view", "audit.export", "reports.view", "settings.view", "settings.manage",
    "backup.export", "tariffs.manage",
  ],
  Doctor: [
    "dashboard.view", "sections.view", "notifications.view", "patients.view", "patients.manage", "walkin.view",
    "triage.view", "emergency.view", "staff.view", "schedules.view", "records.view",
    "forms.view", "prescriptions.view", "referrals.view", "counseling.view", "laboratory.view", "radiology.view",
    "bloodbank.view", "wards.view", "admissions.view", "reports.view",
    "mch.view", "art.view", "dental.view", "eye.view", "sti.view", "physio.view",
  ],
  Nurse: [
    "dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view",
    "triage.view", "emergency.view", "staff.view", "records.view", "forms.view", "counseling.view",
    "wards.view", "admissions.view", "mch.view",
  ],
  "MCH Nurse": [
    "dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view",
    "triage.view", "records.view", "forms.view", "mch.view", "referrals.view",
  ],
  Receptionist: [
    "dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view",
    "schedules.view", "forms.view", "billing.view", "billing.create", "billing.payments", "insurance.view",
  ],
  Cashier: [
    "dashboard.view", "sections.view", "notifications.view", "patients.view",
    "billing.view", "billing.create", "billing.payments", "insurance.view", "tariffs.manage",
  ],
  "Records Clerk": [
    "dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view",
    "records.view", "forms.view", "schedules.view",
  ],
  Pharmacist: [
    "dashboard.view", "sections.view", "notifications.view", "patients.view",
    "forms.view", "pharmacy.view", "pharmacy.dispense", "suppliers.view", "inventory.view",
    "billing.view", "billing.create", "billing.payments",
  ],
  "Lab Technician": [
    "dashboard.view", "sections.view", "notifications.view", "patients.view",
    "forms.view", "laboratory.view", "radiology.view", "bloodbank.view", "reports.view",
  ],
  Radiographer: [
    "dashboard.view", "sections.view", "notifications.view", "patients.view",
    "forms.view", "radiology.view", "reports.view",
  ],
  Counselor: [
    "dashboard.view", "sections.view", "notifications.view", "patients.view",
    "records.view", "forms.view", "counseling.view", "referrals.view",
    "art.view", "sti.view",
  ],
  Dentist: [
    "dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view",
    "records.view", "forms.view", "prescriptions.view", "referrals.view", "dental.view",
  ],
  Optometrist: [
    "dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view",
    "records.view", "forms.view", "prescriptions.view", "referrals.view", "eye.view",
  ],
  Physiotherapist: [
    "dashboard.view", "sections.view", "notifications.view", "patients.view", "walkin.view",
    "records.view", "forms.view", "referrals.view", "physio.view",
  ],
};

export type NavItem = {
  to: string;
  icon: React.ElementType;
  label: string;
  roles?: string[];
  permissions?: string[];
  departments?: string[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard", permissions: ["dashboard.view"] },
      { to: "/clinic-sections", icon: Building2, label: "Clinic Sections", permissions: ["sections.view"] },
      { to: "/notifications", icon: Bell, label: "Notifications", permissions: ["notifications.view"] },
    ],
  },
  {
    title: "Clinical",
    items: [
      { to: "/patients", icon: Users, label: "Patients", permissions: ["patients.view"] },
      { to: "/patient-flow", icon: GitBranchPlus, label: "Walk-In Flow", permissions: ["walkin.view"], departments: ["Reception", "Clinical", "Nursing"] },
      { to: "/triage", icon: AlertTriangle, label: "Triage", permissions: ["triage.view"], departments: ["Nursing", "Clinical", "Emergency"] },
      { to: "/emergency", icon: Siren, label: "Emergency", permissions: ["emergency.view"], departments: ["Emergency", "Clinical", "Nursing"] },
      { to: "/doctor-schedule", icon: Calendar, label: "Schedules", permissions: ["schedules.view"] },
      { to: "/appointments", icon: Calendar, label: "Appointments", permissions: ["schedules.view"] },
      { to: "/doctor-queue", icon: Stethoscope, label: "Doctor's Queue", permissions: ["walkin.view"] },
      { to: "/medical-records", icon: FileText, label: "Medical Records", permissions: ["records.view"] },
      { to: "/clinical-forms", icon: FileBadge2, label: "Clinical Forms", permissions: ["forms.view"] },
      { to: "/medical-exams", icon: FileSearch, label: "Medical Exams", permissions: ["forms.view"] },
      { to: "/referrals", icon: ArrowRightLeft, label: "Referrals", permissions: ["referrals.view"] },
      { to: "/counseling", icon: Heart, label: "Counseling", permissions: ["counseling.view"] },
    ],
  },
  {
    title: "Specialized Clinics",
    items: [
      { to: "/mch-clinic", icon: Baby, label: "MCH Clinic", permissions: ["mch.view"], departments: ["MCH", "Mother and Child Health", "Nursing", "Clinical"] },
      { to: "/art-clinic", icon: ShieldAlert, label: "ART / HIV Clinic", permissions: ["art.view"], departments: ["ART", "HIV", "Clinical"] },
      { to: "/dental-clinic", icon: Smile, label: "Dental Clinic", permissions: ["dental.view"], departments: ["Dental", "Clinical"] },
      { to: "/eye-clinic", icon: Eye, label: "Eye Clinic", permissions: ["eye.view"], departments: ["Eye Clinic", "Ophthalmic", "Clinical"] },
      { to: "/sti-clinic", icon: ShieldCheck, label: "STI Clinic", permissions: ["sti.view"], departments: ["STI", "Clinical"] },
      { to: "/physiotherapy", icon: Dumbbell, label: "Physiotherapy", permissions: ["physio.view"], departments: ["Physiotherapy", "Rehabilitation"] },
    ],
  },
  {
    title: "Diagnostics",
    items: [
      { to: "/laboratory", icon: FlaskConical, label: "Laboratory", permissions: ["laboratory.view"], departments: ["Laboratory"] },
      { to: "/radiology", icon: Image, label: "Radiology", permissions: ["radiology.view"], departments: ["Radiology"] },
      { to: "/blood-bank", icon: Droplets, label: "Blood Bank", permissions: ["bloodbank.view"], departments: ["Laboratory"] },
    ],
  },
  {
    title: "Pharmacy",
    items: [
      { to: "/pharmacy", icon: Pill, label: "Drug Inventory", permissions: ["pharmacy.view"], departments: ["Pharmacy"] },
      { to: "/pharmacy/dispensing", icon: PackageCheck, label: "Dispensing Queue", permissions: ["pharmacy.dispense", "pharmacy.view"], departments: ["Pharmacy"] },
      { to: "/prescriptions", icon: ClipboardList, label: "Prescriptions", permissions: ["prescriptions.view"] },
      { to: "/suppliers", icon: Truck, label: "Suppliers", permissions: ["suppliers.view"], departments: ["Pharmacy", "Administration", "Accounts"] },
      { to: "/inventory", icon: Boxes, label: "Inventory", permissions: ["inventory.view"], departments: ["Pharmacy", "Administration"] },
    ],
  },
  {
    title: "Inpatient",
    items: [
      { to: "/wards", icon: BedDouble, label: "Wards & Beds", permissions: ["wards.view"], departments: ["Inpatient", "Nursing", "Clinical"] },
      { to: "/admissions", icon: Users, label: "Admissions", permissions: ["admissions.view"], departments: ["Inpatient", "Nursing", "Clinical"] },
    ],
  },
  {
    title: "Finance",
    items: [
      { to: "/billing", icon: CreditCard, label: "Billing", permissions: ["billing.view"], departments: ["Accounts", "Reception", "Pharmacy", "Laboratory", "Clinical", "Mother and Child Health", "Eye Clinic"] },
      { to: "/billing/tariffs", icon: CreditCard, label: "Tariff Manager", permissions: ["tariffs.manage"] },
      { to: "/insurance", icon: ShieldCheck, label: "Insurance Claims", permissions: ["insurance.view"], departments: ["Accounts", "Administration"] },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/departments", icon: Building2, label: "Departments", permissions: ["departments.manage"] },
      { to: "/staff-attendance", icon: Clock, label: "Staff Attendance", permissions: ["attendance.view"] },
      { to: "/users", icon: Shield, label: "User Management", permissions: ["users.manage"] },
      { to: "/student-intake-screening", icon: UserCheck, label: "Student Intake Screening", permissions: ["patients.manage", "patients.view"] },
      { to: "/bulk-import", icon: Upload, label: "Bulk Import (SIS/HR)", permissions: ["patients.manage"] },
      { to: "/audit-logs", icon: ScrollText, label: "Audit Logs", permissions: ["audit.view"] },
       { to: "/reports", icon: BarChart3, label: "Reports", permissions: ["reports.view"] },
       { to: "/clinical-statistics", icon: BarChart3, label: "Clinical Stats", permissions: ["reports.view"] },
      { to: "/settings", icon: Settings, label: "Settings", permissions: ["settings.view"] },
    ],
  },
];

const flattenNavItems = () => navSections.flatMap((section) => section.items);
const hiddenRouteAccess = [
  { prefix: "/reception-desk", permissions: ["walkin.view"] },
  { prefix: "/records-desk", permissions: ["records.view"] },
  { prefix: "/patients/register", permissions: ["patients.view", "walkin.view"] },
  { prefix: "/patients/", permissions: ["patients.view"] },
  { prefix: "/billing/invoice/", permissions: ["billing.view"] },
];

export const hasPermission = (user?: AuthUser | null, required?: string[]) => {
  if (!required || required.length === 0) return true;
  const effectivePermissions = user?.permissions?.length ? user.permissions : rolePermissionFallback[user?.role || ""] || [];
  return required.some((permission) => effectivePermissions.includes(permission));
};

const hasNavAccess = (user: AuthUser | null | undefined, item: NavItem) => {
  if (!user) return false;
  const roleOkay = !item.roles || item.roles.includes(user.role);
  const permissionOkay = !item.permissions || hasPermission(user, item.permissions);
  const departmentOkay = !item.departments || item.departments.length === 0 || item.departments.some((department) => department.toLowerCase() === (user.department || "").toLowerCase()) || user.role === "Admin";
  return roleOkay && permissionOkay && departmentOkay;
};

export const getAllowedNavSections = (user?: AuthUser | null) =>
  navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasNavAccess(user, item)),
    }))
    .filter((section) => section.items.length > 0);

export const canAccessPath = (user: AuthUser | null | undefined, pathname: string) => {
  if (!user || user.status === "inactive") return false;
  const hidden = hiddenRouteAccess.find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}`));
  if (hidden) {
    return hasPermission(user, hidden.permissions);
  }
  const item = flattenNavItems().find((entry) => entry.to === "/" ? pathname === "/" : pathname === entry.to || pathname.startsWith(`${entry.to}/`));
  if (!item) return true;
  return hasNavAccess(user, item);
};

export const getDefaultPathForRole = (user?: AuthUser | null) => {
  if (!user) return "/login";
  return getAllowedNavSections(user)[0]?.items[0]?.to ?? "/";
};

export const getStaffWorkspaceProfile = (role?: string, department?: string): StaffWorkspaceProfile => {
  const normalizedRole = (role || "").toLowerCase();
  const roleKey = Object.keys(rolePermissionFallback).find((entry) => entry.toLowerCase() === normalizedRole);
  const permissions = roleKey ? rolePermissionFallback[roleKey] : [];

  const sectionNames = new Set<string>();
  const actionNames = new Set<string>();

  navSections.forEach((section) => {
    section.items.forEach((item) => {
      if (!item.permissions || item.permissions.some((permission) => permissions.includes(permission))) {
        sectionNames.add(item.label);
      }
    });
  });

  permissions.forEach((permission) => {
    const action = permissionActionLabels[permission];
    if (action) {
      actionNames.add(action);
    }
  });

  if (department) {
    sectionNames.add(department);
  }

  const tasks = roleTaskFallback[roleKey || role || ""] || ["Perform assigned clinic duties", "Update records in your section"];

  return {
    sections: Array.from(sectionNames).slice(0, 6),
    actions: Array.from(actionNames).slice(0, 6),
    tasks,
  };
};

const permissionActionLabels: Record<string, string> = {
  "patients.view": "View patient files",
  "patients.manage": "Update and remove patient records",
  "walkin.view": "Register and route walk-in patients",
  "triage.view": "Handle triage workflow",
  "emergency.view": "Handle emergency cases",
  "staff.view": "View staff directory",
  "staff.manage": "Create and remove staff records",
  "schedules.view": "View staff schedules",
  "records.view": "Open and review medical records",
  "forms.view": "Access clinic forms",
  "prescriptions.view": "Review prescriptions",
  "referrals.view": "Create and track referrals",
  "counseling.view": "Coordinate counseling workflows",
  "laboratory.view": "Process laboratory work",
  "radiology.view": "Process radiology work",
  "bloodbank.view": "Manage blood bank workflow",
  "pharmacy.view": "Manage drug inventory",
  "pharmacy.dispense": "Dispense prescriptions",
  "inventory.view": "Manage stock and inventory",
  "suppliers.view": "Manage suppliers",
  "wards.view": "Monitor wards and beds",
  "admissions.view": "Manage admissions",
  "billing.view": "View billing records",
  "billing.create": "Create invoices",
  "billing.payments": "Receive payments",
  "insurance.view": "Manage insurance claims",
  "mch.view": "Access MCH clinic",
  "art.view": "Access ART/HIV clinic",
  "dental.view": "Access dental clinic",
  "eye.view": "Access eye clinic",
  "sti.view": "Access STI clinic",
  "physio.view": "Access physiotherapy",
  "departments.manage": "Maintain departments",
  "attendance.view": "Monitor staff attendance",
  "users.manage": "Manage user accounts",
  "users.reset_password": "Reset user passwords",
  "audit.view": "Review audit logs",
  "audit.export": "Export audit logs",
  "reports.view": "View operational reports",
  "settings.view": "View system settings",
  "settings.manage": "Change system settings",
  "backup.export": "Export backups",
  "tariffs.manage": "Manage tariffs",
};

const roleTaskFallback: Record<string, string[]> = {
  Admin: [
    "Oversee clinic operations across all sections",
    "Manage users, settings, tariffs, and reports",
    "Review audit history and compliance activity",
    "Support section-level administration",
  ],
  Doctor: [
    "Review patients and complete consultations",
    "Order tests, referrals, and prescriptions",
    "Update clinical notes and patient records",
    "Support admissions, ward decisions, and specialist clinics",
  ],
  Nurse: [
    "Record vitals and complete triage assessments",
    "Monitor admitted patients and wards",
    "Update nursing observations and forms",
    "Support emergency and inpatient care",
  ],
  "MCH Nurse": [
    "Conduct antenatal care visits and record findings",
    "Administer vaccines and record immunization data",
    "Provide family planning counseling and services",
    "Monitor maternal and child health outcomes",
  ],
  Receptionist: [
    "Register patients and open visits",
    "Direct patients through clinic flow",
    "Prepare billing records at front desk",
    "Coordinate schedules and intake details",
  ],
  Cashier: [
    "Process patient payments and issue receipts",
    "Create billing invoices for services rendered",
    "Manage insurance claims and pre-authorizations",
    "Reconcile daily cash and payment records",
  ],
  "Records Clerk": [
    "Retrieve and file patient medical records",
    "Register new patients and maintain records",
    "Update patient demographic and contact information",
    "Support appointment scheduling and records requests",
  ],
  Pharmacist: [
    "Review and verify prescriptions before dispensing",
    "Dispense medications and provide patient counseling",
    "Track stock, suppliers, and inventory levels",
    "Maintain controlled drugs register and dispensing records",
  ],
  "Lab Technician": [
    "Receive and process diagnostic test requests",
    "Run tests and capture results accurately",
    "Support laboratory, radiology, and blood bank workflows",
    "Maintain diagnostic turnaround and quality records",
  ],
  Radiographer: [
    "Process radiology and imaging requests",
    "Perform X-rays, ultrasounds, and other imaging",
    "Record findings and report to requesting clinician",
    "Maintain radiation safety and equipment records",
  ],
  Counselor: [
    "Conduct individual and group counseling sessions",
    "Manage HIV, ART, and STI adherence counseling",
    "Coordinate mental health and psychosocial support",
    "Maintain confidential counseling records",
  ],
  Dentist: [
    "Conduct dental examinations and diagnoses",
    "Perform dental procedures and treatments",
    "Prescribe dental medications and follow-up plans",
    "Refer complex cases to specialist facilities",
  ],
  Optometrist: [
    "Conduct eye examinations and visual acuity tests",
    "Prescribe spectacles and manage eye conditions",
    "Refer pathological eye conditions to ophthalmology",
    "Maintain eye clinic records and follow-up schedules",
  ],
  Physiotherapist: [
    "Assess referred patients and create treatment plans",
    "Conduct physiotherapy sessions and document progress",
    "Design home exercise programs for patients",
    "Monitor recovery and adjust treatment plans accordingly",
  ],
};
