import type { AuthUser } from "@/lib/navigation";

export function getUserDisplayName(user?: AuthUser | null, fallback = "Clinic User") {
  return user?.name?.trim() || fallback;
}

export function getUserDepartment(user?: AuthUser | null, fallback = "Clinical") {
  return user?.department?.trim() || fallback;
}
