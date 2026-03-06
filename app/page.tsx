import { LuckyDraw } from "@/components/lucky-draw";
import {
  getLatestDraw,
  getMembers,
  type LuckyDraw as LuckyDrawResult,
  type Member,
} from "@/lib/lucky-db";

export const dynamic = "force-dynamic";

export default function Home() {
  let members: Member[] = [];
  let latestDraw: LuckyDrawResult | null = null;

  try {
    members = getMembers();
    latestDraw = getLatestDraw();
  } catch (error) {
    console.error("Failed to initialize lucky draw data.", error);
  }

  return <LuckyDraw initialMembers={members} initialWinner={latestDraw} />;
}
