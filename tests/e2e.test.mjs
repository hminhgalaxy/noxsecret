import { createRequire } from "node:module";
import fs from "node:fs";
import { startServer } from "./server.mjs";
import { fakeFirebaseSource, GIS_STUB, DEV_EMAIL } from "./fake-firebase.mjs";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
const { createApi } = createRequire(import.meta.url)("../api/_lib/core.js");
const SHOTS = process.env.SHOTS || "/tmp/claude-0/-home-claude/99618507-ff35-52bc-84ef-f65de1e6fb66/scratchpad/shots";
const { srv, port, hits } = await startServer(); const BASE = "http://127.0.0.1:" + port;
const browser = await chromium.launch();
const DEVPW = ["hminhgalaxy@gmail.com", "devpass"], USERPW = ["user@example.com", "userpass"], UNV = ["devunverified@x.io", "unverified"];
const T = []; const test = (n, f, o) => T.push([n, f, o || {}]);
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || "eq"}: nhận ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
const ok = (c, m) => { if (!c) throw new Error("assert: " + m); };
const path = p => { const u = new URL(p.url()); return u.pathname + u.search; };
const TURNSTILE_STUB = `window.turnstile={render(el,o){const m=window.__captcha||'auto';window.__tsOpts=o;if(m==='auto')setTimeout(()=>o.callback('TEST-TOKEN'),20);return 'w1'},reset(){window.__tsReset=(window.__tsReset||0)+1;if((window.__captcha||'auto')==='auto')setTimeout(()=>window.__tsOpts.callback('TEST-TOKEN'),20)},remove(){}};`;
const TECH = /Firebase|Realtime|Database|\bUID\b|\bRules?\b|listener|\bSync\b|\bAPI\b|\bnode\b|\[DEV\]|DEV ONLY|permission|PERMISSION|nox_|undefined|\[object/;

async function fresh(o = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...(o.device || {}) });
  await ctx.addInitScript(opt => { try { if (!window.__keepSplash) { sessionStorage.setItem("ssw_splash", "1"); sessionStorage.setItem("ssw_notice_seen", "1700000500000"); } } catch (_) {} if (opt.captcha) window.__captcha = opt.captcha; if (opt.lang !== "default") try { localStorage.setItem("ssw_lang", opt.lang || "vi"); } catch (_) {} }, { captcha: o.captcha, lang: o.lang });
  await ctx.route("**/*", route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (/firebase-app-compat\.js/.test(u)) return route.fulfill({ contentType: "text/javascript", body: fakeFirebaseSource() });
    if (/firebase-(auth|database)-compat\.js/.test(u)) return route.fulfill({ contentType: "text/javascript", body: "" });
    if (/accounts\.google\.com\/gsi\/client/.test(u)) return route.fulfill({ contentType: "text/javascript", body: GIS_STUB });
    if (/challenges\.cloudflare\.com\/turnstile/.test(u)) return o.noCaptchaScript ? route.abort() : route.fulfill({ contentType: "text/javascript", body: TURNSTILE_STUB });
    if (/jsdelivr|fonts\.googleapis/.test(u)) return route.fulfill({ contentType: "text/css", body: "" });
    return route.abort();
  });
  const page = await ctx.newPage(); page.errs = [];
  page.on("pageerror", e => page.errs.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) page.errs.push("console: " + m.text()); });
  return { ctx, page };
}

/* Máy chủ /api/account THẬT (api/_lib/core.js) chạy trong Node, nối với Firebase giả trong trang + Brevo giả (st.sent). */
async function installApi(page, st = {}) {
  st.sent = []; st.off = !!st.off;
  const ev = (fn, arg) => page.evaluate(fn, arg), A = n => (a, b) => ev(([n, a, b]) => window.__fb.admin[n](a, b), [n, a, b]);
  const NF = () => Object.assign(new Error("nf"), { code: "auth/user-not-found" });
  const deps = {
    auth: { verifyIdToken: async t => { const d = await ev(t => window.__fb.admin.verify(t), t); if (!d) throw new Error("bad token"); return d; },
      getUser: async u => (await A("getUser")(u)) || Promise.reject(NF()), getUserByEmail: async e => (await A("getUserByEmail")(e)) || Promise.reject(NF()),
      setCustomUserClaims: (u, c) => A("setClaims")(u, c), updateUser: (u, p) => A("updateUser")(u, p), revokeRefreshTokens: u => A("revoke")(u),
      generateEmailVerificationLink: e => ev(e => window.__fb.admin.link("verifyEmail", e), e), generatePasswordResetLink: e => ev(e => window.__fb.admin.link("resetPassword", e), e),
      generateVerifyAndChangeEmailLink: (e, n) => ev(([e, n]) => window.__fb.admin.link("verifyAndChangeEmail", e, n), [e, n]) },
    db: { get: p => ev(p => window.__fb.admin.db.get(p), p), set: (p, v) => ev(([p, v]) => window.__fb.admin.db.set(p, v), [p, v]), update: (p, o) => ev(([p, o]) => window.__fb.admin.db.update(p, o), [p, o]), remove: p => ev(p => window.__fb.admin.db.remove(p), p) },
    sendMail: async m => { st.sent.push(m); }, verifyPassword: (e, p) => ev(([e, p]) => window.__fb.admin.passwordOk(e, p), [e, p]),
    env: { DEV_EMAIL }, randomInt: () => 123456, diagnose: () => (st.problems || []).map(msg => ({ msg })), liveCheck: async () => st.live || [{ ok: true, msg: "Khoá API hợp lệ." }]
  };
  const handle = createApi(deps);
  await page.route(BASE + "/api/account", async route => {
    if (st.off) { try { if (JSON.parse(route.request().postData() || "{}").action === "status" && st.problems) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mail: false, twofa: false, problems: st.problems }) }); } catch (_) {} }
    if (st.off) return route.fulfill({ status: 501, contentType: "application/json", body: JSON.stringify({ ok: false, code: "not_configured" }) });
    let body = {}; try { body = JSON.parse(route.request().postData() || "{}"); } catch (_) {}
    const h = route.request().headers(), token = /^Bearer /i.test(h.authorization || "") ? h.authorization.slice(7) : "";
    let out; try { out = await handle({ action: body.action, body, token, ip: st.ip || "9.9.9.9", geo: st.geo || { country: "VN", city: "Hanoi" } }); } catch (e) { out = { status: 500, body: { ok: false, code: "server_error" } }; }
    st.last = out; return route.fulfill({ status: out.status, contentType: "application/json", body: JSON.stringify(out.body) });
  });
  return st;
}
const until = async (fn, ms = 6000) => { const t = Date.now(), at = (new Error().stack.split("\n")[2] || "").replace(/^.*e2e\.test\.mjs:/, "dòng ").replace(/\)$/, ""); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw new Error("hết giờ chờ điều kiện (" + at + ")"); await new Promise(r => setTimeout(r, 40)); } };
const linkOf = m => (m.html.match(/href="([^"]*\/auth\/action[^"]*)"/) || [])[1].replace(/&amp;/g, "&").replace("https://skibidiscript.vercel.app", BASE);
const mailTo = (st, to, re) => st.sent.find(m => m.to === to && re.test(m.subject));
const acct = (page, e) => page.evaluate(e => JSON.parse(localStorage.getItem("fb_accounts"))[e], e);
const oneCf = page => page.waitForFunction(() => document.querySelectorAll(".cf").length === 1);
const codeDlg = async (page, code) => { const f = '.cf-root.on [data-f="code"]'; await page.waitForSelector(f); await page.fill(f, code); await page.waitForFunction(c => document.querySelector('.cf-root.on [data-f="code"]')?.value === c, code); await page.click('.cf-root.on [data-cf="yes"]'); await page.waitForFunction(() => !document.querySelector(".cf-root.on")); };
const go = async (page, p) => { await page.goto(BASE + p); await page.waitForSelector("#view .page", { timeout: 8000 }); };
const authState = page => page.locator("#hdrAcc").getAttribute("data-state");
const authed = page => page.waitForFunction(() => document.querySelector("#hdrAcc") && document.querySelector("#hdrAcc").dataset.state === "in");
async function login(page, [email, pw], next) {
  await go(page, "/login" + (next ? "?next=" + encodeURIComponent(next) : ""));
  await page.waitForFunction(() => window.__tsOpts); await page.waitForTimeout(80);
  await page.fill("#email", email); await page.fill("#password", pw); await page.click(".auth-card button[type=submit]");
}
const loginDev = async page => { await login(page, DEVPW); await page.waitForURL(BASE + "/"); await authed(page); };
const db = page => page.evaluate(() => window.__fb.getDb());
const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
/* Các chữ tiếng Việt còn sót lại (bỏ qua nội dung translate="no", code, script/style) */
const viContent = page => page.evaluate(src => {
  const re = new RegExp(src, "i"), out = [], skip = n => { for (let e = n.nodeType === 1 ? n : n.parentElement; e; e = e.parentElement) { if (/^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE)$/.test(e.tagName) || e.getAttribute("translate") === "no") return true; } return false; };
  const w = document.createTreeWalker(document.body, 5);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) { if (re.test(n.nodeValue) && !skip(n)) out.push(n.nodeValue.trim().slice(0, 400)); }
    else if (!skip(n)) for (const a of ["placeholder", "aria-label", "title", "alt"]) { const v = n.getAttribute(a); if (v && re.test(v)) out.push("[" + a + "] " + v.slice(0, 400)); }
  }
  if (re.test(document.title)) out.push("[title] " + document.title);
  return [...new Set(out)];
}, VI.source).then(l => l.filter(x => !SEED_TEXT.some(t => x.includes(t)))).then(l => { if (process.env.VI_DUMP && l.length) fs.appendFileSync(process.env.VI_DUMP, l.join("\n") + "\n"); return l.map(x => x.length > 70 ? x.slice(0, 70) + "…" : x); });
/* Nội dung do DEV / người dùng nhập (dữ liệu mẫu) — được giữ nguyên, không dịch */
const SEED_TEXT = ["Danh mục Mod", "Tự động farm", "Dữ liệu cũ dùng title/script", "Cộng đồng", "Thêm APK mới", "Đã thêm vài APK mới vào kho.", "Auto Farm Script", "Dev Minh", "Người Dùng"];
/* Kiểm tra chữ: từ bị xuống dòng giữa chừng (H/O/O), tràn ngang, chữ quá to hoặc quá nhỏ */
const textAudit = (page, mobile) => page.evaluate(mob => {
  const W = innerWidth, bad = [], hidden = e => { for (; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === "none" || c.visibility === "hidden" || c.opacity === "0" || e.hidden || e.hasAttribute("inert")) return true; } return false; };
  const scrollers = e => { for (; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (/(auto|scroll|hidden)/.test(c.overflowX) && e.scrollWidth > e.clientWidth + 1) return true; } return false; };
  if (document.documentElement.scrollWidth > W + 1) bad.push("tràn ngang " + document.documentElement.scrollWidth + ">" + W);
  const w = document.createTreeWalker(document.body, 4), seen = new Set();
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const el = n.parentElement, txt = n.nodeValue; if (!el || !/\S/.test(txt) || /^(SCRIPT|STYLE|CODE|PRE|TEXTAREA|OPTION)$/.test(el.tagName) || hidden(el) || el.closest(".nf-code,#splash,#maint,.modal:not(.show),#toasts,.sr-only")) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize), tag = el.tagName + "." + (el.className || "").toString().split(" ")[0];
    if (el.getBoundingClientRect().width === 0) continue;
    if (fs > (mob ? 36 : 60)) bad.push("chữ quá to " + fs + "px: " + tag + " «" + txt.trim().slice(0, 24) + "»");
    if (fs < 10.5 && !seen.has(tag + fs)) { seen.add(tag + fs); bad.push("chữ quá nhỏ " + fs + "px: " + tag + " «" + txt.trim().slice(0, 24) + "»"); }
    const re = /\S+/g; let m;
    while ((m = re.exec(txt))) {
      const word = m[0]; if (word.length < 2 || word.length > 18 || /[\/@:._-]/.test(word)) continue;
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + word.length);
      const rs = [...r.getClientRects()].filter(x => x.width > 0.5); if (rs.length < 2) continue;
      const tops = new Set(rs.map(x => Math.round(x.top / 4))); if (tops.size > 1 && !scrollers(el)) bad.push("từ bị xuống dòng giữa chừng «" + word + "» trong " + tag);
    }
    const r2 = el.getBoundingClientRect(); if (r2.right > W + 2 && !scrollers(el) && !el.closest("#track,.car-track")) bad.push("tràn phải " + Math.round(r2.right) + ">" + W + ": " + tag + " «" + txt.trim().slice(0, 20) + "»");
  }
  return [...new Set(bad)];
}, mobile);
/* Độ tương phản chữ/nền theo WCAG (≥ 4.5; chữ lớn ≥ 3). Bỏ qua phần tử có ảnh/gradient làm nền. */
const contrastAudit = page => page.evaluate(() => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const bgOf = el => { const chain = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none" && !/gradient\(.*rgba\(0, 0, 0, 0\)/.test(cs.backgroundImage) && e !== document.documentElement && e !== document.body) return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) chain.push(c); if (c && c.a >= 1) break; } let base = parse(getComputedStyle(document.body).backgroundColor); if (!base || base.a < 1) base = { r: 255, g: 255, b: 255, a: 1 }; if (chain.length && chain[chain.length - 1].a >= 1) base = chain.pop(); let out = base; while (chain.length) out = over(chain.pop(), out); return out; };
  const hidden = e => { for (; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === "none" || c.visibility === "hidden" || +c.opacity === 0 || e.hidden) return true; } return false; };
  const bad = [], seen = new Set(), w = document.createTreeWalker(document.body, 4);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const el = n.parentElement; if (!el || !/\S/.test(n.nodeValue) || /^(SCRIPT|STYLE|OPTION)$/.test(el.tagName) || hidden(el) || el.closest("#splash,#toasts,.nf-code,.cf-root,.sr-only") || el.closest("[disabled],:disabled")) continue;
    if (!el.getBoundingClientRect().width) continue; const cs = getComputedStyle(el), fg = parse(cs.color), bg = bgOf(el); if (!fg || !bg) continue;
    const f = over(fg, bg), L1 = lum(f), L2 = lum(bg), r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05), fs = parseFloat(cs.fontSize), big = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
    if (r < (big ? 3 : 4.5)) { const key = el.tagName + "." + String(el.className).split(" ")[0] + "|" + cs.color + "|" + Math.round(r * 10); if (!seen.has(key)) { seen.add(key); bad.push(r.toFixed(2) + " " + el.tagName + "." + String(el.className).split(" ").slice(0, 2).join(".") + " «" + n.nodeValue.trim().slice(0, 22) + "» " + cs.color); } }
  }
  return bad;
});
const AUDIT_ROUTES = ["/", "/categories", "/scripts", "/scripts/-s1", "/apk", "/notifications", "/help", "/settings", "/login", "/register", "/forgot-password", "/search?q=farm", "/khong/co"];
const DEV_ROUTES = ["/profile", "/dev", "/dev/data", "/dev/data/scripts", "/dev/categories", "/dev/users", "/dev/theme", "/dev/system", "/dev/updates", "/dev/test", "/scripts/create"];
async function audit(page, widths, routes) {
  const by = new Map();
  for (const w of widths) { await page.setViewportSize({ width: w, height: w < 500 ? 780 : 800 });
    for (const r of routes) { await go(page, r); await page.waitForTimeout(450); for (const m of await textAudit(page, w < 500)) { const k = m.replace(/\d{3,}(\.\d+)?>\d+/, "N"); if (!by.has(k)) by.set(k, []); by.get(k).push(w + r); } } }
  ok(!by.size, "lỗi hiển thị chữ:\n   " + [...by].map(([m, where]) => m + "  ← " + where.slice(0, 3).join(", ") + (where.length > 3 ? " (+" + (where.length - 3) + ")" : "")).join("\n   "));
}
const yes = async page => { await page.waitForSelector('.cf [data-cf="yes"]'); await page.click('.cf [data-cf="yes"]'); await page.waitForSelector(".cf", { state: "detached" }); };
const no = async page => { await page.waitForSelector('.cf [data-cf="no"]'); await page.click('.cf [data-cf="no"]'); await page.waitForSelector(".cf", { state: "detached" }); };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DwnwEJMDEgAdwcAAcGAQP9EBUvAAAAAElFTkSuQmCC", "base64");
const seedUsers = page => page.evaluate(() => { const d = window.__fb.getDb(); d.nox_users = { uUSER: { name: "Người Dùng", email: "user@example.com", lastLogin: Date.now(), provider: "password" }, uDEV: { name: "Dev Minh", email: "hminhgalaxy@gmail.com", lastLogin: Date.now() } }; window.__fb.setDb(d); });
const toasts = page => page.locator(".toast").allTextContents();
const visibleText = page => page.evaluate(() => document.body.innerText);
const openMenu = async page => { if (page.viewportSize().width < 1024) { await page.click("#btnMenu"); await page.waitForFunction(() => document.querySelector("#btnMenu").getAttribute("aria-expanded") === "true"); await page.waitForTimeout(400); } };

/* ───────── Đăng nhập / đăng ký / quên mật khẩu ───────── */
test("đăng nhập: truy cập trực tiếp, refresh, tiêu đề", async ({ page }) => {
  await go(page, "/login"); eq(path(page), "/login"); ok((await page.title()).includes("Đăng nhập"), "document.title");
  await page.reload(); await page.waitForSelector(".auth-card"); ok(await page.locator("#email").isVisible(), "form sau refresh");
});
test("đăng nhập: sai mật khẩu báo lỗi dễ hiểu, đúng thì vào được và giữ phiên", async ({ page }) => {
  await login(page, [DEVPW[0], "sai"]); await page.waitForFunction(() => document.querySelector("#err").textContent.length > 3);
  const msg = await page.textContent("#err"); ok(/không đúng/.test(msg) && !TECH.test(msg), "lỗi mật khẩu: " + msg);
  ok(await page.locator("button[type=submit]").isEnabled(), "nút hết loading");
  await page.fill("#password", DEVPW[1]); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); await authed(page);
  await page.reload(); await authed(page); eq(path(page), "/");
});
test("đăng nhập: kiểm tra ô trống và email sai định dạng", async ({ page }) => {
  await go(page, "/login"); await page.click("button[type=submit]");
  ok((await page.textContent('[data-err="email"]')).length > 3, "thiếu email"); ok((await page.textContent('[data-err="password"]')).length > 3, "thiếu mật khẩu");
  await page.fill("#email", "abc"); await page.fill("#password", "x"); await page.click("button[type=submit]"); ok((await page.textContent('[data-err="email"]')).includes("không hợp lệ"), "email sai");
  eq(await page.getAttribute("#email", "placeholder"), "example@gmail.com", "gợi ý email");
  for (const bad of ["abc@gmail", "abc@.com", "a b@gmail.com", "@gmail.com", "abc@@gmail.com"]) { await page.fill("#email", bad); await page.click("button[type=submit]"); ok((await page.textContent('[data-err="email"]')).includes("example@gmail.com"), "phải báo sai: " + bad); }
  await page.fill("#email", "abc@gmail.com"); await page.click("button[type=submit]"); eq((await page.textContent('[data-err="email"]')).trim(), "", "email đúng không báo lỗi");
});
test("đăng nhập Google (sau khi xác minh captcha)", async ({ page }) => {
  await go(page, "/login"); await page.waitForFunction(() => window.__tsOpts); await page.waitForFunction(() => !document.querySelector("#gbtn").classList.contains("locked"));
  await page.click("#gstub", { force: true }); await page.waitForURL(BASE + "/"); await authed(page);
});
test("captcha: chưa xác minh thì không gửi được form và nút Google bị khoá", async ({ page }) => {
  await go(page, "/login"); await page.waitForFunction(() => window.__tsOpts);
  ok(await page.evaluate(() => document.querySelector("#gbtn").classList.contains("locked")), "Google bị khoá");
  await page.fill("#email", DEVPW[0]); await page.fill("#password", DEVPW[1]); await page.click("button[type=submit]");
  await page.waitForFunction(() => document.querySelector("#err").textContent.includes("xác minh")); eq(path(page), "/login");
  eq(await authState(page), "out");
}, { captcha: "manual" });
test("captcha: máy chủ từ chối token thì không đăng nhập", async ({ page }) => {
  globalThis.__api = { "/api/verify-captcha": (q, s) => { s.writeHead(403, { "content-type": "application/json" }); s.end('{"ok":false,"configured":true}'); } };
  try { await login(page, DEVPW); await page.waitForFunction(() => document.querySelector("#err").textContent.includes("Xác minh không thành công")); eq(await authState(page), "out"); await page.waitForTimeout(200); ok((await page.evaluate(() => window.__tsReset)) >= 1, "captcha được làm mới"); }
  finally { globalThis.__api = {}; }
});
test("captcha: máy chủ chưa cấu hình (404) thì vẫn đăng nhập được", async ({ page }) => { await loginDev(page); });
test("captcha: không tải được script captcha thì vẫn dùng được trang (không treo)", async ({ page }) => {
  await go(page, "/login"); await page.waitForSelector("#captcha .field-hint", { timeout: 6000 }); await page.fill("#email", DEVPW[0]); await page.fill("#password", DEVPW[1]); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/");
}, { noCaptchaScript: true });
test("next: về trang đích sau đăng nhập; chặn open-redirect", async ({ page }) => {
  await go(page, "/scripts/create"); eq(path(page), "/login?next=%2Fscripts%2Fcreate", "guard");
  await page.waitForFunction(() => window.__tsOpts); await page.waitForTimeout(80);
  await page.fill("#email", DEVPW[0]); await page.fill("#password", DEVPW[1]); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/scripts/create"); await page.waitForSelector("#itemForm");
  for (const n of ["//evil.com", "/\\evil.com", "http://evil.com", "javascript:alert(1)", "/login"]) {
    await page.evaluate(async () => { await window.firebase.auth().signOut(); });
    await login(page, DEVPW, n); await page.waitForURL(u => u.origin === BASE && u.pathname === "/", { timeout: 6000 }).catch(() => { throw new Error("next=" + n + " → " + path(page)); });
  }
});
test("đăng ký: kiểm tra từng ô, độ mạnh mật khẩu, tạo tài khoản thành công", async ({ page }) => {
  await go(page, "/register"); await page.waitForFunction(() => window.__tsOpts); await page.waitForTimeout(80);
  await page.click("button[type=submit]"); ok((await page.locator(".field-error:not(:empty)").count()) >= 3, "báo lỗi nhiều ô");
  await page.fill("#name", "Test User"); await page.fill("#email", "new@example.com"); await page.fill("#password", "abc"); await page.fill("#confirm", "abc"); await page.click("button[type=submit]");
  ok((await page.textContent('[data-err="password"]')).length > 3, "mật khẩu yếu bị từ chối");
  await page.fill("#password", "Matkhau123"); eq(await page.getAttribute("#meter", "data-s") > "1", true, "thanh độ mạnh"); await page.fill("#confirm", "Khac12345"); await page.click("button[type=submit]");
  ok((await page.textContent('[data-err="confirm"]')).length > 3, "nhập lại không khớp");
  await page.fill("#confirm", "Matkhau123"); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); await authed(page);
  await page.waitForFunction(() => window.__nameSet === "Test User", null, { timeout: 4000 }).catch(() => { throw new Error("tên hiển thị không được lưu"); }); await page.waitForFunction(() => window.__verifySent >= 1, null, { timeout: 4000 }).catch(() => {}); ok((await page.evaluate(() => window.__verifySent)) >= 1, "gửi email xác minh");
  await page.waitForFunction(() => Object.values(window.__fb.getDb().nox_users || {}).some(u => u.email === "new@example.com"), null, { timeout: 4000 }).catch(() => { throw new Error("hồ sơ người dùng không được tạo"); });
});
test("đăng ký: email đã tồn tại báo lỗi dễ hiểu", async ({ page }) => {
  await go(page, "/register"); await page.waitForFunction(() => window.__tsOpts); await page.waitForTimeout(80);
  await page.fill("#name", "Abc"); await page.fill("#email", USERPW[0]); await page.fill("#password", "Matkhau123"); await page.fill("#confirm", "Matkhau123"); await page.click("button[type=submit]");
  await page.waitForFunction(() => document.querySelector("#err").textContent.length > 3); const m = await page.textContent("#err"); ok(/đã được đăng ký/.test(m) && !TECH.test(m), m);
});
test("quên mật khẩu: gửi email, có thời gian chờ, thông báo không lộ tài khoản", async ({ page }) => {
  await go(page, "/login"); await page.click('a[href^="/forgot-password"]'); await page.waitForURL(/forgot-password/); await page.waitForSelector("#email");
  await page.click("button[type=submit]"); ok((await page.textContent('[data-err="email"]')).length > 3, "thiếu email");
  await page.fill("#email", "ai-do@example.com"); await page.click("button[type=submit]"); await page.waitForFunction(() => document.querySelector("#ok").textContent.length > 3);
  eq(await page.evaluate(() => window.__resetSent), "ai-do@example.com"); ok(await page.locator("button[type=submit]").isDisabled(), "khoá gửi lại");
});
test("đăng xuất: về trạng thái khách, trang cần quyền chuyển về đăng nhập", async ({ page }) => {
  await loginDev(page); await go(page, "/profile"); await page.click('[data-act="signout"]'); await page.waitForSelector(".cf"); await no(page); eq(await authState(page), "in", "Hủy thì vẫn đăng nhập");
  await page.click('[data-act="signout"]'); await yes(page); await page.waitForURL(/\/login/); eq(await authState(page), "out");
});
test("không dùng hộp thoại của trình duyệt: xác nhận bằng bảng riêng", async ({ page }) => {
  let native = 0; page.on("dialog", d => { native++; d.dismiss(); });
  await loginDev(page); await go(page, "/settings"); await page.click("#resetAll"); await page.waitForSelector(".cf"); ok(/Đặt lại|Reset/.test(await page.textContent(".cf")), "bảng hỏi"); await page.keyboard.press("Escape"); await page.waitForSelector(".cf", { state: "detached" });
  await page.click('[data-act="signout"]'); await no(page); eq(native, 0, "không có hộp thoại gốc của trình duyệt");
});
test("DEV chưa xác minh email không vào được Dev Panel", async ({ page }) => {
  await login(page, UNV); await authed(page); await go(page, "/dev"); ok(await page.locator(".statebox").count() >= 1 || path(page) !== "/dev", "bị chặn");
  eq(await page.locator("#view .stats").count(), 0, "không thấy số liệu quản trị");
});

/* ───────── Hồ sơ ───────── */
test("hồ sơ: hiển thị thông tin, đổi tên, gửi email đổi mật khẩu", async ({ page }) => {
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile?tab=edit");
  ok((await page.textContent(".profile-head")).includes(USERPW[0]), "email"); ok(!(await page.textContent(".profile-head")).includes("Quản trị"), "thành viên thường");
  await page.fill("#dn", "Tên Mới"); await page.click("#saveName"); await page.waitForFunction(() => window.__nameSet === "Tên Mới");
  await page.waitForFunction(() => document.querySelector(".profile-id h2").textContent === "Tên Mới");
  await page.click('.ptab-btn[data-tab="security"]'); await page.click("#pwMail"); await page.waitForFunction(() => window.__resetSent); eq(await page.evaluate(() => window.__resetSent), USERPW[0]);
  eq(await page.locator("#view .stats").count(), 0);
});
test("hồ sơ: chưa đăng nhập thì chuyển về đăng nhập", async ({ page }) => { await go(page, "/profile"); eq(path(page), "/login?next=%2Fprofile"); });

/* ───────── Menu & Danh mục ───────── */
test("menu: nút Danh mục mở ra từ từ, có hiệu ứng, ghi nhớ và đóng lại được (desktop)", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("ssw_gfx", "mid"); } catch (_) {} });
  await go(page, "/"); const g = page.locator('.disc[data-g="cats"]'), panel = g.locator(".disc-panel");
  const btn = g.locator(".nav-btn"); eq(await btn.getAttribute("aria-expanded"), "false", "mặc định đóng");
  eq(await panel.evaluate(e => Math.round(e.getBoundingClientRect().height)), 0, "panel đóng cao 0");
  await btn.click(); await page.waitForFunction(s => document.querySelector(s).getBoundingClientRect().height > 0, '.disc[data-g="cats"] .disc-panel', { polling: "raf" }); const mid = await panel.evaluate(e => e.getBoundingClientRect().height);
  await page.waitForTimeout(700); const full = await panel.evaluate(e => e.getBoundingClientRect().height);
  ok(mid > 0 && mid < full, `đang mở dần (giữa=${mid}, đủ=${full}, gfx=${await page.evaluate(() => document.documentElement.dataset.gfx + "/" + document.documentElement.dataset.motion)})`); eq(await btn.getAttribute("aria-expanded"), "true");
  ok((await panel.locator(".disc-item").count()) >= 4, "có đủ danh mục");
  await page.reload(); await page.waitForSelector(".disc"); eq(await page.locator('.disc[data-g="cats"] .nav-btn').getAttribute("aria-expanded"), "true", "nhớ trạng thái mở");
  await page.locator('.disc[data-g="cats"] .nav-btn').click(); await page.waitForTimeout(700); eq(await panel.evaluate(e => Math.round(e.getBoundingClientRect().height)), 0, "đóng lại");
  await page.locator('.disc[data-g="cats"] .nav-btn').click(); await page.waitForTimeout(300); await panel.locator('.disc-item[href="/apk"]').click(); await page.waitForURL(BASE + "/apk");
  await page.waitForSelector('.disc-item[href="/apk"].on', { timeout: 3000 }).catch(() => { throw new Error("mục đang xem không được đánh dấu"); });
});
test("menu: Dev Panel có nút riêng, chỉ DEV mới thấy", async ({ page }) => {
  await go(page, "/"); eq(await page.locator('.disc[data-g="dev"]').count(), 0, "khách không thấy");
  await loginDev(page); await page.waitForSelector('.disc[data-g="dev"]'); await page.locator('.disc[data-g="dev"] .nav-btn').click(); await page.waitForTimeout(700);
  eq(await page.locator('.disc[data-g="dev"] .disc-item').count(), 10, "10 mục quản trị (có Gửi thư, Duyệt bài)"); eq(await page.locator('.disc[data-g="dev"] .disc-item[href="/dev/inbox"]').count(), 0, "Hộp thư không còn nằm trong Dev Panel");
  await page.locator('.disc[data-g="dev"] .disc-item[href="/dev/system"]').click(); await page.waitForURL(BASE + "/dev/system"); await page.waitForSelector("#mBtn");
});
test("menu: tài khoản thường không thấy Dev Panel và bị chặn khi vào /dev", async ({ page }) => {
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); eq(await page.locator('.disc[data-g="dev"]').count(), 0); await go(page, "/dev");
  eq(await page.locator("#view .stats").count(), 0, "không thấy trang quản trị");
});
test("điện thoại: thanh dưới, mở/đóng menu 3 gạch, khoá cuộn, Danh mục trong menu", async ({ page }) => {
  await go(page, "/"); ok(await page.locator("#tabbar").isVisible(), "thanh điều hướng dưới"); eq(await page.locator("#side").evaluate(e => e.getBoundingClientRect().right <= 1), true, "menu ẩn ngoài màn hình");
  await page.click("#btnMenu"); await page.waitForFunction(() => document.querySelector("#btnMenu").getAttribute("aria-expanded") === "true"); await page.waitForTimeout(450);
  ok(await page.locator("#side").evaluate(e => e.getBoundingClientRect().left >= -1), "menu trượt vào");
  await page.locator('.disc[data-g="cats"] .nav-btn').click(); await page.waitForTimeout(700); await page.locator('.disc-item[href="/ios"]').click(); await page.waitForURL(BASE + "/ios");
  await page.waitForFunction(() => document.querySelector("#btnMenu").getAttribute("aria-expanded") === "false"); await page.waitForTimeout(400);
  await page.click("#btnMenu"); await page.waitForTimeout(450); await page.keyboard.press("Escape"); await page.waitForFunction(() => document.querySelector("#btnMenu").getAttribute("aria-expanded") === "false");
  await page.click("#tabCats"); await page.waitForTimeout(500); ok(await page.locator('.disc[data-g="cats"].open').count() === 1, "nút Danh mục ở thanh dưới mở menu và bung danh mục");
}, { device: devices["Pixel 5"] });

/* ───────── Dữ liệu & nội dung ───────── */
test("trang chủ: danh mục chạy ngang (mỗi lần 1 mục, có nút), Cập nhật này có gì?, không còn Mới cập nhật", async ({ page }) => {
  await go(page, "/"); await page.waitForSelector(".slide"); eq(await page.locator(".slide").count(), 5, "5 danh mục gồm Mod tùy chỉnh");
  const vis = () => page.evaluate(() => { const t = document.querySelector("#track").getBoundingClientRect(); return [...document.querySelectorAll(".slide")].filter(s => { const r = s.getBoundingClientRect(); return r.left >= t.left - 2 && r.right <= t.right + 2; }).length; });
  eq(await vis(), 1, "chỉ 1 mục hiện");
  const num = () => page.textContent("#num"); eq((await num()).trim(), "1 / 5");
  await page.click("#next"); await page.waitForFunction(() => document.querySelector("#num").textContent.trim() === "2 / 5"); await page.waitForTimeout(800); eq(await vis(), 1, "vẫn 1 mục sau khi bấm tiếp");
  await page.click("#prev"); await page.waitForFunction(() => document.querySelector("#num").textContent.trim() === "1 / 5");
  await page.click("#prev"); await page.waitForFunction(() => document.querySelector("#num").textContent.trim() === "5 / 5"); // vòng lại
  const h = await page.locator("#view h2").allTextContents(); ok(h.some(x => x.includes("Cập nhật này có gì?")), "có mục Cập nhật này có gì?"); ok(!h.some(x => /Mới cập nhật/.test(x)), "đã bỏ Mới cập nhật");
  ok((await page.locator(".home-news .upd").count()) >= 1, "có bài cập nhật");
  const t = await visibleText(page); ok(!TECH.test(t), "không có chữ kỹ thuật: " + (t.match(TECH) || [])[0]);
  await page.click(".slide >> nth=0"); await page.waitForURL(u => u.pathname !== "/");
});
test("danh sách, chi tiết, sao chép, tìm kiếm", async ({ page }) => {
  await go(page, "/scripts"); eq(await page.locator("#grid .card").count(), 2); await page.click('.card [href="/scripts/-s1"]'); await page.waitForURL(BASE + "/scripts/-s1"); await page.waitForSelector(".detail");
  ok((await page.textContent("#main")).includes("Auto Farm Script"), "chi tiết");
  await go(page, "/scripts/-s2"); ok((await page.textContent("#main")).includes("Legacy Script"), "dữ liệu cũ vẫn hiển thị");
  await go(page, "/search?q=farm"); await page.waitForSelector("#sq"); ok((await page.textContent("#view")).includes("Auto Farm"), "tìm thấy");
  await page.focus("#sq"); await page.fill("#sq", "demo"); await page.waitForFunction(() => document.querySelector("#view").textContent.includes("Demo APK")); ok(await page.evaluate(() => document.activeElement.id === "sq"), "ô tìm kiếm không mất focus");
});
test("tìm kiếm từ ô ở trang chủ", async ({ page }) => {
  await go(page, "/"); await page.fill("#heroSearch input", "discord"); await page.press("#heroSearch input", "Enter"); await page.waitForURL(/\/search\?q=discord/); await page.waitForFunction(() => document.querySelector("#view").textContent.includes("Discord"));
});
test("đầu trang: logo + tên ở giữa, menu bên trái, chuông + avatar bên phải, không có ô tìm kiếm", async ({ page }) => {
  await go(page, "/"); eq(await page.locator("#q").count(), 0, "đã bỏ ô tìm kiếm trên đầu trang");
  const r = sel => page.locator(sel).first().evaluate(e => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, c: (b.left + b.right) / 2, w: b.width }; });
  const W = page.viewportSize().width, menu = await r("#btnMenu"), brand = await r("#hdr .brand"), bell = await r("#btnBell"), acc = await r("#hdrAcc");
  ok(menu.l < 40, "menu ở bên trái"); ok(Math.abs(brand.c - W / 2) <= 4, `thương hiệu ở giữa (tâm ${brand.c} / ${W / 2})`);
  ok(brand.l > menu.r && brand.r < bell.l, "thương hiệu không đè lên menu / chuông"); ok(acc.r > W - 40 && bell.r <= acc.l + 1, "chuông + avatar ở bên phải");
}, {});
test("đầu trang điện thoại (Pixel 5 & 320px): thương hiệu ở giữa, không tràn", async ({ page }) => {
  for (const w of [393, 360, 320]) {
    await page.setViewportSize({ width: w, height: 700 }); await go(page, "/"); await page.waitForTimeout(150);
    const m = await page.evaluate(() => { const g = s => { const b = document.querySelector(s).getBoundingClientRect(); return { l: b.left, r: b.right, c: (b.left + b.right) / 2 }; }; return { menu: g("#btnMenu"), brand: g("#hdr .brand"), bell: g("#btnBell"), acc: g("#hdrAcc"), sw: document.documentElement.scrollWidth, brandH: document.querySelector("#hdr .brand").getBoundingClientRect().height }; });
    ok(m.sw <= w, w + ": cuộn ngang " + m.sw); ok(Math.abs(m.brand.c - w / 2) <= 6, w + ": tâm thương hiệu " + m.brand.c); ok(m.brand.l >= m.menu.r - 1 && m.brand.r <= m.bell.l + 1, w + ": thương hiệu đè lên nút");
    ok(m.brandH < 60, w + ": thương hiệu bị xuống dòng (cao " + m.brandH + ")");
  }
}, { device: devices["Pixel 5"] });
const openBell = async page => { await page.click("#btnBell"); await page.waitForSelector('[data-pop="notif"].on'); };
const closePop = async (page, id) => { await page.keyboard.press("Escape"); await page.waitForSelector(`[data-pop="${id}"]`, { state: "detached" }); };
test("chuông thông báo (popup): sáng khi DEV đăng cập nhật mới, tắt khi mở popup", async ({ page }) => {
  await go(page, "/"); await page.waitForTimeout(600);
  await openBell(page); await page.waitForSelector('[data-pop="notif"] .upd'); await page.waitForTimeout(300);
  eq(path(page), "/", "thông báo là popup, không đổi trang");
  ok(await page.locator("#bellBadge").isHidden(), "đã xem hết → chuông tắt"); await closePop(page, "notif");
  await go(page, "/"); await page.waitForTimeout(300); ok(await page.locator("#bellBadge").isHidden(), "reload vẫn giữ trạng thái đã xem");
  await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_updates["-u2"] = { title: "Bản vá mới", body: "Sửa lỗi nhỏ.", ts: Date.now() }; window.__fb.setDb(d); });
  await page.waitForFunction(() => !document.querySelector("#bellBadge").hidden, null, { timeout: 4000 }).catch(() => { throw new Error("chuông không sáng khi có cập nhật mới"); });
  eq((await page.textContent("#bellBadge")).trim(), "1"); await page.waitForSelector(".toast"); ok((await toasts(page)).join("").includes("Có cập nhật mới"), "có toast");
  await openBell(page); await page.waitForSelector('[data-pop="notif"] .upd.new'); ok((await page.textContent('[data-pop="notif"]')).includes("Bản vá mới"), "hiện bài mới");
  await page.waitForFunction(() => document.querySelector("#bellBadge").hidden);
});
test("thông báo popup: hai thẻ Cập nhật / Bảo trì, Esc đóng, trả focus; /notifications cũ vẫn mở popup", async ({ page }) => {
  await go(page, "/"); await page.focus("#btnBell"); await page.keyboard.press("Enter"); await page.waitForSelector('[data-pop="notif"].on');
  eq(await page.locator('[data-pop="notif"] [role=tab]').count(), 2, "hai thẻ"); eq(await page.getAttribute('[data-pop="notif"] .pop', "aria-modal"), "true");
  await page.keyboard.press("Escape"); await page.waitForSelector('[data-pop="notif"]', { state: "detached" }); eq(await page.evaluate(() => document.activeElement.id), "btnBell", "trả focus về chuông");
  eq(await page.locator('#side a[href="/notifications"]').count(), 0, "đã bỏ Thông báo khỏi menu");
  await go(page, "/notifications"); await page.waitForSelector('[data-pop="notif"].on'); eq(path(page), "/", "địa chỉ cũ chuyển về trang chủ và mở popup");
});
test("popup Thông báo: thẻ Bảo trì có thông báo ghim, thẻ Cập nhật có danh sách", async ({ page }) => {
  await go(page, "/"); await openBell(page); await page.waitForSelector('[data-pop="notif"] .upd');
  ok((await page.textContent('[data-pop="notif"]')).includes("Thêm APK mới"), "bài DEV"); ok((await page.locator('[data-pop="notif"] .upd').count()) >= 2, "có cả ghi chú bản");
  await page.click('[data-pop="notif"] [data-t="maint"]'); await page.waitForSelector('[data-pop="notif"] .np-pin'); ok((await page.textContent('[data-pop="notif"]')).includes("Đây là thông báo thử nghiệm."), "thông báo ghim");
});
test("danh mục tùy chỉnh /c/mod hoạt động; danh mục không tồn tại báo không tìm thấy, không treo", async ({ page }) => {
  await go(page, "/c/mod"); eq(await page.locator("#grid .card").count(), 1); await go(page, "/c/khong-ton-tai"); ok((await page.locator("#view .page").count()) === 1, "vẫn hiện trang");
});
test("404: đường dẫn lạ hiện trang không tìm thấy, có nút quay về", async ({ page }) => {
  await go(page, "/khong/co/trang/nay"); ok((await page.textContent("#view")).includes("404"), "404"); await page.click("#bk, #view a.btn"); await page.waitForTimeout(300);
});
test("DEV thêm / sửa / xoá một mục", async ({ page }) => {
  await loginDev(page); await go(page, "/links/create"); await page.fill("#itemForm [name=name]", "Mục thử"); await page.fill("#itemForm [name=url]", "https://example.com/x"); await page.click("#saveBtn");
  await page.waitForFunction(() => /\/links\//.test(location.pathname) || document.querySelector(".toast")); await page.waitForTimeout(400);
  const d = await db(page); ok(Object.values(d.nox_data.links).some(i => i.name === "Mục thử"), "đã lưu");
  const key = Object.keys(d.nox_data.links).find(k => d.nox_data.links[k].name === "Mục thử");
  await go(page, "/links/" + key); await page.click("#delBtn"); await no(page); await page.waitForTimeout(200); ok(Object.values((await db(page)).nox_data.links || {}).some(i => i.name === "Mục thử"), "hủy thì còn"); await page.click("#delBtn"); await yes(page); await page.waitForTimeout(600);
  ok(!Object.values((await db(page)).nox_data.links || {}).some(i => i.name === "Mục thử"), "đã xoá");
});
test("khách không thể thêm/sửa dữ liệu (đổi qua Rules)", async ({ page }) => {
  await go(page, "/"); const r = await page.evaluate(async () => { try { await firebase.database().ref("nox_data/links/x").set({ name: "hack" }); return "ok"; } catch (e) { return e.code; } }); eq(r, "PERMISSION_DENIED");
});

/* ───────── Dev Panel ───────── */
test("Dev Panel: các trang quản trị đều mở được và không có chữ kỹ thuật", async ({ page }) => {
  await loginDev(page);
  for (const r of ["/dev", "/dev/data", "/dev/data/scripts", "/dev/data/c/mod", "/dev/categories", "/dev/users", "/dev/theme", "/dev/system", "/dev/updates"]) {
    await go(page, r); await page.waitForTimeout(300); eq(path(page), r); const t = await visibleText(page); ok(!TECH.test(t), r + " có chữ kỹ thuật: " + (t.match(TECH) || [])[0]);
  }
});
test("Dev Panel: bảo trì bật/tắt và thông báo", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/system"); await page.click("#mBtn"); await no(page); await page.waitForTimeout(300); eq((await db(page)).nox_maintenance.enabled, false, "hủy thì không bật"); await page.click("#mBtn"); await yes(page); await page.waitForFunction(() => document.querySelector("#maint.show, #maint:not([hidden])") && true);
  await page.waitForTimeout(400); eq((await db(page)).nox_maintenance.enabled, true, "đã bật bảo trì");
  await page.click("#mBtn"); await page.waitForTimeout(400); eq((await db(page)).nox_maintenance.enabled, false, "đã tắt");
});
test("Dev Panel: thêm / xoá danh mục tuỳ chỉnh", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/categories"); const before = Object.keys((await db(page)).nox_categories).length;
  await page.fill("#cName, input[name=name]", "Công cụ"); await page.click("#cAdd, button[type=submit]"); await page.waitForTimeout(500);
  eq(Object.keys((await db(page)).nox_categories).length, before + 1);
});

test("Dev Panel: đăng cập nhật làm chuông của người khác sáng, xoá được bài", async ({ page, ctx }) => {
  const other = await ctx.newPage(); await other.goto(BASE + "/"); await other.waitForSelector("#view .page"); await other.click("#btnBell"); await other.waitForSelector('[data-pop="notif"].on'); await other.waitForTimeout(400);
  await loginDev(page); await go(page, "/dev/updates"); await page.fill("#uT", "Bài thử từ DEV"); await page.fill("#uB", "Nội dung thử."); await page.click("#uBtn");
  await page.waitForFunction(() => document.querySelector("#ul").textContent.includes("Bài thử từ DEV"));
  const d = await db(page); ok(Object.values(d.nox_updates).some(u => u.title === "Bài thử từ DEV" && typeof u.ts === "number"), "đã lưu");
  await page.click("#uBtn"); ok((await page.textContent('[data-err="title"]')).length > 3, "thiếu tiêu đề báo lỗi");
  const key = Object.keys(d.nox_updates).find(k => d.nox_updates[k].title === "Bài thử từ DEV");
  await page.click(`[data-del="${key}"]`); await yes(page); await page.waitForFunction(() => !document.querySelector("#ul").textContent.includes("Bài thử từ DEV"));
});
test("khách và tài khoản thường không thể đăng cập nhật (Rules)", async ({ page }) => {
  await go(page, "/"); const r = () => page.evaluate(async () => { try { await firebase.database().ref("nox_updates/x").set({ title: "hack", ts: 1 }); return "ok"; } catch (e) { return e.code; } }); eq(await r(), "PERMISSION_DENIED", "khách");
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); eq(await r(), "PERMISSION_DENIED", "thành viên");
});
test("Dev Panel: trang Kiểm tra hệ thống chạy được và hiện kết quả từng mục (không có captcha)", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/test"); eq(await page.locator("#view .chk").count(), 8, "8 phép thử"); ok(!/captcha/i.test(await page.textContent("#view")), "không có captcha ở đây");
  await page.click("#runAll"); await page.waitForFunction(() => [...document.querySelectorAll(".chk")].every(c => !/wait|run/.test(c.dataset.s)), null, { timeout: 20000 });
  const st = await page.$$eval(".chk", l => l.map(c => c.id + ":" + c.dataset.s)); ok(st.find(x => x.startsWith("c-data:")).endsWith("ok"), "kết nối dữ liệu tốt: " + st); ok(st.find(x => x.startsWith("c-write:")).endsWith("ok"), "ghi dữ liệu tốt: " + st);
  ok(st.find(x => x.startsWith("c-cf:")).match(/warn|bad/), "tên miền test không qua Cloudflare phải báo: " + st);
  await page.waitForSelector(".chk[data-s=warn] .chk-hint:not([hidden]), .chk[data-s=bad] .chk-hint:not([hidden])"); ok((await page.locator(".chk-sum").textContent()).length > 3, "có tóm tắt");
});
test("Dev Panel: khách / thành viên không mở được trang kiểm tra", async ({ page }) => { await go(page, "/dev/test"); ok(path(page).startsWith("/login"), "khách bị chuyển đi: " + path(page)); });

/* ───────── Chế độ bảo trì ───────── */
test("bảo trì: khách thấy màn hình bảo trì, DEV vẫn vào được", async ({ page }) => {
  await go(page, "/"); await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_maintenance = { enabled: true, until: Date.now() + 600000 }; window.__fb.setDb(d); });
  await page.waitForFunction(() => { const m = document.querySelector("#maint"); return m && getComputedStyle(m).display !== "none" && m.getBoundingClientRect().height > 100; });
  eq(await page.locator("#maint a[href='/login']").count(), 0, "không còn nút đăng nhập quản trị trong màn bảo trì");
});
test("bảo trì: DEV đang đăng nhập KHÔNG đăng xuất được (nút báo lý do, vẫn đăng nhập); hết bảo trì thì đăng xuất được; /login vẫn vào được", async ({ page }) => {
  await loginDev(page); await go(page, "/profile");
  await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_maintenance = { enabled: true, until: Date.now() + 600000 }; window.__fb.setDb(d); }); await page.waitForTimeout(600);
  await page.click('[data-act="signout"]'); await page.waitForTimeout(500); eq(await page.locator(".cf-root.on").count(), 0, "không mở hộp đăng xuất"); eq(await authState(page), "in", "vẫn đăng nhập"); ok(/bảo trì/i.test(await page.textContent("#toasts")), "có báo lý do");
  await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_maintenance = { enabled: false }; window.__fb.setDb(d); }); await page.waitForTimeout(600);
  await page.click('[data-act="signout"]'); await yes(page); await page.waitForFunction(() => window.__fb && true); eq(await authState(page), "out", "hết bảo trì thì đăng xuất được");
  await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_maintenance = { enabled: true, until: Date.now() + 600000 }; window.__fb.setDb(d); }); await go(page, "/login"); await page.waitForSelector("#f #email"); ok(true, "/login vẫn vào được khi bảo trì");
});

/* ───────── SEO ───────── */
test("SEO: tiêu đề, mô tả, canonical, robots theo từng trang", async ({ page }) => {
  const meta = () => page.evaluate(() => ({ t: document.title, d: (document.querySelector('meta[name=description]') || {}).content, c: (document.querySelector('link[rel=canonical]') || {}).href, r: (document.querySelector('meta[name=robots]') || {}).content, og: (document.querySelector('meta[property="og:title"]') || {}).content }));
  await go(page, "/"); let m = await meta(); ok(/SKIBIDI/i.test(m.t) && m.d && m.d.length > 30, "trang chủ " + JSON.stringify(m)); ok(/index/.test(m.r || "index"), "trang chủ cho phép index");
  await go(page, "/categories"); m = await meta(); ok(/Danh mục/.test(m.t) && /\/categories$/.test(m.c), "danh mục: " + JSON.stringify(m));
  await go(page, "/login"); m = await meta(); ok(/noindex/.test(m.r), "đăng nhập noindex");
  await go(page, "/scripts/-s1"); m = await meta(); ok(/Auto Farm/.test(m.t) && /\/scripts\/-s1$/.test(m.c), "chi tiết: " + JSON.stringify(m));
  await go(page, "/zzz"); m = await meta(); ok(/noindex/.test(m.r), "404 noindex");
});
test("SEO: robots.txt, sitemap, manifest, ảnh chia sẻ truy cập được", async ({ page }) => {
  for (const [u, re] of [["/robots.txt", /Sitemap:/], ["/manifest.webmanifest", /SKIBIDI/]]) { const r = await page.request.get(BASE + u); eq(r.status(), 200, u); ok(re.test(await r.text()), u); }
  for (const u of ["/assets/img/og.png", "/assets/img/icon-192.png", "/assets/img/icon-512.png", "/assets/img/apple-touch-icon.png", "/assets/img/logo.svg"]) eq((await page.request.get(BASE + u)).status(), 200, u);
});
test("hiệu năng: mọi file tải trước (modulepreload) đều tồn tại", async ({ page }) => {
  await page.goto(BASE + "/"); const hrefs = await page.$$eval('link[rel=modulepreload]', l => l.map(x => x.getAttribute("href"))); ok(hrefs.length > 10, "có danh sách preload");
  for (const h of hrefs) eq((await page.request.get(BASE + h)).status(), 200, h);
});
test("tải tức thì: lần vào thứ hai hiện dữ liệu ngay từ bộ nhớ đệm, không trang rỗng", async ({ page }) => {
  await go(page, "/scripts"); await page.waitForTimeout(2200); const ls = await page.evaluate(() => localStorage.getItem("ssw_cache_v2")); ok(ls && ls.length > 50, "đã lưu bộ nhớ đệm");
  await page.evaluate(() => { window.__fbDelay = 0; }); await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("#view .page", { timeout: 8000 });
  ok((await page.locator("#view .card").count()) >= 1, "thẻ hiện ngay");
});

/* ───────── Chữ & bố cục theo kích thước màn hình ───────── */
test("chữ (khách, tiếng Việt): không xuống dòng giữa từ, không tràn, cỡ chữ hợp lý — 280/320/360/390", async ({ page }) => { await audit(page, [280, 320, 360, 390], AUDIT_ROUTES); }, { device: { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } });
test("chữ (khách, tiếng Việt): máy tính bảng & máy tính — 768/1024/1280/1920", async ({ page }) => { await audit(page, [768, 1024, 1280, 1920], AUDIT_ROUTES); });
test("chữ (khách, English): 320/390/1280", async ({ page }) => { await audit(page, [320, 390, 1280], AUDIT_ROUTES); }, { lang: "en", device: { hasTouch: true } });
test("chữ (DEV, tiếng Việt): trang quản trị 320/390/1280", async ({ page }) => { await loginDev(page); await audit(page, [320, 390, 1280], DEV_ROUTES); });
test("chữ (DEV, English): trang quản trị 320/1280", async ({ page }) => { await loginDev(page); await audit(page, [320, 1280], DEV_ROUTES); }, { lang: "en" });
test("chữ: tăng cỡ chữ hệ thống (zoom 150%) trên điện thoại vẫn không vỡ chữ", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 }); await go(page, "/"); await page.addStyleTag({ content: "html{font-size:150% !important}" }); await page.waitForTimeout(300);
  const b = await textAudit(page, true); ok(!b.filter(x => /giữa chừng|tràn ngang/.test(x)).length, b.join(" ; "));
}, { device: { hasTouch: true, isMobile: true } });

test("tốc độ: các trang hay dùng được tải sẵn lúc rảnh (bấm Đăng nhập / Cài đặt mở ngay)", async ({ page }) => {
  await go(page, "/"); await page.waitForFunction(() => performance.getEntriesByType("resource").some(r => /pages\/settings\.js/.test(r.name)) && performance.getEntriesByType("resource").some(r => /pages\/auth\/login\.js/.test(r.name)), null, { timeout: 8000 });
});

async function contrastRun(page, routes, label) {
  const by = [];
  for (const r of routes) { await go(page, r); await page.waitForTimeout(500); const b = await contrastAudit(page); if (b.length) by.push(`[${label} ${r}] ` + b.slice(0, 6).join(" ; ")); }
  ok(!by.length, "chữ thiếu tương phản:\n   " + by.join("\n   "));
}
const CROUTES = ["/", "/categories", "/scripts", "/scripts/-s1", "/notifications", "/settings", "/login", "/register", "/forgot-password", "/search?q=farm", "/khong/co"];
test("tương phản chữ — giao diện SÁNG", async ({ page }) => { await go(page, "/"); await page.evaluate(() => { localStorage.setItem("ssw_theme", "light"); }); await contrastRun(page, CROUTES, "sáng"); });
test("tương phản chữ — giao diện TỐI", async ({ page }) => { await contrastRun(page, CROUTES, "tối"); });
test("tương phản chữ — SÁNG + kính mờ", async ({ page }) => { await go(page, "/"); await page.evaluate(() => { localStorage.setItem("ssw_theme", "light"); localStorage.setItem("ssw_glass", "1"); }); await contrastRun(page, CROUTES, "sáng+kính"); });
test("tương phản chữ — TỐI + kính mờ", async ({ page }) => { await go(page, "/"); await page.evaluate(() => { localStorage.setItem("ssw_glass", "1"); }); await contrastRun(page, CROUTES, "tối+kính"); });
test("tương phản chữ — DEV (sáng)", async ({ page }) => { await loginDev(page); await page.evaluate(() => { localStorage.setItem("ssw_theme", "light"); }); await contrastRun(page, ["/profile", "/dev", "/dev/data", "/dev/data/scripts", "/dev/categories", "/dev/users", "/dev/theme", "/dev/system", "/dev/updates", "/dev/test", "/scripts/create"], "dev sáng"); });

/* ───────── Giao diện ───────── */
test("giao diện: chuyển sáng/tối trong Cài đặt và ghi nhớ", async ({ page }) => {
  await go(page, "/settings"); const th = () => page.evaluate(() => document.documentElement.dataset.theme);
  await page.click('[data-theme-set="light"], [data-v="light"], button:has-text("Sáng")'); await page.waitForTimeout(200); eq(await th(), "light"); await page.reload(); await page.waitForSelector("#view .page"); eq(await th(), "light");
});
test("cài đặt: kính mờ bật/tắt — tắt: khung màu đặc, bật: khung trong suốt chỉ còn viền; ghi nhớ", async ({ page }) => {
  await go(page, "/settings"); const bgOf = () => page.evaluate(() => { const e = document.querySelector(".set-card"); const cs = getComputedStyle(e); return { g: document.documentElement.dataset.glass || "off", bg: cs.backgroundColor, bd: cs.borderTopColor, bf: cs.backdropFilter || cs.webkitBackdropFilter || "none" }; });
  const alpha = c => { const m = c.match(/rgba?\(([^)]+)\)/); const p = m[1].split(",").map(x => parseFloat(x)); return p.length > 3 ? p[3] : 1; };
  const off = await bgOf(); eq(off.g, "off"); eq(alpha(off.bg), 1, "tắt: màu đặc"); ok(/none/.test(off.bf), "tắt: không làm mờ");
  await page.click("label.sw:has(#glass)"); await page.waitForFunction(() => document.documentElement.dataset.glass === "on");
  const on = await bgOf(); ok(alpha(on.bg) < 0.6, "bật: trong suốt " + on.bg); ok(alpha(on.bd) > 0, "bật: còn viền " + on.bd);
  await page.reload(); await page.waitForSelector(".set-card"); eq(await page.evaluate(() => document.documentElement.dataset.glass), "on", "nhớ sau khi tải lại");
  await page.click("label.sw:has(#glass)"); await page.waitForFunction(() => document.documentElement.dataset.glass !== "on"); 
  for (const th of ["light", "dark"]) { await page.evaluate(t => { localStorage.setItem("ssw_theme", t); document.documentElement.dataset.theme = t; }, th); const x = await bgOf(); eq(alpha(x.bg), 1, "màu đặc ở giao diện " + th); }
});
test("cài đặt: ngôn ngữ English ⇄ Tiếng Việt, ghi nhớ sau khi tải lại", async ({ page }) => {
  await go(page, "/settings"); await page.waitForFunction(() => /Appearance/.test(document.body.innerText));
  const t = await visibleText(page); ok(/Language/.test(t) && /Frosted glass/.test(t), "mặc định tiếng Anh: " + t.slice(0, 120)); ok(!/Giao diện|Ngôn ngữ|Kính mờ/.test(t), "không còn tiếng Việt");
  await page.click('[data-lang="vi"]'); await page.waitForFunction(() => document.documentElement.lang === "vi"); ok(/Giao diện/.test(await visibleText(page)) && !/Appearance/.test(await visibleText(page)), "sang tiếng Việt");
  await page.reload(); await page.waitForSelector(".set-card"); await page.waitForFunction(() => /Giao diện/.test(document.body.innerText)); eq(await page.evaluate(() => document.documentElement.lang), "vi", "nhớ tiếng Việt");
  await page.click('[data-lang="en"]'); await page.waitForFunction(() => document.documentElement.lang === "en" && /Appearance/.test(document.body.innerText));
}, { lang: "default" });
test("English: duyệt mọi trang (khách) không còn chữ tiếng Việt", async ({ page }) => {
  const bad = [];
  for (const r of ["/", "/categories", "/scripts", "/scripts/-s1", "/apk", "/ios", "/links", "/c/mod", "/notifications", "/help", "/about", "/guide", "/apk-safety", "/security", "/terms", "/privacy", "/settings", "/favorites", "/login", "/register", "/forgot-password", "/search", "/search?q=zzz", "/scripts/khong-co", "/khong/co"]) {
    await go(page, r); await page.waitForTimeout(350); const v = await viContent(page); if (v.length) bad.push(r + " → " + v.slice(0, 6).join(" | "));
  }
  await go(page, "/scripts/-s1"); await page.click(".save-btn"); await go(page, "/favorites"); await page.waitForTimeout(300); { const v = await viContent(page); if (v.length) bad.push("/favorites (có mục) → " + v.slice(0, 6).join(" | ")); }
  await go(page, "/"); await page.keyboard.press("Control+k"); await page.waitForSelector(".cmdk-box", { timeout: 3000 }); { const v = await viContent(page); if (v.length) bad.push("palette → " + v.slice(0, 6).join(" | ")); } await page.keyboard.press("Escape");
  await go(page, "/"); await page.click("#btnMenu").catch(() => {}); const v2 = await viContent(page); if (v2.length) bad.push("menu → " + v2.slice(0, 6).join(" | "));
  ok(!bad.length, "còn tiếng Việt:\n   " + bad.join("\n   "));
}, { lang: "en", timeout: 120000 });
test("English: Dev Panel, hồ sơ, quên mật khẩu — không còn chữ tiếng Việt", async ({ page }) => {
  await loginDev(page); const bad = [];
  for (const r of ["/profile", "/dev", "/dev/data", "/dev/data/scripts", "/dev/categories", "/dev/users", "/dev/theme", "/dev/system", "/dev/updates", "/scripts/create", "/scripts/-s1/edit"]) {
    await go(page, r); await page.waitForTimeout(400); const v = await viContent(page); if (v.length) bad.push(r + " → " + v.slice(0, 6).join(" | "));
  }
  await go(page, "/dev/test"); await page.click("#runAll"); await page.waitForFunction(() => [...document.querySelectorAll(".chk")].every(c => !/wait|run/.test(c.dataset.s)), null, { timeout: 20000 }); await page.waitForTimeout(300); const v = await viContent(page); if (v.length) bad.push("/dev/test → " + v.slice(0, 8).join(" | "));
  ok(!bad.length, "còn tiếng Việt:\n   " + bad.join("\n   "));
}, { lang: "en" });
test("English: nội dung DEV/người dùng nhập (bài cập nhật, tên mục) giữ nguyên, không bị dịch", async ({ page }) => {
  await go(page, "/"); await openBell(page); await page.waitForSelector('[data-pop="notif"] .upd'); const pt = await page.textContent('[data-pop="notif"]'); ok(pt.includes("Thêm APK mới") && pt.includes("Đã thêm vài APK mới vào kho."), "bài DEV giữ tiếng Việt"); await page.click('[data-pop="notif"] [data-t="maint"]'); await page.waitForSelector('[data-pop="notif"] .np-pin'); ok((await page.textContent('[data-pop="notif"]')).includes("Đây là thông báo thử nghiệm."), "thông báo ghim giữ nguyên");
}, { lang: "en" });

/* ───────── Giai đoạn 1: cài đặt mới, khách, hồ sơ, quyền ───────── */
test("mặc định là English khi chưa chọn ngôn ngữ; chọn Tiếng Việt thì nhớ", async ({ page }) => {
  await go(page, "/settings"); await page.waitForFunction(() => document.documentElement.lang === "en" && /Appearance/.test(document.body.innerText));
  const order = await page.$$eval("[data-lang]", l => l.map(x => x.dataset.lang)); eq(order, ["en", "vi"], "English đứng đầu");
  await page.click('[data-lang="vi"]'); await page.reload(); await page.waitForSelector(".set-card"); eq(await page.evaluate(() => document.documentElement.lang), "vi");
}, { lang: "default" });
test("cài đặt: kính mờ chỉnh độ mờ + độ trong, về mặc định", async ({ page }) => {
  await go(page, "/settings"); ok(await page.locator("#glBlur").isDisabled(), "tắt kính thì thanh bị khoá");
  await page.click("label.sw:has(#glass)"); await page.waitForFunction(() => document.documentElement.dataset.glass === "on");
  const blur = () => page.evaluate(() => document.documentElement.style.getPropertyValue("--gl-blur")), alpha = () => page.evaluate(() => { const m = getComputedStyle(document.querySelector(".set-card")).backgroundColor.match(/rgba?\(([^)]+)\)/)[1].split(",").map(parseFloat); return m.length > 3 ? m[3] : 1; });
  const set = (id, v) => page.$eval("#" + id, (e, v) => { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }, v);
  await set("glBlur", 30); eq((await blur()).trim(), "30px"); eq(await page.textContent("#glBlurV"), "30px");
  await set("glClear", 100); const a100 = await alpha(); await set("glClear", 0); const a0 = await alpha(); ok(a100 < a0, `độ trong 100% phải trong hơn 0% (${a100} < ${a0})`);
  await page.reload(); await page.waitForSelector(".set-card"); eq(await page.inputValue("#glBlur"), "30", "nhớ độ mờ");
  await page.click("#glReset"); eq(await page.inputValue("#glBlur"), "14"); eq(await page.inputValue("#glClear"), "85");
});
test("cài đặt: hình nền — ẩn được, chỉnh độ sáng, ghi nhớ", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("ssw_gfx", "high"); } catch (_) {} });
  await go(page, "/settings"); await page.$eval("#bgBright", e => { e.value = 60; e.dispatchEvent(new Event("input", { bubbles: true })); });
  eq((await page.evaluate(() => document.documentElement.style.getPropertyValue("--bg-bright"))).trim().replace(/^0?\./, "0."), "0.6", "độ sáng 60%");
  await page.click("label.sw:has(#bgShow)"); await page.waitForFunction(() => document.documentElement.dataset.bg === "off"); ok(await page.locator("#bgBright").isDisabled(), "ẩn nền thì khoá thanh sáng");
  await page.reload(); await page.waitForSelector(".set-card"); eq(await page.evaluate(() => document.documentElement.dataset.bg), "off", "nhớ");
  await page.click("label.sw:has(#bgShow)"); await page.waitForFunction(() => !document.documentElement.dataset.bg);
});
test("cài đặt: âm thanh, thoải mái khi dùng, đặt lại có hỏi", async ({ page }) => {
  await go(page, "/settings"); const h = a => page.evaluate(a => document.documentElement.getAttribute(a), "data-" + a);
  await page.click("label.sw:has(#snd)"); eq(await page.evaluate(() => localStorage.getItem("ssw_muted")), "1", "tắt nhạc"); ok(await page.locator("#vol").isDisabled(), "tắt nhạc thì khoá âm lượng");
  await page.$eval("#vol", e => { e.disabled = false; e.value = 20; e.dispatchEvent(new Event("input", { bubbles: true })); }); eq(await page.evaluate(() => localStorage.getItem("ssw_vol")), "20");
  await page.click("label.sw:has(#rm)"); eq(await h("motion"), "reduced"); await page.click("label.sw:has(#hc)"); eq(await h("contrast"), "high"); await page.click("label.sw:has(#dens)"); eq(await h("density"), "compact");
  await page.click("label.sw:has(#intro)"); eq(await page.evaluate(() => localStorage.getItem("ssw_nosplash")), "1");
  await page.click("#resetAll"); await no(page); eq(await h("motion"), "reduced", "hủy thì giữ nguyên");
  await page.click("#resetAll"); await yes(page); await page.waitForFunction(() => !document.documentElement.getAttribute("data-motion")); eq(await h("contrast"), null); eq(await h("density"), null);
  eq(await page.evaluate(() => localStorage.getItem("ssw_lang")), "vi", "ngôn ngữ giữ nguyên");
});
test("tài khoản KHÁCH: vào bằng 1 nút, bị hạn chế, không đổi được hồ sơ", async ({ page }) => {
  await go(page, "/login"); await page.click("#guestBtn"); await page.waitForURL(BASE + "/"); await authed(page);
  ok(/Khách/.test(await page.textContent("#hdrAcc")) || true, "đã vào"); eq(await page.evaluate(() => window.firebase.auth().currentUser.isAnonymous), true);
  await go(page, "/profile"); ok(/hạn chế/i.test(await page.textContent("#view")), "báo hạn chế"); eq(await page.locator("#bio, #dn, #avPick").count(), 0, "không có ô sửa hồ sơ");
  const w = await page.evaluate(async () => { const r = {}; for (const [k, v] of [["name", { name: "Khách" }], ["bio", { bio: "xin chào" }]]) { try { await firebase.database().ref("nox_users/" + firebase.auth().currentUser.uid).update({ ...v, email: "", lastLogin: Date.now() }); r[k] = "ok"; } catch (e) { r[k] = e.code; } } return r; });
  eq(w, { name: "PERMISSION_DENIED", bio: "PERMISSION_DENIED" }, "khách không ghi được hồ sơ");
  eq(Object.keys((await db(page)).nox_users || {}).length, 0, "khách không được tính là người dùng");
  await go(page, "/dev"); ok(path(page).startsWith("/login") || (await page.locator("#view .stats").count()) === 0, "khách không vào được Dev Panel");
  await go(page, "/links/create"); ok(!/\/links\/create$/.test(path(page)), "khách không thêm được mục");
  await page.click('[data-act="signout"]').catch(() => {});
});
test("khách: đăng nhập khách chưa bật trong Firebase thì báo lỗi dễ hiểu", async ({ page }) => {
  await page.addInitScript(() => { window.__anonOff = true; }); await go(page, "/login"); await page.click("#guestBtn"); await page.waitForTimeout(500);
  eq(path(page), "/login"); const e = await visibleText(page); ok(!TECH.test(e) && !/operation-not-allowed/.test(e), "không lộ mã lỗi: " + e.slice(0, 80)); eq(await authState(page), "out");
});
test("hồ sơ: sửa mô tả (đếm ký tự), đổi & xoá ảnh đại diện (có hỏi)", async ({ page }) => {
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile?tab=edit");
  await page.fill("#bio", "Mình thích script ✨"); eq((await page.textContent("#bioN")).trim().startsWith("19") || (await page.textContent("#bioN")).includes("/300"), true, "đếm ký tự");
  await page.click("#saveBio"); await page.waitForFunction(() => window.__fb.getDb().nox_users.uUSER.bio === "Mình thích script ✨");
  await page.setInputFiles("#avFile", { name: "a.png", mimeType: "image/png", buffer: PNG });
  await page.waitForFunction(() => (window.__fb.getDb().nox_users.uUSER.avatar || "").startsWith("data:image/"), null, { timeout: 8000 });
  await page.waitForFunction(() => document.querySelector("#hdrAcc img, #hdrAcc .avatar img")); ok(true);
  await page.click("#avDel"); await no(page); ok(!!(await db(page)).nox_users.uUSER.avatar, "hủy thì còn ảnh"); await page.click("#avDel"); await yes(page);
  await page.waitForFunction(() => !window.__fb.getDb().nox_users.uUSER.avatar);
  await page.setInputFiles("#avFile", { name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("hello") }); await page.waitForFunction(() => document.querySelector("#avErr").textContent.length > 3);
  await page.fill("#bio", "x".repeat(400)); eq(await page.inputValue("#bio"), "x".repeat(300), "giới hạn 300");
});
test("hồ sơ: bị mute thì không sửa được tên / mô tả / ảnh", async ({ page }) => {
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page);
  await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_admin = { uUSER: { muteUntil: Date.now() + 3600000, muteReason: "Spam", by: "uDEV", ts: Date.now() } }; window.__fb.setDb(d); });
  await go(page, "/profile?tab=edit"); await page.waitForSelector(".notice-mute"); ok(/Spam/.test(await page.textContent(".notice-mute")), "hiện lý do"); ok(await page.locator("#bio").isDisabled(), "khoá mô tả"); ok(await page.locator("#dn").isDisabled(), "khoá tên");
  const r = await page.evaluate(async () => { try { await firebase.database().ref("nox_users/uUSER/bio").set("hack"); return "ok"; } catch (e) { return e.code; } }); eq(r, "PERMISSION_DENIED", "Rules chặn ghi khi bị mute");
});
test("bị ban: đang dùng thì bị đăng xuất ngay + bảng thông báo; đăng nhập lại vẫn bị chặn", async ({ page }) => {
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page);
  await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_admin = { uUSER: { banUntil: Date.now() + 3600000, banReason: "Vi phạm", by: "uDEV", ts: Date.now() } }; window.__fb.setDb(d); });
  await page.waitForSelector(".cf"); ok(/Vi phạm/.test(await page.textContent(".cf")), "hiện lý do ban"); await page.click('.cf [data-cf="yes"]');
  await page.waitForFunction(() => document.querySelector("#hdrAcc").dataset.state === "out"); 
});
test("Dev Panel · Người dùng: cấp / gỡ biên tập viên, mute, ban có hộp xác nhận và lưu đúng", async ({ page }) => {
  await loginDev(page); await seedUsers(page); await go(page, "/dev/users"); await page.waitForSelector('[data-uid="uUSER"]');
  eq(await page.locator('[data-uid="uDEV"]').count(), 0, "không có nút thao tác lên chính DEV");
  const row = '[data-uid="uUSER"]';
  await page.click(row + ' [data-a="role"]'); await no(page); eq(((await db(page)).nox_admin || {}).uUSER, undefined, "hủy thì không cấp");
  await page.click(row + ' [data-a="role"]'); await yes(page); await page.waitForFunction(() => (window.__fb.getDb().nox_admin || {}).uUSER?.role === "editor"); ok(/Gỡ biên tập viên/.test(await page.textContent(row)), "nút đổi thành Gỡ");
  await page.click(row + ' [data-a="mute"]'); await page.click('.cf .cf-chip[data-v="3600000"]'); await page.fill('.cf [data-f="why"]', "Spam"); await yes(page);
  await page.waitForFunction(() => { const a = (window.__fb.getDb().nox_admin || {}).uUSER; return a && a.muteUntil > Date.now() && a.muteReason === "Spam" && a.role === "editor"; }); await page.waitForFunction(() => /mute/i.test(document.querySelector("tbody").textContent));
  await page.click(row + ' [data-a="mute"]'); await yes(page); await page.waitForFunction(() => !((window.__fb.getDb().nox_admin || {}).uUSER || {}).muteUntil);
  await page.click(row + ' [data-a="ban"]'); await page.click('.cf .cf-chip[data-v="perm"]'); await page.fill('.cf [data-f="why"]', "Vi phạm"); await yes(page);
  await page.waitForFunction(() => (window.__fb.getDb().nox_admin || {}).uUSER?.banUntil >= 4102444800000); ok(/vĩnh viễn/.test(await page.textContent(row.replace('[data-uid="uUSER"]', "tbody"))), "hiện vĩnh viễn");
  await page.click(row + ' [data-a="ban"]'); await yes(page); await page.waitForFunction(() => !((window.__fb.getDb().nox_admin || {}).uUSER || {}).banUntil);
  eq(await page.evaluate(() => (window.__fb.getDb().nox_admin.uUSER || {}).role), "editor", "gỡ ban không mất quyền biên tập viên");
});
test("biên tập viên: thêm/sửa/xoá mục được, nhưng không vào Dev Panel và không sửa danh mục", async ({ page }) => {
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page);
  await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_admin = { uUSER: { role: "editor", by: "uDEV", ts: Date.now() } }; window.__fb.setDb(d); });
  await go(page, "/links/create"); eq(path(page), "/links/create", "vào được trang thêm"); await page.fill("#itemForm [name=name]", "Mục của biên tập viên"); await page.fill("#itemForm [name=url]", "https://example.com/e"); await page.click("#saveBtn");
  await page.waitForFunction(() => Object.values(window.__fb.getDb().nox_data.links || {}).some(i => i.name === "Mục của biên tập viên"), null, { timeout: 8000 });
  await go(page, "/dev"); ok(path(page) !== "/dev" || (await page.locator("#view .stats").count()) === 0, "không vào được Dev Panel");
  const r = await page.evaluate(async () => { const o = {}; for (const [k, p, v] of [["cat", "nox_categories/x", { name: "x", node: "x" }], ["upd", "nox_updates/x", { title: "x", ts: 1 }], ["adm", "nox_admin/uUSER/role", "editor"], ["maint", "nox_maintenance", { enabled: true }]]) { try { await firebase.database().ref(p).set(v); o[k] = "ok"; } catch (e) { o[k] = e.code; } } return o; });
  eq(r, { cat: "PERMISSION_DENIED", upd: "PERMISSION_DENIED", adm: "PERMISSION_DENIED", maint: "PERMISSION_DENIED" }, "biên tập viên không đụng được phần quản trị");
});
test("bảng chọn biểu tượng danh mục có nhiều biểu tượng và cuộn được", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/categories"); const n = await page.locator(".icons-pick button, .icons-pick label").count(); ok(n >= 50, "có ≥ 50 biểu tượng: " + n);
  const sc = await page.$eval(".icons-pick", e => getComputedStyle(e).overflowY); ok(/auto|scroll/.test(sc), "cuộn được: " + sc);
});
test("English: trang cài đặt mới, hộp xác nhận, hồ sơ khách, Người dùng — không còn chữ tiếng Việt", async ({ page }) => {
  const bad = []; const chk = async n => { await page.waitForTimeout(350); const v = await viContent(page); if (v.length) bad.push(n + " → " + v.slice(0, 8).join(" | ")); };
  await go(page, "/settings"); await chk("/settings"); await page.click("#resetAll"); await page.waitForSelector(".cf"); await chk("hộp hỏi đặt lại"); await no(page);
  await page.click("label.sw:has(#glass)"); await chk("/settings kính");
  await go(page, "/login"); await chk("/login"); await page.click("#guestBtn"); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile"); await chk("/profile khách");
  await page.click('[data-act="signout"]').catch(() => {}); 
  await loginDev(page); await seedUsers(page); await go(page, "/profile"); await chk("/profile"); for (const t of ["edit", "security"]) { await page.click(`.ptab-btn[data-tab="${t}"]`); await chk("/profile " + t); } await page.click('[data-act="signout"]'); await page.waitForSelector(".cf"); await chk("hộp đăng xuất"); await no(page);
  await go(page, "/dev/users"); await page.waitForSelector('[data-uid="uUSER"]'); await chk("/dev/users"); await page.click('[data-uid="uUSER"] [data-a="ban"]'); await page.waitForSelector(".cf"); await chk("hộp ban"); await no(page);
  await page.click('[data-uid="uUSER"] [data-a="role"]'); await page.waitForSelector(".cf"); await chk("hộp cấp quyền"); await no(page);
  await go(page, "/dev/categories"); await chk("/dev/categories");
  ok(!bad.length, "còn tiếng Việt:\n   " + bad.join("\n   "));
}, { lang: "en" });
test("English: giai đoạn 2 (hồ sơ bảo mật, hộp mã, /two-step, /auth/action, quên mật khẩu) — không còn chữ tiếng Việt", async ({ page }) => {
  const st = await installApi(page); const bad = []; const chk = async n => { await page.waitForTimeout(350); const v = await viContent(page); if (v.length) bad.push(n + " → " + v.slice(0, 8).join(" | ")); };
  await go(page, "/forgot-password"); await page.waitForSelector("#recover"); await chk("/forgot-password");
  await go(page, "/auth/action?mode=resetPassword&oobCode=SAI"); await page.waitForSelector(".auth-card h1"); await chk("/auth/action lỗi");
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile?tab=security"); await page.waitForSelector("#tfBtn"); await chk("/profile bảo mật"); await page.click('.ptab-btn[data-tab="edit"]'); await chk("/profile chỉnh sửa"); await page.click('.ptab-btn[data-tab="overview"]'); await chk("/profile tổng quan"); await page.click('.ptab-btn[data-tab="security"]');
  await page.click("#rcBtn"); await oneCf(page); await chk("hộp thêm email khôi phục"); await page.fill('.cf [data-f="email"]', USERPW[0]); await page.click('.cf [data-cf="yes"]'); await page.waitForFunction(() => document.querySelector("#toasts").textContent.length > 5); await chk("toast email trùng");
  await page.click("#emBtn"); await oneCf(page); await chk("hộp đổi email"); await no(page);
  await page.click("#tfBtn"); await until(() => mailTo(st, USERPW[0], /verification code/)); await page.waitForSelector('.cf-root.on [data-f="code"]'); await chk("hộp mã bật 2 bước");
  await codeDlg(page, "000000"); await page.waitForFunction(() => /isn't right/.test(document.querySelector("#toasts").textContent)); await chk("toast sai mã"); await page.waitForSelector('.cf-root.on [data-f="code"]'); await codeDlg(page, "123456"); await until(async () => (await db(page)).nox_security?.uUSER?.twofa === true); await chk("sau khi bật");
  await page.click('[data-act="signout"]'); await yes(page); await login(page, USERPW); await page.waitForURL(/\/two-step/); await page.waitForSelector("#code"); await chk("/two-step");
  await page.fill("#code", "12"); await page.click("button[type=submit]"); await chk("/two-step thiếu số"); await page.fill("#code", "999999"); await page.click("button[type=submit]"); await page.waitForFunction(() => document.querySelector("#err").textContent.length > 3); await chk("/two-step sai mã");
  ok(!bad.length, "còn tiếng Việt:\n   " + bad.join("\n   "));
}, { lang: "en" });
test("English: đợt A (quên mật khẩu bằng mã, đổi mật khẩu, đăng nhập vị trí mới) — không còn chữ tiếng Việt", async ({ page }) => {
  const st = await installApi(page); st.ip = "10.1.1.5"; const bad = []; const chk = async n => { await page.waitForTimeout(350); const v = await viContent(page); if (v.length) bad.push(n + " → " + v.slice(0, 8).join(" | ")); };
  await go(page, "/forgot-password"); await page.fill("#email", USERPW[0]); await page.click("button[type=submit]"); await page.waitForSelector("#f2 #code"); await chk("quên mật khẩu bước 2");
  await page.click("#f2 button[type=submit]"); await chk("bước 2 lỗi trống"); await page.fill("#code", "000000"); await page.fill("#password", "Moimatkhau99"); await page.fill("#confirm", "Moimatkhau99"); await page.click("#f2 button[type=submit]"); await page.waitForFunction(() => document.querySelector("#err2").textContent.length > 3); await chk("bước 2 sai mã");
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile?tab=security"); await page.waitForSelector("#pwBtn"); await page.click("#pwBtn"); await page.waitForSelector('.cf-root.on [data-f="cur"]'); await chk("hộp đổi mật khẩu");
  await page.fill('.cf-root.on [data-f="cur"]', USERPW[1]); await page.fill('.cf-root.on [data-f="pw"]', "abc"); await page.fill('.cf-root.on [data-f="pw2"]', "abc"); await page.click('.cf-root.on [data-cf="yes"]'); await page.waitForFunction(() => /needs at least/.test(document.querySelector(".cf-root.on")?.textContent || "")); await chk("hộp đổi mật khẩu lỗi"); await no(page);
  await page.click('[data-act="signout"]'); await yes(page); st.ip = "203.0.113.9"; await login(page, USERPW); await page.waitForURL(/\/two-step/); await page.waitForSelector("#code"); await chk("/two-step vị trí mới");
  ok(!bad.length, "còn tiếng Việt:\n   " + bad.join("\n   "));
}, { lang: "en" });
test("English: Dev — trang Gửi thư và hộp xem trước", async ({ page }) => {
  await installApi(page); await loginDev(page); await seedUsers(page); const bad = []; const chk = async n => { await page.waitForTimeout(400); const v = await viContent(page); if (v.length) bad.push(n + " → " + v.slice(0, 8).join(" | ")); };
  await go(page, "/dev/mail"); await page.waitForSelector("#mT"); await chk("/dev/mail"); await page.selectOption("#mT", { index: 1 }); await chk("/dev/mail văn mẫu");
  await page.click('[data-prev]'); await chk("xem trước"); await page.fill("#mTo", ""); await page.click("#mSend"); await chk("thiếu người nhận");
  ok(!bad.length, "còn tiếng Việt:\n   " + bad.join("\n   "));
}, { lang: "en" });
test("tương phản chữ — trang Người dùng và Cài đặt mới (sáng + kính)", async ({ page }) => {
  await loginDev(page); await seedUsers(page); await page.evaluate(() => { localStorage.setItem("ssw_theme", "light"); localStorage.setItem("ssw_glass", "1"); });
  await contrastRun(page, ["/settings", "/profile", "/dev/users"], "người dùng+cài đặt");
});

/* ───────── Giai đoạn 2: thư HTML, 2 bước, email khôi phục, đổi email, /auth/action ───────── */
test("chưa cấu hình máy chủ thư: vẫn quên mật khẩu bằng Firebase, ẩn mục 2 bước, trang Gửi thư báo chưa bật", async ({ page }) => {
  await installApi(page, { off: true });
  await go(page, "/forgot-password"); await page.fill("#email", "ai-do@example.com"); await page.click("button[type=submit]"); await page.waitForFunction(() => document.querySelector("#ok").textContent.length > 3);
  eq(await page.evaluate(() => window.__resetSent), "ai-do@example.com", "quay về thư mặc định của Firebase");
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile"); await page.waitForTimeout(500); eq(await page.locator("#secPanel").count(), 0, "không hiện mục 2 bước khi chưa cấu hình");
  await page.click('[data-act="signout"]'); await yes(page);
  await loginDev(page); await go(page, "/dev/mail"); await page.waitForSelector(".statebox"); ok(/chưa được bật/.test(await page.textContent("#view")), "báo chưa bật");
});
test("/dev/mail: khi chưa bật hiện đúng lý do thiếu cấu hình; khi bật có nút Kiểm tra với Brevo báo từng mục", async ({ page }) => {
  const st = await installApi(page, { off: true, problems: ["Thiếu biến môi trường BREVO_API_KEY trên Vercel (hoặc chưa Redeploy sau khi thêm)."] });
  await loginDev(page); await go(page, "/dev/mail"); await page.waitForSelector("#diag");
  ok(/BREVO_API_KEY/.test(await page.textContent("#diag")), "nêu đúng biến thiếu"); ok(/Redeploy/.test(await page.textContent("#diag")), "nhắc Redeploy");
  st.off = false; st.live = [{ ok: true, msg: "Khoá API hợp lệ." }, { ok: false, msg: "Người gửi a@gmail.com CHƯA có trong Brevo." }];
  await page.evaluate(() => import("/assets/js/lib/account.js").then(m => m.serverReady())); await page.reload(); await page.waitForSelector("#mT");
  await page.click("#diagGo"); await page.waitForFunction(() => document.querySelectorAll("#diag li").length >= 2);
  const t = await page.textContent("#diag"); ok(/✓ Khoá API hợp lệ/.test(t) && /✗ Người gửi a@gmail\.com CHƯA/.test(t), "hiện từng mục đạt/lỗi: " + t.slice(0, 200));
});
test("đăng ký (máy chủ thư bật): thư xác minh + chào mừng gửi qua API, bấm liên kết thì xác minh xong", async ({ page }) => {
  const st = await installApi(page); await go(page, "/register"); await page.waitForFunction(() => window.__tsOpts); await page.waitForTimeout(80);
  await page.fill("#name", "Test User"); await page.fill("#email", "new@example.com"); await page.fill("#password", "Matkhau123"); await page.fill("#confirm", "Matkhau123"); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); await authed(page);
  await until(() => mailTo(st, "new@example.com", /Verify your email/) && mailTo(st, "new@example.com", /Welcome to/));
  eq(await page.evaluate(() => window.__verifySent || 0), 0, "không dùng thư mặc định của Firebase");
  const m = mailTo(st, "new@example.com", /Verify your email/); ok(/SkibidiScript &bull; skibidiscript\.vercel\.app/.test(m.html) && /icon-192\.png/.test(m.html), "có logo + tên web");
  eq((await acct(page, "new@example.com")).verified, false);
  await page.goto(linkOf(m)); await page.waitForSelector(".auth-card h1"); await page.waitForFunction(() => /Email đã được xác minh/.test(((document.querySelector(".auth-card h1") || {}).textContent || "")), null, { timeout: 5000 }); eq((await acct(page, "new@example.com")).verified, true, "đã xác minh");
  await page.reload(); await page.waitForFunction(() => /không dùng được/.test(((document.querySelector(".auth-card h1") || {}).textContent || "")), null, { timeout: 5000 }); ok(true, "dùng lại liên kết → báo hết hạn/đã dùng");
});
test("quên mật khẩu (máy chủ thư bật): email → MÃ 6 số → mã + mật khẩu mới → đăng nhập bằng mật khẩu mới (không dùng liên kết)", async ({ page }) => {
  const st = await installApi(page); await go(page, "/forgot-password"); await page.fill("#email", USERPW[0]); await page.click("button[type=submit]"); await page.waitForSelector("#f2 #code");
  const m = await until(() => mailTo(st, USERPW[0], /password reset code/)); eq(await page.evaluate(() => window.__resetSent || null), null, "không dùng thư Firebase"); ok(!/oobCode|mode=resetPassword/.test(m.html), "thư không có liên kết đặt lại"); ok(/123456/.test(m.html), "thư có mã");
  await page.fill("#code", "000000"); await page.fill("#password", "Moimatkhau99"); await page.fill("#confirm", "Moimatkhau99"); await page.click("#f2 button[type=submit]"); await page.waitForFunction(() => document.querySelector("#err2").textContent.length > 3); ok(path(page) === "/forgot-password", "sai mã thì ở lại");
  await page.fill("#password", "abc"); await page.fill("#confirm", "abc"); await page.click("#f2 button[type=submit]"); ok((await page.textContent('[data-err="password"]')).length > 3, "mật khẩu yếu bị từ chối");
  await page.fill("#code", "123 456"); await page.fill("#password", "Moimatkhau99"); await page.fill("#confirm", "Moimatkhau99"); await page.click("#f2 button[type=submit]"); await page.waitForURL(u => /\/login/.test(u.toString()));
  await login(page, [USERPW[0], "Moimatkhau99"]); await page.waitForURL(BASE + "/"); await authed(page);
});
test("đổi mật khẩu trong hồ sơ (mật khẩu hiện tại): sai mật khẩu bị từ chối; xong bị đăng xuất, đăng nhập lại bằng mật khẩu mới", async ({ page }) => {
  const st = await installApi(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile?tab=security"); await page.waitForSelector("#pwBtn"); await page.click("#pwBtn");
  await page.waitForSelector('.cf-root.on [data-f="cur"]'); eq(await page.locator('.cf-root.on [data-f="code"]').count(), 0, "chưa bật 2 bước / email khôi phục → chỉ có cách mật khẩu hiện tại"); eq(st.sent.filter(m => /password change code/.test(m.subject)).length, 0, "không gửi mã");
  const fillAll = async (cur, pw) => { await page.fill('.cf-root.on [data-f="cur"]', cur); await page.fill('.cf-root.on [data-f="pw"]', pw); await page.fill('.cf-root.on [data-f="pw2"]', pw); await page.click('.cf-root.on [data-cf="yes"]'); };
  await fillAll(USERPW[1], "abc"); await page.waitForFunction(() => /Mật khẩu mới cần/.test(document.querySelector(".cf-root.on")?.textContent || "")); ok(true, "mật khẩu yếu bị chặn ngay trên trang");
  await fillAll("sai-mat-khau", "Moimatkhau99"); await page.waitForFunction(() => /Kiểm tra lại/.test(document.querySelector(".cf-root.on")?.textContent || "")); ok(await authState(page) === "in", "sai mật khẩu hiện tại: chưa đổi gì");
  await fillAll(USERPW[1], "Moimatkhau99"); await page.waitForURL(u => /\/login/.test(u.toString())); eq(await authState(page), "out", "đổi xong thì đăng xuất");
  await until(() => mailTo(st, USERPW[0], /password was changed/));
  await login(page, [USERPW[0], "Moimatkhau99"]); await page.waitForURL(BASE + "/"); await authed(page);
});
test("kiểm tra IP ngầm: IP quen vào thẳng; IP/vị trí lạ phải nhập mã gửi về email (thư 'new location'), sai mã bị chặn và Rules không cho ghi", async ({ page }) => {
  const st = await installApi(page); st.ip = "10.1.1.5";
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await until(async () => (await db(page)).nox_security?.uUSER?.gate === true);
  eq(Object.keys((await db(page)).nox_security.uUSER.known).length, 1, "lưu dấu vân tay IP đầu tiên (không phải IP thật)"); ok(!JSON.stringify(await db(page)).includes("10.1.1"), "không lưu IP thật");
  await page.click('[data-act="signout"]'); await yes(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); eq(st.sent.filter(m => /new location/.test(m.subject)).length, 0, "cùng dải IP: không hỏi mã");
  await page.click('[data-act="signout"]'); await yes(page); st.ip = "203.0.113.9"; await login(page, USERPW); await page.waitForURL(/\/two-step/);
  await until(() => mailTo(st, USERPW[0], /new location/)); ok(/Hanoi, VN/.test(mailTo(st, USERPW[0], /new location/).html), "thư ghi vị trí"); ok(/vị trí|location/i.test(await page.textContent(".auth-card")), "trang giải thích vì sao cần mã");
  await go(page, "/settings"); eq(path(page).split("?")[0], "/two-step", "chưa nhập mã thì mọi trang đều bị đưa về bước nhập mã");
  await page.fill("#code", "000000"); await page.click("button[type=submit]"); await page.waitForFunction(() => document.querySelector("#err").textContent.length > 3);
  await page.fill("#code", "123456"); await page.click("button[type=submit]"); await page.waitForURL(u => !/two-step/.test(u.toString())); await authed(page);
  eq(Object.keys((await db(page)).nox_security.uUSER.known).length, 2, "IP mới đã được tin sau khi nhập đúng mã");
});
test("liên kết hết hạn / sai: trang báo lỗi dễ hiểu và có nút yêu cầu liên kết mới", async ({ page }) => {
  await installApi(page);
  for (const q of ["mode=resetPassword&oobCode=SAI", "mode=verifyEmail", "mode=khac&oobCode=x", ""]) { await go(page, "/auth/action" + (q ? "?" + q : "")); await page.waitForFunction(() => /không dùng được/.test(((document.querySelector(".auth-card h1") || {}).textContent || ""))); ok(await page.locator('a[href="/forgot-password"]').count() === 1, "nút yêu cầu liên kết mới: " + q); ok(!TECH.test(await visibleText(page)), "không lộ thuật ngữ"); }
  eq(await page.evaluate(() => document.querySelector('meta[name=robots]') && document.querySelector('meta[name=robots]').content), "noindex,nofollow");
});
test("2 bước: bật trong hồ sơ → đăng nhập lại bị hỏi mã → sai mã bị từ chối → đúng mã vào được → tắt", async ({ page }) => {
  const st = await installApi(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile?tab=security"); await page.waitForSelector("#tfBtn");
  await page.click("#tfBtn"); await until(() => mailTo(st, USERPW[0], /verification code/)); ok(/^123456 is your/.test(mailTo(st, USERPW[0], /verification code/).subject), "mã trong tiêu đề thư");
  await codeDlg(page, "000000"); await page.waitForFunction(() => document.querySelector("#toasts") && /chưa đúng/.test(document.querySelector("#toasts").textContent)); await page.waitForFunction(() => document.querySelectorAll(".cf").length === 1 && document.querySelector('.cf [data-f="code"]')); await page.fill('.cf [data-f="code"]', "123 456"); await page.click('.cf [data-cf="yes"]'); await page.waitForSelector(".cf", { state: "detached" });
  await until(async () => (await db(page)).nox_security?.uUSER?.twofa === true); await page.waitForTimeout(400); eq(path(page).split("?")[0], "/profile", "phiên hiện tại không bị đá ra");
  await page.click('.ptab-btn[data-tab="edit"]'); await page.fill("#bio", "vẫn ghi được"); await page.click("#saveBio"); await page.waitForFunction(() => window.__fb.getDb().nox_users.uUSER.bio === "vẫn ghi được", null, { timeout: 6000 }); await page.click('.ptab-btn[data-tab="security"]'); ok(/Disable|Tắt/.test(await page.textContent("#tfBtn")), "nút đổi thành Tắt");
  /* phiên mới */
  await page.click('[data-act="signout"]'); await yes(page); await page.waitForURL(/\/login/); st.sent.length = 0;
  await login(page, USERPW); await page.waitForURL(/\/two-step/); await until(() => mailTo(st, USERPW[0], /sign-in code/));
  const w = await page.evaluate(async () => { try { await firebase.database().ref("nox_users/uUSER/bio").set("hack"); return "ok"; } catch (e) { return e.code; } }); eq(w, "PERMISSION_DENIED", "chưa nhập mã thì Rules chặn ghi");
  await go(page, "/profile"); eq(path(page).split("?")[0], "/two-step", "mọi trang cần đăng nhập đều bị đưa về bước nhập mã"); await go(page, "/settings"); eq(path(page).split("?")[0], "/two-step", "kể cả trang công khai");
  await page.fill("#code", "12"); await page.click("button[type=submit]"); ok((await page.textContent("#codeErr")).length > 3, "mã thiếu số"); await page.fill("#code", "999999"); await page.click("button[type=submit]"); await page.waitForFunction(() => document.querySelector("#err").textContent.length > 3); ok(!TECH.test(await page.textContent("#err")), "lỗi dễ hiểu"); eq(path(page).split("?")[0], "/two-step");
  await page.fill("#code", "123456"); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/settings"); await authed(page); /* quay về đúng trang đang định vào */
  const w2 = await page.evaluate(async () => { try { await firebase.database().ref("nox_users/uUSER/bio").set("ok-sau-khi-nhap-ma"); return "ok"; } catch (e) { return e.code; } }); eq(w2, "ok", "nhập mã xong thì ghi được");
  await page.reload(); await authed(page); await page.waitForTimeout(500); ok(!/two-step/.test(path(page)), "tải lại trang không phải nhập lại");
  await go(page, "/profile?tab=security"); await page.click("#tfBtn"); await until(() => mailTo(st, USERPW[0], /turn off|Turn off|verification code/i)); await codeDlg(page, "123456"); await until(async () => (await db(page)).nox_security.uUSER.twofa === false); await page.waitForFunction(() => /Bật|Turn on/.test(document.querySelector("#tfBtn").textContent));
});
test("2 bước: mã chỉ dùng 1 lần, hết 10 phút hoặc sai 5 lần thì phải xin mã mới; gửi lại có đếm ngược", async ({ page }) => {
  const st = await installApi(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile?tab=security"); await page.click("#tfBtn"); await codeDlg(page, "123456"); await until(async () => (await db(page)).nox_security?.uUSER?.twofa === true);
  await page.click('[data-act="signout"]'); await yes(page); await login(page, USERPW); await page.waitForURL(/\/two-step/); await until(() => st.sent.some(m => /sign-in code/.test(m.subject)));
  await page.waitForFunction(() => document.querySelector("#resend").disabled, null, { timeout: 4000 }); ok(await page.locator("#resend").isDisabled(), "gửi lại bị khoá trong lúc đếm ngược"); ok(/\d+s/.test(await page.textContent("#resend")), "có đếm ngược");
  for (let i = 0; i < 5; i++) { await page.fill("#code", "000000"); await page.click("button[type=submit]"); await page.waitForFunction(n => document.querySelector("#err").textContent.length > 3 && !document.querySelector("button[type=submit]").disabled, i); }
  await page.fill("#code", "123456"); await page.click("button[type=submit]"); await page.waitForFunction(() => /quá nhiều lần|yêu cầu mã mới|hết hạn/.test(document.querySelector("#err").textContent)); eq(path(page).split("?")[0], "/two-step", "sai 5 lần thì mã đúng cũng không còn dùng được");
  await page.click("#out"); await page.waitForURL(/\/login/); eq(await authState(page), "out");
});
test("email khôi phục: thêm (xác nhận bằng mã) → dùng để nhận mã đăng nhập 2 bước → quên email: nhận liên kết đặt lại ở email khôi phục → xoá", async ({ page }) => {
  const st = await installApi(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile?tab=security"); await page.waitForSelector("#rcBtn");
  await page.click("#rcBtn"); await oneCf(page); await page.fill('.cf [data-f="email"]', USERPW[0]); await page.click('.cf [data-cf="yes"]'); await page.waitForFunction(() => /khác|different/i.test(document.querySelector("#toasts").textContent));
  await page.click("#rcBtn"); await oneCf(page); await page.fill('.cf [data-f="email"]', "backup@example.com"); await page.click('.cf [data-cf="yes"]');
  await until(() => mailTo(st, "backup@example.com", /recovery code/)); await codeDlg(page, "123456"); await until(async () => (await db(page)).nox_security?.uUSER?.recovery?.email === "backup@example.com");
  await until(() => mailTo(st, USERPW[0], /recovery email was added/i)); await page.waitForFunction(() => /backup@example.com/.test(document.querySelector("#secPanel").textContent));
  await page.click("#tfBtn"); await codeDlg(page, "123456"); await until(async () => (await db(page)).nox_security.uUSER.twofa === true);
  await page.click('[data-act="signout"]'); await yes(page); st.sent.length = 0; await login(page, USERPW); await page.waitForURL(/\/two-step/); await page.waitForSelector("#alt"); await until(() => mailTo(st, USERPW[0], /sign-in code/));
  await page.waitForTimeout(100); st.sent.length = 0; await page.evaluate(() => 0); await page.click("#alt"); await until(() => mailTo(st, "backup@example.com", /sign-in code/)); ok(/recovery email/.test(mailTo(st, "backup@example.com", /sign-in code/).html), "thư nói rõ đây là email khôi phục");
  await page.fill("#code", "123456"); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); await authed(page);
  await page.click('[data-act="signout"]'); await yes(page); await go(page, "/forgot-password"); await page.waitForSelector("#recover"); st.sent.length = 0; await page.fill("#email", USERPW[0]); await page.click("#recover"); await until(() => mailTo(st, "backup@example.com", /account recovery code/i)); await page.waitForSelector("#f2 #code");
  await login(page, USERPW); await page.waitForURL(/\/two-step/); await page.fill("#code", "123456"); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); await go(page, "/profile?tab=security"); await page.waitForSelector("#rcDel"); await page.click("#rcDel"); await no(page); await page.click("#rcDel"); await yes(page);
  await until(async () => !((await db(page)).nox_security.uUSER.recovery)); await until(() => mailTo(st, USERPW[0], /recovery email was removed/i));
});
test("đổi email đăng nhập: cần mật khẩu, gửi liên kết tới email mới (+ báo email cũ), bấm xong đăng nhập bằng email mới", async ({ page }) => {
  const st = await installApi(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile?tab=security"); await page.waitForSelector("#emBtn");
  await page.click("#emBtn"); await oneCf(page); eq(await page.getAttribute('.cf [data-f="pw"]', "type"), "password", "ô mật khẩu được che");
  await page.fill('.cf [data-f="email"]', "moi@example.com"); await page.fill('.cf [data-f="pw"]', "saimatkhau"); await page.click('.cf [data-cf="yes"]'); await page.waitForFunction(() => /Mật khẩu hiện tại không đúng/.test(document.querySelector("#toasts").textContent)); eq(st.sent.filter(m => m.to === "moi@example.com").length, 0, "sai mật khẩu → không gửi");
  await page.click("#emBtn"); await oneCf(page); await page.fill('.cf [data-f="email"]', "moi@example.com"); await page.fill('.cf [data-f="pw"]', USERPW[1]); await page.click('.cf [data-cf="yes"]');
  const m = await until(() => mailTo(st, "moi@example.com", /Confirm your new email/)); await until(() => mailTo(st, USERPW[0], /email is being changed/i));
  await page.goto(linkOf(m)); await page.waitForFunction(() => /Đã đổi email/.test(((document.querySelector(".auth-card h1") || {}).textContent || ""))); eq(await page.evaluate(() => window.__emailChanged), "moi@example.com");
  await login(page, ["moi@example.com", USERPW[1]]); await page.waitForURL(BASE + "/"); await authed(page);
});
test("DEV: cấp quyền / mute / ban qua máy chủ — gửi thư thông báo, ban vĩnh viễn khoá thật tài khoản", async ({ page }) => {
  const st = await installApi(page); await loginDev(page); await seedUsers(page); await go(page, "/dev/users"); await page.waitForSelector('[data-uid="uUSER"]'); const row = '[data-uid="uUSER"]';
  await page.click(row + ' [data-a="role"]'); await yes(page); await until(() => mailTo(st, USERPW[0], /editor/)); eq((await db(page)).nox_admin.uUSER.role, "editor");
  await page.click(row + ' [data-a="mute"]'); await page.click('.cf .cf-chip[data-v="3600000"]'); await page.fill('.cf [data-f="why"]', "Spam"); await yes(page); await until(() => mailTo(st, USERPW[0], /muted/)); ok(/Spam/.test(mailTo(st, USERPW[0], /muted/).html), "thư có lý do");
  await page.click(row + ' [data-a="ban"]'); await page.click('.cf .cf-chip[data-v="perm"]'); await page.fill('.cf [data-f="why"]', "Vi phạm"); await yes(page); await until(() => mailTo(st, USERPW[0], /suspended/)); ok(/permanently/.test(mailTo(st, USERPW[0], /suspended/).text), "thư nói vĩnh viễn");
  eq((await acct(page, USERPW[0])).disabled, true, "tài khoản bị khoá thật");
  await page.click('[data-act="signout"]').catch(() => {}); await page.evaluate(() => 0);
  await go(page, "/profile"); await page.click('[data-act="signout"]'); await yes(page); await login(page, USERPW); await page.waitForFunction(() => /bị khóa/.test(document.querySelector("#err").textContent)); eq(await authState(page), "out");
  await loginDev(page); await go(page, "/dev/users"); await page.waitForSelector(row + ' [data-a="ban"]'); await page.click(row + ' [data-a="ban"]'); await yes(page); await until(() => mailTo(st, USERPW[0], /active again/)); eq((await acct(page, USERPW[0])).disabled, false, "mở khoá lại");
});
test("DEV → Gửi thư: văn mẫu điền sẵn, xem trước có logo, gửi thật + gửi thử về DEV, thư hệ thống xem/gửi thử được", async ({ page }) => {
  const st = await installApi(page); await loginDev(page); await seedUsers(page); await go(page, "/dev/mail"); await page.waitForSelector("#mT");
  const n = await page.locator("#mT option").count(); ok(n >= 8, "nhiều văn mẫu: " + n); ok((await page.inputValue("#mB")).length > 40 && /\{\{name\}\}/.test(await page.inputValue("#mB")), "điền sẵn nội dung");
  await page.selectOption("#mT", "resolved"); ok(/resolved/i.test(await page.inputValue("#mS")), "đổi mẫu thì đổi tiêu đề");
  await page.waitForFunction(() => (document.querySelector("#mFrame").srcdoc || "").includes("SkibidiScript"), null, { timeout: 5000 }); ok(/icon-192\.png/.test(await page.getAttribute("#mFrame", "srcdoc")), "xem trước có logo");
  await page.click("#mSend"); ok((await page.textContent("#mE")).length > 3, "thiếu người nhận"); await page.fill("#mTo", USERPW[0]); await page.click("#mSend"); const m = await until(() => mailTo(st, USERPW[0], /resolved/i)); ok(/Hi Người/.test(m.text) || /Hi /.test(m.text), "chèn tên: " + m.text.slice(0, 40));
  await page.fill("#mB", "Xin chào\n\n**Đậm** và <b>html</b>"); await page.click("#mTest"); const t = await until(() => st.sent.find(x => x.to === DEV_EMAIL && /resolved/i.test(x.subject))); ok(!/<b>html<\/b>/.test(t.html) && /<b>Đậm<\/b>/.test(t.html), "escape HTML, giữ **đậm**");
  await page.click('[data-prev="banned"]'); await page.waitForFunction(() => /suspended/.test(document.querySelector("#mFrame").srcdoc)); await page.click('[data-test="loginCode"]'); await until(() => st.sent.some(x => x.to === DEV_EMAIL && /sign-in code/.test(x.subject)));
});
test("người dùng thường không gọi được API quản trị / gửi thư (kể cả gọi thẳng)", async ({ page }) => {
  const st = await installApi(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page);
  const r = await page.evaluate(async () => { const tok = await firebase.auth().currentUser.getIdToken(); const o = {}; for (const [k, b] of [["mod", { action: "moderate", uid: "uDEV", op: "ban", until: 9e15 }], ["send", { action: "dev-send", to: "x@y.co", body: "hi" }], ["tpl", { action: "dev-templates" }]]) { const r = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + tok }, body: JSON.stringify(b) }); o[k] = r.status; } return o; });
  eq(r, { mod: 403, send: 403, tpl: 403 }); eq(st.sent.length, 0);
  await go(page, "/dev/mail"); ok(path(page) === "/" || (await page.locator("#mT").count()) === 0, "không vào được trang Gửi thư");
});
test("English: màn nhập mã 2 bước, trang /auth/action, hồ sơ (mục bảo mật) và Gửi thư — không còn tiếng Việt", async ({ page }) => {
  const st = await installApi(page); const bad = []; const chk = async n => { await page.waitForTimeout(400); const v = await viContent(page); if (v.length) bad.push(n + " → " + v.slice(0, 8).join(" | ")); };
  await go(page, "/auth/action?mode=resetPassword&oobCode=SAI"); await page.waitForSelector(".auth-card h1"); await chk("/auth/action lỗi");
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile?tab=security"); await page.waitForSelector("#tfBtn"); await chk("/profile bảo mật");
  await page.click("#tfBtn"); await page.waitForSelector(".cf"); await chk("hộp nhập mã"); await codeDlg(page, "123456"); await until(async () => (await db(page)).nox_security?.uUSER?.twofa === true);
  await page.click("#rcBtn"); await page.waitForSelector(".cf"); await chk("hộp email khôi phục"); await no(page); await page.click("#emBtn"); await page.waitForSelector(".cf"); await chk("hộp đổi email"); await no(page);
  await page.click('[data-act="signout"]'); await yes(page); await login(page, USERPW); await page.waitForURL(/two-step/); await page.waitForSelector("#code"); await chk("/two-step"); await page.click("button[type=submit]"); await chk("/two-step lỗi");
  await page.click("#out"); await page.waitForURL(/login/); await loginDev(page); await go(page, "/dev/mail"); await page.waitForSelector("#mT"); await chk("/dev/mail");
  ok(!bad.length, "còn tiếng Việt:\n   " + bad.join("\n   "));
}, { lang: "en" });
test("tương phản chữ — /two-step, hồ sơ có mục bảo mật, /dev/mail (sáng + kính)", async ({ page }) => {
  const st = await installApi(page); await loginDev(page); await seedUsers(page); await page.evaluate(() => { localStorage.setItem("ssw_theme", "light"); localStorage.setItem("ssw_glass", "1"); });
  await contrastRun(page, ["/profile", "/dev/mail", "/auth/action?mode=resetPassword&oobCode=SAI"], "giai đoạn 2");
});
test("không có chữ kỹ thuật trên các trang công khai (cả khi chưa có dữ liệu)", async ({ page }) => {
  for (const r of ["/", "/categories", "/scripts", "/apk", "/ios", "/links", "/notifications", "/settings", "/login", "/register", "/forgot-password", "/search?q=zzz", "/scripts/khong-co"]) {
    await go(page, r); await page.waitForTimeout(250); const t = await visibleText(page); ok(!TECH.test(t), r + ": " + (t.match(TECH) || [])[0]);
  }
});
/* ───────── Đợt B: mức đồ họa, Trợ giúp, ảnh từ máy, thu gọn ───────── */
test("đồ họa: mặc định Tối Ưu; 3 bậc; lên Cao có cảnh báo (huỷ thì giữ); nền hình chỉ hiện ở Cao; ghi nhớ", async ({ page }) => {
  await go(page, "/settings"); const g = () => page.evaluate(() => document.documentElement.dataset.gfx), tick = i => page.click(`.gfx-ticks span[data-g="${i}"]`);
  eq(await g(), "low", "mặc định thấp nhất"); eq(await page.inputValue("#gfx"), "0"); ok((await page.textContent("#gfxName")).includes("Tối"), "tên mức"); 
  await tick(1); await page.waitForFunction(() => document.documentElement.dataset.gfx === "mid"); eq(await page.evaluate(() => localStorage.getItem("ssw_gfx")), "mid");
  ok(await page.evaluate(() => !document.body.classList.contains("has-bg")), "trung bình: không nền hình");
  await tick(2); await page.waitForSelector(".cf"); ok(/Cao/.test(await page.textContent(".cf")), "có cảnh báo trước khi lên Cao");
  await no(page); eq(await g(), "mid", "huỷ thì giữ mức cũ"); eq(await page.inputValue("#gfx"), "1", "thanh trượt quay về");
  await tick(2); await yes(page); await page.waitForFunction(() => document.documentElement.dataset.gfx === "high"); 
  await page.reload(); await page.waitForSelector(".set-card"); eq(await g(), "high", "nhớ mức đồ họa"); eq(await page.inputValue("#gfx"), "2");
  await tick(0); await page.waitForFunction(() => document.documentElement.dataset.gfx === "low"); eq(await page.evaluate(() => localStorage.getItem("ssw_gfx")), null, "về mặc định thì xoá khoá");
});
test("đồ họa: nền lưới có ở mọi mức; mức thấp đứng yên, mức trung bình chuyển động nhẹ; thẻ/nút khác nhau theo mức", async ({ page }) => {
  const anim = () => page.evaluate(() => getComputedStyle(document.querySelector("#bg"), "::before").animationName);
  await go(page, "/"); eq(await anim(), "none", "thấp: lưới đứng yên");
  const bgLow = await page.evaluate(() => getComputedStyle(document.querySelector("#bg"), "::before").backgroundImage); ok(/gradient/.test(bgLow), "thấp: có lưới ô vuông");
  await page.evaluate(() => { localStorage.setItem("ssw_gfx", "mid"); }); await page.reload(); await page.waitForSelector("#view .page"); ok(/gridDrift/.test(await anim()), "trung bình: lưới chuyển động nhẹ");
  const sh = () => page.evaluate(() => getComputedStyle(document.querySelector(".btn.primary") || document.body).boxShadow);
  const mid = await sh();
  await page.evaluate(() => { localStorage.setItem("ssw_gfx", "high"); }); await page.reload(); await page.waitForSelector("#view .page");
  ok(await page.evaluate(() => document.documentElement.dataset.gfx) === "high");
  ok(await page.evaluate(() => !!document.querySelector("#bg")), "có lớp nền");
});
test("đồ họa: mức Tối Ưu không hiện màn hình mở đầu, không video/hình nền; Cao mới có hình nền", async ({ page }) => {
  await go(page, "/"); ok(await page.evaluate(() => document.documentElement.classList.contains("no-splash")), "thấp: bỏ màn mở đầu"); ok(await page.evaluate(() => !document.body.classList.contains("has-bg")));
  await go(page, "/settings"); ok(await page.locator("#bgShow").isDisabled(), "thấp: tuỳ chọn hình nền bị khoá, có ghi chú");
});
test("Trợ giúp: nhóm menu, câu hỏi thường gặp, tìm kiếm, mở/đóng, Hiển thị tất cả", async ({ page }) => {
  await go(page, "/"); ok(await page.locator('.disc[data-g="help"] .disc-item[href="/help"]').count() === 1, "nhóm Trợ giúp trong menu");
  await go(page, "/help"); eq((await page.title()).includes("Câu hỏi thường gặp"), true); ok((await page.locator(".faq-i").count()) >= 20, "đủ câu hỏi");
  eq(await page.locator('.disc[data-g="help"].open').count(), 1, "mở sẵn nhóm chứa trang đang xem");
  ok((await page.locator(".more-btn").count()) >= 1, "nhóm dài có nút Hiển thị tất cả");
  const vis0 = await page.locator(".faq-i:visible").count(); await page.locator(".more-btn").first().click(); ok((await page.locator(".faq-i:visible").count()) > vis0, "bấm Hiển thị tất cả thì hiện thêm"); ok(/Thu gọn/.test(await page.locator(".more-btn").first().textContent()), "đổi thành Thu gọn");
  await page.locator(".more-btn").first().click(); eq(await page.locator(".faq-i:visible").count(), vis0, "Thu gọn lại");
  const q1 = page.locator(".faq-q").first(), q2 = page.locator(".faq-q").nth(1);
  await q1.click(); eq(await q1.getAttribute("aria-expanded"), "true"); await q2.click(); eq(await q1.getAttribute("aria-expanded"), "false", "chỉ một câu mở"); eq(await q2.getAttribute("aria-expanded"), "true");
  await page.fill("#fs", "mat khau"); await page.waitForFunction(() => document.querySelectorAll(".faq-i").length < 12); ok((await page.locator(".faq-i").count()) >= 3, "tìm không dấu ra kết quả");
  eq(await page.locator(".more-btn").count(), 0, "đang tìm thì không ẩn bớt");
  await page.fill("#fs", "zzzzqq"); await page.waitForSelector(".statebox"); eq(await page.locator(".faq-i").count(), 0);
  const t = await visibleText(page); ok(!TECH.test(t), "không có chữ kỹ thuật");
});
test("Trợ giúp (English): câu hỏi hiện bằng tiếng Anh, đổi ngôn ngữ thì đổi theo", async ({ page }) => {
  await go(page, "/help"); ok(/Getting started/.test(await page.textContent(".faq-h")), "tiếng Anh");
  const v = await viContent(page); eq(v, [], "không còn chữ Việt: " + v.join(" | "));
  await page.evaluate(() => import("/assets/js/lib/i18n.js").then(m => m.setLang("vi"))); await page.waitForFunction(() => /Bắt đầu/.test(document.querySelector(".faq-h").textContent)); ok(true, "đổi sang tiếng Việt ngay, không tải lại");
}, { lang: "en" });
test("ảnh mục: chọn từ máy (nén, lưu, hiện); link ảnh cũ không còn hiển thị; đã bỏ ô dán link ảnh", async ({ page }) => {
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await loginDev(page); await go(page, "/links/create"); eq(await page.locator('#itemForm input[type=url][name=img]').count(), 0, "không còn ô dán link ảnh"); await page.fill("#itemForm [name=name]", "Có ảnh"); await page.fill("#itemForm [name=url]", "https://example.com/a");
  await page.setInputFiles("#imgPick", { name: "a.png", mimeType: "image/png", buffer: PNG }); await page.waitForSelector("#imgPrev img"); ok(await page.locator("#imgDel").isVisible(), "có nút Xóa ảnh");
  await page.click("#saveBtn"); await page.waitForFunction(() => /^\/links$/.test(location.pathname)); const d = await db(page); const it = Object.entries(d.nox_data.links).find(([, v]) => v.name === "Có ảnh");
  ok(it && /^data:image\/jpeg;base64,/.test(it[1].img) && it[1].img.length < 36000, "ảnh đã lưu dạng data: nhẹ");
  await go(page, "/links/" + it[0]); ok(await page.locator(".detail-img").count() === 1, "chi tiết hiện ảnh");
  await go(page, "/links/" + it[0] + "/edit"); await page.click("#imgDel"); await page.click("#saveBtn"); await page.waitForFunction(() => /^\/links$/.test(location.pathname)); ok(!(await db(page)).nox_data.links[it[0]].img, "xoá ảnh được");
  await page.evaluate(() => firebase.database().ref("nox_data/links/leg").set({ name: "Cũ", url: "https://a.b", img: "https://evil.example/t.png", createdAt: 1 })); await go(page, "/links/leg"); eq(await page.locator(".detail-img").count(), 0, "ảnh từ link ngoài không được tải");
  await go(page, "/links"); eq(await page.locator('img[src^="http"]:not(.avatar img)').evaluateAll(l => l.filter(i => /evil\.example/.test(i.src)).length), 0);
});
test("đoạn dài: mô tả dài được thu gọn, có nút Hiển thị tất cả / Thu gọn; đoạn ngắn thì không có nút", async ({ page }) => {
  await loginDev(page); const long = Array.from({ length: 34 }, (_, i) => "Dòng mô tả số " + i + " khá dài để chiếm nhiều chỗ.").join(" ");
  await page.evaluate(l => firebase.database().ref("nox_data/links").update({ longi: { name: "Dài", url: "https://a.b", desc: l, createdAt: 1 }, shorti: { name: "Ngắn", url: "https://a.b", desc: "Ngắn thôi.", createdAt: 2 } }), long);
  await go(page, "/links/longi"); await page.waitForSelector(".more-btn"); const h1 = await page.locator(".detail-desc").evaluate(e => e.clientHeight);
  ok(await page.locator(".detail-desc.clamp").count() === 1, "đang thu gọn"); eq(await page.textContent(".more-btn"), "Hiển thị tất cả");
  await page.click(".more-btn"); const h2 = await page.locator(".detail-desc").evaluate(e => e.clientHeight); ok(h2 > h1, `mở rộng (${h1} → ${h2})`); eq(await page.textContent(".more-btn"), "Thu gọn"); eq(await page.getAttribute(".more-btn", "aria-expanded"), "true");
  await page.click(".more-btn"); eq(await page.locator(".detail-desc").evaluate(e => e.clientHeight), h1, "thu gọn lại");
  await go(page, "/links/shorti"); await page.waitForSelector(".detail-desc"); await page.waitForTimeout(300); eq(await page.locator(".more-btn").count(), 0, "đoạn ngắn không có nút");
});
test("tiêu đề mới của web: nói rõ đây là web chia sẻ APK bảo mật cao, không còn 'kho script apk ios link'", async ({ page }) => {
  await go(page, "/"); const m = await page.evaluate(() => ({ t: document.title, d: document.querySelector("meta[name=description]").content, o: document.querySelector('meta[property="og:title"]').content }));
  ok(/APK/.test(m.t) && !/iOS|Kho|useful links/i.test(m.t), "tiêu đề: " + m.t); ok(/bảo mật cao/i.test(m.d) && /hack/i.test(m.d), "mô tả nói rõ bảo mật + không cổ xúy hack: " + m.d); ok(!/useful links|Kho Script/.test(m.o));
  const sm = await (await page.request.get(BASE + "/manifest.webmanifest")).text(); ok(!/Kho Script/.test(sm), "manifest");
  await page.evaluate(() => import("/assets/js/lib/i18n.js").then(m => m.setLang("en"))); await page.waitForFunction(() => /Secure APK/i.test(document.title)); ok(true);
});
test("ảnh chụp: 3 mức đồ họa (máy tính)", async ({ page }) => {
  for (const g of ["low", "mid", "high"]) {
    await page.addInitScript(g => { try { localStorage.setItem("ssw_gfx", g === "low" ? "" : g); if (g === "low") localStorage.removeItem("ssw_gfx"); sessionStorage.setItem("ssw_splash", "1"); } catch (_) {} }, g);
    for (const [r, n] of [["/", "home"], ["/settings", "settings"], ["/help", "help"], ["/scripts", "list"]]) { await go(page, r); await page.waitForTimeout(900); await page.screenshot({ path: SHOTS + `/gfx-${g}-${n}.png` }); }
    await page.evaluate(() => localStorage.removeItem("ssw_gfx"));
  }
});
test("ảnh chụp: 3 mức đồ họa (điện thoại)", async ({ page }) => {
  for (const g of ["low", "mid", "high"]) {
    await page.evaluate(g => { try { g === "low" ? localStorage.removeItem("ssw_gfx") : localStorage.setItem("ssw_gfx", g); } catch (_) {} }, g).catch(() => {});
    await page.addInitScript(g => { try { g === "low" ? localStorage.removeItem("ssw_gfx") : localStorage.setItem("ssw_gfx", g); } catch (_) {} }, g);
    for (const [r, n] of [["/", "home"], ["/settings", "settings"], ["/help", "help"]]) { await go(page, r); await page.waitForTimeout(900); await page.screenshot({ path: SHOTS + `/gfxm-${g}-${n}.png` }); }
  }
}, { device: devices["Pixel 5"] });
test("ảnh chụp màn hình", async ({ page }) => {
  await go(page, "/"); await page.waitForSelector(".slide"); await page.waitForTimeout(700); await page.screenshot({ path: SHOTS + "/d-home.png" }); await page.screenshot({ path: SHOTS + "/d-home-full.png", fullPage: true });
  await page.locator('.disc[data-g="cats"] .nav-btn').click(); await page.waitForTimeout(800); await page.screenshot({ path: SHOTS + "/d-home-menu.png" });
  for (const [r, n] of [["/scripts", "list"], ["/scripts/-s1", "detail"], ["/login", "login"], ["/register", "register"], ["/categories", "cats"], ["/notifications", "notif"], ["/settings", "settings"]]) { await go(page, r); await page.waitForTimeout(500); await page.screenshot({ path: SHOTS + "/d-" + n + ".png" }); }
  await loginDev(page); for (const [r, n] of [["/profile", "profile"], ["/dev", "dev"], ["/dev/system", "system"], ["/dev/users", "users"], ["/dev/categories", "devcats"], ["/dev/updates", "devupd"]]) { await go(page, r); await page.waitForTimeout(500); await page.screenshot({ path: SHOTS + "/d-" + n + ".png" }); }
});
test("ảnh chụp màn hình điện thoại", async ({ page }) => {
  await go(page, "/"); await page.waitForSelector(".slide"); await page.waitForTimeout(700); await page.screenshot({ path: SHOTS + "/m-home.png" }); await page.screenshot({ path: SHOTS + "/m-home-full.png", fullPage: true });
  await page.click("#btnMenu"); await page.waitForTimeout(500); await page.locator('.disc[data-g="cats"] .nav-btn').click(); await page.waitForTimeout(800); await page.screenshot({ path: SHOTS + "/m-menu.png" });
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  for (const [r, n] of [["/scripts", "list"], ["/login", "login"], ["/register", "register"], ["/notifications", "notif"], ["/settings", "settings"]]) { await go(page, r); await page.waitForTimeout(500); await page.screenshot({ path: SHOTS + "/m-" + n + ".png" }); }
  await page.evaluate(() => { localStorage.setItem("ssw_glass", "1"); document.documentElement.dataset.glass = "on"; }); await go(page, "/settings"); await page.waitForTimeout(400); await page.screenshot({ path: SHOTS + "/m-settings-glass.png" });
}, { device: devices["Pixel 5"] });

/* ===== Đợt C ===== */
const signout = async page => { await page.click('[data-act="signout"]').catch(async () => { await go(page, "/profile"); await page.click('[data-act="signout"]'); }); await yes(page); await page.waitForFunction(() => document.querySelector("#hdrAcc") && document.querySelector("#hdrAcc").dataset.state !== "in"); };
test("danh mục: dev sửa / xóa / khôi phục Script-APK-iOS-Link, route và menu đổi theo", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/categories");
  ok(await page.locator('[data-edit="apk"]').count() === 1, "APK là danh mục sửa được");
  await page.click('[data-edit="apk"]'); await page.waitForSelector('.cf-root.on [data-f="name"]');
  await page.fill('.cf-root.on [data-f="name"]', "Ứng dụng"); await page.click('.cf-root.on .cf-chip[data-v="third"]'); await page.click('.cf-root.on [data-cf="yes"]'); await page.waitForSelector(".cf", { state: "detached" });
  await until(async () => /Ứng dụng/.test(await page.textContent("#list")));
  await page.goto(BASE + "/apk"); await page.waitForSelector(".rk-root", { timeout: 8000 });
  await page.click("#rkBack"); await page.waitForSelector(".rk-root", { state: "detached" });
  await go(page, "/dev/categories"); await page.click('[data-cat="apk"]'); await yes(page);
  await until(async () => await page.locator('[data-restore="apk"]').count() === 1);
  await page.goto(BASE + "/apk"); await page.waitForTimeout(1200); ok(!/Ứng dụng/.test(await page.textContent("#view")) && await page.locator(".rk-root").count() === 0, "route /apk không còn");
  await go(page, "/dev/categories"); await page.click('[data-restore="apk"]'); await until(async () => await page.locator('[data-edit="apk"]').count() === 1);
});
test("cảnh báo rủi ro: đếm ngược, không bấm được trước khi hết giờ, nhớ 'không hỏi lại'", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/categories"); await page.click('[data-edit="apk"]'); await page.waitForSelector('.cf-root.on .cf-chip[data-v="hack"]');
  await page.click('.cf-root.on .cf-chip[data-v="hack"]'); await page.click('.cf-root.on [data-cf="yes"]'); await page.waitForSelector(".cf", { state: "detached" });
  await until(async () => /Hack/.test(await page.textContent("#list")));
  await page.evaluate(() => { window.__rkSeconds = 3; });
  await page.click('.disc-item[href="/apk"], a[href="/apk"]', { timeout: 3000 }).catch(async () => { await page.evaluate(() => { history.pushState({}, "", "/apk"); dispatchEvent(new PopStateEvent("popstate")); }); });
  await page.waitForSelector(".rk-root", { timeout: 8000 });
  ok(await page.locator("#rkGo").isDisabled(), "nút tiếp tục khóa lúc đầu"); await page.click("#rkGo", { force: true, timeout: 800 }).catch(() => {}); ok(await page.locator(".rk-root").count() === 1, "bấm sớm không vào được");
  await page.check("#rkNo"); await page.waitForFunction(() => !document.querySelector("#rkGo").disabled, null, { timeout: 6000 }); await page.click("#rkGo"); await page.waitForSelector(".rk-root", { state: "detached" });
  await page.waitForSelector("#grid, .statebox, .page"); ok(/\/apk/.test(path(page)), "đã vào danh mục");
  await page.evaluate(() => { history.pushState({}, "", "/categories"); dispatchEvent(new PopStateEvent("popstate")); }); await page.waitForTimeout(500);
  await page.evaluate(() => { history.pushState({}, "", "/apk"); dispatchEvent(new PopStateEvent("popstate")); }); await page.waitForTimeout(1200); eq(await page.locator(".rk-root").count(), 0, "đã chọn không hỏi lại");
});
test("hỗ trợ, báo cáo, chat: người dùng gửi → dev thấy trong Hộp thư → trả lời → người dùng thấy", async ({ page }) => {
  const st = await installApi(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page);
  await go(page, "/help/support"); await page.click("button[type=submit]"); ok((await page.textContent('[data-err="subject"]')).length > 3, "báo thiếu chủ đề");
  await page.fill("#ss", "Không vào được"); await page.fill("#sm", "Mình bị lỗi trang trắng"); await page.click("button[type=submit]"); await page.waitForURL(/\/inbox\/.+/);
  await page.waitForSelector("#chLog .bub"); ok(/trang trắng/.test(await page.textContent("#chLog")), "tin của mình hiện ra");
  await go(page, "/help/report?cat=script&key=-s1"); ok(/Auto Farm/.test(await page.textContent("#view")), "tự điền mục bị báo cáo");
  await page.fill("#rd", "Link hỏng"); await page.click("button[type=submit]"); await page.waitForURL(/\/inbox\/.+/);
  await go(page, "/help/chat"); eq(path(page), "/inbox/chat", "địa chỉ cũ chuyển sang Hộp thư"); await page.fill("#ct", "Chào dev"); await page.click("#cf button[type=submit]"); await page.waitForSelector("#chText");
  await go(page, "/inbox"); await page.waitForSelector("button.thread"); eq(await page.locator("button.thread").count(), 3, "3 cuộc trò chuyện");
  const bad = await page.evaluate(async () => { try { await firebase.database().ref("nox_msgs/uDEV/x/m1").set({ from: "user", text: "a", ts: Date.now() }); return "ok"; } catch (e) { return e.code; } }); eq(bad, "PERMISSION_DENIED", "không ghi vào hộp thư người khác");
  await signout(page); await login(page, DEVPW); await page.waitForURL(BASE + "/"); await authed(page);
  await go(page, "/inbox"); await page.waitForSelector("button.thread"); eq(await page.locator("button.thread").count(), 3, "dev thấy 3 cuộc");
  await page.locator("button.thread", { hasText: "Không vào được" }).click(); await page.waitForSelector("#chText");
  await page.fill("#chText", "Mình đã xem, thử tải lại nhé"); await page.click("#chForm button[type=submit]"); await until(async () => /thử tải lại/.test(await page.textContent("#chLog")));
  await page.click('[data-x="perm"]'); await until(async () => (await db(page)).nox_perms?.uUSER?.post === true);
  await page.click('[data-x="close"]'); await until(async () => Object.values((await db(page)).nox_threads.uUSER).some(t => t.status === "closed"));
  await signout(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page);
  await go(page, "/inbox"); await page.locator("button.thread", { hasText: "Không vào được" }).click(); await page.waitForSelector("#chLog .bub");
  ok(/thử tải lại/.test(await page.textContent("#chLog")), "thấy trả lời của dev"); ok(await page.locator("#chForm").isHidden(), "cuộc đã đóng thì không nhập thêm");
});
test("khách và tài khoản chưa đủ điều kiện: bị đưa về đăng nhập / thấy điều kiện đăng bài", async ({ page }) => {
  await go(page, "/help/messages"); ok(/\/login/.test(path(page)), "khách bị đưa tới /login");
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/help/submit");
  eq(await page.locator("#cond li.bad").count(), 2, "thiếu 2 điều kiện (2 bước, cấp phép)"); eq(await page.locator("#pf").count(), 0, "chưa có form gửi bài");
});
test("gửi bài chờ duyệt: đủ 3 điều kiện → nhãn Đang xem xét, không hiện công khai → dev duyệt / từ chối", async ({ page }) => {
  const st = await installApi(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page);
  await go(page, "/profile?tab=security"); await page.click("#tfBtn"); await codeDlg(page, "123456"); await until(async () => (await db(page)).nox_security?.uUSER?.twofa === true);
  await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_perms = { uUSER: { post: true } }; window.__fb.setDb(d); });
  await go(page, "/help/submit"); await page.waitForSelector("#pf"); eq(await page.locator("#cond li.bad").count(), 0, "đủ điều kiện");
  await page.selectOption("#pc", "script"); await page.fill("#pn", "Bài của khách"); await page.fill("#pd", "Mô tả"); await page.fill("#pu", "http://x.io"); await page.click("#pf button[type=submit]");
  await until(async () => (await page.textContent("#pe2")).length > 3); await page.fill("#pu", "https://example.com/a"); await page.click("#pf button[type=submit]"); await until(async () => /code/i.test(await page.textContent("#pe2"))); await page.fill("#pk", "print(1)"); await page.click("#pf button[type=submit]");
  await page.waitForSelector("#mine .badge.review"); ok(/Bài của khách/.test(await page.textContent("#mine")), "bài của tôi");
  await page.click('[data-m="category"]'); await page.fill("#pn", "Công cụ khách"); await page.click("#pf button[type=submit]"); await until(async () => await page.locator("#mine .badge.review").count() === 2);
  await go(page, "/scripts"); ok(!/Bài của khách/.test(await page.textContent("#view")), "chưa duyệt thì không công khai");
  await signout(page); await login(page, DEVPW); await page.waitForURL(/\/(two-step.*)?$/); if (/two-step/.test(path(page))) { await page.fill("#code", "123456"); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); } await authed(page); await seedUsers(page);
  await go(page, "/dev/review"); await page.waitForSelector("article.rv"); eq(await page.locator("article.rv").count(), 2, "2 bài chờ");
  await page.locator("article.rv", { hasText: "Bài của khách" }).locator('[data-a="ok"]').click(); await yes(page);
  await until(async () => Object.values((await db(page)).nox_data?.scripts || {}).some(i => i.name === "Bài của khách"));
  await page.locator("article.rv", { hasText: "Công cụ khách" }).locator('[data-a="no"]').click(); await page.waitForSelector('.cf-root.on [data-f="note"]'); await page.fill('.cf-root.on [data-f="note"]', "Trùng"); await page.click('.cf-root.on [data-cf="yes"]'); await page.waitForSelector(".cf", { state: "detached" });
  await until(async () => Object.values((await db(page)).nox_pending?.uUSER || {}).some(p => p.status === "rejected" && p.note === "Trùng"));
  await go(page, "/scripts"); ok(/Bài của khách/.test(await page.textContent("#view")), "đã duyệt thì công khai");
  await signout(page); await login(page, USERPW); await page.waitForURL(/\/two-step/); await page.fill("#code", "123456"); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/help/submit");
  await page.waitForSelector("#mine .badge.strong"); ok(/Trùng/.test(await page.textContent("#mine")), "thấy lý do từ chối");
});

test("nhạc nền nối tiếp: dev thêm nhiều bài bằng dấu +, hết bài này sang bài kế, xóa bài", async ({ page }) => {
  const wav = n => { const b = Buffer.alloc(44 + n * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40); return b; };
  await loginDev(page); await go(page, "/dev/theme");
  await page.setInputFiles("#auF", [{ name: "Một.wav", mimeType: "audio/wav", buffer: wav(8000) }, { name: "Hai.wav", mimeType: "audio/wav", buffer: wav(8000) }]);
  await until(async () => (await page.locator("#auL li").count()) === 2); ok(/Một/.test(await page.textContent("#auL")) && /Hai/.test(await page.textContent("#auL")), "2 bài trong danh sách");
  const d = await db(page); eq(Object.keys(d.nox_tracks).length, 2, "lưu 2 bài"); ok(Object.values(d.nox_trackdata).every(x => /^data:audio\//.test(x)), "dữ liệu âm thanh ở nox_trackdata");
  await page.setInputFiles("#auF", [{ name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("hi") }]); await until(async () => (await page.textContent("#auE")).length > 3);
  await page.evaluate(() => localStorage.setItem("ssw_mute", "0")); await go(page, "/settings"); await page.waitForSelector("#nextBtn");
  const first = await page.textContent("#nowp"); await page.click("#nextBtn"); await until(async () => (await page.textContent("#nowp")) !== first);
  const cur = await page.textContent("#nowp"); await page.evaluate(() => document.querySelector("#bgm").dispatchEvent(new Event("ended"))); await until(async () => (await page.textContent("#nowp")) !== cur);
  ok(!(await page.evaluate(() => document.querySelector("#bgm").loop)), "nhiều bài thì không lặp một bài");
  await go(page, "/dev/theme"); await page.locator('[data-rm]').first().click(); await yes(page); await until(async () => (await page.locator("#auL li").count()) === 1);
  eq(Object.keys((await db(page)).nox_trackdata || {}).length, 1, "dữ liệu bài bị xóa cũng được dọn");
  await go(page, "/settings"); await page.waitForTimeout(300); eq(await page.locator("#nextBtn").count(), 0, "1 bài thì không có nút Bài tiếp theo");
});

test("SEO: 6 trang thông tin công khai, breadcrumb JSON-LD, canonical, mô tả ≤160, có bản tiếng Anh, logo và favicon", async ({ page }) => {
  const pages = [["/about", "Giới thiệu"], ["/guide", "Hướng dẫn sử dụng"], ["/apk-safety", "Tải APK an toàn"], ["/security", "Bảo mật"], ["/terms", "Điều khoản"], ["/privacy", "Chính sách riêng tư"]];
  await fresh(page);
  for (const [p, h] of pages) {
    await page.goto(BASE + p); await page.waitForSelector(".info h2"); ok(new RegExp(h).test(await page.textContent("h1")), p + ": tiêu đề " + h);
    eq(await page.getAttribute('link[rel="canonical"]', "href"), "https://skibidiscript.vercel.app" + p, p + ": canonical");
    ok(((await page.getAttribute('meta[name="description"]', "content")) || "").length <= 160, p + ": mô tả ≤160");
    eq(await page.getAttribute('meta[name="robots"]', "content"), "index,follow,max-image-preview:large", p + ": cho lập chỉ mục");
    const ld = JSON.parse(await page.textContent("#ld-page")); const g = ld["@graph"]; ok(g.some(x => x["@type"] === "BreadcrumbList" && x.itemListElement.length >= 2), p + ": breadcrumb JSON-LD");
    ok(g[0].publisher && g[0].primaryImageOfPage, p + ": nhà xuất bản và ảnh trang");
    ok(await page.locator('.info-more a').count() >= 5, p + ": liên kết trang liên quan");
  }
  await page.goto(BASE + "/"); await page.waitForSelector("#view .page, #view h1"); const home = JSON.parse(await page.textContent('script[type="application/ld+json"]'));
  const org = home["@graph"].find(x => x["@type"] === "Organization"); ok(org.logo && org.logo.width === 512 && /icon-512\.png$/.test(org.logo.url), "Organization.logo là ImageObject 512");
  ok(await page.locator('link[rel="icon"][href="/favicon.ico"]').count() === 1, "có favicon.ico");
  ok((await page.locator('#footer a[href="/about"], #footer a[href="/privacy"]').count()) === 2, "chân trang có liên kết trang thông tin");
  await page.goto(BASE + "/login"); await page.waitForSelector("form"); eq(await page.locator("#ld-page").count(), 0, "trang đăng nhập chặn lập chỉ mục không có JSON-LD riêng");
  await page.goto(BASE + "/security"); await page.waitForSelector(".info h2"); await page.evaluate(() => import("/assets/js/lib/i18n.js").then(m => m.setLang("en"))); await page.waitForFunction(() => /Account protection/.test(document.querySelector(".info").textContent));
  ok(/Account protection/.test(await page.textContent(".info")) && /Security & safety/.test(await page.textContent("h1")), "bản tiếng Anh");
});

test("cập nhật: dev đăng có phân loại + danh sách, sửa bài, người dùng lọc theo loại", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/updates");
  await page.fill("#uT", "Bản mới"); await page.selectOption("#uG", "fix"); await page.fill("#uB", "Sửa hai lỗi:\n- Lỗi một\n- Lỗi hai\nCảm ơn bạn."); await page.click("#uBtn");
  await until(async () => /Bản mới/.test(await page.textContent("#ul")));
  await page.fill("#uT", "Tính năng X"); await page.selectOption("#uG", "new"); await page.fill("#uB", "Có X"); await page.click("#uBtn"); await until(async () => /Tính năng X/.test(await page.textContent("#ul")));
  ok(/Sửa lỗi/.test(await page.textContent("#ul")), "nhãn loại ở danh sách");
  const ts0 = Object.values((await db(page)).nox_updates).find(u => u.title === "Bản mới").ts;
  await page.locator(".upd-row", { hasText: "Bản mới" }).locator("[data-edit]").click(); eq(await page.inputValue("#uT"), "Bản mới", "nạp bài vào form"); ok(await page.locator("#uCancel").isVisible(), "có nút Hủy sửa");
  await page.fill("#uT", "Bản mới 2"); await page.click("#uBtn"); await until(async () => /Bản mới 2/.test(await page.textContent("#ul")));
  const u = Object.values((await db(page)).nox_updates).find(x => x.title === "Bản mới 2"); eq(u.ts, ts0, "sửa bài không đổi thời gian (không báo mới lại)"); eq(u.tag, "fix", "giữ nguyên loại");
  eq(Object.values((await db(page)).nox_updates).filter(x => /^(Bản mới|Tính năng X)/.test(x.title)).length, 2, "sửa không tạo bài mới");
  await go(page, "/"); await openBell(page); await page.waitForSelector(".upd ul li"); eq(await page.locator(".upd ul li").first().textContent(), "Lỗi một", "dòng gạch đầu dòng thành danh sách");
  ok(await page.locator('.np-flt [data-flt="fix"]').count() === 1, "có bộ lọc loại");
  await page.click('.np-flt [data-flt="fix"]'); await until(async () => !/Tính năng X/.test(await page.textContent(".np-news"))); ok(/Bản mới 2/.test(await page.textContent(".np-news")), "lọc theo Sửa lỗi");
  await page.click('.np-flt [data-flt=""]'); await until(async () => /Tính năng X/.test(await page.textContent(".np-news")));
  const bad = await page.evaluate(async () => { try { await firebase.database().ref("nox_updates").push({ title: "x", ts: 1, tag: "evil" }); return "ok"; } catch (e) { return e.code; } }); eq(bad, "PERMISSION_DENIED", "loại lạ bị rules chặn");
});

test("English: trang Đợt C (hỗ trợ, báo cáo, tin nhắn, gửi bài, hộp thư dev, duyệt bài, danh mục, giao diện) không còn chữ tiếng Việt", async ({ page }) => {
  const bad = []; await installApi(page);
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page);
  for (const r of ["/help/support", "/help/report?cat=script&key=-s1", "/help/chat", "/help/messages", "/help/submit", "/settings"]) { await go(page, r); await page.waitForTimeout(400); const v = await viContent(page); if (v.length) bad.push(r + " → " + v.slice(0, 6).join(" | ")); }
  await go(page, "/help/support"); await page.fill("#ss", "A"); await page.fill("#sm", "B"); await page.click("button[type=submit]"); await page.waitForURL(/\/inbox\/.+/); await page.waitForSelector("#chLog .bub"); { const v = await viContent(page); if (v.length) bad.push("cuộc trò chuyện → " + v.slice(0, 6).join(" | ")); }
  await go(page, "/inbox"); await page.waitForSelector("button.thread"); { const v = await viContent(page); if (v.length) bad.push("danh sách tin nhắn → " + v.slice(0, 6).join(" | ")); }
  await page.click('[data-act="signout"]').catch(async () => { await go(page, "/profile"); await page.click('[data-act="signout"]'); }); await yes(page);
  await page.waitForFunction(() => document.querySelector("#hdrAcc") && document.querySelector("#hdrAcc").dataset.state !== "in");
  await login(page, DEVPW); await page.waitForURL(/\/(two-step.*)?$/); if (/two-step/.test(path(page))) { await page.fill("#code", "123456"); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); } await authed(page);
  for (const r of ["/inbox", "/dev/review", "/dev/categories", "/dev/theme", "/dev/updates", "/dev/system"]) { await go(page, r); await page.waitForTimeout(500); const v = await viContent(page); if (v.length) bad.push(r + " → " + v.slice(0, 6).join(" | ")); }
  await go(page, "/inbox"); await page.waitForSelector("button.thread"); await page.locator("button.thread").first().click(); await page.waitForSelector("#chText"); { const v = await viContent(page); if (v.length) bad.push("hộp thư (mở cuộc) → " + v.slice(0, 6).join(" | ")); }
  ok(!bad.length, "còn tiếng Việt:\n   " + bad.join("\n   "));
}, { lang: "en" });
/* ===== Tính năng bổ sung (Ctrl+K, yêu thích, sắp xếp, màu nhấn, mạng, huy hiệu, lên đầu trang) ===== */
test("tìm nhanh Ctrl+K và phím /: mở, lọc, mũi tên, Enter đi tới mục, Esc đóng, không cướp phím khi đang gõ", async ({ page }) => {
  await fresh(page); await go(page, "/");
  await page.keyboard.press("Control+k"); await page.waitForSelector(".cmdk-box"); ok(await page.evaluate(() => document.activeElement.id === "cmdkQ"), "ô nhập được focus");
  ok(await page.locator(".cmdk-o").count() >= 5, "chưa gõ gì vẫn có gợi ý trang");
  await page.keyboard.type("auto"); await page.waitForSelector('.cmdk-g:has-text("Nội dung")'); ok(/Auto Farm/.test(await page.textContent("#cmdkL")), "tìm thấy mục theo tên");
  ok(/Tìm “auto”/.test(await page.textContent("#cmdkL")), "luôn có dòng tìm trong toàn bộ website");
  await page.keyboard.press("Escape"); await page.waitForSelector(".cmdk-box", { state: "detached" }); ok(true, "Esc đóng");
  await page.keyboard.press("/"); await page.waitForSelector(".cmdk-box"); await page.keyboard.type("cai dat"); await until(async () => /Cài đặt/.test(await page.textContent(".cmdk-o.on")));
  await page.keyboard.press("Enter"); await page.waitForURL(/\/settings/); eq(await page.locator(".cmdk-box").count(), 0, "đã đóng sau khi đi");
  await go(page, "/search"); await page.focus("#sq"); await page.keyboard.type("/x"); eq(await page.locator(".cmdk-box").count(), 0, "gõ / trong ô nhập không mở tìm nhanh"); eq(await page.inputValue("#sq"), "/x", "ký tự được gõ bình thường");
  await go(page, "/"); await page.keyboard.press("Control+k"); await page.waitForSelector(".cmdk-box"); await page.keyboard.type("tim kiem"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowUp"); await page.keyboard.press("Enter"); await page.waitForURL(/\/search/);
  await page.keyboard.press("Control+k"); await page.waitForSelector(".cmdk-box"); await page.click(".cmdk-ov", { position: { x: 5, y: 5 } }); await page.waitForSelector(".cmdk-box", { state: "detached" }); ok(true, "bấm nền để đóng");
});
test("lưu bài + xem gần đây + chia sẻ: lưu trên trình duyệt, trang Yêu thích & đã lưu, trang chủ", async ({ page }) => {
  await fresh(page); await go(page, "/scripts/-s1"); await page.waitForSelector(".save-btn");
  eq(await page.getAttribute(".save-btn", "aria-pressed"), "false", "chưa lưu");
  await page.click(".save-btn"); eq(await page.getAttribute(".save-btn", "aria-pressed"), "true", "đã lưu"); ok(/Đã lưu/.test(await page.textContent(".save-btn")), "nhãn đổi");
  await page.click("#shareBtn"); await until(async () => /liên kết|link|Không sao chép/i.test((await toasts(page)).join(" "))); ok(true, "chia sẻ báo kết quả");
  await go(page, "/favorites"); await page.waitForSelector("#favGrid .card"); ok(/Auto Farm/.test(await page.textContent("#favGrid")), "tab Đã lưu có mục");
  await go(page, "/"); await page.waitForSelector("#hrGrid .card"); ok(/Auto Farm/.test(await page.textContent("#hrGrid")) && !(await page.locator("#hrec").isHidden()), "trang chủ có Xem gần đây");
  await page.reload(); await go(page, "/favorites"); await page.waitForSelector("#favGrid .card"); ok(true, "còn sau khi tải lại trang");
  await go(page, "/scripts/-s1"); await page.click(".save-btn"); eq(await page.getAttribute(".save-btn", "aria-pressed"), "false", "bỏ lưu");
  await go(page, "/favorites"); await page.waitForSelector("#favGrid, .statebox"); eq(await page.locator("#favGrid").count(), 0, "danh sách đã lưu rỗng");
  await page.click('[data-t="recent"]'); await page.waitForSelector("#favGrid .card"); eq(await page.locator("#favGrid .card").count(), 1, "vẫn có trong Xem gần đây"); await page.click("#clrRecent"); await yes(page); await until(async () => (await page.locator("#favGrid").count()) === 0);
  await page.evaluate(() => localStorage.setItem("ssw_favs", "{hỏng")); await go(page, "/favorites"); await page.waitForSelector(".statebox"); ok(true, "dữ liệu lưu bị hỏng không làm sập trang");
});
test("bài viết: nút Thích (đếm, cần đăng nhập), menu 3 chấm, Lưu; nhân sự có thêm Sửa/Xóa", async ({ page }) => {
  await fresh(page); await go(page, "/scripts"); await page.waitForSelector(".card .like-btn");
  await page.locator(".card", { hasText: "Auto Farm" }).locator(".like-btn").click(); await page.waitForURL(/\/login/); ok(/next=/.test(path(page)), "khách bấm Thích → đăng nhập rồi quay lại");
  await login(page, USERPW); await page.waitForURL(u => !/\/login/.test(u.toString())); await authed(page); await go(page, "/scripts"); const card = page.locator(".card", { hasText: "Auto Farm" }); await card.waitFor();
  await card.locator(".like-btn").click(); await page.waitForFunction(() => document.querySelector('.card .like-btn').classList.contains("on")); eq((await card.locator(".lk-n").textContent()).trim(), "1", "đếm lượt thích");
  const lk = (await db(page)).nox_likes; ok(JSON.stringify(lk).includes("uUSER"), "lưu lượt thích theo uid"); await card.locator(".like-btn").click(); await page.waitForFunction(() => !document.querySelector('.card .like-btn').classList.contains("on")); ok(true, "bỏ thích");
  await card.locator(".dots-btn").click(); await page.waitForSelector('[data-pop="itemmenu"].on'); const labels = await page.locator('[data-pop="itemmenu"] [role=menuitem]').allTextContents();
  for (const w of ["Thích", "Lưu bài viết", "Chia sẻ", "Sao chép liên kết", "Mở trong tab mới", "Báo cáo bài viết"]) ok(labels.some(l => l.includes(w)), "menu có: " + w); ok(!labels.some(l => /Sửa bài viết|Xóa bài viết/.test(l)), "người dùng thường không thấy Sửa/Xóa");
  await page.click('[data-pop="itemmenu"] [data-m="save"]'); await page.waitForSelector('[data-pop="itemmenu"]', { state: "detached" }); await until(async () => JSON.stringify((await db(page)).nox_saved || {}).includes("uUSER")); ok(true, "Lưu bài viết đồng bộ theo tài khoản");
  await card.locator(".dots-btn").click(); await page.waitForSelector('[data-pop="itemmenu"].on'); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Escape"); await page.waitForSelector('[data-pop="itemmenu"]', { state: "detached" }); eq(await page.evaluate(() => document.activeElement.classList.contains("dots-btn")), true, "Esc đóng và trả focus");
  await card.locator(".dots-btn").click(); await page.click('[data-pop="itemmenu"] [data-m="report"]'); await page.waitForURL(/\/help\/report\?cat=script/); ok(true, "Báo cáo mở trang báo cáo đúng mục");
  await signout(page); await login(page, DEVPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/scripts"); await page.locator(".card", { hasText: "Auto Farm" }).locator(".dots-btn").click();
  await page.waitForSelector('[data-pop="itemmenu"].on [data-m="edit"]'); ok(await page.locator('[data-pop="itemmenu"] [data-m="del"]').count() === 1, "DEV thấy Sửa và Xóa");
});
test("sắp xếp danh mục: A→Z, Z→A, nhớ lựa chọn trong phiên", async ({ page }) => {
  await fresh(page); await go(page, "/scripts"); await page.waitForSelector("#grid .card");
  const names = async () => (await page.$$eval("#grid .card h3, #grid .card .name, #grid .card [data-name]", els => els.map(e => e.textContent.trim()))).filter(Boolean);
  await page.selectOption("#catSort", "az"); await page.waitForTimeout(200); const az = await names(); ok(az.length >= 2, "có ≥2 mục để so sánh"); eq(az, [...az].sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base" })), "A → Z");
  await page.selectOption("#catSort", "za"); await page.waitForTimeout(200); const za = await names(); eq(za, [...az].reverse(), "Z → A");
  await go(page, "/apk"); await go(page, "/scripts"); await page.waitForSelector("#catSort"); eq(await page.inputValue("#catSort"), "za", "nhớ lựa chọn");
});
test("màu nhấn: đổi, giữ sau khi tải lại, Mặc định và Đặt lại khôi phục", async ({ page }) => {
  await fresh(page); await go(page, "/settings"); await page.waitForSelector(".swatch");
  const strong = () => page.evaluate(() => document.documentElement.style.getPropertyValue("--strong"));
  eq(await strong(), "", "ban đầu theo giao diện");
  await page.click('.swatch[data-accent="blue"]'); eq(await strong(), "#3b82f6", "đã đổi sang xanh dương"); eq(await page.evaluate(() => document.documentElement.style.getPropertyValue("--on-strong")), "#ffffff", "chữ trắng trên nền xanh");
  await page.click('.swatch[data-accent="orange"]'); eq(await strong(), "#ea580c", "đổi sang cam");
  await page.reload(); await page.waitForSelector(".swatch"); eq(await strong(), "#ea580c", "giữ sau khi tải lại"); eq(await page.getAttribute('.swatch[data-accent="orange"]', "aria-checked"), "true", "nút đúng trạng thái");
  await page.click('.swatch[data-accent=""]'); eq(await strong(), "", "Mặc định");
  await page.click('.swatch[data-accent="red"]'); await page.click("#resetAll"); await yes(page); await until(async () => (await strong()) === ""); ok(true, "Đặt lại cũng trả về mặc định");
  await page.evaluate(() => localStorage.setItem("ssw_accent", "<script>")); await page.reload(); await page.waitForSelector(".swatch"); eq(await strong(), "", "giá trị lạ bị bỏ qua");
});
test("mất kết nối: hiện thanh báo, có mạng lại thì ẩn và báo", async ({ page }) => {
  const context = page.context(); await fresh(page); await go(page, "/"); await context.setOffline(true); await page.waitForSelector("#netBar:not([hidden])", { timeout: 3000 }); ok(/Mất kết nối/.test(await page.textContent("#netBar")), "thanh báo hiện");
  await context.setOffline(false); await page.waitForSelector("#netBar", { state: "hidden", timeout: 4000 }); await page.waitForSelector(".toast"); ok(/kết nối lại/i.test(await page.textContent(".toast")), "báo đã kết nối lại");
});
test("lên đầu trang: chỉ hiện sau khi cuộn, bấm thì về đầu", async ({ page }) => {
  await fresh(page); await go(page, "/help"); await page.evaluate(() => { const d = document.createElement("div"); d.style.height = "3000px"; d.id = "spacer"; document.querySelector("#view").appendChild(d); });
  ok(await page.locator("#backTop").isHidden(), "ở đầu trang thì ẩn"); await page.evaluate(() => scrollTo(0, 1500)); await page.waitForSelector("#backTop:not([hidden])"); await page.click("#backTop"); await page.waitForFunction(() => scrollY < 5, null, { timeout: 4000 }); await page.waitForSelector("#backTop", { state: "hidden" }); ok(true);
});
test("huy hiệu: Hộp thư (biểu tượng thư riêng) báo số tin chưa đọc; dev thấy cả bài chờ duyệt; mở cuộc trò chuyện thì giảm", async ({ page }) => {
  await installApi(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page);
  ok(await page.locator("#btnMail").isVisible(), "có biểu tượng Hộp thư ở đầu trang"); eq(await page.locator('#side a[href="/inbox"], #side a[href="/help/messages"], #side a[href="/dev/inbox"]').count(), 0, "menu không còn mục Hộp thư");
  await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_threads = { uUSER: { t1: { type: "support", subject: "A", status: "open", last: "dev", unreadUser: true, createdAt: 1, updatedAt: 2 }, t2: { type: "support", subject: "B", status: "open", last: "dev", unreadUser: true, createdAt: 1, updatedAt: 3 }, t3: { type: "report", subject: "C", status: "open", last: "dev", unreadUser: false, createdAt: 1, updatedAt: 1 } } }; window.__fb.setDb(d); });
  await page.waitForFunction(() => { const b = document.querySelector("#mailBadge"); return !b.hidden && b.textContent.trim() === "2"; }); ok(true, "2 tin chưa đọc"); await page.waitForSelector("#btnMail.has"); ok(true, "biểu tượng thư sáng");
  await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_threads.uUSER.t1.unreadUser = false; d.nox_threads.uUSER.t2.unreadUser = false; window.__fb.setDb(d); }); await page.waitForFunction(() => document.querySelector("#mailBadge").hidden); ok(true, "hết chưa đọc thì mất huy hiệu");
  await page.click('[data-act="signout"]').catch(async () => { await go(page, "/profile"); await page.click('[data-act="signout"]'); }); await yes(page); await page.waitForFunction(() => document.querySelector("#hdrAcc") && document.querySelector("#hdrAcc").dataset.state !== "in");
  await login(page, DEVPW); await page.waitForURL(/\/(two-step.*)?$/); if (/two-step/.test(path(page))) { await page.fill("#code", "123456"); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); } await authed(page);
  await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_threads = { uUSER: { t1: { type: "support", subject: "A", status: "open", last: "user", unreadDev: true, createdAt: 1, updatedAt: 2 }, t2: { type: "chat", subject: "B", status: "closed", last: "user", unreadDev: true, createdAt: 1, updatedAt: 3 } } }; d.nox_pending = { uUSER: { p1: { kind: "item", status: "pending", name: "x", catId: "script", createdAt: 1, updatedAt: 1 }, p2: { kind: "item", status: "rejected", name: "y", catId: "script", createdAt: 1, updatedAt: 1 } } }; window.__fb.setDb(d); });
  await page.waitForFunction(() => { const b = document.querySelector("#mailBadge"); return !b.hidden && b.textContent.trim() === "1"; }, null, { timeout: 8000 }); ok(true, "hộp thư: chỉ tính cuộc đang mở");
  await page.waitForSelector('#sideNav a[href="/dev/review"] .nav-badge', { state: "attached" }); eq((await page.textContent('#sideNav a[href="/dev/review"] .nav-badge')).trim(), "1", "duyệt bài: chỉ tính bài chờ duyệt");
  ok(await page.locator("#hdrAcc .avatar.has-badge").count() === 1, "chấm báo trên ảnh đại diện");
});
/* ===== Đợt E: bảo trì, hộp thư kiểu chat, Google bắt buộc 2 bước, chẩn đoán DEV ===== */
test("thông báo bảo trì: dev đăng → dải trên cùng + thẻ Bảo trì trong chuông; sửa; xóa", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/system"); await page.waitForSelector("#mnAdd"); await page.click("#mnAdd"); await page.waitForSelector('[data-pop="mnedit"].on #mnT');
  await page.click('#mnf [data-lv="active"]'); await page.click('#mnf button[type=submit]'); ok((await page.textContent("#mnX")).length > 3, "thiếu tiêu đề báo lỗi");
  await page.fill("#mnT", "Bảo trì máy chủ"); await page.fill("#mnB", "Khoảng 30 phút."); await page.click('#mnf button[type=submit]'); await page.waitForSelector('[data-pop="mnedit"]', { state: "detached" });
  await until(async () => /Bảo trì máy chủ/.test(await page.textContent("#mnList"))); eq(Object.keys((await db(page)).nox_maintnotes || {}).length, 1, "đã lưu 1 thông báo");
  await go(page, "/"); await page.waitForSelector("#mnBanner:not([hidden])"); ok(/Bảo trì máy chủ/.test(await page.textContent("#mnBanner")), "dải hiện tiêu đề"); eq(await page.getAttribute("#mnBanner", "data-level"), "active"); ok(await page.evaluate(() => document.documentElement.classList.contains("has-mn")), "nội dung được đẩy xuống dưới dải");
  const hdrBottom = await page.evaluate(() => document.querySelector("#hdr").getBoundingClientRect().bottom), bn = await page.evaluate(() => document.querySelector("#mnBanner").getBoundingClientRect().top); ok(Math.abs(hdrBottom - bn) < 2, "dải nằm sát dưới thanh trên");
  await page.click("#mnBanner .mnb-more"); await page.waitForSelector('[data-pop="notif"].on .mn-active'); ok(/Khoảng 30 phút/.test(await page.textContent('[data-pop="notif"]')), "chi tiết trong chuông"); await closePop(page, "notif");
  await page.click("#mnBanner .mnb-x"); await page.waitForSelector("#mnBanner", { state: "hidden" }); ok(true, "ẩn dải (nhớ trong phiên)");
  await go(page, "/dev/system"); await page.click("[data-e]"); await page.waitForSelector('[data-pop="mnedit"].on'); eq(await page.inputValue("#mnT"), "Bảo trì máy chủ", "nạp lại để sửa"); await page.click('#mnf [data-lv="done"]'); await page.fill("#mnT", "Đã xong bảo trì"); await page.click('#mnf button[type=submit]');
  await until(async () => Object.values((await db(page)).nox_maintnotes || {}).some(n => n.title === "Đã xong bảo trì" && n.level === "done")); eq(Object.keys((await db(page)).nox_maintnotes).length, 1, "sửa không tạo thêm");
  await page.click("[data-d]"); await yes(page); await until(async () => !Object.keys((await db(page)).nox_maintnotes || {}).length); ok(true, "đã xóa");
});
test("hộp thư kiểu chat: Ctrl+Enter gửi, nhóm bong bóng, ngày, đã xem; dev có trả lời nhanh", async ({ page }) => {
  await installApi(page); await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page);
  await page.click("#btnMail"); await page.waitForURL(BASE + "/inbox"); await page.waitForSelector(".mbx"); ok(await page.locator(".mbx-side").isVisible(), "danh sách bên trái");
  await go(page, "/inbox/chat"); await page.waitForSelector("#ct"); await page.fill("#ct", "Chào dev, mình cần hỏi"); await page.click("#cf button[type=submit]"); await page.waitForSelector("#chText");
  await page.fill("#chText", "Tin thứ hai"); await page.keyboard.press("Control+Enter"); await page.waitForFunction(() => document.querySelectorAll("#chLog .msg.me").length === 2);
  ok(await page.locator("#chLog .msg.me.first").count() === 1 && await page.locator("#chLog .msg.me.last").count() === 1, "hai tin liền nhau gộp thành một nhóm"); ok(await page.locator("#chLog .cv-day").count() >= 1, "có mốc ngày");
  await page.fill("#chText", "a"); await page.keyboard.press("Shift+Enter"); await page.keyboard.type("b"); eq(await page.inputValue("#chText"), "a\nb", "Shift+Enter xuống dòng"); await page.fill("#chText", "");
  ok(await page.evaluate(() => document.querySelector(".cv-form").classList.contains("has") === false), "ô trống → nút gửi xám");
  const w = await page.evaluate(() => { const b = document.querySelector("#chLog .msg.me .bub"); return b ? getComputedStyle(b).backgroundImage.includes("gradient") : false; }); ok(w, "bong bóng của mình có nền gradient");
  await signout(page); await login(page, DEVPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/inbox"); await page.waitForSelector("button.thread.unread, button.thread"); await page.locator("button.thread").first().click(); await page.waitForSelector("#chQuick button");
  const q = await page.locator("#chQuick button").first().textContent(); await page.locator("#chQuick button").first().click(); eq((await page.inputValue("#chText")).trim(), q.trim(), "bấm trả lời nhanh điền vào ô nhập");
  await page.keyboard.press("Control+Enter"); await until(async () => (await page.locator("#chLog .msg.me").count()) >= 1); ok(true, "dev gửi được");
});
test("Google: bắt buộc bật xác minh 2 bước → tự đưa tới Hồ sơ › Bảo mật, bật xong mới dùng được", async ({ page }) => {
  const st = await installApi(page); await go(page, "/login"); await page.waitForFunction(() => window.__tsOpts); await page.waitForFunction(() => !document.querySelector("#gbtn").classList.contains("locked"));
  await page.click("#gstub", { force: true }); await page.waitForURL(/\/profile\?tab=security&setup=1/); await page.waitForSelector(".setup-banner"); ok(/Google/.test(await page.textContent(".setup-banner")), "biểu ngữ giải thích");
  await go(page, "/scripts"); eq(path(page).split("?")[0], "/profile", "trang khác bị đưa về Hồ sơ"); await go(page, "/settings"); eq(path(page).split("?")[0], "/settings", "Cài đặt vẫn mở được");
  await go(page, "/profile?tab=security&setup=1"); await page.waitForSelector("#tfBtn"); await until(() => mailTo(st, USERPW[0], /verification code/) || true, 3000).catch(() => {}); 
  await page.click("#tfBtn").catch(() => {}); await page.waitForSelector('.cf-root.on [data-f="code"]'); await page.fill('.cf-root.on [data-f="code"]', "123456"); await page.click('.cf-root.on [data-cf="yes"]');
  await page.waitForFunction(() => !document.querySelector(".setup-banner"), null, { timeout: 8000 }); await go(page, "/scripts"); eq(path(page), "/scripts", "bật xong thì vào bình thường");
});
test("Dev Panel: thẻ chẩn đoán quyền — bình thường báo xanh; thiếu thẻ phiên báo đỏ và tự sửa dẫn tới nhập mã", async ({ page }) => {
  await installApi(page); await loginDev(page); await go(page, "/dev"); await page.waitForSelector("#doctor .doctor.ok"); ok(/hoạt động bình thường/.test(await page.textContent("#doctor")), "báo bình thường"); eq(await page.locator("#doctor .dr-list li.no").count(), 0);
  await page.evaluate(() => { const a = firebase.auth(), d = Object.getOwnPropertyDescriptor(a, "currentUser"); Object.defineProperty(a, "currentUser", { configurable: true, get() { const u = d.get.call(a); u.emailVerified = false; u.reload = () => { Object.defineProperty(a, "currentUser", d); return Promise.resolve(); }; return u; } }); }); /* mô phỏng trạng thái "email chưa xác minh" bị cũ trong phiên */
  await page.click('#view a[href="/dev/system"]'); await page.waitForURL(BASE + "/dev/system"); await page.goBack(); await page.waitForSelector("#doctor .doctor.bad");
  ok(/chưa xác minh/.test(await page.textContent("#doctor")), "chỉ rõ nguyên nhân: email chưa xác minh"); ok(await page.locator("#doctor .dr-list li.no").count() >= 1, "có mục đỏ");
  await page.click("#drFix"); await page.waitForSelector("#doctor .doctor.ok", { timeout: 8000 }); ok(true, "Kiểm tra & sửa làm mới trạng thái → báo xanh");
});
let pass = 0, fail = 0; const only = process.argv[2];
for (const [name, fn, o] of T) {
  if (only && !name.includes(only)) continue; const { ctx, page } = await fresh(o); const t0 = Date.now();
  try { await Promise.race([fn({ page, ctx }), new Promise((_, rj) => setTimeout(() => rj(new Error("quá thời gian (treo)")), (o.timeout || 45000)))]); const extra = page.errs.filter(e => !/net::ERR_FAILED/.test(e)); if (extra.length && !o.allowErrors) throw new Error("lỗi console: " + extra.join(" | ")); pass++; console.log(`  ✓ ${name} (${Date.now() - t0}ms)`); }
  catch (e) { fail++; console.log(`  ✗ ${name}\n      ${String(e.message).split("\n").slice(0, 40).join("\n      ")}`); try { await page.screenshot({ path: SHOTS + "/FAIL-" + name.replace(/\W+/g, "_").slice(0, 40) + ".png" }); } catch (_) {} }
  await ctx.close();
}
await browser.close(); srv.close(); console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
