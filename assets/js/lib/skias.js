/* Skias — cái đầu biết nói của website. Chào mỗi lần vào web, trả lời câu hỏi (Việt/Anh) từ kho câu trả lời có sẵn, có hiệu ứng
   "đang suy nghĩ", chớp mắt, và khi bạn nhờ (hoặc khi bạn đồng ý sau khi Skias phát hiện lỗi) Skias xem xét tình trạng rồi gửi thẳng
   cho dev qua khung chat. Có thêm chế độ "Skias AI" (dùng puter.js) CHỈ dành cho tài khoản dev. Không có gợi ý/mẹo tự bật ra.
   Toàn bộ nội dung đánh dấu translate="no" vì tự mình có cả hai ngôn ngữ. Tắt/bật trong Cài đặt. */
import { getLang, onLangChange } from "./i18n.js";
import { session, onAuth } from "./auth.js";
import { answer, detectLang } from "./skias-brain.js";
import { isSkiasOn, setSkiasOn } from "./prefs.js";
import { logs, onLog } from "./log.js";
import { RM, esc, toast } from "./util.js";
import { navigate } from "./router.js";
import { db } from "./firebase.js";
import * as H from "./help.js";

const L = (vi, en) => (getLang() === "vi" ? vi : en);
const real = () => !!(session.user && !session.isGuest && !session.user.isAnonymous);
let root, fig, bubble, panel, logEl, form, input, chips, stEl, btnAuto, btnAI;
let wired = false, open = false, state = "idle", stT = 0, hideT = 0, busy = false, mode = "", ai = false, sends = 0, lastSend = 0, offered = 0, greeted = false, opened = false;
const hist = [], seenErr = new Set(), wait = ms => new Promise(r => setTimeout(r, RM() ? Math.min(ms, 80) : ms));

/* ───── Chỉ còn cái đầu (to hơn), có chớp mắt đầy đủ ───── */
const FIG = `<svg class="sk-svg" viewBox="0 0 120 124" width="100%" height="100%" aria-hidden="true" focusable="false">
  <ellipse class="sk-shadow" cx="60" cy="118" rx="30" ry="3.6"/>
  <g class="sk-all"><g class="sk-head">
    <path class="sk-ant" d="M60 17 V6"/><circle class="sk-bulb" cx="60" cy="5" r="4.6"/>
    <circle class="sk-ear" cx="9" cy="66" r="7"/><circle class="sk-ear" cx="111" cy="66" r="7"/>
    <rect class="sk-face" x="12" y="16" width="96" height="94" rx="42"/>
    <ellipse class="sk-blush" cx="29" cy="82" rx="8" ry="5"/><ellipse class="sk-blush" cx="91" cy="82" rx="8" ry="5"/>
    <g class="sk-brows"><path class="sk-brow" d="M30 38 Q41 31 52 37"/><path class="sk-brow" d="M68 37 Q79 31 90 38"/></g>
    <g class="sk-eyes">
      <g class="sk-eye"><ellipse class="sk-sclera" cx="41" cy="60" rx="11.5" ry="14"/><g class="sk-pup"><circle class="sk-iris" cx="41" cy="61" r="7"/><circle class="sk-glint" cx="38.4" cy="57.6" r="2.3"/></g></g>
      <g class="sk-eye"><ellipse class="sk-sclera" cx="79" cy="60" rx="11.5" ry="14"/><g class="sk-pup"><circle class="sk-iris" cx="79" cy="61" r="7"/><circle class="sk-glint" cx="76.4" cy="57.6" r="2.3"/></g></g>
      <path class="sk-joy" d="M29 63 Q41 47 53 63"/><path class="sk-joy" d="M67 63 Q79 47 91 63"/>
    </g>
    <path class="sk-m sk-mSmile" d="M45 86 Q60 99 75 86"/><path class="sk-m sk-mFlat" d="M49 91 H71"/><ellipse class="sk-m sk-mOpen" cx="60" cy="91" rx="8.5" ry="6.5"/>
  </g></g></svg>`;
const CLOUD = `<span class="sk-cloud" aria-hidden="true"><i class="sk-c1"></i><i class="sk-c2"></i><span class="sk-c3"><b></b><b></b><b></b></span></span>`;
const AVATAR = `<svg viewBox="0 0 120 124" aria-hidden="true" focusable="false"><rect class="sk-face" x="12" y="16" width="96" height="94" rx="42"/><ellipse class="sk-sclera" cx="41" cy="60" rx="11.5" ry="14"/><ellipse class="sk-sclera" cx="79" cy="60" rx="11.5" ry="14"/><circle class="sk-iris" cx="41" cy="61" r="7"/><circle class="sk-iris" cx="79" cy="61" r="7"/><path class="sk-m" d="M45 88 Q60 99 75 88"/></svg>`;

function setState(s, ms = 0) {
  clearTimeout(stT); state = s; if (root) root.dataset.st = s;
  if (ms) stT = setTimeout(() => { if (!busy) setState("idle"); }, ms);
}
const act = () => {};

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
function addMsg(who, html, extra = "") {
  const d = document.createElement("div"); d.className = "sk-m-row " + who; d.innerHTML = `<div class="sk-msg">${html}</div>${extra}`;
  logEl.appendChild(d); logEl.scrollTop = logEl.scrollHeight; return d;
}
const linksHTML = go => go && go.length ? `<div class="sk-go">${go.map(g => `<a href="${esc(g.href)}" data-sk-go>${esc(g.label)}</a>`).join("")}</div>` : "";
/* Chỉ còn nút HÀNH ĐỘNG (Gửi dev / Hủy), không còn nút câu hỏi gợi ý */
function setChips(list) {
  chips.innerHTML = (list || []).map(c => `<button type="button" class="sk-chip${c.pri ? " pri" : ""}" data-k="${esc(c.k)}">${esc(c.label)}</button>`).join(""); chips.hidden = !list || !list.length;
  chips.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { const c = list.find(x => x.k === b.dataset.k); if (c) c.run(); }));
}
const devChip = (text = "") => ({ k: "dev", pri: true, label: L("Gửi dev", "Send to dev"), run: () => startReport(text) });
const typing = () => addMsg("bot", `<span class="sk-dots"><i></i><i></i><i></i></span>`);

/* ───── Chế độ Skias AI (puter.js) — chỉ tài khoản dev ───── */
let puterP = null;
function loadPuter() {
  if (window.puter && window.puter.ai) return Promise.resolve(window.puter);
  if (puterP) return puterP;
  puterP = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = "https://js.puter.com/v2/"; s.async = true;
    const fail = e => { puterP = null; s.remove(); rej(e); };
    const t = setTimeout(() => fail(new Error("timeout")), 15000);
    s.onload = () => { clearTimeout(t); window.puter && window.puter.ai ? res(window.puter) : fail(new Error("puter")); };
    s.onerror = () => { clearTimeout(t); fail(new Error("load")); };
    document.head.appendChild(s);
  });
  return puterP;
}
const SYS = "You are Skias, the friendly assistant of the website Skibidi Web (also called Skibidi Shop): a digital shop where users top up a wallet by bank transfer (VietQR) and buy products delivered instantly in their order, plus a free content library. Answer briefly and kindly in the same language as the user (Vietnamese or English). Never ask for passwords or one-time codes.";
const textOf = r => { if (r == null) return ""; if (typeof r === "string") return r; const c = r.message ? r.message.content : r.content != null ? r.content : r.text; if (typeof c === "string") return c; if (Array.isArray(c)) return c.map(x => (typeof x === "string" ? x : x && x.text) || "").join(""); return typeof r.toString === "function" && r.toString !== Object.prototype.toString ? String(r) : ""; };
async function askAI(text) {
  const ty = typing(); busy = true; setState("think");
  try {
    const p = await loadPuter();
    const msgs = [{ role: "system", content: SYS }].concat(hist.slice(-8), [{ role: "user", content: text }]);
    const out = textOf(await Promise.race([p.ai.chat(msgs), new Promise((_, rj) => setTimeout(() => rj(new Error("timeout")), 60000))])).trim();
    if (!out) throw new Error("empty");
    hist.push({ role: "user", content: text }, { role: "assistant", content: out });
    ty.remove(); busy = false; setState("talk", 1800);
    addMsg("bot", esc(out.slice(0, 4000)).replace(/\n/g, "<br>") + `<br><small>✨ Skias AI</small>`);
  } catch (e) {
    ty.remove(); busy = false; setState("idle");
    addMsg("bot", `⚠️ ${esc(L("Skias AI chưa trả lời được. Có thể Puter cần bạn đăng nhập Puter (cửa sổ nhỏ hiện ra) hoặc đang bị chặn/mất mạng. Bạn thử lại hoặc chuyển về chế độ Tự động.", "Skias AI couldn't answer. Puter may need you to sign in to Puter (a small window opens), or it is blocked/offline. Try again or switch back to Auto mode."))}`);
  }
}
function paintModes() {
  if (!btnAuto) return;
  const dev = !!session.isDev; if (ai && !dev) ai = false;
  btnAuto.classList.toggle("on", !ai); btnAuto.setAttribute("aria-pressed", String(!ai));
  btnAI.classList.toggle("on", ai); btnAI.setAttribute("aria-pressed", String(ai)); btnAI.classList.toggle("locked", !dev); btnAI.setAttribute("aria-disabled", String(!dev));
  btnAI.innerHTML = `<span aria-hidden="true">${dev ? "✨" : "🔒"}</span> Skias AI`;
  btnAI.title = dev ? L("Trò chuyện với trí tuệ nhân tạo", "Chat with the AI") : L("Chỉ tài khoản dev mới dùng được Skias AI", "Skias AI is only available to dev accounts");
  stEl.textContent = ai ? L("Đang dùng Skias AI", "Using Skias AI") : L("Trợ lý của Skibidi Web", "Skibidi Web assistant");
  input.placeholder = ai ? L("Hỏi Skias AI bất cứ điều gì…", "Ask Skias AI anything…") : L("Hỏi Skias điều gì đó…", "Ask Skias something…");
}
function pickMode(wantAI) {
  if (wantAI && !session.isDev) { addMsg("bot", `🔒 ${esc(L("Skias AI đang bị khóa với tài khoản thường — chỉ tài khoản dev mới dùng được. Chế độ Tự động vẫn trả lời mọi câu hỏi về web nhé!", "Skias AI is locked for regular accounts — only dev accounts can use it. Auto mode still answers every question about the site!"))}`); setState("talk", 1500); return; }
  if (busy) return; ai = !!wantAI; paintModes();
  addMsg("bot", esc(ai ? L("Đã bật Skias AI ✨ Hỏi mình bất cứ điều gì.", "Skias AI is on ✨ Ask me anything.") : L("Đã về chế độ Tự động.", "Back to Auto mode.")));
  input.focus({ preventScroll: true });
}

async function ask(text) {
  text = String(text || "").trim(); if (!text || busy) return;
  addMsg("me", esc(text)); setChips([]);
  if (mode === "report") { mode = ""; return sendReport(text); }
  if (ai && session.isDev) return askAI(text);
  const r = answer(text, { ui: getLang() });
  busy = true; setState("think"); const ty = typing();
  await wait(Math.min(1500, 450 + text.length * 14));
  ty.remove(); busy = false; setState("talk", 1800);
  if (!r) return;
  if (r.kind === "report") { return startReport(text.length >= 25 ? text : ""); }
  addMsg("bot", esc(r.text).replace(/\n/g, "<br>") + linksHTML(r.go));
  setChips(r.report ? [{ ...devChip(r.kind === "unknown" ? text : ""), label: r.lang === "vi" ? "Gửi dev" : "Send to dev" }] : []);
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
  if (busy) return; busy = true; setChips([]); setState("think");
  if (Date.now() - lastSend < 30000 || sends >= 5) { busy = false; setState("idle"); addMsg("bot", esc(L("Mình vừa gửi cho dev rồi — chờ một chút (hoặc nhắn thêm trong khung chat nổi) nhé.", "I just sent one to the dev — please wait a moment (or add details in the floating chat)."))); return; }
  const steps = [L("Đọc các lỗi gần đây…", "Reading recent errors…"), L("Kiểm tra kết nối và máy chủ…", "Checking connection and server…"), L("Soạn tin nhắn cho dev…", "Writing the message for the dev…")];
  const box = addMsg("bot", `<ol class="sk-steps">${steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`), lis = [...box.querySelectorAll("li")];
  const job = collect(desc, err); let res;
  for (let i = 0; i < lis.length; i++) { lis[i].className = "on"; logEl.scrollTop = logEl.scrollHeight; await wait(i === 1 ? 900 : 650); if (i === 1) res = await job; lis[i].className = "ok"; }
  try {
    const uid = session.user.uid, has = db ? (await db.ref("nox_threads/" + uid + "/chat").once("value")).exists() : false;
    if (has) await H.sendMsg(uid, "chat", res.msg); else await H.createThread({ type: "chat", subject: "Nhắn tin với dev", text: res.msg, id: "chat" });
    sends++; lastSend = Date.now(); busy = false; setState("happy", 2600);
    /* Người dùng thường chỉ thấy lời xác nhận đơn giản; phần nhận định kỹ thuật đã nằm trong tin gửi dev */
    addMsg("bot", `✅ ${esc(L("Đã gửi cho dev!", "Sent to the dev!"))}` + (session.isDev && res.hints.length ? `<br><small>${esc(res.hints.join(" "))}</small>` : "") + `<br><small>${esc(L("Dev sẽ trả lời trong khung chat nổi và Hộp thư.", "The dev will reply in the floating chat and your Inbox."))}</small>`, `<div class="sk-go"><a href="/inbox/chat" data-sk-go>${esc(L("Mở cuộc trò chuyện", "Open the conversation"))}</a></div>`);
  } catch (x) {
    busy = false; setState("idle");
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

/* ───── Mở / đóng khung ───── */
function openPanel() {
  if (open) return; open = true; hideBub(); panel.hidden = false; requestAnimationFrame(() => panel.classList.add("on")); root.classList.add("open"); fig.setAttribute("aria-expanded", "true"); paintModes();
  if (!opened) { opened = true; addMsg("bot", esc(L("Chào bạn! Mình là Skias 👋 Hỏi mình về nạp tiền, đơn hàng, tài khoản, cài đặt… hoặc nhờ mình gửi vấn đề cho dev.", "Hi! I'm Skias 👋 Ask me about top-ups, orders, your account, settings… or have me send a problem to the dev.")) + `<br><small>${esc(L("Mình hiểu cả tiếng Việt lẫn English.", "I understand both English and Vietnamese."))}</small>`); }
  setState("wave", 1800); setTimeout(() => input && input.focus({ preventScroll: true }), 80);
}
function closePanel(refocus = true) {
  if (!open) return; open = false; mode = ""; panel.classList.remove("on"); root.classList.remove("open"); fig.setAttribute("aria-expanded", "false"); setTimeout(() => { if (!open) panel.hidden = true; }, 220); setState("idle"); if (refocus) fig.focus({ preventScroll: true });
}
function apply() { if (!root) return; const on = isSkiasOn(); root.hidden = !on; document.body.classList.toggle("has-skias", on); if (!on) { closePanel(false); hideBub(); } }

export function initSkias() {
  if (wired) return; wired = true;
  root = document.createElement("div"); root.id = "sk"; root.setAttribute("translate", "no"); root.dataset.st = "idle"; root.hidden = true;
  root.innerHTML = `<section class="sk-panel" role="dialog" aria-label="Skias" hidden>
      <header class="sk-head2"><span class="sk-av" aria-hidden="true">${AVATAR}</span><div><b>Skias</b><small class="sk-sub"></small></div>
        <button class="sk-hx sk-off" type="button"></button><button class="sk-hx sk-min" type="button">×</button></header>
      <div class="sk-modes" role="group"><button type="button" class="sk-mode sk-auto on"></button><button type="button" class="sk-mode sk-ai locked"></button></div>
      <div class="sk-log" role="log" aria-live="polite"></div><div class="sk-chips" hidden></div>
      <form class="sk-form" novalidate><input class="sk-in" type="text" maxlength="300" autocomplete="off" enterkeyhint="send"><button class="sk-send" type="button">➤</button></form>
    </section>
    <div class="sk-bubble" role="status" hidden></div>
    <button class="sk-fig" type="button" aria-haspopup="dialog" aria-expanded="false">${FIG}${CLOUD}</button>`;
  document.body.appendChild(root);
  fig = root.querySelector(".sk-fig"); bubble = root.querySelector(".sk-bubble"); panel = root.querySelector(".sk-panel"); logEl = root.querySelector(".sk-log"); chips = root.querySelector(".sk-chips"); form = root.querySelector(".sk-form"); input = root.querySelector(".sk-in"); stEl = root.querySelector(".sk-sub"); btnAuto = root.querySelector(".sk-auto"); btnAI = root.querySelector(".sk-ai");
  const labels = () => {
    fig.setAttribute("aria-label", L("Trò chuyện với Skias", "Chat with Skias")); input.setAttribute("aria-label", L("Câu hỏi cho Skias", "Question for Skias"));
    const o = root.querySelector(".sk-off"), m = root.querySelector(".sk-min"); btnAuto.textContent = L("💬 Tự động", "💬 Auto");
    o.textContent = L("Ẩn Skias", "Hide Skias"); o.title = L("Ẩn Skias (bật lại trong Cài đặt)", "Hide Skias (turn back on in Settings)"); m.setAttribute("aria-label", L("Thu nhỏ", "Minimize")); paintModes();
  };
  labels(); onLangChange(() => labels()); onAuth(() => paintModes());
  fig.addEventListener("click", () => { open ? closePanel() : openPanel(); });
  fig.addEventListener("mouseenter", () => { if (!open && state === "idle") setState("wave", 1500); });
  bubble.addEventListener("click", e => { if (e.target.closest("button,a")) return; hideBub(); openPanel(); });
  btnAuto.addEventListener("click", () => pickMode(false)); btnAI.addEventListener("click", () => pickMode(!ai));
  root.querySelector(".sk-min").addEventListener("click", () => closePanel());
  root.querySelector(".sk-off").addEventListener("click", () => { setSkiasOn(false); toast(L("Đã ẩn Skias. Bật lại trong Cài đặt.", "Skias is hidden. Turn it back on in Settings."), "ok"); });
  const sendIt = () => { const v = input.value; input.value = ""; ask(v); };
  form.addEventListener("submit", e => { e.preventDefault(); sendIt(); });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); sendIt(); } });
  root.querySelector(".sk-send").addEventListener("click", sendIt);
  logEl.addEventListener("click", e => { const a = e.target.closest("[data-sk-go]"); if (!a) return; e.preventDefault(); const h = a.getAttribute("href"); if (h === "/inbox/chat") { import("./chatwidget.js").then(m => m.openChat()); } else { closePanel(false); navigate(h); } });
  addEventListener("keydown", e => { if (e.key === "Escape" && open && !document.querySelector(".pop-root .pop")) closePanel(); });
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
