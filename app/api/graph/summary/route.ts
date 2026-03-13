import { NextResponse } from "next/server";

import { getGraphSummary } from "@/lib/server/repository";

export async function GET() {
  return NextResponse.json({ summary: getGraphSummary() });
}
