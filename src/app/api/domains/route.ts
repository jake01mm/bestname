import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { initDatabase, getAvailableDomains } from "@/lib/database";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await initDatabase();
  const { searchParams } = new URL(req.url);
  const result = await getAvailableDomains({
    search: searchParams.get("search") || "",
    minScore: parseInt(searchParams.get("minScore") || "0"),
    sortBy: searchParams.get("sortBy") || "ai_score",
    sortOrder: searchParams.get("sortOrder") || "DESC",
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "50"),
  });
  return NextResponse.json(result);
}
