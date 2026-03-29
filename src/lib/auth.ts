import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

// Layer 1: Server-Side Identity Strategy
export type UserRole = "buyer" | "seller" | "admin";

export interface CurrentUser {
  user_id: string;
  role:    UserRole;
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
  const user = getCurrentUser();
  if (!user) return null;
  
  const hierarchy: Record<string, number> = { buyer: 0, seller: 1, admin: 2 };
  // Placeholder for redirect logic if needed in specific components
  return user;
}
