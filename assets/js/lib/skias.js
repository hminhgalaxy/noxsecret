/* Skias — quả cầu vàng mặt cười biết nói của website (vẽ hoàn toàn bằng code, không dùng tệp ảnh). Chào mỗi lần vào web, trả lời
   câu hỏi (Việt/Anh) từ kho câu trả lời có sẵn, có hiệu ứng "đang suy nghĩ", chớp mắt, gõ chữ; bấm "Dừng" để ngắt bất cứ lúc nào.
   Khi bạn nhờ (hoặc đồng ý sau khi Skias phát hiện lỗi) Skias xem xét tình trạng rồi gửi thẳng cho dev qua khung chat.
   Có chế độ "Skias AI" (dùng puter.js) cho mọi người dùng — Puter có thể mở cửa sổ nhỏ để đăng nhập Puter lần đầu. Không có gợi ý/mẹo tự bật ra.
   Toàn bộ nội dung đánh dấu translate="no" vì tự mình có cả hai ngôn ngữ. Tắt/bật trong Cài đặt. */
import { getLang, onLangChange } from "./i18n.js";
import { session, onAuth } from "./auth.js";
import { answer, detectLang } from "./skias-brain.js";
import { md, mdPartial } from "./skias-md.js";
import { isSkiasOn, setSkiasOn } from "./prefs.js";
import { logs, onLog } from "./log.js";
import { RM, esc, toast } from "./util.js";
import { navigate } from "./router.js";
import { db } from "./firebase.js";
import * as H from "./help.js";

const L = (vi, en) => (getLang() === "vi" ? vi : en);
const real = () => !!(session.user && !session.isGuest && !session.user.isAnonymous);
let root, fig, bubble, panel, logEl, form, input, chips, subEl, btnAuto, btnAI, btnSend, modesEl, downEl;
let wired = false, open = false, state = "idle", stT = 0, hideT = 0, peekT = 0, busy = false, job = null, mode = "", ai = false, stick = true;
let sends = 0, lastSend = 0, offered = 0, greeted = false, opened = false;
const hist = [], seenErr = new Set(), wait = ms => new Promise(r => setTimeout(r, RM() ? Math.min(ms, 80) : ms)), sleep = ms => new Promise(r => setTimeout(r, ms));

/* ───── Quả cầu vàng mặt cười (SVG vẽ bằng code): mắt bầu dục đen, nụ cười rộng, chớp mắt, nhìn quanh ───── */
const FIG = `<svg class="sk-svg" viewBox="0 0 120 124" width="100%" height="100%" aria-hidden="true" focusable="false">
  <defs><radialGradient id="skgB" cx="36%" cy="26%" r="86%"><stop offset="0" stop-color="#fff7b0"/><stop offset=".34" stop-color="#ffdc34"/><stop offset=".78" stop-color="#f7ae08"/><stop offset="1" stop-color="#e08a00"/></radialGradient></defs>
  <ellipse class="sk-shadow" cx="60" cy="117" rx="32" ry="4.6"/>
  <g class="sk-all"><g class="sk-head">
    <circle class="sk-face" cx="60" cy="60" r="52" fill="url(#skgB)"/>
    <ellipse class="sk-shine" cx="39" cy="28" rx="17" ry="9" transform="rotate(-32 39 28)"/>
    <ellipse class="sk-blush" cx="26" cy="76" rx="8.5" ry="5"/><ellipse class="sk-blush" cx="94" cy="76" rx="8.5" ry="5"/>
    <g class="sk-eyes">
      <g class="sk-eye"><ellipse class="sk-ball" cx="42" cy="47" rx="7" ry="12.5"/><circle class="sk-glint" cx="40" cy="41.5" r="2.3"/></g>
      <g class="sk-eye"><ellipse class="sk-ball" cx="78" cy="47" rx="7" ry="12.5"/><circle class="sk-glint" cx="76" cy="41.5" r="2.3"/></g>
      <path class="sk-joy" d="M32 52 Q42 37 52 52"/><path class="sk-joy" d="M68 52 Q78 37 88 52"/>
    </g>
    <path class="sk-m sk-mSmile" d="M28 71 Q60 103 92 71"/><path class="sk-m sk-mFlat" d="M42 84 Q58 79 78 85"/><path class="sk-m sk-mOpen" d="M33 71 Q60 109 87 71 Q60 78 33 71Z"/>
  </g></g></svg>`;
const CLOUD = `<span class="sk-cloud" aria-hidden="true"><i class="sk-c1"></i><i class="sk-c2"></i><span class="sk-c3"><b></b><b></b><b></b></span></span>`;
const ICON = {
  neu: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  off: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.7 10.7 0 0 1 12 19.5C6 19.5 2 12 2 12a18.7 18.7 0 0 1 4.1-5.1M9.9 4.6A9.7 9.7 0 0 1 12 4.5c6 0 10 7.5 10 7.5a18.6 18.6 0 0 1-2.2 3.2M1 1l22 22"/></svg>',
  min: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  send: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  stop: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7"/></svg>'
};

function setState(s, ms = 0) {
  clearTimeout(stT); state = s; if (root) root.dataset.st = s;
  if (ms) stT = setTimeout(() => { if (!busy) setState("idle"); }, ms);
}

/* ───── Bong bóng nói (khung mờ, không lộ chữ phía sau) ───── */
function bub(html, { ms = 9000, st = "talk", actions = null } = {}) {
  if (!bubble || open) return;
  bubble.innerHTML = `<button class="sk-bx" type="button" aria-label="${L("Đóng", "Close")}">×</button><div class="sk-bt">${html}</div>${actions ? `<div class="sk-ba">${actions.map((a, i) => `<button type="button" class="sk-btn${a.primary ? " pri" : ""}" data-i="${i}">${esc(a.label)}</button>`).join("")}</div>` : ""}`;
  bubble.hidden = false; requestAnimationFrame(() => bubble.classList.add("on"));
  bubble.querySelector(".sk-bx").onclick = e => { e.stopPropagation(); hideBub(); };
  bubble.querySelectorAll("[data-i]").forEach(b => b.onclick = e => { e.stopPropagation(); hideBub(); actions[+b.dataset.i].run(); });
  if (st) setState(st, Math.min(ms || 2600, 2600));
  clearTimeout(hideT); if (ms) hideT = setTimeout(hideBub, ms);
}
function hideBub() { if (!bubble) return; clearTimeout(hideT); bubble.classList.remove("on"); setTimeout(() => { if (!bubble.classList.contains("on")) bubble.hidden = true; }, 200); }
const two = (vi, en) => (getLang() === "vi" ? `<span>${esc(vi)}</span><small>${esc(en)}</small>` : `<span>${esc(en)}</span><small>${esc(vi)}</small>`);

/* Chào mỗi lần vào web: dòng chính theo ngôn ngữ giao diện, dòng nhỏ là bản dịch (Anh ↔ Việt) */
function greet() {
  if (greeted || !isSkiasOn()) return; greeted = true;
  bub(two("Xin chào! Mình là Skias, bạn cần gì cứ hỏi mình nhé 👋", "Hi! I'm Skias — ask me anything about the site 👋"), { ms: 8000, st: "wave" });
  setState("wave", 3200);
}

/* ───── Khung trò chuyện ───── */
const clock = () => { try { return new Date().toLocaleTimeString(getLang() === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit" }); } catch (_) { return ""; } };
const follow = (force = false) => { if (!logEl) return; if (force) stick = true; if (stick) logEl.scrollTop = logEl.scrollHeight; paintDown(); };
function paintDown() { if (!downEl || !logEl) return; const far = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight > 90; downEl.hidden = !far; }
/* who: "bot" (Skias) hoặc "usr" (người dùng). Lưu ý: KHÔNG dùng tên lớp "me"/"sk" vì trùng với CSS của các phần khác của web. */
function addMsg(who, html, extra = "") {
  const d = document.createElement("div"); d.className = "sk-m-row " + who;
  d.innerHTML = (who === "bot" ? `<span class="sk-mav" aria-hidden="true"></span>` : "") + `<div class="sk-col"><div class="sk-msg">${html}</div>${extra}<time class="sk-t">${esc(clock())}</time></div>`;
  logEl.appendChild(d); follow(who === "usr"); return d;
}
/* Dòng ghi chú nhỏ ở giữa (đổi chế độ, đã dừng…) */
function note(text) { const d = document.createElement("div"); d.className = "sk-m-row sys"; d.innerHTML = `<span class="sk-note">${esc(text)}</span>`; logEl.appendChild(d); follow(); return d; }
const linksHTML = go => go && go.length ? `<div class="sk-go">${go.map(g => `<a href="${esc(g.href)}" data-sk-go>${esc(g.label)}<span aria-hidden="true"> →</span></a>`).join("")}</div>` : "";
/* Chỉ còn nút HÀNH ĐỘNG (Gửi dev / Hủy), không còn nút câu hỏi gợi ý */
function setChips(list) {
  chips.innerHTML = (list || []).map(c => `<button type="button" class="sk-chip${c.pri ? " pri" : ""}" data-k="${esc(c.k)}">${esc(c.label)}</button>`).join(""); chips.hidden = !list || !list.length;
  chips.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { const c = list.find(x => x.k === b.dataset.k); if (c) c.run(); }));
}
const devChip = (text = "") => ({ k: "dev", pri: true, label: L("Gửi dev", "Send to dev"), run: () => startReport(text) });
const typing = () => addMsg("bot", `<span class="sk-dots" role="img" aria-label="${esc(L("Skias đang soạn tin", "Skias is typing"))}"><i></i><i></i><i></i></span>`);

/* ───── Một "công việc" đang chạy (suy nghĩ, gọi AI, gõ chữ, xem xét lỗi): có thể NGẮT bất cứ lúc nào ───── */
const alive = j => job === j && !j.dead;
function begin(sub) { const j = { dead: false, lock: false, onStop: null, stopNote: "" }; job = j; busy = true; setBusy(true, sub); return j; }
function end(j) { if (job === j) { job = null; busy = false; setBusy(false); } }
function setBusy(on, sub) {
  if (!btnSend) return; root.dataset.busy = on ? "1" : ""; btnSend.classList.toggle("stop", on); btnSend.innerHTML = on ? ICON.stop : ICON.send;
  btnSend.setAttribute("aria-label", on ? L("Dừng", "Stop") : L("Gửi", "Send")); btnSend.title = on ? L("Dừng (Esc)", "Stop (Esc)") : L("Gửi", "Send"); paintSub(on ? sub : "");
}
function stop() {
  const j = job; if (!j || j.lock) return false;
  j.dead = true; try { j.onStop && j.onStop(); } catch (_) {}
  end(j); setState("idle"); note(j.stopNote || L("Đã dừng.", "Stopped.")); input && input.focus({ preventScroll: true }); return true;
}
/* Hiện câu trả lời dần dần (như đang gõ), hiểu Markdown; có thể dừng giữa chừng. Trả về true nếu hiện đủ. */
async function reveal(j, { text, extra = "", tag = "" }) {
  const full = String(text || "").slice(0, 4000), row = addMsg("bot", ""), box = row.querySelector(".sk-msg"), col = row.querySelector(".sk-col"), fin = () => { box.innerHTML = md(full) + tag; };
  setState("talk"); paintSub(L("Đang trả lời…", "Answering…"));
  if (!RM() && full.length > 3) {
    const step = Math.max(2, Math.ceil(full.length / 70));
    for (let n = step; n < full.length; n += step) {
      if (!alive(j)) { box.innerHTML = md(full.slice(0, n)) + `<span class="sk-cut">…</span>`; return false; }
      box.innerHTML = mdPartial(full.slice(0, n)) + `<i class="sk-caret"></i>`; follow(); await sleep(16);
    }
    if (!alive(j)) { box.innerHTML = md(full.slice(0, Math.ceil(full.length / 2))) + `<span class="sk-cut">…</span>`; return false; }
  }
  fin(); if (extra) col.querySelector(".sk-msg").insertAdjacentHTML("afterend", extra); follow(); return true;
}

/* ───── Chế độ Skias AI (puter.js) — dành cho mọi người dùng ───── */
let puterP = null;
function loadPuter() {
  if (window.puter && window.puter.ai) return Promise.resolve(window.puter);
  if (puterP) return puterP;
  puterP = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = "https://js.puter.com/v2/"; s.async = true;
    const fail = e => { puterP = null; s.remove(); rej(e); };
    s.onload = () => { window.puter && window.puter.ai ? res(window.puter) : fail(new Error("puter")); };
    s.onerror = () => { fail(new Error("load")); };
    document.head.appendChild(s);
  });
  return puterP;
}
const SYS = "You are Skias, the friendly assistant of the website Skibidi Web (also called Skibidi Shop): a digital shop where users top up a wallet by bank transfer (the admin sends a QR code for each top-up invoice, minimum 2,000 VND, processed manually) and buy products delivered instantly in their order, plus a free content library. Answer briefly and kindly in the same language as the user (Vietnamese or English). You may use simple Markdown (bold, short lists). Speak plainly: do not use technical jargon (no talk of databases, servers, APIs, tokens, code or developer tools). Never ask for passwords or one-time codes, and never reveal or guess other people's information.";
const textOf = r => { if (r == null) return ""; if (typeof r === "string") return r; const c = r.message ? r.message.content : r.content != null ? r.content : r.text; if (typeof c === "string") return c; if (Array.isArray(c)) return c.map(x => (typeof x === "string" ? x : x && x.text) || "").join(""); return typeof r.toString === "function" && r.toString !== Object.prototype.toString ? String(r) : ""; };
async function askAI(text) {
  const j = begin(L("Skias AI đang nghĩ…", "Skias AI is thinking…")), ty = typing(); j.onStop = () => ty.remove(); setState("think");
  let out = "";
  try {
    const p = await loadPuter();
    if (!alive(j)) return;
    const msgs = [{ role: "system", content: SYS }].concat(hist, [{ role: "user", content: text }]); /* không giới hạn thời gian trả lời và không cắt lịch sử: chờ bao lâu cũng được, nút Dừng luôn ở đó */
    out = textOf(await p.ai.chat(msgs)).trim();
    if (!out) throw new Error("empty");
  } catch (e) {
    if (!alive(j)) return;
    ty.remove(); end(j); setState("idle");
    addMsg("bot", `⚠️ ${esc(L("Skias AI chưa trả lời được. Có thể Puter cần bạn đăng nhập Puter (cửa sổ nhỏ hiện ra) hoặc đang bị chặn/mất mạng. Bạn thử lại hoặc chuyển về chế độ Tự động.", "Skias AI couldn't answer. Puter may need you to sign in to Puter (a small window opens), or it is blocked/offline. Try again or switch back to Auto mode."))}`);
    return;
  }
  if (!alive(j)) return;
  ty.remove(); hist.push({ role: "user", content: text }, { role: "assistant", content: out });
  const done = await reveal(j, { text: out, tag: `<div class="sk-tag">✨ Skias AI</div>` });
  end(j); setState("talk", done ? 1800 : 0);
}
function paintSub(s) { if (!subEl) return; subEl.querySelector(".sk-subt").textContent = s || (ai ? L("Đang dùng Skias AI", "Using Skias AI") : L("Trợ lý của Skibidi Web", "Skibidi Web assistant")); subEl.classList.toggle("busy", !!s); }
function paintModes() {
  if (!btnAuto) return;
    modesEl.dataset.m = ai ? "ai" : "auto";
  btnAuto.classList.toggle("on", !ai); btnAuto.setAttribute("aria-pressed", String(!ai));
  btnAI.classList.toggle("on", ai); btnAI.setAttribute("aria-pressed", String(ai)); btnAI.classList.remove("locked"); btnAI.removeAttribute("aria-disabled");
  btnAuto.innerHTML = `<span aria-hidden="true">💬</span> ${esc(L("Tự động", "Auto"))}`;
  btnAI.innerHTML = `<span aria-hidden="true">✨</span> Skias AI`;
  btnAI.title = L("Trò chuyện với trí tuệ nhân tạo", "Chat with the AI");
  root.classList.toggle("ai", ai); paintSub(busy && job ? subEl.querySelector(".sk-subt").textContent : "");
  input.placeholder = ai ? L("Hỏi Skias AI bất cứ điều gì…", "Ask Skias AI anything…") : L("Hỏi Skias điều gì đó…", "Ask Skias something…");
}
function pickMode(wantAI) {
  if (!!wantAI === ai) return;
  if (busy && !stop()) return;
  ai = !!wantAI; paintModes();
  note(ai ? L("✨ Đã bật Skias AI — hỏi mình bất cứ điều gì.", "✨ Skias AI is on — ask me anything.") : L("💬 Đã về chế độ Tự động.", "💬 Back to Auto mode."));
  input.focus({ preventScroll: true });
}

async function ask(text) {
  text = String(text || "").trim(); if (!text || busy) return;
  addMsg("usr", esc(text)); setChips([]);
  if (mode === "report") { mode = ""; return sendReport(text); }
  if (ai) return askAI(text);
  const r = answer(text, { ui: getLang() });
  const j = begin(L("Skias đang nghĩ…", "Skias is thinking…")), ty = typing(); j.onStop = () => ty.remove(); setState("think");
  await wait(Math.min(1500, 450 + text.length * 14));
  if (!alive(j)) return;
  ty.remove();
  if (!r) { end(j); setState("idle"); return; }
  if (r.kind === "report") { end(j); setState("idle"); return startReport(text.length >= 25 ? text : ""); }
  const done = await reveal(j, { text: r.text, extra: linksHTML(r.go) });
  end(j); setState("talk", done ? 1800 : 0);
  if (done) setChips(r.report ? [{ ...devChip(r.kind === "unknown" ? text : ""), label: r.lang === "vi" ? "Gửi dev" : "Send to dev" }] : []);
}

/* ───── Xem xét lỗi + gửi dev ───── */
const IGNORE = /ResizeObserver|Script error\.?$|Non-Error promise|chrome-extension|moz-extension|Loading chunk|Load failed|cancel/i;
async function collect(desc, err) {
  const errs = logs.filter(l => l.type === "er" && !IGNORE.test(l.msg)).slice(0, 5);
  let srv = null;
  try { const { api } = await import("./account.js"); srv = await Promise.race([api("status", {}, { token: false }), new Promise(r => setTimeout(() => r(null), 3500))]); } catch (_) {}
  const hints = [];
  if (!navigator.onLine) hints.push("Máy người dùng đang offline.");
  if (errs.length || err) hints.push((errs.length || 1) + " lỗi JavaScript gần đây trên trang.");
  if (srv && srv.ok) { if (srv.admin === false) hints.push("Máy chủ CHƯA nhận Firebase Admin."); if (srv.mail === false) hints.push("Máy chủ chưa cấu hình gửi email."); if (srv.shop === false) hints.push("Cấu hình ngân hàng của cửa hàng chưa có."); }
  else if (srv && srv.ok === false) hints.push("Máy chủ /api trả lỗi khi kiểm tra trạng thái.");
  else if (!srv) hints.push("Không kiểm tra được trạng thái máy chủ (chậm hoặc không phản hồi).");
  const d = document.documentElement.dataset, flag = v => (v === true ? "✓" : v === false ? "✗" : "?");
  const lines = ["👀 Skias báo từ người dùng", "Nội dung: " + String(desc || "(không có mô tả)").slice(0, 700),
    "Trang: " + location.pathname, "Nhận định của Skias: " + (hints.length ? hints.map(x => "• " + x).join(" ") : "chưa thấy dấu hiệu lỗi rõ ràng phía trình duyệt/máy chủ."),
    errs.length || err ? "Lỗi gần đây: " + (err ? [err] : errs.map(e => e.msg)).concat(err ? errs.map(e => e.msg) : []).slice(0, 4).map(x => "[" + String(x).slice(0, 140) + "]").join(" ") : "",
    "Môi trường: " + (navigator.onLine ? "online" : "offline") + " · " + innerWidth + "×" + innerHeight + "@" + (devicePixelRatio || 1) + " · lang " + getLang() + " · skin " + (d.skin || "-") + " · gfx " + (d.gfx || "-"),
    srv && srv.ok ? "Máy chủ: mail " + flag(srv.mail) + " · 2FA " + flag(srv.twofa) + " · admin " + flag(srv.admin) + " · shop " + flag(srv.shop) + " · hook " + flag(srv.hook) : "",
    "Trình duyệt: " + navigator.userAgent.slice(0, 120)].filter(Boolean);
  let msg = lines.join("\n"); if (msg.length > 1950) msg = msg.slice(0, 1947) + "…";
  return { msg, hints, errs: errs.length };
}
function startReport(desc) {
  if (busy) return; open || openPanel();
  if (!real()) { addMsg("bot", esc(L("Để gửi tin cho dev, bạn cần đăng nhập bằng tài khoản thật nhé.", "To send a message to the dev you need to sign in with a real account.")) + linksHTML([{ href: "/login?next=" + encodeURIComponent(location.pathname), label: L("Đăng nhập", "Sign in") }])); setChips([]); return; }
  if (session.isDev) { addMsg("bot", esc(L("Bạn chính là dev mà! Tin nhắn của người dùng nằm trong Hộp thư.", "You're the dev! Users' messages are in your Inbox.")) + linksHTML([{ href: "/inbox", label: L("Hộp thư", "Inbox") }])); return; }
  if (!desc) { mode = "report"; addMsg("bot", esc(L("Bạn gặp vấn đề gì? Hãy kể ngắn gọn (bấm gì, mong đợi gì, thấy gì). Mình sẽ xem xét rồi gửi cho dev.", "What went wrong? Tell me briefly (what you pressed, what you expected, what you saw). I'll look into it and send it to the dev."))); setChips([{ k: "x", label: L("Hủy", "Cancel"), run: () => { mode = ""; addMsg("bot", esc(L("Ok, không gửi nữa nhé.", "OK, I won't send anything."))); setChips([]); } }]); input.focus(); return; }
  sendReport(desc);
}
async function sendReport(desc, { err = null } = {}) {
  if (busy) return; setChips([]);
  if (Date.now() - lastSend < 30000 || sends >= 5) { setState("idle"); addMsg("bot", esc(L("Mình vừa gửi cho dev rồi — chờ một chút (hoặc nhắn thêm trong khung chat nổi) nhé.", "I just sent one to the dev — please wait a moment (or add details in the floating chat)."))); return; }
  const j = begin(L("Đang xem xét…", "Looking into it…")); j.stopNote = L("Đã dừng — chưa gửi gì cho dev.", "Stopped — nothing was sent to the dev."); setState("think");
  const steps = [L("Đọc các lỗi gần đây…", "Reading recent errors…"), L("Kiểm tra kết nối và máy chủ…", "Checking connection and server…"), L("Soạn tin nhắn cho dev…", "Writing the message for the dev…")];
  const box = addMsg("bot", `<ol class="sk-steps">${steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`), lis = [...box.querySelectorAll("li")];
  const gather = collect(desc, err); let res;
  for (let i = 0; i < lis.length; i++) { lis[i].className = "on"; follow(); await wait(i === 1 ? 900 : 650); if (!alive(j)) return; if (i === 1) { res = await gather; if (!alive(j)) return; } lis[i].className = "ok"; }
  j.lock = true; /* từ đây đang ghi tin gửi dev — không ngắt giữa chừng để tránh gửi nửa vời */
  try {
    const uid = session.user.uid, has = db ? (await db.ref("nox_threads/" + uid + "/chat").once("value")).exists() : false;
    if (has) await H.sendMsg(uid, "chat", res.msg); else await H.createThread({ type: "chat", subject: "Nhắn tin với dev", text: res.msg, id: "chat" });
    sends++; lastSend = Date.now(); end(j); setState("happy", 2600);
    /* Người dùng thường chỉ thấy lời xác nhận đơn giản; phần nhận định kỹ thuật đã nằm trong tin gửi dev */
    addMsg("bot", `✅ ${esc(L("Đã gửi cho dev!", "Sent to the dev!"))}` + (session.isDev && res.hints.length ? `<br><small>${esc(res.hints.join(" "))}</small>` : "") + `<br><small>${esc(L("Dev sẽ trả lời trong khung chat nổi và Hộp thư.", "The dev will reply in the floating chat and your Inbox."))}</small>`, `<div class="sk-go"><a href="/inbox/chat" data-sk-go>${esc(L("Mở cuộc trò chuyện", "Open the conversation"))}<span aria-hidden="true"> →</span></a></div>`);
  } catch (x) {
    end(j); setState("idle");
    addMsg("bot", `⚠️ ${esc(L("Mình chưa gửi được, bạn thử lại sau một chút nhé.", "I couldn't send it — please try again in a moment."))}`);
  }
}
/* Khi trang vừa gặp lỗi: chỉ ĐỀ NGHỊ (người dùng đồng ý bằng một cú bấm mới gửi) */
function onErr() {
  if (!isSkiasOn() || offered >= 2 || !real() || session.isDev) return;
  const e = logs[0]; if (!e || e.type !== "er" || IGNORE.test(e.msg) || seenErr.has(e.msg)) return; seenErr.add(e.msg);
  setTimeout(() => {
    if (open || busy || offered >= 2) return; offered++;
    bub(two("Mình thấy trang vừa gặp lỗi. Để mình xem xét và gửi cho dev nhé?", "I noticed the page just hit an error. Shall I look into it and send it to the dev?"), { ms: 0, st: "talk", actions: [
      { label: L("Xem & gửi dev", "Check & send"), primary: true, run: () => { openPanel(); sendReport(L("(Tự phát hiện) Trang vừa gặp lỗi: ", "(Auto-detected) The page just hit an error: ") + e.msg.slice(0, 200), { err: e.msg.slice(0, 160) }); } },
      { label: L("Không, cảm ơn", "No thanks"), run: () => setState("idle") }] });
  }, 1400);
}

/* ───── Mở / đóng khung, cuộc trò chuyện mới ───── */
const welcome = () => addMsg("bot", `<p>${esc(L("Chào bạn! Mình là Skias 👋 Hỏi mình về nạp tiền, đơn hàng, tài khoản, cài đặt… hoặc nhờ mình gửi vấn đề cho dev.", "Hi! I'm Skias 👋 Ask me about top-ups, orders, your account, settings… or have me send a problem to the dev."))}</p><p><small>${esc(L("Mình hiểu cả tiếng Việt lẫn English.", "I understand both English and Vietnamese."))}</small></p>`);
function openPanel() {
  if (open) return; open = true; hideBub(); panel.hidden = false; requestAnimationFrame(() => panel.classList.add("on")); root.classList.add("open"); root.classList.remove("peek"); fig.setAttribute("aria-expanded", "true"); paintModes();
  if (!opened) { opened = true; welcome(); }
  requestAnimationFrame(() => follow(true)); setState("wave", 1800); setTimeout(() => input && input.focus({ preventScroll: true }), 80);
}
function closePanel(refocus = true) {
  if (!open) return; open = false; mode = ""; panel.classList.remove("on"); root.classList.remove("open"); fig.setAttribute("aria-expanded", "false"); setTimeout(() => { if (!open) panel.hidden = true; }, 220); setState("idle"); if (refocus) fig.focus({ preventScroll: true });
}
function newChat() {
  if (job && job.lock) return; if (job) { job.dead = true; try { job.onStop && job.onStop(); } catch (_) {} end(job); }
  hist.length = 0; mode = ""; ai = false; logEl.innerHTML = ""; setChips([]); stick = true; paintModes(); welcome(); setState("wave", 1500); input.value = ""; input.focus({ preventScroll: true });
}
function apply() { if (!root) return; const on = isSkiasOn(); root.hidden = !on; document.body.classList.toggle("has-skias", on); if (!on) { stop(); closePanel(false); hideBub(); } }

export function initSkias() {
  if (wired) return; wired = true;
  root = document.createElement("div"); root.id = "sk"; root.setAttribute("translate", "no"); root.dataset.st = "idle"; root.hidden = true;
  root.innerHTML = `<section class="sk-panel" role="dialog" aria-label="Skias" hidden>
      <header class="sk-hd"><span class="sk-mav big" aria-hidden="true"></span><div class="sk-who"><b>Skias</b><small class="sk-sub"><i class="sk-dot"></i><span class="sk-subt"></span></small></div>
        <button class="sk-ic sk-new" type="button">${ICON.neu}</button><button class="sk-ic sk-off" type="button">${ICON.off}</button><button class="sk-ic sk-min" type="button">${ICON.min}</button></header>
      <div class="sk-modes" role="group" data-m="auto"><i class="sk-pill" aria-hidden="true"></i><button type="button" class="sk-mode sk-auto on"></button><button type="button" class="sk-mode sk-ai locked"></button></div>
      <div class="sk-logwrap"><div class="sk-log" role="log" aria-live="polite"></div><button class="sk-down" type="button" hidden>${ICON.down}</button></div>
      <div class="sk-chips" hidden></div>
      <form class="sk-form" novalidate><input class="sk-in" type="text" maxlength="20000" autocomplete="off" enterkeyhint="send"><button class="sk-send" type="button"></button></form>
    </section>
    <div class="sk-bubble" role="status" hidden></div>
    <button class="sk-fig" type="button" aria-haspopup="dialog" aria-expanded="false">${FIG}${CLOUD}</button>`;
  document.body.appendChild(root);
  const q = s => root.querySelector(s);
  fig = q(".sk-fig"); bubble = q(".sk-bubble"); panel = q(".sk-panel"); logEl = q(".sk-log"); chips = q(".sk-chips"); form = q(".sk-form"); input = q(".sk-in"); subEl = q(".sk-sub"); btnAuto = q(".sk-auto"); btnAI = q(".sk-ai"); btnSend = q(".sk-send"); modesEl = q(".sk-modes"); downEl = q(".sk-down");
  const labels = () => {
    fig.setAttribute("aria-label", L("Trò chuyện với Skias", "Chat with Skias")); input.setAttribute("aria-label", L("Câu hỏi cho Skias", "Question for Skias"));
    const set = (sel, t) => { const b = q(sel); b.title = t; b.setAttribute("aria-label", t); };
    set(".sk-new", L("Cuộc trò chuyện mới", "New conversation")); set(".sk-off", L("Ẩn Skias (bật lại trong Cài đặt)", "Hide Skias (turn back on in Settings)")); set(".sk-min", L("Thu nhỏ", "Minimize")); set(".sk-down", L("Xuống tin mới nhất", "Jump to latest"));
    setBusy(busy, job ? q(".sk-subt").textContent : ""); paintModes();
  };
  labels(); onLangChange(() => labels());
  onAuth(() => paintModes());
  fig.addEventListener("click", () => { open ? closePanel() : openPanel(); });
  fig.addEventListener("mouseenter", () => { if (!open && state === "idle") setState("wave", 1500); });
  bubble.addEventListener("click", e => { if (e.target.closest("button,a")) return; hideBub(); openPanel(); });
  btnAuto.addEventListener("click", () => pickMode(false)); btnAI.addEventListener("click", () => pickMode(!ai));
  q(".sk-min").addEventListener("click", () => closePanel());
  q(".sk-new").addEventListener("click", newChat);
  q(".sk-off").addEventListener("click", () => { setSkiasOn(false); toast(L("Đã ẩn Skias. Bật lại trong Cài đặt.", "Skias is hidden. Turn it back on in Settings."), "ok"); });
  const sendIt = () => { if (busy) { stop(); return; } const v = input.value; input.value = ""; ask(v); };
  form.addEventListener("submit", e => { e.preventDefault(); sendIt(); });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); if (!busy) sendIt(); } });
  btnSend.addEventListener("click", sendIt);
  logEl.addEventListener("scroll", () => { stick = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 80; paintDown(); }, { passive: true });
  downEl.addEventListener("click", () => { follow(true); input.focus({ preventScroll: true }); });
  logEl.addEventListener("click", e => { const a = e.target.closest("[data-sk-go]"); if (!a) return; e.preventDefault(); const h = a.getAttribute("href"); if (h === "/inbox/chat") { import("./chatwidget.js").then(m => m.openChat()); } else { closePanel(false); navigate(h); } });
  addEventListener("keydown", e => { if (e.key === "Escape" && open && !document.querySelector(".pop-root .pop")) { if (busy && stop()) return; closePanel(); } });
  /* Khi cuộn trang: Skias nép sang trái một chút để không che chữ đang đọc, đứng yên 2 giây thì ló ra lại */
  addEventListener("scroll", () => { if (open || !root) return; root.classList.add("peek"); clearTimeout(peekT); peekT = setTimeout(() => root.classList.remove("peek"), 2200); }, { passive: true, capture: true });
  document.addEventListener("prefs-change", apply);
  onLog(onErr);
  apply();
  let tries = 0;
  const splashGone = () => { const e = document.getElementById("splash"); if (!e || !e.isConnected) return true; const c = getComputedStyle(e); return c.display === "none" || c.visibility === "hidden" || +c.opacity === 0; };
  const first = () => { if (!isSkiasOn()) return; if (splashGone() || ++tries > 12) greet(); else setTimeout(first, 600); };
  setTimeout(first, 1800);
  /* cho các nơi khác (lệnh) mở khung Skias */
  addEventListener("skias:open", () => { if (isSkiasOn()) openPanel(); });
}
export { detectLang };
