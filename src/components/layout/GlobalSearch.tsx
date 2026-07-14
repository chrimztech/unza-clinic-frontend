import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Activity, FileText, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { getAllowedNavSections, hasPermission } from "@/lib/navigation";
import { useAuth } from "@/context/AuthContext";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
}

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options?: { ctrl?: boolean; shift?: boolean; alt?: boolean }
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.key) return;
      const matchesKey = event.key.toLowerCase() === key.toLowerCase();
      const matchesCtrl = options?.ctrl ? event.ctrlKey || event.metaKey : true;
      const matchesShift = options?.shift ? event.shiftKey : true;
      const matchesAlt = options?.alt ? event.altKey : true;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [callback, key, options?.alt, options?.ctrl, options?.shift]);
}

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allItems, setAllItems] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;

    async function loadSearchItems() {
      const navigationItems = getAllowedNavSections(user).flatMap((section) =>
        section.items.map((item) => ({
          id: `nav-${item.to}`,
          title: item.label,
          subtitle: section.title,
          icon: item.icon,
          action: () => navigate(item.to),
          category: "Navigation",
        }))
      );

      try {
        const [patients, staff] = await Promise.all([api.patients.getAll(), api.staff.getAll()]);
        setAllItems([
          ...navigationItems,
          ...(hasPermission(user, ["patients.view"]) ? (patients || []).map((patient: any) => ({
            id: `patient-${patient.patient_id}`,
            title: patient.name,
            subtitle: `${patient.clinic_number || patient.patient_id} | ${patient.student_id || patient.man_number || patient.patient_type || "Patient"}`,
            icon: Users,
            action: () => navigate(`/patients/${patient.patient_id}`),
            category: "Patients",
          })) : []),
          ...(hasPermission(user, ["staff.view"]) ? (staff || []).map((member: any) => ({
            id: `staff-${member.staff_id}`,
            title: member.name,
            subtitle: `${member.staff_id}${member.man_number ? ` | ${member.man_number}` : ""} | ${member.department}`,
            icon: member.role?.toLowerCase().includes("doctor") ? Activity : FileText,
            action: () => navigate("/users"),
            category: "Staff",
          })) : []),
        ]);
      } catch {
        setAllItems(navigationItems);
      }
    }

    loadSearchItems();
  }, [navigate, open, user]);

  useEffect(() => {
    if (query.trim()) {
      const q = query.toLowerCase();
      setResults(allItems.filter((item) =>
        (item.title ?? "").toLowerCase().includes(q) ||
        (item.subtitle ?? "").toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q)
      ));
    } else {
      setResults(allItems.filter((item) => item.category === "Navigation").slice(0, 6));
    }
  }, [allItems, query]);

  const handleSelect = (result: SearchResult) => {
    result.action();
    setQuery("");
    onOpenChange(false);
  };

  const grouped = results.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Global Search</DialogTitle>
          <DialogDescription>Search patients, staff members, and clinic pages.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search patients, staff, pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus:ring-0 text-lg"
            autoFocus
          />
          <button onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">{category}</p>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <item.icon className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          ))}

          {results.length === 0 && query && (
            <div className="text-center py-8 text-gray-400">
              <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No results found for "{query}"</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-3 border-t text-xs text-gray-400">
          <span>Up/Down Navigate</span>
          <span>Enter Select</span>
          <span>Esc Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
