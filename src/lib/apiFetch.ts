// Layer 1: Core API Telemetry (Auto-Refresh Wrapper)
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  _retry?: boolean;
}

export async function apiFetch<T = unknown>(
  path:    string,
  options: FetchOptions = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  
  const res = await fetch(url, {
    ...options,
    credentials: "include", // Essential for HTTP-only cookie transmission
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Layer 2: Automated Identity Rotation (401 Interception)
  if (res.status === 401 && !options._retry) {
    const refreshed = await fetch(`${API}/auth/refresh`, {
      method:      "POST",
      credentials: "include",
    });

    if (refreshed.ok) {
      // Retry the original telemetry loop with new session authority
      return apiFetch<T>(path, { ...options, _retry: true });
    }

    // Refresh synchronization failed — terminate session
    if (typeof window !== "undefined") {
      window.location.href = "/login?expired=1";
    }
    throw new Error("Session expired. Identity rotation failed.");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown telemetry error" }));
    throw new Error(error.detail || `HTTP ${res.status} Error`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}
