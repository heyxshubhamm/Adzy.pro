'use server';

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createOrder(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    throw new Error("Unauthorized");
  }

  const gigId = formData.get("gigId") as string;
  const packageId = formData.get("packageId") as string | null;
  const targetUrl = formData.get("targetUrl") as string;
  const anchorText = formData.get("anchorText") as string;

  const response = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      gig_id: gigId,
      ...(packageId ? { package_id: packageId } : {}),
      anchor_text: anchorText,
      target_url: targetUrl,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      typeof errorData.detail === "string"
        ? errorData.detail
        : "Failed to place order"
    );
  }

  const order = await response.json();
  redirect(`/dashboard/orders?success=true&order_id=${order.id}`);
}
