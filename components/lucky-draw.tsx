"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import styles from "./lucky-draw.module.css";

type Member = {
  id: number;
  name: string;
};

type Winner = {
  id: number;
  memberId: number;
  winnerName: string;
  createdAt: string;
} | null;

type LuckyDrawProps = {
  initialMembers: Member[];
  initialWinner: Winner;
};

const SPIN_DURATION_MS = 5200;

export function LuckyDraw({
  initialMembers,
  initialWinner,
}: LuckyDrawProps) {
  const [members] = useState(initialMembers);
  const [winner, setWinner] = useState<Winner>(initialWinner);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [status, setStatus] = useState(
    initialWinner
      ? `${initialWinner.winnerName} is the current lucky winner.`
      : "Press spin to reveal the lucky winner.",
  );

  const segmentAngle = 360 / members.length;

  const wheelBackground = useMemo(() => {
    const colors = [
      "#f7d58b",
      "#f2b999",
      "#d98370",
      "#8c4f4d",
      "#5e2f46",
      "#d9a441",
      "#f1c27d",
      "#e88873",
      "#b55d4c",
      "#6f3143",
    ];

    return `conic-gradient(from 0deg, ${members
      .map((_, index) => {
        const start = index * segmentAngle;
        const end = start + segmentAngle;

        return `${colors[index % colors.length]} ${start}deg ${end}deg`;
      })
      .join(", ")})`;
  }, [members, segmentAngle]);

  async function handleSpin() {
    if (isSpinning) {
      return;
    }

    setIsSpinning(true);
    setStatus("Spinning the wheel...");

    try {
      const response = await fetch("/api/lucky/draw", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to complete the lucky draw.");
      }

      const data = (await response.json()) as {
        winner: NonNullable<Winner>;
      };
      const winnerIndex = members.findIndex(
        (member) => member.id === data.winner.memberId,
      );

      if (winnerIndex < 0) {
        throw new Error("Winner was not found in the member list.");
      }

      const centerAngle = winnerIndex * segmentAngle + segmentAngle / 2;
      const targetRotation = 360 - centerAngle;

      setRotation((currentRotation) => {
        const currentOffset = ((currentRotation % 360) + 360) % 360;
        const delta = (targetRotation - currentOffset + 360) % 360;

        return currentRotation + 360 * 7 + delta;
      });

      window.setTimeout(() => {
        setWinner(data.winner);
        setStatus(`${data.winner.winnerName} is the lucky winner.`);
        setIsSpinning(false);
      }, SPIN_DURATION_MS);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Something went wrong.",
      );
      setIsSpinning(false);
    }
  }

  async function handleReset() {
    if (isSpinning) {
      return;
    }

    const response = await fetch("/api/lucky/reset", {
      method: "POST",
    });

    if (!response.ok) {
      setStatus("Unable to reset the lucky draw.");
      return;
    }

    setWinner(null);
    setRotation(0);
    setStatus("The draw has been reset. Spin again to choose a winner.");
  }

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Lucky Draw Experience</p>
          <h1>Spin the wheel and choose one lucky member.</h1>
          <p className={styles.description}>
            A polished Next.js experience with a SQLite-backed member list and
            saved winner selection.
          </p>
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={handleSpin}
              disabled={isSpinning}
            >
              {isSpinning ? "Spinning..." : "Spin the Wheel"}
            </button>
            <button
              className={styles.secondaryButton}
              onClick={handleReset}
              disabled={isSpinning}
            >
              Reset Draw
            </button>
          </div>
          <p className={styles.status}>{status}</p>
        </div>

        <div className={styles.stage}>
          <div className={styles.pointer} aria-hidden="true" />
          <div
            className={styles.wheel}
            style={{
              background: wheelBackground,
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.84, 0.18, 1)`
                : "none",
            }}
          >
            {members.map((member, index) => {
              const angle = index * segmentAngle + segmentAngle / 2;

              return (
                <div
                  key={member.id}
                  className={styles.label}
                  style={{ "--angle": `${angle}deg` } as CSSProperties}
                >
                  <span>{member.name}</span>
                </div>
              );
            })}
            <div className={styles.wheelCenter}>
              <span>Lucky</span>
              <strong>Draw</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.panelGrid}>
        <article className={styles.winnerCard}>
          <p className={styles.cardLabel}>Current Winner</p>
          <h2>{winner ? winner.winnerName : "Waiting for the next spin"}</h2>
          <p>
            {winner
              ? `Selected from ${members.length} members.`
              : "No winner has been selected yet."}
          </p>
        </article>

        <article className={styles.membersCard}>
          <div className={styles.cardHeader}>
            <p className={styles.cardLabel}>Members</p>
            <span>{members.length} total</span>
          </div>
          <div className={styles.memberList}>
            {members.map((member, index) => (
              <div key={member.id} className={styles.memberItem}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{member.name}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
