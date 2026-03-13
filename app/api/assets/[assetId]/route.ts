import { NextResponse } from "next/server";

import { getAssetById } from "@/lib/server/repository";

export async function GET(_: Request, { params }: { params: { assetId: string } }) {
  const asset = getAssetById(params.assetId);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  return NextResponse.json({ asset });
}
