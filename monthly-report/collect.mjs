#!/usr/bin/env node
// AI活用の月次報告の材料を、この端末の Claude Code の記録（~/.claude/projects）から作る。
//
//   node collect.mjs --month YYYY-MM --out <材料.md> [--exclude-cwd <dir>]
//
// 出すのは、プロジェクト（作業フォルダの名前）ごとのセッション数・使った日数・動いていた時間・依頼の数と、
// 依頼の文の抜粋。材料は要約役の Claude に渡すためだけのもので、run.mjs が使い終わったら消す。
// 依頼の判定と時間の数え方（記録の間隔が5分以内ならつなぐ）は claude-toolkit の claude-usage に合わせている。
// 判定を変えるときは claude-usage の isHumanPrompt と揃える。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const month = opt("--month");
const out = opt("--out");
const exclude = opt("--exclude-cwd");
if (!/^\d{4}-\d{2}$/.test(month || "") || !out) {
  console.error("使い方: node collect.mjs --month YYYY-MM --out <材料.md> [--exclude-cwd <dir>]");
  process.exit(1);
}
const [y, m] = month.split("-").map(Number);
const from = new Date(y, m - 1, 1).getTime(); // 端末の現地時刻で月を切る
const to = new Date(y, m, 1).getTime();
const IDLE = 5 * 60 * 1000;
const MAX_PER_PROJECT = 60; // 1プロジェクトから渡す依頼の文の数
const MAX_CHARS = 200; // 依頼の文1件の長さ

const root = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "projects");
const norm = (p) => (p ? path.resolve(p).toLowerCase() : "");
const excl = norm(exclude);

function listJsonl(dir) {
  const res = [];
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return res; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "subagents") res.push(...listJsonl(p)); }
    else if (e.name.endsWith(".jsonl")) res.push(p);
  }
  return res;
}
// 作業フォルダの名前。Orca の作業場（~/orca/workspaces/<リポジトリ>/<作業場>）と Claude Code の worktree
// （<リポジトリ>/.claude/worktrees/<名前>）は作業場の名前ではなくリポジトリの名前で数える。
function lastPathPart(p) {
  let parts = String(p || "").split(/[\\/]+/).filter(Boolean);
  const o = parts.findIndex((x, i) => x.toLowerCase() === "orca" && parts[i + 1] === "workspaces");
  if (o >= 0 && parts.length > o + 2) parts = parts.length > o + 4 ? parts.slice(o + 4) : [parts[o + 2]];
  const w = parts.findIndex((x, i) => x === ".claude" && parts[i + 1] === "worktrees");
  if (w > 0) parts = parts.length > w + 3 ? [...parts.slice(0, w), ...parts.slice(w + 3)] : parts.slice(0, w);
  return parts[parts.length - 1] || "(不明)";
}
function promptText(r) {
  if (r.type !== "user" || r.isSidechain || r.isMeta || r.isCompactSummary) return null;
  if (r.turnOrigin && r.turnOrigin !== "human") return null;
  const c = r.message && r.message.content;
  let text = "";
  if (typeof c === "string") text = c;
  else if (Array.isArray(c)) {
    if (c.some((b) => b && b.type === "tool_result")) return null;
    text = c.filter((b) => b && b.type === "text").map((b) => b.text || "").join("");
    if (!text && c.some((b) => b && b.type === "image")) text = "(画像)";
    if (!text) return null;
  } else return null;
  const t = text.trimStart();
  if (t.startsWith("<local-command-") || t.startsWith("[Request interrupted")) return null;
  return t;
}

const seen = new Set();
const sessions = new Map(); // sid -> { cwd, ts: [], prompts: [[ts, text]] }
let earliest = Infinity;
for (const f of listJsonl(root)) {
  let text;
  try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (!r || typeof r !== "object") continue;
    if (r.uuid) { if (seen.has(r.uuid)) continue; seen.add(r.uuid); }
    const ts = r.timestamp ? Date.parse(r.timestamp) : NaN;
    if (Number.isNaN(ts)) continue;
    if (ts < earliest) earliest = ts;
    if (ts < from || ts >= to) continue;
    const sid = r.sessionId || path.basename(f, ".jsonl");
    let s = sessions.get(sid);
    if (!s) { s = { cwd: "", ts: [], prompts: [] }; sessions.set(sid, s); }
    if (r.cwd && !s.cwd) s.cwd = r.cwd;
    s.ts.push(ts);
    const p = promptText(r);
    if (p !== null) s.prompts.push([ts, p]);
  }
}

const projects = new Map();
for (const s of sessions.values()) {
  if (excl && norm(s.cwd) === excl) continue; // 月次報告を作る処理そのもの
  const name = lastPathPart(s.cwd);
  let P = projects.get(name);
  if (!P) { P = { sessions: 0, days: new Set(), ms: 0, prompts: [] }; projects.set(name, P); }
  P.sessions++;
  s.ts.sort((a, b) => a - b);
  for (let i = 0; i < s.ts.length; i++) {
    P.days.add(new Date(s.ts[i]).toDateString());
    if (i > 0 && s.ts[i] - s.ts[i - 1] <= IDLE) P.ms += s.ts[i] - s.ts[i - 1];
  }
  P.prompts.push(...s.prompts);
}

const allDays = new Set();
let totalMs = 0, totalPrompts = 0, totalSessions = 0;
for (const P of projects.values()) {
  P.days.forEach((d) => allDays.add(d));
  totalMs += P.ms; totalPrompts += P.prompts.length; totalSessions += P.sessions;
}
const fmtDate = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const hours = (ms) => (ms / 3600000).toFixed(1);

const L = [];
L.push(`# 材料 ${month}`, "");
L.push(`- 端末：${os.hostname()}`);
L.push(`- 対象：${month} の Claude Code の記録（端末の現地時刻）`);
L.push(`- この端末に残る最も古い記録：${earliest === Infinity ? "なし" : fmtDate(earliest)}${earliest > from && earliest !== Infinity ? "（月の初めの記録は消えている）" : ""}`);
L.push(`- 全体：使った日数 ${allDays.size} 日、セッション ${totalSessions} 件、動いていた時間 約 ${hours(totalMs)} 時間、依頼 ${totalPrompts} 件`);
L.push("");
const sorted = [...projects.entries()].sort((a, b) => b[1].ms - a[1].ms);
for (const [name, P] of sorted) {
  L.push(`## プロジェクト：${name}`, "");
  L.push(`- セッション ${P.sessions} 件、使った日数 ${P.days.size} 日、動いていた時間 約 ${hours(P.ms)} 時間、依頼 ${P.prompts.length} 件`);
  P.prompts.sort((a, b) => a[0] - b[0]);
  const step = Math.max(1, P.prompts.length / MAX_PER_PROJECT);
  const pick = [];
  for (let i = 0; i < P.prompts.length && pick.length < MAX_PER_PROJECT; i += step) pick.push(P.prompts[Math.floor(i)]);
  if (pick.length) {
    L.push(`- 依頼の文の抜粋（${pick.length} 件。報告に写さない）`);
    for (const [ts, t] of pick) {
      const one = t.replace(/\s+/g, " ").slice(0, MAX_CHARS);
      L.push(`  - ${fmtDate(ts)} ${one}`);
    }
  }
  L.push("");
}
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, L.join("\n"), "utf8");
console.log(JSON.stringify({ month, projects: projects.size, sessions: totalSessions, prompts: totalPrompts, hours: Number(hours(totalMs)) }));
