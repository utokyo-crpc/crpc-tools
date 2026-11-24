#!/usr/bin/env node
// AI活用の月次報告を作って Box に置く。定期実行（毎日。register.py が登録する）と手での実行の両方の入口。
//
//   node run.mjs                     前月の報告が無ければ作り、まだ置いていない報告を Box に置く
//   node run.mjs --month 2026-11     月を指定する
//   node run.mjs --force             その月の報告を作り直す（置き直す）
//   node run.mjs --no-upload         作るだけで Box に置かない
//   node run.mjs --status            設定と、作った・置いた報告の一覧を出す
//
// 設定は ~/.config/crpc/monthly-report.json（register.py が書く）。報告と記録は ~/.config/crpc/monthly-report/ に置く。
// 毎日動くが、同じ月の報告は1回しか作らない。端末が月初めに起動していなかった月や、Box に置けなかった月は、次に動いたときに取り返す。
//
// 複数の端末を使う人の報告は、端末ごとに作って Box の月次報告/<月>/devices/<氏名>_<端末名>.md に置き、
// どれかの端末が動いたときに、そろった端末の分を1つにまとめて 月次報告/<月>/<氏名>.md に置く。
// まとめた報告の Box の説明欄に、まとめた端末の分の指紋を書いておき、端末の分が増えたり変わったりしたときだけまとめ直す。
// 端末が1台だけの人は、その端末の報告がそのまま <氏名>.md になる。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONF_DIR = process.env.CRPC_MONTHLY_HOME || path.join(os.homedir(), ".config", "crpc"); // 環境変数は試験用
const CONF = path.join(CONF_DIR, "monthly-report.json");
const STATE_DIR = path.join(CONF_DIR, "monthly-report");
const STATE = path.join(STATE_DIR, "state.json");
const LOG = path.join(STATE_DIR, "run.log");
const LOCK = path.join(STATE_DIR, "run.lock");
const BOX_PARENT = process.env.CRPC_MONTHLY_BOX_PARENT || "435463497599"; // Box: Projects/センター共通/AI活用/月次報告（環境変数は試験用）
const DEVICES = "devices"; // 端末ごとの報告を置くサブフォルダ（Windows の .cmd に日本語を渡せないので ASCII）
const HOST = (process.env.CRPC_MONTHLY_HOST || os.hostname()).replace(/\.local$/i, "").replace(/[^A-Za-z0-9-]+/g, "-").slice(0, 40) || "pc";
const FIRST_MONTH = "2026-11"; // 定期実行で作るのはこの月の分から（10月分は一回限りの指示で作った）

const args = process.argv.slice(2);
const has = (k) => args.includes(k);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };

fs.mkdirSync(STATE_DIR, { recursive: true });
const log = (msg) => {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + "\n", "utf8"); } catch {}
};
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return d; } };

const conf = readJson(CONF, null);
if (!conf || !conf.name) {
  log("設定がありません。crpc-tools の install.bat（Mac は install.command）をもう一度実行してください");
  process.exit(1);
}
const state = readJson(STATE, {});
state.uploaded ||= {}; // 端末の分を Box に置いた月
state.merged ||= {}; // <氏名>.md を置いたときの指紋
const saveState = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 2), "utf8");

const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const now = new Date();
const month = opt("--month") || ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
const monthJa = `${month.slice(0, 4)}年${Number(month.slice(5))}月`;
const today = `${ym(now)}-${String(now.getDate()).padStart(2, "0")}`;
const reportPath = (mo) => path.join(STATE_DIR, "reports", mo, `${conf.name}.md`);
const statsPath = (mo) => path.join(STATE_DIR, "reports", mo, `${conf.name}.stats.json`);
const STATS_RE = /\n?<!-- crpc-stats (\{.*?\}) -->\s*$/s;
const INCLUDED_RE = /\n?<!--\s*included:(.*?)-->\s*$/s;

if (has("--status")) {
  console.log(JSON.stringify({ config: conf, host: HOST, stateDir: STATE_DIR, uploaded: state.uploaded, merged: state.merged }, null, 2));
  const rd = path.join(STATE_DIR, "reports");
  for (const mo of fs.existsSync(rd) ? fs.readdirSync(rd).sort() : []) console.log(`${mo}: ${fs.existsSync(reportPath(mo)) ? "作成済み" : "なし"}${state.uploaded[mo] ? `・端末の分を Box に置いた（${state.uploaded[mo]}）` : ""}${state.merged[mo] ? `・${conf.name}.md を置いた（${state.merged[mo].at}）` : ""}`);
  process.exit(0);
}

// 二重起動を防ぐ（3時間より古いロックは前回の異常終了の残りとみなす）
try {
  const st = fs.statSync(LOCK);
  if (Date.now() - st.mtimeMs < 3 * 3600 * 1000) { log("別の実行が動いているので終わります"); process.exit(0); }
} catch {}
fs.writeFileSync(LOCK, String(process.pid));
process.on("exit", () => { try { fs.unlinkSync(LOCK); } catch {} });

// 外のコマンドを呼ぶ。Windows の .cmd は shell を通すしかないので、そのときは引数を ASCII に限る
function run(cmd, cmdArgs, { input, cwd, timeout = 120000 } = {}) {
  const isCmd = process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd);
  if (isCmd && cmdArgs.some((a) => /[^\x20-\x7e]/.test(a))) throw new Error(`非 ASCII の引数を ${cmd} に渡せない`);
  const q = (a) => (isCmd ? (a === "" ? '""' : /[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a) : a);
  const r = spawnSync(isCmd ? `"${cmd}"` : cmd, cmdArgs.map(q), {
    input, cwd, timeout, encoding: "utf8", shell: isCmd, windowsHide: true, maxBuffer: 64 * 1024 * 1024,
    env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("CLAUDE_CODE_") && k !== "CLAUDECODE")),
  });
  if (r.error) throw r.error;
  return r;
}

// 1. 報告を作る
function generate() {
  if (month < FIRST_MONTH && !opt("--month")) return;
  const rp = reportPath(month);
  if (fs.existsSync(rp) && !has("--force")) return;
  const work = path.join(STATE_DIR, "work");
  fs.mkdirSync(work, { recursive: true });
  const material = path.join(work, "material.md");
  const stats = path.join(work, "stats.json");
  const c = run(process.execPath, [path.join(HERE, "collect.mjs"), "--month", month, "--out", material, "--exclude-cwd", work, "--stats", stats]);
  if (c.status !== 0) { log(`材料を作れませんでした：${(c.stderr || "").trim()}`); return; }
  log(`材料 ${c.stdout.trim()}`);
  const prompt = fs.readFileSync(path.join(HERE, "prompt.md"), "utf8")
    .replaceAll("{NAME}", conf.name).replaceAll("{MONTH_JA}", monthJa).replaceAll("{TODAY}", today);
  const input = prompt + fs.readFileSync(material, "utf8");
  let r;
  try {
    r = run(conf.claude || "claude", ["-p", "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--output-format", "text"], { input, cwd: work, timeout: 20 * 60 * 1000 });
  } finally {
    try { fs.unlinkSync(material); } catch {} // 依頼の文の抜粋を手元に残さない
  }
  let body = (r.stdout || "").trim();
  const inc = body.match(INCLUDED_RE);
  if (r.status !== 0 || !body.startsWith("# AI活用 月次報告") || !body.includes("## 7.") || !inc) {
    log(`報告を作れませんでした（終了コード ${r.status}${inc ? "" : "・載せたプロジェクトの行が無い"}）：${(r.stderr || body).trim().slice(0, 300)}`);
    try { fs.unlinkSync(stats); } catch {}
    return;
  }
  body = body.replace(INCLUDED_RE, "").trim();
  // 載せたプロジェクトだけで、端末の集計（使った日付・件数・時間）を作る。まとめるときに日付の重なりを除くため
  const st = readJson(stats, { projects: {} });
  try { fs.unlinkSync(stats); } catch {}
  const names = inc[1].split("|").map((x) => x.trim()).filter(Boolean);
  // 使った日は、月の何日目かのビット（1日＝1）で持つ。報告と一緒に Box に置くので、日付の一覧そのものは載せない
  const agg = { host: HOST, earliest: st.earliest, dayBits: 0, sessions: 0, ms: 0, prompts: 0 };
  for (const n of names) {
    const P = st.projects[n];
    if (!P) { log(`載せたプロジェクト「${n}」が集計に無い（数えない）`); continue; }
    agg.sessions += P.sessions; agg.ms += P.ms; agg.prompts += P.prompts;
    for (const d of P.days) agg.dayBits |= 2 ** (Number(d.slice(8, 10)) - 1);
  }
  fs.mkdirSync(path.dirname(rp), { recursive: true });
  fs.writeFileSync(rp, body + "\n", "utf8");
  fs.writeFileSync(statsPath(month), JSON.stringify(agg), "utf8");
  delete state.uploaded[month];
  delete state.merged[month];
  saveState();
  log(`報告を作りました：${rp}`);
}

// 2. 端末の分を Box に置き、そろった端末の分を <氏名>.md にまとめる
function box(boxArgs) {
  const b = conf.box || {};
  if (b.run) return run(conf.node || process.execPath, [b.run, ...boxArgs]); // node で直接起動（日本語の引数が崩れない）
  return run(b.cmd || "box", boxArgs);
}
const items = (folderId) => {
  const r = box(["folders:items", folderId, "--fields", "name,sha1,description", "--json"]);
  if (r.status !== 0) throw new Error(`Box のフォルダ ${folderId} を読めません：${(r.stderr || "").trim().slice(0, 200)}`);
  return JSON.parse(r.stdout || "[]");
};
function ensureFolder(parent, name) {
  let f = items(parent).find((x) => x.type === "folder" && x.name === name);
  if (f) return f;
  const cr = box(["folders:create", parent, name, "--json"]);
  if (cr.status === 0) return JSON.parse(cr.stdout);
  f = items(parent).find((x) => x.type === "folder" && x.name === name); // 他の人が同時に作った
  if (!f) throw new Error(`Box にフォルダ ${name} を作れません：${(cr.stderr || "").trim().slice(0, 200)}`);
  return f;
}
const fileOf = (out) => { const o = JSON.parse(out); return Array.isArray(o) ? o[0] : o.entries ? o.entries[0] : o; };
function put(localPath, parentId, description) {
  const up = box(["files:upload", localPath, "--parent-id", parentId, "--overwrite", "--json"]);
  if (up.status !== 0) throw new Error(`${path.basename(localPath)} を Box に置けません：${(up.stderr || "").trim().slice(0, 200)}`);
  const f = fileOf(up.stdout);
  if (description !== undefined) {
    const d = box(["files:update", f.id, "--description", description]);
    if (d.status !== 0) log(`説明欄を書けません（次の実行でまとめ直す）：${(d.stderr || "").trim().slice(0, 200)}`);
  }
  return f;
}
const hours = (ms) => (ms / 3600000).toFixed(1);

// この端末の分を devices/<氏名>_<端末名>.md として置く（本文の末尾に集計を隠して付ける）
function uploadPart(mo, monthFolder) {
  const dev = ensureFolder(monthFolder.id, DEVICES);
  const agg = readJson(statsPath(mo), null);
  const part = path.join(STATE_DIR, "work", "parts", `${conf.name}_${HOST}.md`);
  fs.mkdirSync(path.dirname(part), { recursive: true });
  fs.writeFileSync(part, fs.readFileSync(reportPath(mo), "utf8").trimEnd() + (agg ? `\n\n<!-- crpc-stats ${JSON.stringify(agg)} -->\n` : "\n"), "utf8");
  try { put(part, dev.id); } finally { try { fs.unlinkSync(part); } catch {} }
  state.uploaded[mo] = new Date().toISOString();
  saveState();
  log(`${mo} のこの端末（${HOST}）の分を Box に置きました（月次報告/${mo}/${DEVICES}/${conf.name}_${HOST}.md）`);
}

// そろった端末の分を1つにまとめて <氏名>.md に置く。端末の分が前回まとめたときと同じなら何もしない
function syncMerged(mo, monthFolder) {
  const top = items(monthFolder.id);
  const dev = top.find((x) => x.type === "folder" && x.name === DEVICES);
  if (!dev) return;
  const parts = items(dev.id).filter((x) => x.type === "file" && x.name.startsWith(`${conf.name}_`) && x.name.endsWith(".md")).sort((a, b) => a.name.localeCompare(b.name));
  if (!parts.length) return;
  const sig = `parts:${parts.length}:` + crypto.createHash("sha1").update(parts.map((p) => `${p.name}:${p.sha1}`).join("\n")).digest("hex").slice(0, 16);
  const current = top.find((x) => x.type === "file" && x.name === `${conf.name}.md`);
  if (current && current.description === sig) return;
  const dir = path.join(STATE_DIR, "work", "merge");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  try {
    const got = parts.map((p, i) => {
      const dl = box(["files:download", p.id, "--destination", dir, "--save-as", `part${i}.md`, "--overwrite"]);
      if (dl.status !== 0) throw new Error(`${p.name} を読めません：${(dl.stderr || "").trim().slice(0, 200)}`);
      const text = fs.readFileSync(path.join(dir, `part${i}.md`), "utf8");
      const m = text.match(STATS_RE);
      return { name: p.name, body: text.replace(STATS_RE, "").trim(), stats: m ? JSON.parse(m[1]) : null };
    });
    let body;
    if (got.length === 1) body = got[0].body;
    else {
      let bits = 0, sessions = 0, ms = 0, prompts = 0, earliest = null, known = 0;
      for (const g of got) {
        if (!g.stats) continue;
        known++;
        bits |= g.stats.dayBits;
        sessions += g.stats.sessions; ms += g.stats.ms; prompts += g.stats.prompts;
        if (g.stats.earliest && (!earliest || g.stats.earliest < earliest)) earliest = g.stats.earliest;
      }
      const head = fs.readFileSync(path.join(HERE, "prompt.md"), "utf8").split(/\n# 材料\n/)[0];
      const fill = (t) => t.replaceAll("{NAME}", conf.name).replaceAll("{MONTH_JA}", `${mo.slice(0, 4)}年${Number(mo.slice(5))}月`).replaceAll("{TODAY}", today);
      const input = fill(fs.readFileSync(path.join(HERE, "merge-prompt.md"), "utf8")) + fill(head) +
        "\n---\n\n# 全端末を合わせた集計\n\n" +
        `- 端末：${got.length} 台${known < got.length ? `（うち ${got.length - known} 台は集計が無いので、その分は数字に入っていない）` : ""}\n` +
        `- 使った日数 ${bits.toString(2).replace(/0/g, "").length} 日（端末間の重なりを除く）、セッション ${sessions} 件、動いていた時間 約 ${hours(ms)} 時間、依頼 ${prompts} 件\n` +
        `- 端末に残る最も古い記録：${earliest || "不明"}\n\n# 端末ごとの報告\n\n` +
        got.map((g, i) => `## 端末 ${i + 1}\n\n${g.body.replace(/^#/gm, "###")}\n`).join("\n");
      const r = run(conf.claude || "claude", ["-p", "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--output-format", "text"], { input, cwd: dir, timeout: 20 * 60 * 1000 });
      body = (r.stdout || "").trim().replace(INCLUDED_RE, "").trim();
      if (r.status !== 0 || !body.startsWith("# AI活用 月次報告") || !body.includes("## 7.")) {
        log(`${mo} の端末 ${got.length} 台分をまとめられませんでした（終了コード ${r.status}）：${(r.stderr || body).trim().slice(0, 300)}`);
        return;
      }
    }
    const merged = path.join(dir, `${conf.name}.md`);
    fs.writeFileSync(merged, body + "\n", "utf8");
    put(merged, monthFolder.id, sig);
    state.merged[mo] = { at: new Date().toISOString(), devices: got.length, sig };
    saveState();
    log(`${mo} の ${conf.name}.md を置きました（端末 ${got.length} 台分）`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true }); // 端末の分の写しを手元に残さない
  }
}

function upload() {
  if (has("--no-upload")) return;
  const rd = path.join(STATE_DIR, "reports");
  const pending = fs.existsSync(rd) ? fs.readdirSync(rd).filter((mo) => fs.existsSync(reportPath(mo)) && !state.uploaded[mo]).sort() : [];
  // まとめ直しを確かめるのは、今回置いた月と、前月（ほかの端末が後から置くことがある）
  const check = [...new Set([...pending, ...(fs.existsSync(reportPath(month)) ? [month] : [])])].sort();
  if (!check.length) return;
  const me = (() => { try { return box(["users:get", "me", "--json"]); } catch (e) { return { status: -1, stderr: String(e) }; } })();
  if (me.status !== 0) { log(`Box CLI が使えないので、報告は手元に置いたままにします（${STATE_DIR}）`); return; }
  for (const mo of check) {
    try {
      const monthFolder = ensureFolder(BOX_PARENT, mo);
      if (pending.includes(mo)) uploadPart(mo, monthFolder);
      syncMerged(mo, monthFolder);
    } catch (e) { log(`${mo}：${e.message}`); }
  }
}

try {
  generate();
  upload();
} catch (e) {
  log(`失敗：${e && e.stack ? e.stack.split("\n")[0] : e}`);
  process.exit(1);
}
