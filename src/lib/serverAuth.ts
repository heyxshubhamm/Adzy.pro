import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtDecode } from "jwt-decode";

interface JWTPayload {
  sub: string;
  role: string;
  email: string;
  exp: number;
}

export async function getServerUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  try {
    const payload = jwtDecode<JWTPayload>(token);
    // Check expiry (client-side check only — FastAPI validates on API call)
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireServerUser(): Promise<JWTPayload> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireServerRole(role: "buyer" | "seller" | "admin"): Promise<JWTPayload> {
  const user = await requireServerUser();
  const hierarchy: Record<string, number> = { buyer: 0, seller: 1, admin: 2 };
  if (hierarchy[user.role] < hierarchy[role]) {
    redirect("/unauthorized");
  }
  return user;
}
