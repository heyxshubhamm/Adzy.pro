import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import GigEditForm from "./GigEditForm";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function EditGigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) redirect("/login");

  const [gigRes, catRes] = await Promise.all([
    fetch(`${API}/gigs/${id}`, { headers: { Cookie: `access_token=${token}` }, cache: "no-store" }),
    fetch(`${API}/categories`, { cache: "no-store" }),
  ]);

  if (!gigRes.ok) notFound();

  const gig = await gigRes.json();
  const categories = catRes.ok ? await catRes.json() : [];

  return <GigEditForm gig={gig} categories={categories} />;
}
