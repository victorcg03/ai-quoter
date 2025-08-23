// src/lib/store/fileStore.ts
import { randomUUID } from "node:crypto";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const PATH = "./data/quotes.json";
const DIR = dirname(PATH);
export const db = { quotes: [] as any[] };

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
if (existsSync(PATH))
  Object.assign(db, JSON.parse(readFileSync(PATH, "utf-8")));

export function saveQuote(proposal: any) {
  const id = randomUUID();
  db.quotes.push({ id, ...proposal, createdAt: Date.now() });
  writeFileSync(PATH, JSON.stringify(db, null, 2));
  return id;
}
export const getQuote = (id: string) => db.quotes.find((q) => q.id === id);
