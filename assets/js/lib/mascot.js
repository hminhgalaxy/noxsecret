/* Scott — người que trợ giúp của website. Chào mỗi lần vào web, trả lời câu hỏi đơn giản (Việt/Anh), thỉnh thoảng gợi ý mẹo
   kèm từ vựng Anh ↔ Việt, có hiệu ứng "đang suy nghĩ", và khi bạn nhờ (hoặc khi bạn đồng ý sau khi Scott phát hiện lỗi)
   Scott xem xét tình trạng rồi gửi thẳng cho dev qua khung chat. Toàn bộ nội dung của Scott đánh dấu translate="no"
   vì tự mình có cả hai ngôn ngữ. Tắt/bật trong Cài đặt. */
import { getLang, onLangChange } from "./i18n.js";
import { session } from "./auth.js";
import { answer, tip, suggest, detectLang } from "./mascot-brain.js";
import { isScottOn, setScottOn } from "./prefs.js";
import { logs, onLog } from "./log.js";
import { RM, esc, toast } from "./util.js";
import { navigate } from "./router.js";
import { db } from "./firebase.js";
import * as H from "./help.js";

const L = (vi, en) => (getLang() === "vi" ? vi : en);
const real = () => !!(session.user && !session.isGuest && !session.user.isAnonymous);
let root, fig, bubble, panel, logEl, form, input, chips, stEl;
let wired = false, open = false, state = "idle", stT = 0, hideT = 0, busy = false, mode = "", lastAct = Date.now(), tipN = 0, tipsShown = 0, sends = 0, lastSend = 0, offered = 0, greeted = false, opened = false;
const seenErr = new Set(), wait = ms => new Promise(r => setTimeout(r, RM() ? Math.min(ms, 80) : ms));

/* ───── Hình người que ───── */
const FIG = `<svg class="sc-svg" viewBox="0 0 96 120" width="100%" height="100%" aria-hidden="true" focusable="false">
  <ellipse class="sc-shadow" cx="48" cy="112" rx="22" ry="3.5"/>
  <g class="sc-all">
    <g class="sc-legs"><path class="sc-legL" d="M48 78 L36 108 L28 108"/><path class="sc-legR" d="M48 78 L60 108 L68 108"/></g>
    <path d="M48 41 L48 78"/>
    <path class="sc-armL" d="M48 50 L31 68"/>
    <path class="sc-armUp" d="M48 50 L30 30"/>
    <path class="sc-armR sc-armDown" d="M48 50 L65 68"/>
    <path class="sc-armR sc-armWave" d="M48 50 L68 34 L74 22"/>
    <path class="sc-armR sc-armChin" d="M48 50 L63 61 L53 37"/>
    <g class="sc-head"><circle cx="48" cy="26" r="15" class="sc-face"/>
      <circle class="sc-blush" cx="38" cy="30" r="2.6"/><circle class="sc-blush" cx="58" cy="30" r="2.6"/>
      <g class="sc-eyes"><circle cx="42.5" cy="24" r="1.9" class="sc-eye"/><circle cx="53.5" cy="24" r="1.9" class="sc-eye"/></g>
      <path class="sc-m sc-mSmile" d="M42 31 Q48 37 54 31"/><path class="sc-m sc-mFlat" d="M43 33 H53"/><ellipse class="sc-m sc-mOpen" cx="48" cy="33" rx="4" ry="3"/>
    </g>
  </g></svg>`;
const CLOUD = `<span class="sc-cloud" aria-hidden="true"><i class="sc-c1"></i><i class="sc-c2"></i><span class="sc-c3"><b></b><b></b><b></b><u>💡</u></span></span>`;

function setState(s, ms = 0) {
  clearTimeout(stT); state = s; if (root) root.dataset.st = s;
  if (ms) stT = setTimeout(() => { if (!busy) setState("idle"); }, ms);
}
const act = () => { lastAct = Date.now(); };

/* ───── Bong bóng nói ───── */
function bub(html, { ms = 9000, st = "talk", actions = null } = {}) {
  if (!bubble || open) return;
  bubble.innerHTML = `<button class="sc-bx" type="button" aria-label="${L("Đóng", "Close")}">×</button><div class="sc-bt">${html}</div>${actions ? `<div class="sc-ba">${actions.map((a, i) => `<button type="button" class="sc-btn${a.primary ? " pri" : ""}" data-i="${i}">${esc(a.label)}</button>`).join("")}</div>` : ""}`;
  bubble.hidden = false; requestAnimationFrame(() => bubble.classList.add("on"));
  bubble.querySelector(".sc-bx").onclick = e => { e.stopPropagation(); hideBub(); };
  bubble.querySelectorAll("[data-i]").forEach(b => b.onclick = e => { e.stopPropagation(); hideBub(); actions[+b.dataset.i].run(); });
  if (st) setState(st, Math.min(ms, 2600));
  clearTimeout(hideT); if (ms) hideT = setTimeout(hideBub, ms);
  act();
}
function hideBub() { if (!bubble) return; clearTimeout(hideT); bubble.classList.remove("on"); setTimeout(() => { if (!bubble.classList.contains("on")) bubble.hidden = true; }, 200); }
const two = (vi, en) => (getLang() === "vi" ? `<span>${esc(vi)}</span><small>${esc(en)}</small>` : `<span>${esc(en)}</span><small>${esc(vi)}</small>`);

/* Chào mỗi lần vào web: dòng chính theo ngôn ngữ giao diện, dòng nhỏ là bản dịch (Anh ↔ Việt) */
function greet() {
  if (greeted || !isScottOn()) return; greeted = true;
  bub(two("Xin chào! Mình là Scott, bạn cần gì cứ hỏi mình nhé 👋", "Hi! I'm Scott — ask me anything about the site 👋"), { ms: 8000, st: "wave" });
  setState("wave", 3200);
}
/* Mẹo thỉnh thoảng + từ vựng Anh → Việt */
function maybeTip() {
  if (!isScottOn() || open || busy || document.hidden || tipsShown >= 12) return;
  if (!bubble.hidden && bubble.classList.contains("on")) return;
  if (Date.now() - lastAct < 70000) return;
  const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !root.contains(a)) return;
  const t = tip(location.pathname, tipN++); tipsShown++;
  bub(`${two(t.vi, t.en)}<em class="sc-w"><b>${esc(t.w[0])}</b> = ${esc(t.w[1])}</em>`, { ms: 11000, st: "talk" });
}

/* ───── Khung trò chuyện ───── */
function addMsg(who, html, extra = "") {
  const d = document.createElement("div"); d.className = "sc-m-row " + who; d.innerHTML = `<div class="sc-msg">${html}</div>${extra}`;
  logEl.appendChild(d); logEl.scrollTop = logEl.scrollHeight; return d;
}
const linksHTML = go => go && go.length ? `<div class="sc-go">${go.map(g => `<a href="${esc(g.href)}" data-sc-go>${esc(g.label)}</a>`).join("")}</div>` : "";
function setChips(list) {
  chips.innerHTML = (list || []).map(c => `<button type="button" class="sc-chip${c.pri ? " pri" : ""}" data-k="${esc(c.k)}">${esc(c.label)}</button>`).join(""); chips.hidden = !list || !list.length;
  chips.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { act(); const c = list.find(x => x.k === b.dataset.k); if (c) c.run(); }));
}
const baseChips = lang => { const q = suggest(lang, 4, Math.floor(Date.now() / 60000) + tipN); return q.map(x => ({ k: "q:" + x, label: x, run: () => ask(x) })).concat([{ k: "dev", pri: true, label: L("Gửi dev", "Send to dev"), run: () => startReport("") }]); };
function showHome() { setChips(baseChips(getLang())); }
function typing() { return addMsg("sc", `<span class="sc-dots"><i></i><i></i><i></i></span>`); }

async function ask(text) {
  text = String(text || "").trim(); if (!text || busy) return; act();
  addMsg("me", esc(text)); setChips([]);
  if (mode === "report") { mode = ""; return sendReport(text); }
  const r = answer(text, { ui: getLang() });
  busy = true; setState("think"); const ty = typing();
  await wait(Math.min(1500, 450 + text.length * 14));
  ty.remove(); busy = false; setState("talk", 1800);
  if (!r) return;
  if (r.kind === "report") { return startReport(text.length >= 25 ? text : ""); }
  const d = addMsg("sc", esc(r.text).replace(/\n/g, "<br>") + linksHTML(r.go));
  const ch = [];
  if (r.report) ch.push({ k: "dev", pri: true, label: r.lang === "vi" ? "Gửi dev" : "Send to dev", run: () => startReport(r.kind === "unknown" ? text : "") });
  baseChips(r.lang).slice(0, 3).forEach(c => ch.push(c));
  setChips(ch); void d;
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
  const lines = ["🕴️ Scott báo từ người dùng", "Nội dung: " + String(desc || "(không có mô tả)").slice(0, 700),
    "Trang: " + location.pathname, "Nhận định của Scott: " + (hints.length ? hints.map(x => "• " + x).join(" ") : "chưa thấy dấu hiệu lỗi rõ ràng phía trình duyệt/máy chủ."),
    errs.length || err ? "Lỗi gần đây: " + (err ? [err] : errs.map(e => e.msg)).concat(err ? errs.map(e => e.msg) : []).slice(0, 4).map(x => "[" + String(x).slice(0, 140) + "]").join(" ") : "",
    "Môi trường: " + (navigator.onLine ? "online" : "offline") + " · " + innerWidth + "×" + innerHeight + "@" + (devicePixelRatio || 1) + " · lang " + getLang() + " · skin " + (d.skin || "-") + " · gfx " + (d.gfx || "-"),
    srv && srv.ok ? "Máy chủ: mail " + flag(srv.mail) + " · 2FA " + flag(srv.twofa) + " · admin " + flag(srv.admin) + " · shop " + flag(srv.shop) + " · hook " + flag(srv.hook) : "",
    "Trình duyệt: " + navigator.userAgent.slice(0, 120)].filter(Boolean);
  let msg = lines.join("\n"); if (msg.length > 1950) msg = msg.slice(0, 1947) + "…";
  return { msg, hints, errs: errs.length };
}
function startReport(desc) {
  if (busy) return; act(); open || openPanel();
  if (!real()) { addMsg("sc", esc(L("Để gửi tin cho dev, bạn cần đăng nhập bằng tài khoản thật nhé.", "To send a message to the dev you need to sign in with a real account.")) + linksHTML([{ href: "/login?next=" + encodeURIComponent(location.pathname), label: L("Đăng nhập", "Sign in") }])); setChips(baseChips(getLang()).slice(0, 4)); return; }
  if (session.isDev) { addMsg("sc", esc(L("Bạn chính là dev mà! Tin nhắn của người dùng nằm trong Hộp thư.", "You're the dev! Users' messages are in your Inbox.")) + linksHTML([{ href: "/inbox", label: L("Hộp thư", "Inbox") }])); return; }
  if (!desc) { mode = "report"; addMsg("sc", esc(L("Bạn gặp vấn đề gì? Hãy kể ngắn gọn (bấm gì, mong đợi gì, thấy gì). Mình sẽ xem xét rồi gửi cho dev.", "What went wrong? Tell me briefly (what you pressed, what you expected, what you saw). I'll look into it and send it to the dev."))); setChips([{ k: "x", label: L("Hủy", "Cancel"), run: () => { mode = ""; addMsg("sc", esc(L("Ok, không gửi nữa nhé.", "OK, I won't send anything."))); showHome(); } }]); input.focus(); return; }
  sendReport(desc);
}
async function sendReport(desc, { err = null } = {}) {
  if (busy) return; busy = true; setChips([]); setState("think");
  if (Date.now() - lastSend < 30000 || sends >= 5) { busy = false; setState("idle"); addMsg("sc", esc(L("Mình vừa gửi cho dev rồi — chờ một chút (hoặc nhắn thêm trong khung chat nổi) nhé.", "I just sent one to the dev — please wait a moment (or add details in the floating chat)."))); showHome(); return; }
  const steps = [L("Đọc các lỗi gần đây…", "Reading recent errors…"), L("Kiểm tra kết nối và máy chủ…", "Checking connection and server…"), L("Soạn tin nhắn cho dev…", "Writing the message for the dev…")];
  const box = addMsg("sc", `<ol class="sc-steps">${steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`), lis = [...box.querySelectorAll("li")];
  const job = collect(desc, err); let res;
  for (let i = 0; i < lis.length; i++) { lis[i].className = "on"; logEl.scrollTop = logEl.scrollHeight; await wait(i === 1 ? 900 : 650); if (i === 1) res = await job; lis[i].className = "ok"; }
  try {
    const uid = session.user.uid, has = db ? (await db.ref("nox_threads/" + uid + "/chat").once("value")).exists() : false;
    if (has) await H.sendMsg(uid, "chat", res.msg); else await H.createThread({ type: "chat", subject: "Nhắn tin với dev", text: res.msg, id: "chat" });
    sends++; lastSend = Date.now(); busy = false; setState("happy", 2600);
    addMsg("sc", `✅ ${esc(L("Đã gửi cho dev!", "Sent to the dev!"))}` + (res.hints.length ? `<br><small>${esc(L("Mình đã ghi kèm nhận định: ", "I attached my findings: ") + res.hints.join(" "))}</small>` : "") + `<br><small>${esc(L("Dev sẽ trả lời trong khung chat nổi và Hộp thư.", "The dev will reply in the floating chat and your Inbox."))}</small>`, `<div class="sc-go"><a href="/inbox/chat" data-sc-go>${esc(L("Mở cuộc trò chuyện", "Open the conversation"))}</a></div>`);
  } catch (x) {
    busy = false; setState("idle");
    addMsg("sc", `⚠️ ${esc(L("Mình chưa gửi được: ", "I couldn't send it: ") + ((x && x.message) || ""))}`);
  }
  showHome();
}
/* Khi trang vừa gặp lỗi: chỉ ĐỀ NGHỊ (người dùng đồng ý bằng một cú bấm mới gửi) */
function onErr() {
  if (!isScottOn() || offered >= 2 || !real() || session.isDev) return;
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
  if (open) return; open = true; hideBub(); panel.hidden = false; requestAnimationFrame(() => panel.classList.add("on")); root.classList.add("open"); fig.setAttribute("aria-expanded", "true"); act();
  if (!opened) { opened = true; addMsg("sc", esc(L("Chào bạn! Mình là Scott 👋 Hỏi mình về nạp tiền, đơn hàng, tài khoản, cài đặt… hoặc nhờ mình gửi vấn đề cho dev.", "Hi! I'm Scott 👋 Ask me about top-ups, orders, your account, settings… or have me send a problem to the dev.")) + `<br><small>${esc(L("Mình hiểu cả tiếng Việt lẫn English.", "I understand both English and Vietnamese."))}</small>`); }
  showHome(); setState("wave", 1800); setTimeout(() => input && input.focus({ preventScroll: true }), 80);
}
function closePanel(refocus = true) {
  if (!open) return; open = false; mode = ""; panel.classList.remove("on"); root.classList.remove("open"); fig.setAttribute("aria-expanded", "false"); setTimeout(() => { if (!open) panel.hidden = true; }, 220); setState("idle"); if (refocus) fig.focus({ preventScroll: true });
}
function apply() { if (!root) return; const on = isScottOn(); root.hidden = !on; document.body.classList.toggle("has-scott", on); if (!on) { closePanel(false); hideBub(); } }

export function initMascot() {
  if (wired) return; wired = true;
  root = document.createElement("div"); root.id = "sc"; root.setAttribute("translate", "no"); root.dataset.st = "idle"; root.hidden = true;
  root.innerHTML = `<section class="sc-panel" role="dialog" aria-label="Scott" hidden>
      <header class="sc-head2"><span class="sc-av" aria-hidden="true"></span><div><b>Scott</b><small class="sc-sub"></small></div>
        <button class="sc-hx sc-off" type="button"></button><button class="sc-hx sc-min" type="button">×</button></header>
      <div class="sc-log" role="log" aria-live="polite"></div><div class="sc-chips" hidden></div>
      <form class="sc-form" novalidate><input class="sc-in" type="text" maxlength="300" autocomplete="off" enterkeyhint="send"><button class="sc-send" type="button">➤</button></form>
    </section>
    <div class="sc-bubble" role="status" hidden></div>
    <button class="sc-fig" type="button" aria-haspopup="dialog" aria-expanded="false">${FIG}${CLOUD}</button>`;
  document.body.appendChild(root);
  fig = root.querySelector(".sc-fig"); bubble = root.querySelector(".sc-bubble"); panel = root.querySelector(".sc-panel"); logEl = root.querySelector(".sc-log"); chips = root.querySelector(".sc-chips"); form = root.querySelector(".sc-form"); input = root.querySelector(".sc-in"); stEl = root.querySelector(".sc-sub");
  const labels = () => {
    fig.setAttribute("aria-label", L("Trò chuyện với Scott", "Chat with Scott")); input.placeholder = L("Hỏi Scott điều gì đó…", "Ask Scott something…"); input.setAttribute("aria-label", L("Câu hỏi cho Scott", "Question for Scott"));
    stEl.textContent = L("Người que trợ giúp", "Your stick-figure helper"); const o = root.querySelector(".sc-off"), m = root.querySelector(".sc-min");
    o.textContent = L("Ẩn Scott", "Hide Scott"); o.title = L("Ẩn Scott (bật lại trong Cài đặt)", "Hide Scott (turn back on in Settings)"); m.setAttribute("aria-label", L("Thu nhỏ", "Minimize"));
  };
  labels(); onLangChange(() => { labels(); if (open) showHome(); });
  fig.addEventListener("click", () => { act(); open ? closePanel() : openPanel(); });
  fig.addEventListener("mouseenter", () => { if (!open && state === "idle") setState("wave", 1500); });
  bubble.addEventListener("click", e => { if (e.target.closest("button,a")) return; hideBub(); openPanel(); });
  root.querySelector(".sc-min").addEventListener("click", () => closePanel());
  root.querySelector(".sc-off").addEventListener("click", () => { setScottOn(false); toast(L("Đã ẩn Scott. Bật lại trong Cài đặt.", "Scott is hidden. Turn him back on in Settings."), "ok"); });
  const sendIt = () => { const v = input.value; input.value = ""; ask(v); };
  form.addEventListener("submit", e => { e.preventDefault(); sendIt(); });
  root.querySelector(".sc-send").addEventListener("click", sendIt);
  logEl.addEventListener("click", e => { const a = e.target.closest("[data-sc-go]"); if (!a) return; e.preventDefault(); const h = a.getAttribute("href"); if (h === "/inbox/chat") { import("./chatwidget.js").then(m => m.openChat()); } else { closePanel(false); navigate(h); } });
  addEventListener("keydown", e => { if (e.key === "Escape" && open && !document.querySelector(".pop-root .pop")) closePanel(); });
  document.addEventListener("prefs-change", apply);
  document.addEventListener("pointerdown", act, { passive: true }); document.addEventListener("keydown", act, { passive: true });
  onLog(onErr);
  apply();
  let tries = 0;
  const splashGone = () => { const e = document.getElementById("splash"); if (!e || !e.isConnected) return true; const c = getComputedStyle(e); return c.display === "none" || c.visibility === "hidden" || +c.opacity === 0; };
  const first = () => { if (!isScottOn()) return; if (splashGone() || ++tries > 12) greet(); else setTimeout(first, 600); };
  setTimeout(first, 1800);
  setInterval(maybeTip, 20000);
  /* cho các nơi khác (mẹo, lệnh) mở khung Scott */
  addEventListener("scott:open", () => { if (isScottOn()) openPanel(); });
}
export { detectLang };
