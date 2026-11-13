/* Kiểm thử ví / nạp tiền / mua hàng / webhook ngân hàng / tệp chat — Firebase Admin giả có giao dịch nguyên tử (không gọi mạng). */
import { createRequire } from "node:module";
import crypto from "node:crypto";
const require = createRequire(import.meta.url);
const { createApi } = require("../api/_lib/core.js");
const { vietqr, crc16 } = require("../api/_lib/vietqr.js");
let pass = 0, fail = 0;
const t = (n, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); if (g === w) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n, "→ nhận", g, "mong đợi", w); } };

const NOW0 = 1800000000000; let clock = NOW0;
const DEVE = "hminhgalaxy@gmail.com";
function world(envExtra = {}) {
  const users = { uDEV: { uid: "uDEV", email: DEVE, providerData: [{ providerId: "password" }] }, uA: { uid: "uA", email: "a@example.com", providerData: [{ providerId: "password" }] }, uB: { uid: "uB", email: "b@example.com", providerData: [{ providerId: "password" }] } };
  const mk = (uid, email, v = true) => ({ uid, email, email_verified: v, auth_time: NOW0 / 1000 - 60, firebase: { sign_in_provider: "password" } });
  const tokens = { dev: mk("uDEV", DEVE), a: mk("uA", "a@example.com"), b: mk("uB", "b@example.com"), aUnv: mk("uA", "a@example.com", false), guest: { uid: "gg1", firebase: { sign_in_provider: "anonymous" } } };
  let data = {};
  const get = (o, p) => p.split("/").reduce((x, k) => (x == null ? null : x[k] === undefined ? null : x[k]), o);
  const setp = (o, p, v) => { const k = p.split("/"); let c = o; for (let i = 0; i < k.length - 1; i++) c = c[k[i]] = c[k[i]] && typeof c[k[i]] === "object" ? c[k[i]] : {}; if (v === null || v === undefined) delete c[k.at(-1)]; else c[k.at(-1)] = JSON.parse(JSON.stringify(v)); };
  const clone = v => (v == null ? null : JSON.parse(JSON.stringify(v)));
  const db = {
    get: async p => clone(get(data, p)), set: async (p, v) => setp(data, p, v), update: async (p, o) => { for (const k in o) setp(data, p + "/" + k, o[k]); }, remove: async p => setp(data, p, null),
    tx: async (p, fn) => { const cur = clone(get(data, p)); let first = fn(cur === null ? null : clone(cur)); if (first === undefined) return { committed: false, value: cur }; setp(data, p, first); return { committed: true, value: clone(first) }; }
  };
  const auth = { verifyIdToken: async tk => { if (!tokens[tk]) throw new Error("bad"); return { ...tokens[tk] }; }, getUser: async uid => ({ ...users[uid] }), getUserByEmail: async e => ({ ...Object.values(users).find(x => x.email === e) }), setCustomUserClaims: async () => {}, updateUser: async () => {}, revokeRefreshTokens: async () => {} };
  const env = { DEV_EMAIL: DEVE, SEPAY_API_KEY: "key-123", SEPAY_SECRET: "sec-456", CASSO_SECURE_TOKEN: "cas-789", ...envExtra };
  let n = 0;
  const api = createApi({ auth, db, sendMail: async () => {}, verifyPassword: async () => true, env, now: () => clock, randomInt: (a, b) => (n++ === 0 ? 21920417 : 21920417 + n) });
  const call = (action, body = {}, token = "", ip = "1.2.3.4") => api({ action, body, token, ip });
  const hook = (body, headers = { authorization: "Apikey key-123" }) => api.webhook({ headers, raw: JSON.stringify(body), ip: "9.9.9.9" });
  return { api, call, hook, get data() { return data; }, set data(v) { data = v; }, users, tokens };
}
const sePay = (id, amount, content, extra = {}) => ({ id, gateway: "Techcombank", transactionDate: "2026-11-12 16:00:00", accountNumber: "19077584659010", code: null, content, transferType: "in", description: content, transferAmount: amount, accumulated: 0, referenceCode: "FT" + id, ...extra });

console.log("VIETQR");
{ const stat = vietqr({ bin: "970407", account: "19077584659010" });
  t("mã QR tĩnh dựng lại khớp từng ký tự với QR thật của Techcombank (CRC a522)", stat, "00020101021138580010A000000727012800069704070114190775846590100208QRIBFTTA5204601153037045802VN5903TCB6005Hanoi6304A522");
  const dyn = vietqr({ bin: "970407", account: "19077584659010", amount: 50000, content: "SKN21920417" });
  t("mã QR có số tiền: kiểu động (12), có tag 54 và nội dung", [dyn.includes("010212"), dyn.includes("540550000"), dyn.includes("0811SKN21920417")], [true, true, true]);
  t("CRC hợp lệ", crc16(dyn.slice(0, -4)), dyn.slice(-4));
  t("CRC-16/CCITT-FALSE chuẩn ('123456789' = 29B1)", crc16("123456789"), "29B1");
  t("ngân hàng sai → lỗi", (() => { try { vietqr({ bin: "x", account: "1" }); return "no"; } catch (_) { return "throw"; } })(), "throw"); }

console.log("VÍ + MÃ NẠP RIÊNG");
{ const w = world();
  t("khách / chưa đăng nhập bị chặn", [(await w.call("wallet-info")).status, (await w.call("wallet-info", {}, "guest")).status], [401, 403]);
  t("email chưa xác minh bị chặn", (await w.call("wallet-info", {}, "aUnv")).body.code, "unverified");
  const a = await w.call("wallet-info", {}, "a");
  t("tạo ví: mã dạng SKN + 8 số, số dư 0, có thông tin ngân hàng", [a.status, /^SKN\d{8}$/.test(a.body.code), a.body.balance, a.body.bank.account, a.body.bank.bank], [200, true, 0, "19077584659010", "Techcombank"]);
  t("gọi lại → vẫn cùng một mã", (await w.call("wallet-info", {}, "a")).body.code, a.body.code);
  const b = await w.call("wallet-info", {}, "b"); t("mỗi tài khoản một mã khác nhau", b.body.code !== a.body.code && /^SKN\d{8}$/.test(b.body.code), true);
  t("chỉ mục tra ngược mã → tài khoản", [w.data.nox_topcodes[a.body.code], w.data.nox_topcodes[b.body.code]], ["uA", "uB"]);
  const ban = world(); ban.data = { nox_admin: { uA: { banUntil: clock + 1e6 } } }; t("tài khoản bị khóa không dùng được ví", (await ban.call("wallet-info", {}, "a")).body.code, "banned"); }

console.log("TẠO YÊU CẦU NẠP (SỐ TIỀN CỐ ĐỊNH)");
{ const w = world(); const code = (await w.call("wallet-info", {}, "a")).body.code;
  const r = await w.call("topup-create", { amount: 50000 }, "a");
  t("trả mã VietQR có đúng số tiền + nội dung = mã tài khoản", [r.status, r.body.qr.includes("540550000"), r.body.qr.includes("0811" + code), r.body.code], [200, true, true, code]);
  t("lưu yêu cầu chờ", Object.values(w.data.nox_topups.uA).map(x => [x.amount, x.status]), [[50000, "pending"]]);
  for (const bad of [5000, 10500, 60000000, "abc", -50000, 0, null, 12345.5]) { const x = await w.call("topup-create", { amount: bad }, "a"); t("số tiền không hợp lệ bị từ chối: " + bad, [x.status, x.body.code], [400, "bad_amount"]); }
  t("không đăng nhập → 401", (await w.call("topup-create", { amount: 50000 })).status, 401);
  const lim = world(); for (let i = 0; i < 20; i++) await lim.call("topup-create", { amount: 20000 }, "a"); t("giới hạn 20 yêu cầu/giờ", (await lim.call("topup-create", { amount: 20000 }, "a")).status, 429);
  const stale = world(); await stale.call("wallet-info", {}, "a"); await stale.call("topup-create", { amount: 20000 }, "a"); clock += 4 * 86400000; await stale.call("topup-create", { amount: 30000 }, "a"); t("yêu cầu cũ hơn 3 ngày được dọn", Object.values(stale.data.nox_topups.uA).map(x => x.amount), [30000]); clock = NOW0; }

console.log("WEBHOOK NGÂN HÀNG");
{ const w = world(); const code = (await w.call("wallet-info", {}, "a")).body.code; await w.call("topup-create", { amount: 50000 }, "a");
  t("không có khoá → 401", (await w.hook(sePay(1, 50000, code), {})).status, 401);
  t("khoá sai → 401", (await w.hook(sePay(1, 50000, code), { authorization: "Apikey nope" })).status, 401);
  t("chưa cấu hình khoá nào → 503 (không bao giờ mở toang)", (await world({ SEPAY_API_KEY: "", SEPAY_SECRET: "", CASSO_SECURE_TOKEN: "" }).hook(sePay(1, 5, "x"))).status, 503);
  t("sai khoá thì ví vẫn nguyên 0", w.data.nox_wallet.uA.balance, 0);
  const ok1 = await w.hook(sePay(101, 50000, "NGUYEN VAN A chuyen tien " + code + " FT123"));
  t("đúng khoá + đúng mã → 200 {success:true}, cộng ví", [ok1.status, ok1.body.success, ok1.body.results, w.data.nox_wallet.uA.balance], [200, true, ["credited"], 50000]);
  t("ghi lịch sử giao dịch", Object.values(w.data.nox_txs.uA).map(x => [x.type, x.amount, x.balance]), [["topup", 50000, 50000]]);
  t("yêu cầu nạp 50.000 chuyển sang 'done'", Object.values(w.data.nox_topups.uA)[0].status, "done");
  const dup = await w.hook(sePay(101, 50000, code)); t("SePay gửi lại cùng id → KHÔNG cộng thêm", [dup.body.results, w.data.nox_wallet.uA.balance], [["duplicate"], 50000]);
  const par = await Promise.all([w.hook(sePay(102, 20000, code)), w.hook(sePay(102, 20000, code)), w.hook(sePay(102, 20000, code))]); t("3 lần gửi đồng thời cùng id → chỉ cộng một lần", [par.map(x => x.body.results[0]).sort(), w.data.nox_wallet.uA.balance], [["credited", "duplicate", "duplicate"], 70000]);
  t("mã viết thường / tách dấu vẫn nhận (ngân hàng đổi chữ)", [(await w.hook(sePay(103, 10000, "chuyen tien " + code.toLowerCase()))).body.results, (await w.hook(sePay(104, 10000, "SKN-" + code.slice(3, 7) + " " + code.slice(7)))).body.results, w.data.nox_wallet.uA.balance], [["credited"], ["credited"], 90000]);
  t("tiền ra (transferType out) bị bỏ qua", [(await w.hook(sePay(105, 99999, code, { transferType: "out" }))).body.results, w.data.nox_wallet.uA.balance], [["ignored"], 90000]);
  t("sai số tài khoản nhận → bỏ qua", [(await w.hook(sePay(106, 5000, code, { accountNumber: "111" }))).body.results, w.data.nox_wallet.uA.balance], [["ignored"], 90000]);
  const um = await w.hook(sePay(107, 30000, "chuyen tien khong co ma")); t("không có mã → 'unmatched' (200 để SePay không gửi lại), ví không đổi", [um.status, um.body.results, w.data.nox_bankhook.sepay_107.status], [200, ["unmatched"], "unmatched"]);
  t("mã không tồn tại → unmatched", (await w.hook(sePay(108, 30000, "SKN99999999"))).body.results, ["unmatched"]);
  t("số tiền 0 / âm bị bỏ qua", [(await w.hook(sePay(109, 0, code))).body.results, (await w.hook(sePay(110, -5, code))).body.results], [["ignored"], ["ignored"]]);
  const bk = world(); const c2 = (await bk.call("wallet-info", {}, "b")).body.code;
  const cs = await bk.hook({ error: 0, data: [{ id: 55, tid: "T1", description: "chuyen tien " + c2, amount: 25000, when: "2026-11-12 10:00:00" }, { id: 56, tid: "T2", description: "rut tien", amount: -1000 }] }, { "secure-token": "cas-789" });
  t("Casso (header secure-token): cộng đúng, bỏ qua giao dịch âm", [cs.body.results, bk.data.nox_wallet.uB.balance], [["credited", "ignored"], 25000]);
  const ts = String(Math.floor(clock / 1000)), body = JSON.stringify(sePay(300, 15000, c2)), sig = "sha256=" + crypto.createHmac("sha256", "sec-456").update(ts + "." + body).digest("hex");
  const hm = await bk.api.webhook({ headers: { "x-sepay-signature": sig, "x-sepay-timestamp": ts }, raw: body, ip: "9.9.9.9" });
  t("SePay HMAC-SHA256 hợp lệ → cộng", [hm.status, bk.data.nox_wallet.uB.balance], [200, 40000]);
  const bad = await bk.api.webhook({ headers: { "x-sepay-signature": "sha256=00", "x-sepay-timestamp": ts }, raw: body, ip: "9.9.9.9" }); t("HMAC sai → 401", bad.status, 401);
  const old = await bk.api.webhook({ headers: { "x-sepay-signature": sig, "x-sepay-timestamp": String(Number(ts) - 3600) }, raw: body, ip: "9.9.9.9" }); t("dấu thời gian quá cũ → 401 (chống phát lại)", old.status, 401);
  t("JSON hỏng → 400", (await bk.api.webhook({ headers: { authorization: "Apikey key-123" }, raw: "{oops", ip: "1.1.1.1" })).status, 400);
  const spam = world(); let last; for (let i = 0; i < 62; i++) last = await spam.api.webhook({ headers: { authorization: "Apikey bad" }, raw: "{}", ip: "6.6.6.6" }); t("dò khoá quá 60 lần/10 phút → 429", last.status, 429);
  const asg = world(); const cc = (await asg.call("wallet-info", {}, "a")).body.code; await asg.hook(sePay(400, 70000, "ghi sai noi dung"));
  t("chỉ DEV được gán giao dịch chưa khớp", (await asg.call("bank-assign", { hook: "sepay_400", uid: "uA" }, "a")).status, 403);
  const as = await asg.call("bank-assign", { hook: "sepay_400", uid: "uA" }, "dev"); t("DEV gán → cộng ví, đánh dấu credited", [as.status, as.body.balance, asg.data.nox_bankhook.sepay_400.status], [200, 70000, "credited"]);
  t("gán lần hai bị từ chối (không cộng trùng)", [(await asg.call("bank-assign", { hook: "sepay_400", uid: "uA" }, "dev")).status, asg.data.nox_wallet.uA.balance], [404, 70000]); void cc; }

console.log("MUA HÀNG");
{ const w = world(); const code = (await w.call("wallet-info", {}, "a")).body.code; await w.call("wallet-info", {}, "b");
  w.data.nox_shop = { items: {
    key1: { name: "Key VIP", price: 30000, stock: 3, mode: "lines", active: true },
    txt1: { name: "Script", price: 10000, stock: 5, mode: "text", active: true },
    man1: { name: "Làm tay", price: 5000, stock: 2, mode: "manual", active: true },
    free1: { name: "Miễn phí", price: 0, mode: "text", active: true },
    off1: { name: "Tắt", price: 1000, stock: 1, mode: "text", active: false } } };
  w.data.nox_shopsecret = { key1: { lines: { a: "KEY-AAA", b: "KEY-BBB", c: "KEY-CCC" } }, txt1: { text: "https://link/secret" } };
  t("chưa có tiền → 402 insufficient, không trừ hàng", [(await w.call("shop-buy", { items: [{ id: "txt1", qty: 1 }] }, "a")).body.code, w.data.nox_shop.items.txt1.stock], ["insufficient", 5]);
  await w.hook(sePay(1, 100000, code));
  const r1 = await w.call("shop-buy", { items: [{ id: "key1", qty: 2 }] }, "a");
  t("mua 2 key: trừ 60.000, giao đúng 2 dòng đầu, stock còn 1", [r1.status, r1.body.balance, r1.body.delivery[0].lines, w.data.nox_shop.items.key1.stock, w.data.nox_shop.items.key1.sold], [200, 40000, ["KEY-AAA", "KEY-BBB"], 1, 2]);
  t("đơn lưu 'paid' kèm nội dung giao + lịch sử trừ tiền", [w.data.nox_orders.uA[r1.body.orderId].status, w.data.nox_orders.uA[r1.body.orderId].delivery[0].lines.length, w.data.nox_txs.uA[r1.body.orderId].amount], ["paid", 2, -60000]);
  t("dòng đã bán bị xoá khỏi kho bí mật", Object.keys(w.data.nox_shopsecret.key1.lines), ["c"]);
  const r2 = await w.call("shop-buy", { items: [{ id: "txt1", qty: 2 }, { id: "free1", qty: 1 }] }, "a");
  t("mua giỏ nhiều món: text + miễn phí", [r2.status, r2.body.balance, r2.body.delivery.map(d => d.text), w.data.nox_shop.items.txt1.stock], [200, 20000, ["https://link/secret", ""], 3]);
  t("hàng giao tay: đơn đánh dấu manual", [(await w.call("shop-buy", { items: [{ id: "man1", qty: 1 }] }, "a")).body.manual, w.data.nox_wallet.uA.balance], [true, 15000]);
  const keep = JSON.stringify(w.data.nox_shop.items) + JSON.stringify(w.data.nox_shopsecret);
  w.data.nox_wallet.uA.balance = 515000; const keepBal = JSON.stringify(w.data.nox_wallet.uA.balance);
  const f1 = await w.call("shop-buy", { items: [{ id: "txt1", qty: 2 }, { id: "key1", qty: 5 }] }, "a"); w.data.nox_wallet.uA.balance = 15000; void keepBal;
  t("giỏ có món hết hàng → 409 và HOÀN LẠI món đã giữ (không mất hàng, không mất tiền, không để đơn rác)", [f1.body.code, JSON.stringify(w.data.nox_shop.items) + JSON.stringify(w.data.nox_shopsecret) === keep, w.data.nox_wallet.uA.balance, Object.keys(w.data.nox_orders.uA).length], ["out_of_stock", true, 15000, 3]);
  t("không đủ tiền ở giỏ nhiều món → 402, hàng giữ nguyên", [(await w.call("shop-buy", { items: [{ id: "txt1", qty: 2 }] }, "a")).body.code, w.data.nox_shop.items.txt1.stock], ["insufficient", 3]);
  t("món đã tắt / không tồn tại → 404", [(await w.call("shop-buy", { items: [{ id: "off1", qty: 1 }] }, "a")).body.code, (await w.call("shop-buy", { items: [{ id: "zzz", qty: 1 }] }, "a")).body.code], ["gone", "gone"]);
  for (const bad of [[], [{ id: "txt1", qty: 0 }], [{ id: "txt1", qty: 100 }], [{ id: "../x", qty: 1 }], [{ id: "txt1", qty: 1.5 }], "x", [{ id: "txt1", qty: -1 }]]) t("giỏ không hợp lệ bị từ chối: " + JSON.stringify(bad), (await w.call("shop-buy", { items: bad }, "a")).body.code, "bad_cart");
  const hm = (await w.call("wallet-info", {}, "a")).body.balance; t("số dư trong ví khớp tổng lịch sử", Object.values(w.data.nox_txs.uA).reduce((s, x) => s + x.amount, 0), hm);
  /* mua cùng lúc món cuối: hai người, chỉ một người được */
  const race = world(); await race.call("wallet-info", {}, "a"); await race.call("wallet-info", {}, "b"); race.data.nox_wallet.uA.balance = 100000; race.data.nox_wallet.uB.balance = 100000;
  race.data.nox_shop = { items: { last: { name: "Cuối", price: 10000, stock: 1, mode: "text", active: true } } }; race.data.nox_shopsecret = { last: { text: "X" } };
  const rr = await Promise.all([race.call("shop-buy", { items: [{ id: "last", qty: 1 }] }, "a"), race.call("shop-buy", { items: [{ id: "last", qty: 1 }] }, "b")]);
  t("hai người mua món cuối cùng lúc → đúng một người được, kho = 0", [rr.map(x => x.status).sort(), race.data.nox_shop.items.last.stock], [[200, 409], 0]);
  t("người thua không bị trừ tiền", [race.data.nox_wallet.uA.balance + race.data.nox_wallet.uB.balance], [190000]);
  /* hoàn tiền */
  const rf = await w.call("order-refund", { uid: "uA", oid: r1.body.orderId }, "dev");
  t("DEV hoàn tiền đơn → cộng lại ví, đơn 'refunded'", [rf.status, rf.body.balance, w.data.nox_orders.uA[r1.body.orderId].status], [200, hm + 60000, "refunded"]);
  t("hoàn lần hai bị từ chối", (await w.call("order-refund", { uid: "uA", oid: r1.body.orderId }, "dev")).status, 404);
  t("người thường không hoàn tiền được", (await w.call("order-refund", { uid: "uA", oid: r2.body.orderId }, "a")).status, 403);
  const aj = await w.call("wallet-adjust", { uid: "uB", amount: 12345, note: "bù" }, "dev"); t("DEV cộng tay", [aj.status, aj.body.balance], [200, 12345]);
  t("trừ tay quá số dư bị chặn", [(await w.call("wallet-adjust", { uid: "uB", amount: -999999 }, "dev")).status, w.data.nox_wallet.uB.balance], [400, 12345]);
  t("người thường không chỉnh ví được", (await w.call("wallet-adjust", { uid: "uA", amount: 1000000 }, "a")).status, 403); }

console.log("TỆP ĐÍNH KÈM CHAT");
{ const w = world(); w.data.nox_threads = { uA: { chat: { type: "chat", status: "open" }, shut: { type: "chat", status: "closed" } } };
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 1)]);
  const du = (buf, mime = "x/y") => "data:" + mime + ";base64," + buf.toString("base64");
  const up = (body, tk = "a") => w.call("chat-file", body, tk);
  const r = await up({ tid: "chat", name: "anh.png", data: du(png) });
  t("gửi ảnh PNG hợp lệ → có att, lưu ở nox_files, mime do máy chủ quyết định", [r.status, r.body.att.kind, r.body.att.mime, w.data.nox_files.uA.chat[r.body.att.id].by], [200, "image", "image/png", "uA"]);
  t("đổi đuôi (file .exe đặt tên .png / .png đặt tên .jpg) bị chặn", [(await up({ tid: "chat", name: "a.png", data: du(Buffer.from("MZ....")) })).body.code, (await up({ tid: "chat", name: "a.jpg", data: du(png) })).body.code], ["bad_file", "bad_file"]);
  for (const n of ["a.exe", "a.bat", "a.html", "a.svg", "a", "a.js.exe"]) t("từ chối " + n, (await up({ tid: "chat", name: n, data: du(Buffer.from("hello")) })).body.code, "bad_file");
  t("tệp văn bản .lua nhận, tệp nhị phân đội lốt .txt bị chặn", [(await up({ tid: "chat", name: "s.lua", data: du(Buffer.from("print(1)")) })).status, (await up({ tid: "chat", name: "s.txt", data: du(Buffer.from([65, 0, 66])) })).body.code], [200, "bad_file"]);
  t("ảnh > 300KB bị từ chối", (await up({ tid: "chat", name: "big.png", data: du(Buffer.concat([png, Buffer.alloc(310 * 1024)])) })).status, 413);
  t("video mp4 hợp lệ nhận", (await up({ tid: "chat", name: "v.mp4", data: du(Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.alloc(50)])) })).body.att.kind, "video");
  t("cuộc trò chuyện không tồn tại → 404", (await up({ tid: "nope", name: "a.png", data: du(png) })).status, 404);
  t("cuộc trò chuyện đã đóng → 403", (await up({ tid: "shut", name: "a.png", data: du(png) })).body.code, "closed");
  t("không gửi vào hộp thư người khác (owner bị bỏ qua với người thường)", [(await w.call("chat-file", { tid: "chat", owner: "uB", name: "a.png", data: du(png) }, "b")).status, w.data.nox_files.uB], [404, undefined]);
  t("DEV gửi vào cuộc trò chuyện của người dùng", (await w.call("chat-file", { tid: "chat", owner: "uA", name: "a.png", data: du(png) }, "dev")).status, 200);
  const lim = world(); lim.data.nox_threads = { uA: { chat: { type: "chat", status: "open" } } }; let last; for (let i = 0; i < 16; i++) last = await lim.call("chat-file", { tid: "chat", name: "a.png", data: du(png) }, "a"); t("giới hạn 15 tệp/giờ/người", last.status, 429);
  const cap = world(); cap.data.nox_threads = { uA: { chat: { type: "chat", status: "open" } } }; cap.data.nox_filecount = { uA: { chat: 30 } }; t("mỗi cuộc trò chuyện tối đa 30 tệp", (await cap.call("chat-file", { tid: "chat", name: "a.png", data: du(png) }, "a")).body.code, "too_many_files");
  const mu = world(); mu.data.nox_threads = { uA: { chat: { type: "chat", status: "open" } } }; mu.data.nox_admin = { uA: { muteUntil: clock + 1e6 } }; t("bị tắt tiếng thì không gửi tệp", (await mu.call("chat-file", { tid: "chat", name: "a.png", data: du(png) }, "a")).body.code, "muted"); }

console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
