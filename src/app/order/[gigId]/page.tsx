import { redirect, notFound } from "next/navigation";
import styles from "./OrderPage.module.css";
import { createOrder } from "./actions";
import { cookies } from "next/headers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Package {
  id: string;
  tier: string;
  name: string;
  price: number;
  delivery_days: number;
}

interface Gig {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  packages: Package[];
  seller?: { username: string } | null;
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ gigId: string }>;
}) {
  const { gigId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect(`/login?next=/order/${gigId}`);
  }

  const response = await fetch(`${API}/gigs/${gigId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) notFound();

  const gig: Gig = await response.json();

  const basicPkg =
    gig.packages.find((p) => p.tier === "basic") ?? gig.packages[0];

  return (
    <div className="container" style={{ paddingTop: "4rem", paddingBottom: "8rem" }}>
      <div className={styles.orderWrapper}>
        <div className={styles.orderCard}>
          <h1 className={styles.title}>Complete Your Order</h1>
          <p className={styles.subtitle}>
            You are purchasing <strong>{gig.title}</strong>
            {gig.seller?.username && ` by ${gig.seller.username}`}
          </p>

          {gig.packages.length > 1 && (
            <div className={styles.listingSummary}>
              {gig.packages.map((pkg) => (
                <div key={pkg.id} className={styles.summaryItem}>
                  <span>{pkg.name}</span>
                  <strong className={styles.price}>${pkg.price}</strong>
                </div>
              ))}
            </div>
          )}

          <form action={createOrder} className={styles.form}>
            <input type="hidden" name="gigId" value={gig.id} />
            <input type="hidden" name="packageId" value={basicPkg?.id ?? ""} />

            <div className={styles.inputGroup}>
              <label htmlFor="targetUrl">Your Target URL</label>
              <input
                type="url"
                name="targetUrl"
                id="targetUrl"
                placeholder="https://yourwebsite.com/article"
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="anchorText">Anchor Text</label>
              <input
                type="text"
                name="anchorText"
                id="anchorText"
                placeholder="e.g. best saas tools"
                required
              />
            </div>

            <div className={styles.paymentInfo}>
              <p>
                Package:{" "}
                <strong>
                  {basicPkg?.name ?? "Basic"} — ${basicPkg?.price ?? "—"}
                </strong>
              </p>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "1rem" }}
              >
                Confirm & Pay
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
