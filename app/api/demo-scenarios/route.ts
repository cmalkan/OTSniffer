import { NextResponse } from "next/server";

import { getDemoScenarios } from "@/lib/server/repository";

export async function GET() {
  return NextResponse.json({ scenarios: getDemoScenarios() });
}
