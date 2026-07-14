import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, Calendar, Pill, FlaskConical, CreditCard, CheckCircle, Trash2, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Notification {
  id: number;
  type: "alert" | "appointment" | "pharmacy" | "lab" | "billing" | "system" | "inventory";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  alert: AlertTriangle,
  appointment: Calendar,
  pharmacy: Pill,
  lab: FlaskConical,
  billing: CreditCard,
  system: Bell,
  inventory: Bell,
};

const typeColors: Record<string, string> = {
  alert: "bg-destructive/10 text-destructive",
  appointment: "bg-primary/10 text-primary",
  pharmacy: "bg-amber-100 text-amber-700",
  lab: "bg-violet-100 text-violet-700",
  billing: "bg-emerald-100 text-emerald-700",
  system: "bg-muted text-muted-foreground",
  inventory: "bg-orange-100 text-orange-700",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const loadNotifications = async () => {
    try {
      const data = await api.notifications.getAll();
      setNotifications(data.sort((a: Notification, b: Notification) => new Date(b.time).getTime() - new Date(a.time).getTime()));
    } catch {
      toast.error("Failed to load notifications");
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const filteredNotifications = useMemo(() => notifications.filter((notification) => {
    const matchesType = filter === "all" || notification.type === filter;
    const matchesSearch = notification.title.toLowerCase().includes(search.toLowerCase()) || notification.message.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  }), [filter, notifications, search]);

  const markAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to update notifications");
    }
  };

  const markRead = async (id: number) => {
    try {
      const updated = await api.notifications.update(id, { read: true });
      setNotifications((prev) => prev.map((n) => n.id === id ? updated : n));
    } catch {
      toast.error("Failed to update notification");
    }
  };

  const dismiss = async (id: number) => {
    try {
      await api.notifications.remove(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification removed");
    } catch {
      toast.error("Failed to remove notification");
    }
  };

  return (
    <div>
      <TopBar title="Notifications" subtitle={`${unread} unread notifications`} />
      <div className="pl-0 pr-6 pt-6 space-y-4 max-w-4xl">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-card p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold font-display text-card-foreground">{notifications.length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Unread</p>
            <p className="text-2xl font-bold font-display text-card-foreground">{unread}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Alerts</p>
            <p className="text-2xl font-bold font-display text-card-foreground">{notifications.filter((n) => n.type === "alert").length}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-1 gap-3">
            <Input placeholder="Search notifications..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="w-full sm:w-52">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="alert">Alerts</SelectItem>
                  <SelectItem value="appointment">Walk-In Visits</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadNotifications}>Refresh</Button>
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={unread === 0}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark All Read
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No notifications match your current filter.
            </div>
          ) : filteredNotifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            return (
              <div
                key={notification.id}
                className={cn("rounded-xl p-4 border border-border shadow-card flex gap-4 transition-colors cursor-pointer", notification.read ? "bg-card" : "bg-primary/[0.03] border-primary/20")}
                onClick={() => !notification.read && markRead(notification.id)}
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", typeColors[notification.type] || typeColors.system)}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-semibold text-card-foreground", !notification.read && "font-bold")}>{notification.title}</p>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{notification.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); dismiss(notification.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
