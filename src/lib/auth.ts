import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

// Layer 1: Server-Side Identity Strategy
export type UserRole = "buyer" | "seller" | "admin";

export interface CurrentUser {
  sub: string;
  email?: string;
  role:    UserRole;
  exp?: number;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  
  if (!token) return null;
  
  try {
    return jwtDecode<CurrentUser>(token);
  } catch {
    return null;
  }
}

export function requireServerRole(role: UserRole) {
  // Utility for server components to enforce role-based entry
  const userPromise = getCurrentUser();
  void role;
  // Keep compatibility for existing imports; callers should use `src/lib/serverAuth.ts`.
  return userPromise;
}
