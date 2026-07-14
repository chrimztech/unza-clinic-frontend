import { useState, useEffect, useCallback } from "react";

const STORAGE_PREFIX = "unza-hms-";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(storageKey, JSON.stringify(valueToStore));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [storageKey, storedValue]);

  const clearValue = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
      setStoredValue(initialValue);
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  }, [storageKey, initialValue]);

  return [storedValue, setValue, clearValue] as const;
}

// Generate unique IDs
export function generateId(prefix: string = "ID"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format date/time
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  return `${hours}:${minutes}`;
}

export function formatDateTime(date: string | Date, time?: string): string {
  return time ? `${formatDate(date)} ${time}` : formatDate(date);
}

// Calculate waiting time
export function getWaitTime(checkIn: string): string {
  const checkInTime = new Date(`2000-01-01T${checkIn}`);
  const now = new Date();
  const diff = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);
  
  if (diff < 0) return "0 min";
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

// Validate forms
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  return /^[\d\s\+()-]{9,}$/.test(phone);
}

export function validateNRC(nrc: string): boolean {
  return /^\d{6}\/\d{1,2}\/\d$/.test(nrc);
}

// Search/filter helpers
export function searchFilter<T>(items: T[], query: string, fields: (keyof T)[]): T[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(item => 
    fields.some(field => {
      const value = item[field];
      return value && String(value).toLowerCase().includes(q);
    })
  );
}

// Sort helpers
export type SortOrder = "asc" | "desc";

export function sortBy<T>(items: T[], field: keyof T, order: SortOrder = "asc"): T[] {
  return [...items].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    if (aVal === bVal) return 0;
    const cmp = aVal < bVal ? -1 : 1;
    return order === "asc" ? cmp : -cmp;
  });
}

// Group helpers
export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const groupKey = String(item[key]);
    (acc[groupKey] = acc[groupKey] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// Export to CSV
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (!data.length) return;
  
  const cols = columns || Object.keys(data[0]).map(key => ({ key, label: String(key) }));
  const headers = cols.map(c => c.label).join(",");
  const rows = data.map(row => 
    cols.map(c => {
      const val = row[c.key];
      const str = String(val ?? "");
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(",")
  );
  
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Print helpers
export function printElement(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Print</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>${element.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Debounce helper
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}