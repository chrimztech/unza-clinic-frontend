import { cn } from "@/lib/utils";

type Status = "active" | "inactive" | "pending" | "completed" | "cancelled" | "critical" | "available" | "occupied" | "discharged" | "dispensed" | "in-progress" | "expired" | "reserved" | "rejected" | "accepted";

const statusStyles: Record<Status, string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  critical: "bg-destructive/10 text-destructive",
  available: "bg-success/10 text-success",
  occupied: "bg-warning/10 text-warning",
  discharged: "bg-info/10 text-info",
  dispensed: "bg-success/10 text-success",
  "in-progress": "bg-info/10 text-info",
  expired: "bg-destructive/10 text-destructive",
  reserved: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
  accepted: "bg-success/10 text-success",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", statusStyles[status])}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
