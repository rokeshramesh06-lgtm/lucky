import { NextResponse } from "next/server";

import { getMembers, resetLuckyDraws } from "@/lib/lucky-db";

export const dynamic = "force-dynamic";

export async function POST() {
  resetLuckyDraws();

  return NextResponse.json({
    members: getMembers(),
    winner: null,
  });
}
