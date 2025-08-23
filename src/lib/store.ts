// src/lib/store.ts
import { randomUUID } from "node:crypto";
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const PATH = "./data/quotes.json";
export const db = { quotes: [] as any[] };

if (existsSync(PATH)) Object.assign(db, JSON.parse(readFileSync(PATH,"utf-8")));
export function saveQuote(proposal: any) {
  const id = randomUUID();
  db.quotes.push({ id, ...proposal, createdAt: Date.now() });
  writeFileSync(PATH, JSON.stringify(db, null, 2));
  return id;
}
export function getQuote(id: string) { return db.quotes.find(q=>q.id===id); }
