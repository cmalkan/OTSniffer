import { NextResponse } from "next/server";

import { getAssets } from "@/lib/server/repository";

export async function GET() {
  return NextResponse.json({ assets: getAssets() });
}
