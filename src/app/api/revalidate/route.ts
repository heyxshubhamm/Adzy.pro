import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  // using process.env or a fallback to sync with backend caller
  if (secret !== (process.env.REVALIDATE_SECRET || "super-secret-key")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tags = body.tags ?? [];
  
  for (const tag of tags) {
    revalidateTag(tag, "");
  }

  return NextResponse.json({ revalidated: true, tags });
}
