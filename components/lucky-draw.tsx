"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

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
const CELEBRATION_DURATION_MS = 4200;
const EMPTY_MEMBERS_MESSAGE =
  "The member list is unavailable right now. Check the deployed database configuration and try again.";

export function LuckyDraw({
  initialMembers,
  initialWinner,
}: LuckyDrawProps) {
  const [members] = useState(initialMembers);
  const [winner, setWinner] = useState<Winner>(initialWinner);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [status, setStatus] = useState(
    initialMembers.length === 0
      ? EMPTY_MEMBERS_MESSAGE
      : initialWinner
      ? `${initialWinner.winnerName} is the current lucky winner.`
      : "Press spin to reveal the lucky winner.",
  );
  const spinTimeoutRef = useRef<number | null>(null);
  const celebrationTimeoutRef = useRef<number | null>(null);

  const segmentAngle = members.length > 0 ? 360 / members.length : 0;
  const winnerId = winner?.memberId ?? null;

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

  function clearTimers() {
    if (spinTimeoutRef.current) {
      window.clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }

    if (celebrationTimeoutRef.current) {
      window.clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = null;
    }
  }

  function triggerCelebration() {
    setIsCelebrating(true);

    if (celebrationTimeoutRef.current) {
      window.clearTimeout(celebrationTimeoutRef.current);
    }

    celebrationTimeoutRef.current = window.setTimeout(() => {
      setIsCelebrating(false);
      celebrationTimeoutRef.current = null;
    }, CELEBRATION_DURATION_MS);
  }

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  async function handleSpin() {
    if (isSpinning) {
      return;
    }

    if (members.length === 0) {
      setStatus(EMPTY_MEMBERS_MESSAGE);
      return;
    }

    clearTimers();
    setIsCelebrating(false);
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

      spinTimeoutRef.current = window.setTimeout(() => {
        setWinner(data.winner);
        setStatus(`${data.winner.winnerName} is the lucky winner.`);
        setIsSpinning(false);
        spinTimeoutRef.current = null;
        triggerCelebration();
      }, SPIN_DURATION_MS);
    } catch (error) {
      clearTimers();
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

    if (members.length === 0) {
      setStatus(EMPTY_MEMBERS_MESSAGE);
      return;
    }

    const response = await fetch("/api/lucky/reset", {
      method: "POST",
    });

    if (!response.ok) {
      setStatus("Unable to reset the lucky draw.");
      return;
    }

    clearTimers();
    setIsCelebrating(false);
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
              disabled={isSpinning || members.length === 0}
            >
              {isSpinning ? "Spinning..." : "Spin the Wheel"}
            </button>
            <button
              className={styles.secondaryButton}
              onClick={handleReset}
              disabled={isSpinning || members.length === 0}
            >
              Reset Draw
            </button>
          </div>
          <p className={styles.status}>{status}</p>
        </div>

        <div
          className={[
            styles.stage,
            isSpinning ? styles.stageSpinning : "",
            isCelebrating ? styles.stageCelebrating : "",
          ].join(" ")}
        >
          <div className={styles.aura} aria-hidden="true" />
          {isCelebrating ? (
            <div className={styles.confettiField} aria-hidden="true">
              {Array.from({ length: 14 }).map((_, index) => (
                <span
                  key={index}
                  className={styles.confetti}
                  style={{ "--index": index } as CSSProperties}
                />
              ))}
            </div>
          ) : null}
          <div className={styles.pointer} aria-hidden="true" />
          <div
            className={[
              styles.wheel,
              isCelebrating ? styles.wheelCelebrating : "",
            ].join(" ")}
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
            <div
              className={[
                styles.wheelCenter,
                isSpinning ? styles.wheelCenterSpinning : "",
                isCelebrating ? styles.wheelCenterCelebrating : "",
              ].join(" ")}
            >
              <span>Lucky</span>
              <strong>Draw</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.panelGrid}>
        <article
          className={[
            styles.winnerCard,
            winner ? styles.winnerCardReady : "",
            isCelebrating ? styles.winnerCardCelebrating : "",
          ].join(" ")}
        >
          <div className={styles.winnerHeader}>
            <p className={styles.cardLabel}>Current Winner</p>
            <span
              className={[
                styles.winnerBadge,
                isCelebrating ? styles.winnerBadgeCelebrating : "",
              ].join(" ")}
            >
              {winner
                ? isCelebrating
                  ? "Fresh Winner"
                  : "Winner Saved"
                : "Awaiting Spin"}
            </span>
          </div>
          <h2 className={winner ? styles.winnerName : ""}>
            {winner ? winner.winnerName : "Waiting for the next spin"}
          </h2>
          <p className={styles.winnerDescription}>
            {members.length === 0
              ? "The wheel is disabled until the member list becomes available."
              : winner
              ? `${winner.winnerName} was selected from ${members.length} members.`
              : "No winner has been selected yet."}
          </p>
          {winner ? (
            <div className={styles.winnerSpotlight}>
              <span className={styles.spotlightLabel}>Lucky Crowned</span>
              <strong>{winner.winnerName}</strong>
              <small>
                The wheel stopped exactly on the winning segment.
              </small>
              <div className={styles.sparkGroup} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
        </article>

        <article className={styles.membersCard}>
          <div className={styles.cardHeader}>
            <p className={styles.cardLabel}>Members</p>
            <span>{members.length} total</span>
          </div>
          <div className={styles.memberList}>
            {members.length === 0 ? (
              <div className={styles.emptyState}>No members loaded.</div>
            ) : (
              members.map((member, index) => (
                <div
                  key={member.id}
                  className={[
                    styles.memberItem,
                    winnerId === member.id ? styles.memberItemWinner : "",
                  ].join(" ")}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{member.name}</strong>
                  {winnerId === member.id ? (
                    <em className={styles.memberWinnerTag}>Lucky Pick</em>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
