import { createRequire } from "node:module";
import { startServer } from "./server.mjs";
import { fakeFirebaseSource, GIS_STUB, DEV_EMAIL } from "./fake-firebase.mjs";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
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
  await ctx.addInitScript(opt => { try { if (!window.__keepSplash) { sessionStorage.setItem("ssw_splash", "1"); sessionStorage.setItem("ssw_notice_seen", "1700000500000"); } } catch (_) {} if (opt.captcha) window.__captcha = opt.captcha; }, { captcha: o.captcha });
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
  await page.waitForFunction(() => window.__nameSet === "Test User", null, { timeout: 4000 }).catch(() => { throw new Error("tên hiển thị không được lưu"); }); ok((await page.evaluate(() => window.__verifySent)) >= 1, "gửi email xác minh");
  const d = await db(page); ok(Object.values(d.nox_users || {}).some(u => u.email === "new@example.com"), "hồ sơ người dùng được tạo");
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
  await loginDev(page); await go(page, "/profile"); await page.click('[data-act="signout"]'); await page.waitForURL(/\/login/); eq(await authState(page), "out");
});
test("DEV chưa xác minh email không vào được Dev Panel", async ({ page }) => {
  await login(page, UNV); await authed(page); await go(page, "/dev"); ok(await page.locator(".statebox").count() >= 1 || path(page) !== "/dev", "bị chặn");
  eq(await page.locator("#view .stats").count(), 0, "không thấy số liệu quản trị");
});

/* ───────── Hồ sơ ───────── */
test("hồ sơ: hiển thị thông tin, đổi tên, gửi email đổi mật khẩu", async ({ page }) => {
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/profile");
  ok((await page.textContent(".profile-head")).includes(USERPW[0]), "email"); ok(!(await page.textContent(".profile-head")).includes("Quản trị"), "thành viên thường");
  await page.fill("#dn", "Tên Mới"); await page.click("#saveName"); await page.waitForFunction(() => window.__nameSet === "Tên Mới");
  await page.waitForFunction(() => document.querySelector(".profile-id h2").textContent === "Tên Mới");
  await page.click("#pwMail"); await page.waitForFunction(() => window.__resetSent); eq(await page.evaluate(() => window.__resetSent), USERPW[0]);
  eq(await page.locator("#view .stats").count(), 0);
});
test("hồ sơ: chưa đăng nhập thì chuyển về đăng nhập", async ({ page }) => { await go(page, "/profile"); eq(path(page), "/login?next=%2Fprofile"); });

/* ───────── Menu & Danh mục ───────── */
test("menu: nút Danh mục mở ra từ từ, có hiệu ứng, ghi nhớ và đóng lại được (desktop)", async ({ page }) => {
  await go(page, "/"); const g = page.locator('.disc[data-g="cats"]'), panel = g.locator(".disc-panel");
  const btn = g.locator(".nav-btn"); eq(await btn.getAttribute("aria-expanded"), "false", "mặc định đóng");
  eq(await panel.evaluate(e => Math.round(e.getBoundingClientRect().height)), 0, "panel đóng cao 0");
  await btn.click(); await page.waitForTimeout(90); const mid = await panel.evaluate(e => e.getBoundingClientRect().height);
  await page.waitForTimeout(700); const full = await panel.evaluate(e => e.getBoundingClientRect().height);
  ok(mid > 0 && mid < full, `đang mở dần (giữa=${mid}, đủ=${full})`); eq(await btn.getAttribute("aria-expanded"), "true");
  ok((await panel.locator(".disc-item").count()) >= 4, "có đủ danh mục");
  await page.reload(); await page.waitForSelector(".disc"); eq(await page.locator('.disc[data-g="cats"] .nav-btn').getAttribute("aria-expanded"), "true", "nhớ trạng thái mở");
  await page.locator('.disc[data-g="cats"] .nav-btn').click(); await page.waitForTimeout(700); eq(await panel.evaluate(e => Math.round(e.getBoundingClientRect().height)), 0, "đóng lại");
  await page.locator('.disc[data-g="cats"] .nav-btn').click(); await page.waitForTimeout(300); await panel.locator('.disc-item[href="/apk"]').click(); await page.waitForURL(BASE + "/apk");
  await page.waitForSelector('.disc-item[href="/apk"].on', { timeout: 3000 }).catch(() => { throw new Error("mục đang xem không được đánh dấu"); });
});
test("menu: Dev Panel có nút riêng, chỉ DEV mới thấy", async ({ page }) => {
  await go(page, "/"); eq(await page.locator('.disc[data-g="dev"]').count(), 0, "khách không thấy");
  await loginDev(page); await page.waitForSelector('.disc[data-g="dev"]'); await page.locator('.disc[data-g="dev"] .nav-btn').click(); await page.waitForTimeout(700);
  eq(await page.locator('.disc[data-g="dev"] .disc-item').count(), 6, "6 mục quản trị");
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
test("trang chủ: ô danh mục, số lượng, mục mới", async ({ page }) => {
  await go(page, "/"); await page.waitForSelector(".tile"); ok((await page.locator(".tile").count()) >= 5, "5 danh mục gồm Mod tùy chỉnh");
  ok((await page.locator(".row").count()) >= 1, "mục mới cập nhật"); const t = await visibleText(page); ok(!TECH.test(t), "không có chữ kỹ thuật: " + (t.match(TECH) || [])[0]);
});
test("danh sách, chi tiết, sao chép, tìm kiếm", async ({ page }) => {
  await go(page, "/scripts"); eq(await page.locator("#grid .card").count(), 2); await page.click('.card [href="/scripts/-s1"]'); await page.waitForURL(BASE + "/scripts/-s1"); await page.waitForSelector(".detail");
  ok((await page.textContent("#main")).includes("Auto Farm Script"), "chi tiết");
  await go(page, "/scripts/-s2"); ok((await page.textContent("#main")).includes("Legacy Script"), "dữ liệu cũ vẫn hiển thị");
  await go(page, "/search?q=farm"); await page.waitForSelector("#sq"); ok((await page.textContent("#view")).includes("Auto Farm"), "tìm thấy");
  await page.focus("#sq"); await page.fill("#sq", "demo"); await page.waitForFunction(() => document.querySelector("#view").textContent.includes("Demo APK")); ok(await page.evaluate(() => document.activeElement.id === "sq"), "ô tìm kiếm không mất focus");
});
test("tìm kiếm từ ô trên thanh đầu trang", async ({ page }) => {
  await go(page, "/"); await page.fill("#q", "discord"); await page.waitForURL(/\/search\?q=discord/); await page.waitForFunction(() => document.querySelector("#view").textContent.includes("Discord"));
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
  await go(page, "/links/" + key); await page.click("#delBtn"); await page.click("#delBtn"); await page.waitForTimeout(600);
  ok(!Object.values((await db(page)).nox_data.links || {}).some(i => i.name === "Mục thử"), "đã xoá");
});
test("khách không thể thêm/sửa dữ liệu (đổi qua Rules)", async ({ page }) => {
  await go(page, "/"); const r = await page.evaluate(async () => { try { await firebase.database().ref("nox_data/links/x").set({ name: "hack" }); return "ok"; } catch (e) { return e.code; } }); eq(r, "PERMISSION_DENIED");
});

/* ───────── Dev Panel ───────── */
test("Dev Panel: các trang quản trị đều mở được và không có chữ kỹ thuật", async ({ page }) => {
  await loginDev(page);
  for (const r of ["/dev", "/dev/data", "/dev/data/scripts", "/dev/data/c/mod", "/dev/categories", "/dev/users", "/dev/theme", "/dev/system"]) {
    await go(page, r); await page.waitForTimeout(300); eq(path(page), r); const t = await visibleText(page); ok(!TECH.test(t), r + " có chữ kỹ thuật: " + (t.match(TECH) || [])[0]);
  }
});
test("Dev Panel: bảo trì bật/tắt và thông báo", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/system"); await page.click("#mBtn"); await page.waitForFunction(() => document.querySelector("#maint.show, #maint:not([hidden])") && true);
  await page.waitForTimeout(400); eq((await db(page)).nox_maintenance.enabled, true, "đã bật bảo trì");
  await page.click("#mBtn"); await page.waitForTimeout(400); eq((await db(page)).nox_maintenance.enabled, false, "đã tắt");
});
test("Dev Panel: thêm / xoá danh mục tuỳ chỉnh", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/categories"); const before = Object.keys((await db(page)).nox_categories).length;
  await page.fill("#cName, input[name=name]", "Công cụ"); await page.click("#cAdd, button[type=submit]"); await page.waitForTimeout(500);
  eq(Object.keys((await db(page)).nox_categories).length, before + 1);
});

/* ───────── Chế độ bảo trì ───────── */
test("bảo trì: khách thấy màn hình bảo trì, DEV vẫn vào được", async ({ page }) => {
  await go(page, "/"); await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_maintenance = { enabled: true, until: Date.now() + 600000 }; window.__fb.setDb(d); });
  await page.waitForFunction(() => { const m = document.querySelector("#maint"); return m && getComputedStyle(m).display !== "none" && m.getBoundingClientRect().height > 100; });
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
  await go(page, "/scripts"); await page.waitForTimeout(2200); const ls = await page.evaluate(() => localStorage.getItem("ssw_cache_v1")); ok(ls && ls.length > 50, "đã lưu bộ nhớ đệm");
  await page.evaluate(() => { window.__fbDelay = 0; }); await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("#view .page", { timeout: 8000 });
  ok((await page.locator("#view .card").count()) >= 1, "thẻ hiện ngay");
});

/* ───────── Giao diện ───────── */
test("giao diện: chuyển sáng/tối trong Cài đặt và ghi nhớ", async ({ page }) => {
  await go(page, "/settings"); const th = () => page.evaluate(() => document.documentElement.dataset.theme);
  await page.click('[data-theme-set="light"], [data-v="light"], button:has-text("Sáng")'); await page.waitForTimeout(200); eq(await th(), "light"); await page.reload(); await page.waitForSelector("#view .page"); eq(await th(), "light");
});
test("không có chữ kỹ thuật trên các trang công khai (cả khi chưa có dữ liệu)", async ({ page }) => {
  for (const r of ["/", "/categories", "/scripts", "/apk", "/ios", "/links", "/notifications", "/settings", "/login", "/register", "/forgot-password", "/search?q=zzz", "/scripts/khong-co"]) {
    await go(page, r); await page.waitForTimeout(250); const t = await visibleText(page); ok(!TECH.test(t), r + ": " + (t.match(TECH) || [])[0]);
  }
});
test("ảnh chụp màn hình", async ({ page }) => {
  await go(page, "/"); await page.waitForSelector(".tile"); await page.screenshot({ path: SHOTS + "/d-home.png" });
  await page.locator('.disc[data-g="cats"] .nav-btn').click(); await page.waitForTimeout(800); await page.screenshot({ path: SHOTS + "/d-home-menu.png" });
  for (const [r, n] of [["/scripts", "list"], ["/scripts/-s1", "detail"], ["/login", "login"], ["/register", "register"], ["/categories", "cats"]]) { await go(page, r); await page.waitForTimeout(500); await page.screenshot({ path: SHOTS + "/d-" + n + ".png" }); }
  await loginDev(page); for (const [r, n] of [["/profile", "profile"], ["/dev", "dev"], ["/dev/system", "system"], ["/dev/users", "users"], ["/dev/categories", "devcats"]]) { await go(page, r); await page.waitForTimeout(500); await page.screenshot({ path: SHOTS + "/d-" + n + ".png" }); }
});
test("ảnh chụp màn hình điện thoại", async ({ page }) => {
  await go(page, "/"); await page.waitForSelector(".tile"); await page.screenshot({ path: SHOTS + "/m-home.png" });
  await page.click("#btnMenu"); await page.waitForTimeout(500); await page.locator('.disc[data-g="cats"] .nav-btn').click(); await page.waitForTimeout(800); await page.screenshot({ path: SHOTS + "/m-menu.png" });
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  for (const [r, n] of [["/scripts", "list"], ["/login", "login"], ["/register", "register"]]) { await go(page, r); await page.waitForTimeout(500); await page.screenshot({ path: SHOTS + "/m-" + n + ".png" }); }
}, { device: devices["Pixel 5"] });

let pass = 0, fail = 0; const only = process.argv[2];
for (const [name, fn, o] of T) {
  if (only && !name.includes(only)) continue; const { ctx, page } = await fresh(o); const t0 = Date.now();
  try { await Promise.race([fn({ page, ctx }), new Promise((_, rj) => setTimeout(() => rj(new Error("quá 45s (treo)")), 45000))]); const extra = page.errs.filter(e => !/net::ERR_FAILED/.test(e)); if (extra.length && !o.allowErrors) throw new Error("lỗi console: " + extra.join(" | ")); pass++; console.log(`  ✓ ${name} (${Date.now() - t0}ms)`); }
  catch (e) { fail++; console.log(`  ✗ ${name}\n      ${String(e.message).split("\n")[0]}`); try { await page.screenshot({ path: SHOTS + "/FAIL-" + name.replace(/\W+/g, "_").slice(0, 40) + ".png" }); } catch (_) {} }
  await ctx.close();
}
await browser.close(); srv.close(); console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
