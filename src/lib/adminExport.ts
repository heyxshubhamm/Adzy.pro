export async function downloadCSV(
  endpoint: string,
  params:   Record<string, string> = {},
): Promise<void> {
  const qs  = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ""))
  ).toString();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${endpoint}${qs ? `?${qs}` : ""}`,
    { credentials: "include" }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Export failed: ${res.status}`);
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match       = disposition.match(/filename="(.+?)"/);
  const filename    = match?.[1] ?? "export.csv";

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
