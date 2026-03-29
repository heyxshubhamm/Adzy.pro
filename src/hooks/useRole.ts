"use client";
import { useAuth, UserRole } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const roleHierarchy: Record<UserRole, number> = {
  buyer: 0,
  seller: 1,
  admin: 2,
};

export function useRequireRole(requiredRole: UserRole) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(`/login?from=${window.location.pathname}`);
      return;
    }

    if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
      // If a buyer tries to access seller content, send them to onboarding
      if (user.role === "buyer" && requiredRole === "seller") {
        router.push("/become-seller");
      } else {
        router.push("/unauthorized");
      }
    }
  }, [user, loading, requiredRole, router]);

  return { user, loading };
}
