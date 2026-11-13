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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONF_DIR = path.join(os.homedir(), ".config", "crpc");
const CONF = path.join(CONF_DIR, "monthly-report.json");
const STATE_DIR = path.join(CONF_DIR, "monthly-report");
const STATE = path.join(STATE_DIR, "state.json");
const LOG = path.join(STATE_DIR, "run.log");
const LOCK = path.join(STATE_DIR, "run.lock");
const BOX_PARENT = "435463497599"; // Box: Projects/センター共通/AI活用/月次報告
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
const state = readJson(STATE, { uploaded: {} });
const saveState = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 2), "utf8");

const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const now = new Date();
const month = opt("--month") || ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
const monthJa = `${month.slice(0, 4)}年${Number(month.slice(5))}月`;
const today = `${ym(now)}-${String(now.getDate()).padStart(2, "0")}`;
const reportPath = (mo) => path.join(STATE_DIR, "reports", mo, `${conf.name}.md`);

if (has("--status")) {
  console.log(JSON.stringify({ config: conf, stateDir: STATE_DIR, uploaded: state.uploaded }, null, 2));
  const rd = path.join(STATE_DIR, "reports");
  for (const mo of fs.existsSync(rd) ? fs.readdirSync(rd).sort() : []) console.log(`${mo}: ${fs.existsSync(reportPath(mo)) ? "作成済み" : "なし"}${state.uploaded[mo] ? `・Box に置いた（${state.uploaded[mo]}）` : ""}`);
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
  const c = run(process.execPath, [path.join(HERE, "collect.mjs"), "--month", month, "--out", material, "--exclude-cwd", work]);
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
  const body = (r.stdout || "").trim();
  if (r.status !== 0 || !body.startsWith("# AI活用 月次報告") || !body.includes("## 7.")) {
    log(`報告を作れませんでした（終了コード ${r.status}）：${(r.stderr || body).trim().slice(0, 300)}`);
    return;
  }
  fs.mkdirSync(path.dirname(rp), { recursive: true });
  fs.writeFileSync(rp, body + "\n", "utf8");
  delete state.uploaded[month];
  saveState();
  log(`報告を作りました：${rp}`);
}

// 2. まだ置いていない報告を Box に置く
function box(boxArgs) {
  const b = conf.box || {};
  if (b.run) return run(conf.node || process.execPath, [b.run, ...boxArgs]); // node で直接起動（日本語の引数が崩れない）
  return run(b.cmd || "box", boxArgs);
}
function upload() {
  if (has("--no-upload")) return;
  const rd = path.join(STATE_DIR, "reports");
  const months = fs.existsSync(rd) ? fs.readdirSync(rd).filter((mo) => fs.existsSync(reportPath(mo)) && !state.uploaded[mo]).sort() : [];
  if (!months.length) return;
  const me = (() => { try { return box(["users:get", "me", "--json"]); } catch (e) { return { status: -1, stderr: String(e) }; } })();
  if (me.status !== 0) { log(`Box CLI が使えないので、報告は手元に置いたままにします（${STATE_DIR}）`); return; }
  for (const mo of months) {
    const items = box(["folders:items", BOX_PARENT, "--json"]);
    if (items.status !== 0) { log(`Box の月次報告フォルダを読めません：${(items.stderr || "").trim().slice(0, 200)}`); return; }
    let folder = JSON.parse(items.stdout).find((x) => x.type === "folder" && x.name === mo);
    if (!folder) {
      const cr = box(["folders:create", BOX_PARENT, mo, "--json"]);
      if (cr.status === 0) folder = JSON.parse(cr.stdout);
      else folder = JSON.parse(box(["folders:items", BOX_PARENT, "--json"]).stdout || "[]").find((x) => x.type === "folder" && x.name === mo); // 他の人が同時に作った
      if (!folder) { log(`Box に ${mo} のフォルダを作れません：${(cr.stderr || "").trim().slice(0, 200)}`); continue; }
    }
    const up = box(["files:upload", reportPath(mo), "--parent-id", folder.id, "--overwrite", "--json"]);
    if (up.status !== 0) { log(`${mo} を Box に置けません：${(up.stderr || "").trim().slice(0, 200)}`); continue; }
    state.uploaded[mo] = new Date().toISOString();
    saveState();
    log(`${mo} を Box に置きました（月次報告/${mo}/${conf.name}.md）`);
  }
}

try {
  generate();
  upload();
} catch (e) {
  log(`失敗：${e && e.stack ? e.stack.split("\n")[0] : e}`);
  process.exit(1);
}
