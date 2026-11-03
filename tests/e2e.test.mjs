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

async function fresh(o = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...(o.device || {}) });
  await ctx.addInitScript(() => { try { if (!window.__keepSplash) { sessionStorage.setItem("ssw_splash", "1"); sessionStorage.setItem("ssw_notice_seen", "1700000500000"); } } catch (_) {} });
  await ctx.route("**/*", route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (/firebase-app-compat\.js/.test(u)) return route.fulfill({ contentType: "text/javascript", body: fakeFirebaseSource() });
    if (/firebase-(auth|database)-compat\.js/.test(u)) return route.fulfill({ contentType: "text/javascript", body: "" });
    if (/accounts\.google\.com\/gsi\/client/.test(u)) return route.fulfill({ contentType: "text/javascript", body: GIS_STUB });
    if (/jsdelivr/.test(u)) return route.fulfill({ contentType: "text/css", body: "" });
    return route.abort();
  });
  const page = await ctx.newPage(); page.errs = [];
  page.on("pageerror", e => page.errs.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) page.errs.push("console: " + m.text()); });
  return { ctx, page };
}
const go = async (page, p) => { await page.goto(BASE + p); await page.waitForSelector("#view .page", { timeout: 8000 }); };
async function login(page, [email, pw], next) {
  await go(page, "/login" + (next ? "?next=" + encodeURIComponent(next) : ""));
  await page.fill("#email", email); await page.fill("#password", pw); await page.click(".authcard button[type=submit]");
}
const settle = page => page.waitForTimeout(250);
const db = page => page.evaluate(() => window.__fb.getDb());
const toastText = page => page.locator(".toast").allTextContents();
const authed = page => page.waitForFunction(() => document.querySelector("#btnAcc").getAttribute("href") === "/settings");
const loginDev = async page => { await login(page, DEVPW); await page.waitForURL(BASE + "/"); await authed(page); };

/* ───────── 1. Routing & đăng nhập ───────── */
test("1-2 truy cập trực tiếp /login và refresh /login", async ({ page }) => {
  await go(page, "/login"); eq(path(page), "/login"); ok(await page.locator(".authcard h2").textContent() === "Đăng nhập", "tiêu đề"); ok((await page.title()).includes("Đăng nhập"), "document.title");
  await page.reload(); await page.waitForSelector(".authcard"); eq(path(page), "/login"); ok(await page.locator("#email").isVisible(), "form sau refresh");
});
test("3 đăng nhập sai/đúng, session giữ sau refresh", async ({ page }) => {
  await login(page, [DEVPW[0], "sai"]); await page.waitForSelector("#err:not(:empty)"); ok((await page.textContent("#err")).includes("không đúng"), "lỗi mật khẩu");
  ok(await page.locator("button[type=submit]").isEnabled(), "nút hết loading");
  await page.fill("#password", DEVPW[1]); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); await authed(page);
  await page.reload(); await authed(page); eq(path(page), "/"); ok(await page.locator('#sideNav a[href="/dev"]').count() === 1, "menu DEV sau refresh");
  const v = await page.locator("#btnAcc.dev").count(); eq(v, 1, "nút tài khoản đánh dấu DEV");
});
test("3b đăng nhập Google (GIS → Firebase credential)", async ({ page }) => {
  await go(page, "/login"); await page.click("#gstub"); await page.waitForURL(BASE + "/"); await authed(page); eq(await page.locator("#btnAcc.dev").count(), 1);
});
test("3c validate form đăng nhập + loading", async ({ page }) => {
  await go(page, "/login"); await page.click("button[type=submit]"); ok((await page.textContent('[data-err="email"]')).includes("email"), "thiếu email"); ok((await page.textContent('[data-err="password"]')).includes("mật khẩu"), "thiếu mk");
  await page.fill("#email", "abc"); await page.fill("#password", "x"); await page.click("button[type=submit]"); ok((await page.textContent('[data-err="email"]')).includes("không hợp lệ"), "email sai định dạng");
});
test("4 next: quay về trang đích sau đăng nhập; chặn open-redirect", async ({ page }) => {
  await go(page, "/scripts/create"); eq(path(page), "/login?next=%2Fscripts%2Fcreate", "guard → login?next");
  await page.fill("#email", DEVPW[0]); await page.fill("#password", DEVPW[1]); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/scripts/create"); await page.waitForSelector("#itemForm");
});
test("4b open-redirect //evil.com, /\\evil.com, http://evil.com bị từ chối", async ({ page }) => {
  for (const n of ["//evil.com", "/\\evil.com", "http://evil.com", "javascript:alert(1)", "/login"]) {
    await login(page, DEVPW, n); await page.waitForURL(u => u.origin === BASE && u.pathname === "/", { timeout: 6000 }).catch(() => { throw new Error("next=" + n + " → " + path(page)); });
    await page.evaluate(async () => { await window.firebase.auth().signOut(); });
  }
});
test("5 đăng xuất; trang cần quyền chuyển về login", async ({ page }) => {
  await loginDev(page); await go(page, "/dev"); await page.click('#authZone [data-act="signout"]'); await page.waitForURL(u => u.pathname === "/login"); eq(path(page), "/login?next=%2Fdev", "đăng xuất khi đang ở /dev");
  ok((await page.textContent("#authZone")).includes("Đăng nhập"), "khu tài khoản"); await page.reload(); await page.waitForSelector(".authcard"); eq(await page.locator("#btnAcc").getAttribute("href"), "/login");
});
test("12 user thường bị chặn mọi trang DEV/ghi", async ({ page }) => {
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page);
  for (const p of ["/dev", "/dev/data", "/dev/data/scripts", "/dev/data/apk", "/dev/data/ios", "/dev/data/links", "/dev/categories", "/dev/users", "/dev/theme", "/dev/system", "/bypass", "/scripts/create", "/apk/create", "/ios/create", "/links/create", "/scripts/-s1/edit", "/c/mod/create"]) {
    await go(page, p); eq(path(page), "/", "chặn " + p); }
  eq(await page.locator('#sideNav a[href="/dev"]').count(), 0, "không hiện menu DEV"); ok(!(await page.content()).includes("SECRET-KEY-123"), "lộ API key");
  const r = await page.evaluate(async () => { const out = {}; const d = firebase.database();
    for (const [k, f] of Object.entries({ push: () => d.ref("nox_data/scripts").push({ name: "hack" }), del: () => d.ref("nox_data/scripts/-s1").remove(), api: () => d.ref("nox_theme/api").once("value"), maint: () => d.ref("nox_maintenance").update({ enabled: true }) })) { try { await f(); out[k] = "OK(!)"; } catch (e) { out[k] = e.code; } } return out; });
  eq(r, { push: "PERMISSION_DENIED", del: "PERMISSION_DENIED", api: "PERMISSION_DENIED", maint: "PERMISSION_DENIED" }, "ghi trực tiếp qua SDK bị Rules chặn");
});
test("12b DEV chưa xác minh email không có quyền DEV", async ({ page }) => {
  await login(page, UNV); await page.waitForURL(BASE + "/"); await authed(page); await go(page, "/dev"); eq(path(page), "/"); ok((await toastText(page)).join().includes("xác minh"), "toast giải thích");
  eq(await page.locator("#btnAcc.dev").count(), 0);
});
test("12c khách chưa đăng nhập: mọi route DEV → /login?next=", async ({ page }) => {
  for (const p of ["/dev", "/dev/data", "/dev/users", "/dev/theme", "/dev/system", "/dev/categories", "/bypass", "/scripts/create", "/links/-l1/edit"]) { await go(page, p); eq(path(page), "/login?next=" + encodeURIComponent(p), p); }
});
test("đăng ký / quên mật khẩu", async ({ page }) => {
  await go(page, "/register"); await page.fill("#email", "moi@x.io"); await page.fill("#password", "abcdef"); await page.fill("#confirm", "khac"); await page.click("button[type=submit]");
  ok((await page.textContent('[data-err="confirm"]')).includes("không khớp"), "mk không khớp"); await page.fill("#confirm", "abcdef"); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); await authed(page);
  ok(await page.evaluate(() => window.__verifySent === 1), "gửi email xác minh");
  await page.evaluate(() => firebase.auth().signOut()); await go(page, "/forgot-password"); await page.fill("#email", "bad"); await page.click("button[type=submit]"); ok((await page.textContent('[data-err="email"]')).includes("không hợp lệ"));
  await page.fill("#email", "moi@x.io"); await page.click("button[type=submit]"); await page.waitForFunction(() => document.querySelector("#ok").textContent.includes("Đã gửi"));
});

/* ───────── Dữ liệu: danh sách / chi tiết / CRUD ───────── */
test("5 /scripts, deep link chi tiết, refresh, id lạ, legacy", async ({ page }) => {
  await go(page, "/scripts"); await page.waitForSelector(".card"); eq(await page.locator(".card").count(), 2); ok((await page.textContent("#grid")).includes("Legacy Script"), "item legacy (title/script)");
  await page.click('.card-link:has-text("Auto Farm Script")'); await page.waitForURL(BASE + "/scripts/-s1"); ok((await page.textContent(".dt-code")).includes("print('farm')"), "code");
  await page.reload(); await page.waitForSelector(".dt-code"); eq(path(page), "/scripts/-s1"); await page.goBack(); await page.waitForURL(BASE + "/scripts");
  await go(page, "/scripts/khong-co"); ok((await page.textContent("#view")).includes("không tồn tại"), "id lạ"); await go(page, "/scripts/create"); eq(path(page), "/login?next=%2Fscripts%2Fcreate", "create không bị hiểu là :id");
});
test("6-10 thêm Script / APK / iOS / Link vào Firebase", async ({ page }) => {
  await loginDev(page); await go(page, "/scripts/create"); await page.click("#saveBtn");
  ok((await page.textContent('[data-err="name"]')).includes("Thiếu tên") && (await page.textContent('[data-err="code"]')).includes("Thiếu code"), "validate rỗng");
  await page.fill('[name="name"]', "Script Mới"); await page.fill('[name="desc"]', "mô tả"); await page.fill('[name="code"]', "print(1)"); await page.click("#saveBtn");
  await page.waitForURL(BASE + "/scripts"); await page.waitForSelector('.card:has-text("Script Mới")'); ok((await toastText(page)).join().includes("Đã thêm"), "toast thành công");
  let d = await db(page); const s = Object.values(d.nox_data.scripts).find(x => x.name === "Script Mới"); ok(s && typeof s.createdAt === "number" && s.copies === 0 && s.code === "print(1)", "bản ghi Script: " + JSON.stringify(s));
  for (const [route, node, extra] of [["apk", "apks", { vault: true }], ["ios", "ios", {}], ["links", "links", {}]]) {
    await go(page, `/${route}/create`); await page.fill('[name="name"]', "Mới " + route); await page.fill('[name="url"]', "abc"); await page.click("#saveBtn");
    ok((await page.textContent('[data-err="url"]')).includes("không hợp lệ"), "url sai " + route); await page.fill('[name="url"]', "https://x.io/" + route);
    if (extra.vault) await page.check('[name="vault"]'); await page.click("#saveBtn"); await page.waitForURL(BASE + "/" + route); await page.waitForSelector(`.card:has-text("Mới ${route}")`);
    d = await db(page); const it = Object.values(d.nox_data[node]).find(x => x.name === "Mới " + route); ok(it && it.url === "https://x.io/" + route && typeof it.createdAt === "number" && (!extra.vault || it.vault === true), `bản ghi ${route}: ` + JSON.stringify(it));
  }
});
test("11 sửa (giữ nguyên field cũ) và xóa", async ({ page }) => {
  await loginDev(page); await go(page, "/scripts/-s1/edit"); await page.waitForSelector("#itemForm"); eq(await page.inputValue('[name="name"]'), "Auto Farm Script");
  await page.fill('[name="name"]', "Auto Farm V2"); await page.click("#saveBtn"); await page.waitForURL(BASE + "/scripts"); let d = await db(page); const a = d.nox_data.scripts["-s1"];
  ok(a.name === "Auto Farm V2" && typeof a.updatedAt === "number" && a.copies === 2 && a.desc === "Tự động farm" && a.createdAt === 1700000000000, "sửa giữ field: " + JSON.stringify(a));
  await go(page, "/scripts/-s2/edit"); await page.waitForSelector("#itemForm"); eq(await page.inputValue('[name="name"]'), "Legacy Script"); await page.fill('[name="code"]', "print('new')"); await page.click("#saveBtn"); await page.waitForURL(BASE + "/scripts");
  d = await db(page); const l = d.nox_data.scripts["-s2"]; ok(l.title === "Legacy Script" && l.script === "print('old')" && l.code === "print('new')", "legacy không mất: " + JSON.stringify(l));
  await go(page, "/links/-l1"); await page.click("#delBtn"); ok((await page.textContent("#delBtn")).includes("Chắc"), "xác nhận 2 bước"); await page.click("#delBtn"); await page.waitForURL(BASE + "/links"); await page.waitForFunction(() => !document.querySelector(".card"));
  d = await db(page); ok(!d.nox_data.links || !d.nox_data.links["-l1"], "đã xóa khỏi DB");
  await go(page, "/dev/data/apk"); await page.click(".drow .de"); await page.click(".drow .de"); await page.waitForFunction(() => !document.querySelector(".drow .de") ); d = await db(page); ok(!d.nox_data.apks, "xóa từ /dev/data/apk");
});
test("realtime: ghi từ nơi khác, danh sách tự cập nhật không reload", async ({ page }) => {
  await loginDev(page); await go(page, "/apk"); await page.waitForSelector(".card"); eq(await page.locator(".card").count(), 1);
  await page.evaluate(() => firebase.database().ref("nox_data/apks").push({ name: "RT apk", url: "https://rt.io", createdAt: Date.now() })); await page.waitForFunction(() => document.querySelectorAll(".card").length === 2);
});
test("bộ đếm copies: khách tăng +1", async ({ page }) => {
  await go(page, "/scripts"); await page.waitForSelector(".card"); await page.click('.card:has-text("Auto Farm") [data-act="copycode"]'); await settle(page).then(() => page.waitForTimeout(200));
  const d = await db(page); eq(d.nox_data.scripts["-s1"].copies, 3, "copies");
});
test("danh mục tùy chỉnh /c/:node", async ({ page }) => {
  await go(page, "/c/mod"); await page.waitForSelector(".card"); ok((await page.textContent("#grid")).includes("Mod Pack")); await go(page, "/c/mod/-m1"); ok((await page.textContent(".dt-url")).includes("example.com/mod"));
  await go(page, "/c/nope"); ok((await page.textContent("#view")).includes("không tồn tại"), "danh mục lạ"); await loginDev(page);
  await go(page, "/c/mod/create"); ok(await page.locator('[name="url"]').count() === 1 && await page.locator('[name="code"]').count() === 1, "form danh mục tùy chỉnh"); await go(page, "/dev/data/c/mod"); await page.waitForSelector(".drow");
});
test("tìm kiếm: URL, kết quả, Back", async ({ page }) => {
  await go(page, "/"); await page.waitForSelector(".tile"); await page.fill("#q", "farm"); await page.waitForURL(BASE + "/search?q=farm"); await page.waitForSelector(".card"); eq(await page.locator(".card").count(), 1);
  await page.goBack(); await page.waitForURL(BASE + "/"); await page.waitForSelector(".tile"); eq(await page.inputValue("#q"), "", "ô tìm kiếm xóa khi rời /search");
});

/* ───────── Bảo mật dữ liệu nhạy cảm ───────── */
test("API key không bị tải về trình duyệt người thường; DEV thấy ở /bypass", async ({ page }) => {
  await go(page, "/"); await go(page, "/scripts"); await go(page, "/settings"); const log = await page.evaluate(() => window.__fbLog);
  ok(!log.reads.includes("/nox_theme") && !log.reads.includes("/nox_theme/api"), "không đọc nox_theme/api: " + log.reads.filter(r => r.includes("theme")).join());
  eq(log.denied.filter(x => x.startsWith("read")), [], "không có lần đọc nào bị từ chối khi duyệt bình thường"); ok(!(await page.content()).includes("SECRET-KEY-123"));
  await loginDev(page); await go(page, "/bypass"); await page.waitForFunction(() => document.querySelector("#key") && document.querySelector("#key").value === "SECRET-KEY-123"); ok((await page.textContent("#stx")).includes("có key"));
});

/* ───────── Router ───────── */
test("14 Back/Forward + lịch sử", async ({ page }) => {
  await go(page, "/"); await page.waitForSelector(".tile"); await page.click('#sideNav a[href="/categories"]'); await page.waitForURL(BASE + "/categories"); await page.click('#sideNav a[href="/apk"]'); await page.waitForURL(BASE + "/apk"); await page.waitForSelector(".card");
  await page.goBack(); await page.waitForURL(BASE + "/categories"); await page.waitForFunction(() => document.querySelector(".ptitle") && document.querySelector(".ptitle").textContent === "Danh mục", null, { timeout: 5000 }).catch(() => { throw new Error("assert: back → categories (tiêu đề hiện tại: " + "?" + ")"); }); await page.goBack(); await page.waitForURL(BASE + "/"); await page.waitForSelector(".hero");
  await page.goForward(); await page.waitForURL(BASE + "/categories"); await page.goForward(); await page.waitForURL(BASE + "/apk"); await page.waitForFunction(() => document.querySelector(".ptitle") && document.querySelector(".ptitle").textContent === "APK", null, { timeout: 5000 });
});
test("404 + route không tồn tại giữ nguyên URL", async ({ page }) => {
  await go(page, "/404"); ok(await page.locator(".nf404").isVisible()); await go(page, "/khong/co/trang"); eq(path(page), "/khong/co/trang"); ok((await page.textContent(".nf404")) === "404"); ok((await page.title()).includes("404"));
  await page.click(".nf a.btn"); await page.waitForURL(BASE + "/");
});
test("route trùng lặp bị chặn + khớp route tĩnh trước :tham-số + safeNext", async ({ page }) => {
  await go(page, "/"); const r = await page.evaluate(async () => { const R = await import("/assets/js/lib/router.js"), U = await import("/assets/js/lib/util.js"); let dup = null; try { R.define("/", { load() {} }); } catch (e) { dup = e.message; }
    const t = R.routeTable().map(x => x.path); return { dup, unique: new Set(t).size === t.length, n: t.length, a: R.match("/scripts/create").path, b: R.match("/scripts/abc").path, c: R.match("/scripts/abc/edit").path, d: R.match("/dev/data/scripts").path, e: R.match("/c/mod/-m1").path, none: R.match("/x/y/z/w"), sn: [U.safeNext("/scripts/create?x=1"), U.safeNext("//e.com"), U.safeNext("/\\e.com"), U.safeNext("https://e.com"), U.safeNext("/login")] }; });
  ok(r.dup && r.dup.includes("trùng"), "define trùng phải ném lỗi"); ok(r.unique, "bảng route không trùng"); eq([r.a, r.b, r.c, r.d, r.e, r.none], ["/scripts/create", "/scripts/:id", "/scripts/:id/edit", "/dev/data/scripts", "/c/:node/:id", null]); eq(r.sn, ["/scripts/create?x=1", null, null, null, null]);
});
test("lazy loading: chỉ tải module trang khi cần", async ({ page }) => {
  hits.length = 0; await go(page, "/"); await page.waitForSelector(".tile"); ok(!hits.some(h => /pages\/(dev|category|misc|auth)\.js/.test(h)), "trang chủ không tải dev/category/misc/auth: " + hits.filter(h => h.includes("pages/")).join());
  await page.click('#sideNav a[href="/scripts"]'); await page.waitForSelector(".card"); ok(hits.some(h => h.endsWith("pages/category.js")), "category.js được tải khi vào /scripts"); ok(!hits.some(h => h.endsWith("pages/dev.js")), "dev.js chưa tải");
});
test("không nhân đôi listener Firebase khi chuyển trang", async ({ page }) => {
  await loginDev(page); await page.waitForTimeout(300); const base = await page.evaluate(() => window.__fbLog.listeners);
  for (const p of ["/scripts", "/apk", "/dev", "/dev/data", "/dev/users", "/dev/theme", "/dev/system", "/settings", "/categories", "/scripts/-s1", "/notifications"]) { await page.evaluate(q => { history.pushState({ k: Math.random() }, "", q); dispatchEvent(new PopStateEvent("popstate", { state: history.state })); }, p); await page.waitForTimeout(120); }
  await page.evaluate(() => { history.pushState({ k: 9e3 }, "", "/"); dispatchEvent(new PopStateEvent("popstate", { state: history.state })); }); await page.waitForTimeout(300); eq(await page.evaluate(() => window.__fbLog.listeners), base, "số listener giữ nguyên");
});
test("bảo trì: khách thấy overlay, /login vẫn vào được, DEV bỏ qua", async ({ page }) => {
  await go(page, "/"); await page.evaluate(() => { const d = window.__fb.getDb(); d.nox_maintenance = { enabled: true, ts: Date.now(), until: Date.now() + 600000 }; window.__fb.setDb(d); });
  await page.waitForSelector("#maint.on"); ok((await page.textContent("#mntClock")).includes(":"), "đồng hồ"); await page.click("#maint a.btn"); await page.waitForURL(BASE + "/login"); await page.waitForSelector("#maint:not(.on)", { state: "attached", timeout: 5000 }); await page.waitForSelector(".authcard");
  await page.fill("#email", DEVPW[0]); await page.fill("#password", DEVPW[1]); await page.click("button[type=submit]"); await page.waitForURL(BASE + "/"); await authed(page); eq(await page.locator("#maint.on").count(), 0, "DEV không bị chặn");
});
test("cài đặt giao diện sáng/tối, giữ sau refresh", async ({ page }) => {
  await go(page, "/settings"); eq(await page.getAttribute("html", "data-theme"), "dark"); await page.click('[data-theme="light"]'); eq(await page.getAttribute("html", "data-theme"), "light");
  await page.screenshot({ path: SHOTS + "/settings-light.png" }); await page.reload(); await page.waitForSelector(".setgrid"); eq(await page.getAttribute("html", "data-theme"), "light", "giữ sau refresh");
});
test("hiệu năng splash: chỉ hiện lần đầu mỗi tab", async ({ page }) => {
  await page.addInitScript(() => { window.__keepSplash = true; try { if (!sessionStorage.getItem("t_once")) { sessionStorage.setItem("t_once", "1"); sessionStorage.removeItem("ssw_splash"); } } catch (_) {} });
  await page.goto(BASE + "/"); ok(await page.locator("#splash").isVisible(), "splash hiện lần đầu"); await page.waitForFunction(() => document.querySelector("#splash").style.display === "none", { timeout: 8000 });
  await page.reload(); await page.waitForSelector("#view .page"); ok(!(await page.locator("#splash").isVisible()), "refresh không hiện lại splash");
}, { skipInit: true });

test("popup thông báo: hiện 1 lần, ẩn 2h, không chặn trang đăng nhập", async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("t2")) { sessionStorage.setItem("t2", "1"); sessionStorage.removeItem("ssw_notice_seen"); } } catch (_) {} });
  await go(page, "/login"); await page.waitForTimeout(500); eq(await page.locator("#mdNotice.on").count(), 0, "không hiện ở /login");
  await page.click('#sideNav a[href="/"]'); await page.waitForSelector("#mdNotice.on"); ok((await page.textContent("#ntBody")).includes("thử nghiệm")); await page.click("#nt2h"); await page.waitForSelector("#mdNotice:not(.on)", { state: "attached" });
  await page.reload(); await page.waitForTimeout(600); eq(await page.locator("#mdNotice.on").count(), 0, "đã ẩn 2h"); await go(page, "/notifications"); ok((await page.textContent(".noticecard")).includes("Chào mừng"), "trang /notifications");
});
test("DEV: bảo trì + thông báo qua giao diện ghi đúng vào Firebase", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/system"); await page.waitForSelector("#mBtn"); await page.fill("#mins", "5"); await page.click("#mBtn");
  await page.waitForFunction(() => window.__fb.getDb().nox_maintenance.enabled === true); let d = await db(page); ok(d.nox_maintenance.until - d.nox_maintenance.ts >= 299000, "until = +5 phút");
  await page.click("#mBtn"); await page.waitForFunction(() => window.__fb.getDb().nox_maintenance.enabled === false);
  await page.fill("#nT", "Tiêu đề mới"); await page.fill("#nB", "Nội dung mới"); await page.click("#nf button[type=submit]"); await page.waitForFunction(() => window.__fb.getDb().nox_notice.title === "Tiêu đề mới");
  await page.uncheck("#nOn", { force: true }).catch(() => {}); await page.locator("#nOn").evaluate(el => { el.checked = false; el.dispatchEvent(new Event("change")); }); await page.waitForFunction(() => window.__fb.getDb().nox_notice.enabled === false);
});
test("DEV: thêm/xóa danh mục tùy chỉnh, route mới hoạt động, dữ liệu cũ không bị xóa", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/categories"); await page.fill("#name", "Tool Hay"); await page.click("#f button[type=submit]");
  await page.waitForFunction(() => Object.values(window.__fb.getDb().nox_categories || {}).some(c => c.node === "tool-hay")); await page.waitForSelector('#sideNav a[href="/c/tool-hay"]'); await go(page, "/c/tool-hay"); await page.waitForSelector(".statebox"); await go(page, "/c/tool-hay/create"); await page.waitForSelector("#itemForm");
  await go(page, "/dev/categories"); await page.waitForSelector('[data-cat="tool-hay"]'); await page.click('[data-cat="tool-hay"]'); await page.click('[data-cat="tool-hay"]'); await page.waitForFunction(() => !Object.values(window.__fb.getDb().nox_categories || {}).some(c => c.node === "tool-hay"));
  await page.click('[data-cat="mod"]'); await page.click('[data-cat="mod"]'); await page.waitForFunction(() => !Object.values(window.__fb.getDb().nox_categories || {}).some(c => c.node === "mod")); d = await db(page); ok(d.nox_data.mod && d.nox_data.mod["-m1"], "dữ liệu trong node không bị xóa khi xóa danh mục");
  var d; });
test("DEV: /dev/users hiển thị hồ sơ đăng nhập thật (nox_users)", async ({ page }) => {
  await login(page, USERPW); await page.waitForURL(BASE + "/"); await authed(page); await page.waitForFunction(() => window.__fb.getDb().nox_users && Object.keys(window.__fb.getDb().nox_users).length === 1); await page.evaluate(() => firebase.auth().signOut());
  await loginDev(page); await go(page, "/dev/users"); await page.waitForSelector(".dtable"); const t = await page.textContent(".dtable"); ok(t.includes("user@example.com") && t.includes(DEV_EMAIL), "bảng người dùng: " + t.slice(0, 120));
});
test("DEV: theme/âm thanh ghi đúng khóa con; API key lưu/xóa", async ({ page }) => {
  await loginDev(page); await go(page, "/dev/theme"); await page.setInputFiles("#auF", { name: "a.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("ID3fake") }); await page.click("#auA");
  await page.waitForFunction(() => window.__fb.getDb().nox_theme.audioName === "a.mp3"); let d = await db(page); ok(d.nox_theme.audioData.startsWith("data:audio/mpeg"), "audioData"); ok(d.nox_theme.api.key === "SECRET-KEY-123", "api không bị ghi đè khi update theme");
  await go(page, "/bypass"); await page.fill("#key", "KEY-MOI"); await page.click("#save"); await page.waitForFunction(() => window.__fb.getDb().nox_theme.api.key === "KEY-MOI"); await page.click("#clear"); await page.waitForFunction(() => !window.__fb.getDb().nox_theme.api);
});

/* ───────── Smoke toàn bộ route + mobile ───────── */
const ROUTES = ["/", "/login", "/register", "/forgot-password", "/search?q=a", "/categories", "/notifications", "/settings", "/404", "/scripts", "/scripts/-s1", "/apk", "/apk/-a1", "/ios", "/ios/-i1", "/links", "/links/-l1", "/c/mod", "/c/mod/-m1", "/bypass",
  "/scripts/create", "/apk/create", "/ios/create", "/links/create", "/scripts/-s1/edit", "/apk/-a1/edit", "/ios/-i1/edit", "/links/-l1/edit", "/c/mod/create", "/c/mod/-m1/edit", "/dev", "/dev/data", "/dev/data/scripts", "/dev/data/apk", "/dev/data/ios", "/dev/data/links", "/dev/data/c/mod", "/dev/categories", "/dev/users", "/dev/theme", "/dev/system"];
const GUESTONLY = ["/login", "/register", "/forgot-password"];
test("13 URL của TẤT CẢ trang (DEV, tải trực tiếp, không lỗi console)", async ({ page }) => {
  await loginDev(page); const bad = [];
  for (const r of ROUTES) { if (GUESTONLY.includes(r)) continue; page.errs.length = 0; await go(page, r); await authed(page); await page.waitForTimeout(150);
    const p = path(page), h1 = await page.locator("#pagehead h1, .hero h1").first().textContent().catch(() => ""), nf = await page.locator(".nf404").count(), lockd = await page.locator(".statebox:has(svg) a[href='/']").count();
    if (r !== "/404" && (p !== r || nf || !h1)) bad.push(`${r} → ${p} h1="${h1}" nf=${nf}`); if (r === "/404" && !nf) bad.push("/404 không hiện 404"); if (page.errs.length) bad.push(`${r}: ${page.errs.join(" | ")}`); }
  for (const r of GUESTONLY) { await go(page, r); eq(path(page), "/", "đã đăng nhập vào " + r + " → về /"); }
  eq(bad, [], "route lỗi"); console.log("      " + ROUTES.length + " route đã kiểm tra");
});
test("15 mobile (Pixel 5): drawer, điều hướng, không tràn ngang", async ({ page }) => {
  await go(page, "/"); await page.waitForSelector(".tile"); await page.click("#btnMenu"); await page.waitForSelector("#side.open"); await page.screenshot({ path: SHOTS + "/mobile-drawer.png" });
  await page.click('#sideNav a[href="/categories"]'); await page.waitForURL(BASE + "/categories"); await page.waitForFunction(() => !document.querySelector("#side.open")); const over = [];
  for (const r of ["/", "/scripts", "/scripts/-s1", "/login", "/settings", "/categories", "/404"]) { await go(page, r); await page.waitForTimeout(200); const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); if (w[0] > w[1]) over.push(r + " " + w.join(">")); }
  eq(over, [], "tràn ngang"); await page.fill("#qM", "x").catch(() => {}); 
}, { device: devices["Pixel 5"] });
test("15b mobile DEV: form + dev panel", async ({ page }) => {
  await loginDev(page); const over = [];
  for (const r of ["/scripts/create", "/dev", "/dev/data/scripts", "/dev/users", "/dev/system", "/dev/theme", "/bypass"]) { await go(page, r); await authed(page); await page.waitForTimeout(250); const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); if (w[0] > w[1]) over.push(r + " " + w.join(">")); }
  eq(over, [], "tràn ngang"); await go(page, "/scripts/create"); await page.screenshot({ path: SHOTS + "/mobile-form.png" });
}, { device: devices["Pixel 5"] });
test("ảnh chụp màn hình desktop", async ({ page }) => {
  await loginDev(page); for (const [r, n] of [["/", "home"], ["/scripts", "scripts"], ["/scripts/-s1", "detail"], ["/scripts/create", "form"], ["/dev", "dev"], ["/dev/system", "system"], ["/dev/users", "users"]]) { await go(page, r); await page.waitForTimeout(900); await page.screenshot({ path: `${SHOTS}/${n}.png` }); }
  await page.evaluate(() => firebase.auth().signOut()); await go(page, "/login"); await page.waitForTimeout(600); await page.screenshot({ path: SHOTS + "/login.png" });
});

let pass = 0, fail = 0; const only = process.argv[2];
for (const [name, fn, o] of T) {
  if (only && !name.includes(only)) continue; const { ctx, page } = await fresh(o); const t0 = Date.now();
  try { await Promise.race([fn({ page, ctx }), new Promise((_, rj) => setTimeout(() => rj(new Error("quá 45s (treo)")), 45000))]); const extra = page.errs.filter(e => !/net::ERR_FAILED/.test(e)); if (extra.length && !o.allowErrors) throw new Error("lỗi console: " + extra.join(" | ")); pass++; console.log(`  ✓ ${name} (${Date.now() - t0}ms)`); }
  catch (e) { fail++; console.log(`  ✗ ${name}\n      ${String(e.message).split("\n")[0]}`); try { await page.screenshot({ path: SHOTS + "/FAIL-" + name.replace(/\W+/g, "_").slice(0, 40) + ".png" }); } catch (_) {} }
  await ctx.close();
}
await browser.close(); srv.close(); console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
