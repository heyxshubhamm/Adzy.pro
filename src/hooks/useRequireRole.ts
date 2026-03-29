"use client";
import { useAuth, UserRole } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Layer 1: Client-Side Navigation Barrier
export function useRequireRole(requiredRole: UserRole) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    // Identify user standing for hierarchy-based routing
    const hierarchy: Record<UserRole, number> = { buyer: 0, seller: 1, admin: 2 };
    if (hierarchy[user.role] < hierarchy[requiredRole]) {
      if (user.role === "buyer" && requiredRole === "seller") {
        router.replace("/become-seller");
      } else {
        router.replace("/unauthorized");
      }
    }
  }, [user, loading, requiredRole, router]);

  return { user, loading };
}
