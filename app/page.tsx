import { LuckyDraw } from "@/components/lucky-draw";
import { getLatestDraw, getMembers } from "@/lib/lucky-db";

export const dynamic = "force-dynamic";

export default function Home() {
  const members = getMembers();
  const latestDraw = getLatestDraw();

  return <LuckyDraw initialMembers={members} initialWinner={latestDraw} />;
}
