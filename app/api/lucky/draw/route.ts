import { NextResponse } from "next/server";

import { createLuckyDraw, getLatestDraw, getMembers } from "@/lib/lucky-db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    members: getMembers(),
    winner: getLatestDraw(),
  });
}

export async function POST() {
  const members = getMembers();

  if (members.length === 0) {
    return NextResponse.json(
      { error: "No members are available for the draw." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    members,
    winner: createLuckyDraw(),
  });
}
