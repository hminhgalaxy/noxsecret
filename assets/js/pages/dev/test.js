/* Dev Panel → Kiểm tra hệ thống: chạy các phép thử thật (dữ liệu, đăng nhập, Google, Cloudflare, tệp SEO, tốc độ...)
   và chỉ ra NGAY nguyên nhân + cách khắc phục khi có lỗi. */
import { esc, toast, copyText } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { db, auth, TS } from "../../lib/firebase.js";
import { GOOGLE_CLIENT_ID, MAINT_NODE, USERS_NODE } from "../../lib/config.js";
import { session } from "../../lib/auth.js";
import { locked, devCrumb } from "./shared.js";

const LIST = [
  ["data", "Kết nối dữ liệu", "Đọc dữ liệu thật từ máy chủ và đo tốc độ."],
  ["write", "Quyền ghi của quản trị viên", "Thử ghi một dòng vào hồ sơ của chính bạn."],
  ["login", "Hệ thống đăng nhập", "Kiểm tra thư viện đăng nhập đã nạp và trạng thái tài khoản."],
  ["google", "Đăng nhập bằng Google", "Nạp dịch vụ Google và kiểm tra cấu hình."],
  ["cf", "Cloudflare bảo vệ tên miền", "Kiểm tra website có đang chạy qua Cloudflare không."],
  ["seo", "Tệp SEO", "Kiểm tra robots.txt, sitemap.xml và manifest."],
  ["speed", "Tốc độ tải trang", "Đọc số đo tải trang của trình duyệt này."],
  ["store", "Bộ nhớ trình duyệt", "Kiểm tra lưu tạm để trang mở nhanh ở lần sau."]
];
const LABEL = { wait: "Chờ", run: "Đang chạy", ok: "Tốt", warn: "Cần chú ý", bad: "Lỗi" };
const tmo = (p, ms, code = "timeout") => Promise.race([p, new Promise((_, r) => setTimeout(() => r(Object.assign(new Error(code), { code })), ms))]);
const ms = t0 => Math.round(performance.now() - t0);

export function mount(ctx) {
  if (locked(ctx)) return;
  ctx.setPage({ title: "Kiểm tra hệ thống", crumbs: devCrumb, sub: "Chạy thử mọi thành phần quan trọng. Nếu có lỗi, nguyên nhân và cách sửa hiện ngay tại đây.", noindex: true });
  ctx.el.innerHTML = `<div class="chk-bar"><div class="chk-sum" id="sum" aria-live="polite">Sẵn sàng.</div>
      <div class="chk-acts"><button class="btn primary" id="runAll" type="button">${ICO.check}Chạy kiểm tra</button><button class="btn ghost" id="copyRep" type="button">${ICO.copy}Sao chép báo cáo</button></div></div>
    <div class="chk-list">${LIST.map(([id, t, d]) => `<section class="chk" id="c-${id}" data-s="wait"><div class="chk-h"><span class="chk-dot" aria-hidden="true"></span><b>${esc(t)}</b><span class="chk-st">${LABEL.wait}</span></div>
      <p class="chk-d">${esc(d)}</p><p class="chk-m" role="status"></p><p class="chk-hint" hidden></p></section>`).join("")}</div>`;

  const $ = s => ctx.el.querySelector(s), res = {}; let dead = false, runId = 0;
  ctx.cleanup(() => { dead = true; });
  const set = (id, s, msg, hint) => {
    if (dead) return; res[id] = { s, msg: msg || "", hint: hint || "" };
    const el = $("#c-" + id); if (!el) return; el.dataset.s = s;
    el.querySelector(".chk-st").textContent = LABEL[s]; el.querySelector(".chk-m").textContent = msg || "";
    const h = el.querySelector(".chk-hint"); h.hidden = !hint; h.innerHTML = hint ? `<b>Cách khắc phục:</b> ${esc(hint)}` : "";
    summary();
    if (s === "bad") toast(LIST.find(x => x[0] === id)[1] + ": " + msg, "err");
  };
  const summary = () => {
    const v = Object.values(res), bad = v.filter(x => x.s === "bad").length, warn = v.filter(x => x.s === "warn").length, ok = v.filter(x => x.s === "ok").length, run = LIST.length - ok - bad - warn;
    const el = $("#sum"); if (!el) return;
    el.dataset.s = bad ? "bad" : run ? "run" : warn ? "warn" : "ok";
    el.textContent = run ? `Đang kiểm tra… (${ok + bad + warn}/${LIST.length})` : bad ? `Có ${bad} lỗi cần sửa${warn ? `, ${warn} mục cần chú ý` : ""}.` : warn ? `Hoạt động tốt, có ${warn} mục cần chú ý.` : "Mọi thứ hoạt động tốt.";
  };

  /* 3: dữ liệu */
  const checkData = async () => {
    set("data", "run", "Đang đọc dữ liệu…");
    if (!db) return set("data", "bad", "Chưa kết nối được dữ liệu.", "Thư viện dữ liệu chưa nạp: kiểm tra mạng và trình chặn quảng cáo (gstatic.com).");
    const t0 = performance.now();
    try { await tmo(db.ref(MAINT_NODE).once("value"), 9000); const t = ms(t0); set("data", t > 2500 ? "warn" : "ok", "Đọc dữ liệu thành công trong " + t + " ms.", t > 2500 ? "Phản hồi chậm. Kiểm tra mạng hoặc vị trí máy chủ dữ liệu." : ""); }
    catch (e) {
      if (e.code === "timeout") set("data", "bad", "Máy chủ dữ liệu không phản hồi sau 9 giây.", "Kiểm tra mạng. Nếu mạng ổn, kiểm tra databaseURL trong assets/js/lib/config.js.");
      else if (/PERMISSION/i.test(e.code || e.message)) set("data", "bad", "Quy tắc bảo mật đang chặn việc đọc dữ liệu.", "Triển khai lại file database.rules.json lên Firebase (Realtime Database → Rules).");
      else set("data", "bad", "Đọc dữ liệu thất bại (" + (e.code || e.message) + ").", "Kiểm tra mạng và cấu hình Firebase trong config.js.");
    }
  };
  const checkWrite = async () => {
    set("write", "run", "Đang thử ghi…");
    if (!db || !session.user) return set("write", "bad", "Chưa đăng nhập hoặc chưa có kết nối dữ liệu.", "Đăng nhập tài khoản quản trị rồi chạy lại.");
    try { await tmo(db.ref(USERS_NODE + "/" + session.user.uid + "/lastLogin").set(TS()), 9000); set("write", "ok", "Ghi dữ liệu thành công."); }
    catch (e) { /PERMISSION/i.test(e.code || e.message) ? set("write", "bad", "Quy tắc bảo mật từ chối ghi.", "Triển khai lại database.rules.json và đảm bảo email quản trị đã được xác minh.") : set("write", "bad", "Không ghi được (" + (e.code || e.message) + ").", "Kiểm tra mạng rồi chạy lại."); }
  };
  /* 5: đăng nhập */
  const checkLogin = () => {
    if (!auth) return set("login", "bad", "Thư viện đăng nhập chưa nạp.", "Kiểm tra mạng, trình chặn quảng cáo, và địa chỉ gstatic.com.");
    const u = session.user;
    if (!u) return set("login", "warn", "Bạn chưa đăng nhập.", "Đăng nhập để chạy đủ các phép thử.");
    if (!session.isDev) return set("login", "warn", "Tài khoản này không phải quản trị viên.", "Đăng nhập bằng email quản trị đã xác minh.");
    set("login", "ok", "Đã đăng nhập: " + u.email + " (email đã xác minh).");
  };
  /* 6: Google */
  const checkGoogle = async () => {
    set("google", "run", "Đang nạp dịch vụ Google…");
    try {
      if (!(window.google && window.google.accounts && window.google.accounts.id)) await tmo(new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = res; s.onerror = () => rej(Object.assign(new Error("x"), { code: "load" })); document.head.appendChild(s); }), 10000);
      if (!(window.google && window.google.accounts && window.google.accounts.id)) throw Object.assign(new Error("x"), { code: "load" });
      const idOk = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(GOOGLE_CLIENT_ID);
      idOk ? set("google", "ok", "Dịch vụ Google đã nạp. Client ID hợp lệ về định dạng.", "Đảm bảo «" + location.origin + "» nằm trong Authorized JavaScript origins của Client ID trong Google Cloud Console.")
        : set("google", "bad", "Client ID sai định dạng.", "Kiểm tra GOOGLE_CLIENT_ID trong assets/js/lib/config.js.");
    } catch (e) { set("google", "bad", e.code === "timeout" ? "Nạp dịch vụ Google quá lâu." : "Không nạp được dịch vụ Google.", "Kiểm tra mạng và trình chặn quảng cáo (accounts.google.com)."); }
  };
  /* 7: Cloudflare proxy */
  const checkCf = async () => {
    set("cf", "run", "Đang kiểm tra…");
    try {
      const r = await tmo(fetch("/cdn-cgi/trace", { cache: "no-store" }), 6000), t = r.ok ? await r.text() : "";
      const colo = (t.match(/colo=(\w+)/) || [])[1];
      if (colo) set("cf", "ok", "Website đang chạy qua Cloudflare (trạm " + colo + ").");
      else set("cf", "warn", "Website chưa chạy qua Cloudflare.", "Muốn Cloudflare bảo vệ toàn bộ website: thêm tên miền riêng của bạn vào Cloudflare và bật đám mây cam (Proxied) cho bản ghi trỏ tới Vercel. Tên miền *.vercel.app không thể đặt sau Cloudflare.");
    } catch (_) { set("cf", "warn", "Website chưa chạy qua Cloudflare.", "Thêm tên miền riêng vào Cloudflare và bật Proxied cho bản ghi DNS trỏ tới Vercel."); }
  };
  /* 8: SEO */
  const checkSeo = async () => {
    set("seo", "run", "Đang kiểm tra…"); const bad = [];
    const get = async (u, re, ty) => { try { const r = await tmo(fetch(u, { cache: "no-store" }), 8000); const t = await r.text(); if (!r.ok || !re.test(t)) bad.push(u + (r.ok ? " (nội dung lạ)" : " (" + r.status + ")")); else if (ty && !(r.headers.get("content-type") || "").includes(ty)) bad.push(u + " (sai kiểu tệp)"); } catch (_) { bad.push(u + " (không tải được)"); } };
    await Promise.all([get("/robots.txt", /User-agent/i), get("/sitemap.xml", /<urlset/i, "xml"), get("/manifest.webmanifest", /"name"/)]);
    bad.length ? set("seo", "bad", "Có tệp lỗi: " + bad.join(", ") + ".", "Kiểm tra vercel.json, thư mục api/ và các tệp robots.txt, manifest.webmanifest rồi deploy lại.") : set("seo", "ok", "robots.txt, sitemap.xml và manifest đều hoạt động.");
  };
  /* 9: tốc độ */
  const checkSpeed = () => {
    const n = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (!n) return set("speed", "warn", "Trình duyệt không cung cấp số đo.");
    const dcl = Math.round(n.domContentLoadedEventEnd), load = Math.round(n.loadEventEnd);
    set("speed", dcl > 3000 ? "warn" : "ok", "Dựng trang xong sau " + dcl + " ms" + (load ? ", tải đầy đủ sau " + load + " ms." : "."), dcl > 3000 ? "Tải chậm. Thử lại bằng mạng khác; nếu vẫn chậm, kiểm tra kích thước dữ liệu và tệp nền trong Giao diện." : "");
  };
  /* 10: bộ nhớ */
  const checkStore = () => {
    try { localStorage.setItem("ssw_t", "1"); const ok = localStorage.getItem("ssw_t") === "1"; localStorage.removeItem("ssw_t"); const c = localStorage.getItem("ssw_cache_v1");
      ok ? set("store", "ok", c ? "Bộ nhớ hoạt động, đã lưu tạm " + Math.round(c.length / 1024) + " KB để mở trang nhanh hơn." : "Bộ nhớ hoạt động (chưa có dữ liệu lưu tạm — sẽ có sau lần tải đầu).") : set("store", "bad", "Không đọc lại được dữ liệu vừa ghi.", "Tắt chế độ riêng tư hoặc cho phép lưu dữ liệu trang web.");
    } catch (_) { set("store", "warn", "Trình duyệt chặn lưu dữ liệu.", "Trang vẫn dùng được nhưng sẽ mở chậm hơn ở các lần sau. Tắt chế độ riêng tư để có tốc độ tốt nhất."); }
  };

  const runAll = async () => {
    const id = ++runId; Object.keys(res).forEach(k => delete res[k]);
    LIST.forEach(([k]) => set(k, "wait", "", "")); const btn = $("#runAll"); btn.disabled = true;
    await Promise.allSettled([checkData(), checkWrite(), Promise.resolve(checkLogin()), checkGoogle(), checkCf(), checkSeo(), Promise.resolve(checkSpeed()), Promise.resolve(checkStore())]);
    if (id === runId && !dead) { btn.disabled = false; summary(); }
  };
  $("#runAll").addEventListener("click", runAll);
  $("#copyRep").addEventListener("click", () => {
    const t = ["Báo cáo kiểm tra · " + new Date().toLocaleString("vi-VN") + " · " + location.origin]
      .concat(LIST.map(([k, n]) => { const r = res[k] || { s: "wait", msg: "", hint: "" }; return `[${LABEL[r.s]}] ${n}: ${r.msg}${r.hint ? " → " + r.hint : ""}`; })).join("\n");
    copyText(t).then(() => toast("Đã sao chép báo cáo.")).catch(() => toast("Không sao chép được.", "err"));
  });
  runAll();
}
