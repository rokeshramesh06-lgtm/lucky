import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const SEED_MEMBERS = [
  "Aarav",
  "Diya",
  "Arjun",
  "Isha",
  "Kabir",
  "Meera",
  "Rohan",
  "Saanvi",
  "Vivaan",
  "Anaya",
];

const dataDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "lucky-draw.db");

type MemberRow = {
  id: number;
  name: string;
};

type DrawRow = {
  id: number;
  member_id: number;
  winner_name: string;
  created_at: string;
};

export type Member = {
  id: number;
  name: string;
};

export type LuckyDraw = {
  id: number;
  memberId: number;
  winnerName: string;
  createdAt: string;
};

declare global {
  var luckyDatabase: Database.Database | undefined;
}

function ensureDatabase() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!global.luckyDatabase) {
    global.luckyDatabase = new Database(databasePath);
    global.luckyDatabase.pragma("journal_mode = WAL");

    global.luckyDatabase.exec(`
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS draws (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(id)
      );
    `);

    const existingMemberCount = global.luckyDatabase
      .prepare("SELECT COUNT(*) as count FROM members")
      .get() as { count: number };

    if (existingMemberCount.count === 0) {
      const insertMember = global.luckyDatabase.prepare(
        "INSERT INTO members (name) VALUES (?)",
      );
      const seedMembers = global.luckyDatabase.transaction((names: string[]) => {
        names.forEach((name) => insertMember.run(name));
      });

      seedMembers(SEED_MEMBERS);
    }
  }

  return global.luckyDatabase;
}

function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
  };
}

function mapDraw(row: DrawRow): LuckyDraw {
  return {
    id: row.id,
    memberId: row.member_id,
    winnerName: row.winner_name,
    createdAt: row.created_at,
  };
}

export function getMembers() {
  const db = ensureDatabase();
  const rows = db
    .prepare("SELECT id, name FROM members ORDER BY id ASC")
    .all() as MemberRow[];

  return rows.map(mapMember);
}

export function getLatestDraw() {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT draws.id, draws.member_id, draws.created_at, members.name as winner_name
      FROM draws
      INNER JOIN members ON members.id = draws.member_id
      ORDER BY draws.id DESC
      LIMIT 1
    `)
    .get() as DrawRow | undefined;

  return row ? mapDraw(row) : null;
}

export function createLuckyDraw() {
  const db = ensureDatabase();
  const members = getMembers();

  if (members.length === 0) {
    throw new Error("No members available for the lucky draw.");
  }

  const winner = members[Math.floor(Math.random() * members.length)];
  const result = db
    .prepare("INSERT INTO draws (member_id) VALUES (?)")
    .run(winner.id);

  return {
    id: Number(result.lastInsertRowid),
    memberId: winner.id,
    winnerName: winner.name,
    createdAt: new Date().toISOString(),
  } satisfies LuckyDraw;
}

export function resetLuckyDraws() {
  const db = ensureDatabase();
  db.prepare("DELETE FROM draws").run();
}
