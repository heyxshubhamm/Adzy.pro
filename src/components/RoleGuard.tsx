"use client";
import { useAuth } from "@/context/AuthContext";

// Layer 1: Component-Level Identity Gating
type Props = {
  allow:    ("buyer" | "seller" | "admin")[];
  fallback?: React.ReactNode;
  children:  React.ReactNode;
};

export function RoleGuard({ allow, fallback = null, children }: Props) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <>{fallback}</>;
  
  // Enforce role-based entry for marketplace participants
  if (!allow.includes(user.role)) return <>{fallback}</>;
  
  return <>{children}</>;
}
