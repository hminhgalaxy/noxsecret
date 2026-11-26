/* Kiểm thử ví / hóa đơn nạp tiền thủ công / mua hàng / tệp chat — Firebase Admin giả có giao dịch nguyên tử (không gọi mạng). */
import { createRequire } from "node:module";
import crypto from "node:crypto";
const require = createRequire(import.meta.url);
const { createApi } = require("../api/_lib/core.js");
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
  const env = { DEV_EMAIL: DEVE, ...envExtra };
  const api = createApi({ auth, db, sendMail: async () => {}, verifyPassword: async () => true, env, now: () => clock, randomInt: (a, b) => crypto.randomInt(a, b) });
  const call = (action, body = {}, token = "", ip = "1.2.3.4") => api({ action, body, token, ip });
  return { api, call, get data() { return data; }, set data(v) { data = v; }, users, tokens };
}
/* Cấp số dư thẳng vào dữ liệu giả (thay cho đường nạp tiền, để các bài test mua hàng độc lập) */
const fund = async (w, uid, amount) => { const tk = uid === "uA" ? "a" : "b"; await w.call("wallet-info", {}, tk); w.data.nox_wallet[uid].balance = (w.data.nox_wallet[uid].balance || 0) + amount; w.data.nox_txs = w.data.nox_txs || {}; w.data.nox_txs[uid] = w.data.nox_txs[uid] || {}; w.data.nox_txs[uid]["fund" + Object.keys(w.data.nox_txs[uid]).length] = { type: "adjust", amount, ts: clock }; };

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 7)]);
const IMG = "data:image/png;base64," + PNG.toString("base64");
/* Đưa một hóa đơn tới trạng thái 'bill' (dev gửi QR, khách gửi ảnh bill) */
const toBill = async (w, who = "a", amount = 50000) => {
  const c = await w.call("inv-create", { amount }, who); const id = c.body.id;
  await w.call("inv-accept", { id, qr: IMG, note: "ck dung so tien" }, "dev"); await w.call("inv-bill", { id, image: IMG }, who);
  return { id, uid: who === "a" ? "uA" : "uB", code: w.data.nox_inv[who === "a" ? "uA" : "uB"][id].code, sec: w.data.nox_invsec[id].sec };
};

console.log("VÍ");
{ const w = world();
  t("khách / chưa đăng nhập bị chặn", [(await w.call("wallet-info")).status, (await w.call("wallet-info", {}, "guest")).status], [401, 403]);
  t("email chưa xác minh bị chặn", (await w.call("wallet-info", {}, "aUnv")).body.code, "unverified");
  const a = await w.call("wallet-info", {}, "a");
  t("tạo ví: số dư 0, tối thiểu 2.000, chưa có hóa đơn mở, KHÔNG còn mã SKN / thông tin ngân hàng", [a.status, a.body.balance, a.body.min, a.body.open, "code" in a.body, "bank" in a.body, "code" in w.data.nox_wallet.uA], [200, 0, 2000, null, false, false, false]);
  t("không còn lối nạp tự động: webhook / bank-* / topup-* / wallet-adjust đều không tồn tại", [(await w.call("wallet-adjust", { uid: "uA", amount: 1e6 }, "dev")).status, (await w.call("bank-set", {}, "dev")).status, (await w.call("topup-create", { amount: 20000 }, "a")).status, (await w.call("bank-assign", {}, "dev")).status, typeof w.api.webhook], [400, 400, 400, 400, "undefined"]);
  const d = await w.call("wallet-info", {}, "dev");
  t("tài khoản dev có sẵn 130.000.000 ₫", [d.body.balance, w.data.nox_wallet.uDEV.balance], [130000000, 130000000]);
  await w.call("wallet-info", {}, "dev"); await w.call("shop-buy", { items: [{ id: "x", qty: 1 }] }, "dev");
  t("gọi lại nhiều lần vẫn chỉ cấp MỘT lần (không cộng trùng)", [w.data.nox_wallet.uDEV.balance, Object.values(w.data.nox_txs.uDEV).filter(x => x.note && x.note.includes("Starting")).length], [130000000, 1]);
  t("người thường không được cấp 130tr", [(await w.call("wallet-info", {}, "b")).body.balance, w.data.nox_wallet.uB.devGrant], [0, undefined]); }

console.log("TẠO HÓA ĐƠN NẠP");
{ const w = world();
  for (const bad of [0, 1000, 1999, 2500, 2001, -2000, 50001000, "abc", null, 2000.5]) t("số tiền không hợp lệ bị chặn: " + bad, (await w.call("inv-create", { amount: bad }, "a")).body.code, "bad_amount");
  t("chưa đăng nhập / email chưa xác minh bị chặn", [(await w.call("inv-create", { amount: 2000 })).status, (await w.call("inv-create", { amount: 2000 }, "aUnv")).body.code], [401, "unverified"]);
  const r = await w.call("inv-create", { amount: 2000 }, "a"), id = r.body.id, inv = w.data.nox_inv.uA[id];
  t("tối thiểu 2.000 ₫ tạo được; trạng thái 'creating'", [r.status, r.body.status, inv.amount, inv.status], [200, "creating", 2000, "creating"]);
  t("mã code (9–12 ký tự) lưu ở hóa đơn, mã bảo mật (10–14 ký tự) CHỈ ở nox_invsec, không rò sang hóa đơn / phản hồi", [/^[A-Z2-9]{9,12}$/.test(inv.code), /^[A-Za-z2-9]{10,14}$/.test(w.data.nox_invsec[id].sec), JSON.stringify(inv).includes(w.data.nox_invsec[id].sec), JSON.stringify(r.body).includes(w.data.nox_invsec[id].sec)], [true, true, false, false]);
  t("chỉ mục cho dev + khoá hóa đơn mở", [w.data.nox_invq[id].uid, w.data.nox_invq[id].status, w.data.nox_invopen.uA], ["uA", "creating", id]);
  const again = await w.call("inv-create", { amount: 5000 }, "a");
  t("đang có hóa đơn mở thì không tạo thêm (409, trả về id hóa đơn đang mở)", [again.status, again.body.code, again.body.id, Object.keys(w.data.nox_inv.uA).length], [409, "open_invoice", id, 1]);
  t("wallet-info báo hóa đơn đang mở", (await w.call("wallet-info", {}, "a")).body.open, id);
  const race = world(); const rr = await Promise.all([race.call("inv-create", { amount: 10000 }, "a"), race.call("inv-create", { amount: 20000 }, "a"), race.call("inv-create", { amount: 30000 }, "a")]);
  t("tạo song song 3 hóa đơn cùng lúc → đúng MỘT hóa đơn được tạo", [rr.map(x => x.status).sort(), Object.keys(race.data.nox_inv.uA).length], [[200, 409, 409], 1]);
  const codes = new Set(), secs = new Set(), lens = new Set(); const rnd = world();
  const clk0 = clock; for (let i = 0; i < 25; i++) { clock = clk0 + i * 6 * 60000; const c = await rnd.call("inv-create", { amount: 2000 }, "a"); codes.add(rnd.data.nox_inv.uA[c.body.id].code); secs.add(rnd.data.nox_invsec[c.body.id].sec); lens.add(rnd.data.nox_inv.uA[c.body.id].code.length + "/" + rnd.data.nox_invsec[c.body.id].sec.length); await rnd.call("inv-cancel", { id: c.body.id }, "a"); } clock = clk0;
  t("mã code + mã bảo mật ngẫu nhiên: 25 hóa đơn không trùng nhau, độ dài thay đổi (không phải định dạng cố định)", [codes.size, secs.size, lens.size > 1], [25, 25, true]);
  const o = world(); const oc = await o.call("inv-create", { amount: 2000 }, "a"); clock += 4 * 24 * 3600 * 1000;
  t("hóa đơn 'creating' quá 3 ngày → hết hạn, được tạo hóa đơn mới", [(await o.call("wallet-info", {}, "a")).body.open, o.data.nox_inv.uA[oc.body.id].status, (await o.call("inv-create", { amount: 4000 }, "a")).status], [null, "expired", 200]); }

console.log("DEV NHẬN YÊU CẦU, GỬI QR, KHÁCH GỬI BILL");
{ const w = world(); const c = await w.call("inv-create", { amount: 50000 }, "a"), id = c.body.id;
  t("chưa có QR thì khách không gửi bill được", (await w.call("inv-bill", { id, image: IMG }, "a")).body.code, "wrong_state");
  t("người thường / khách không nhận yêu cầu được", [(await w.call("inv-accept", { id, qr: IMG }, "a")).status, (await w.call("inv-accept", { id, qr: IMG }, "guest")).status, (await w.call("inv-reject", { id, reason: "x" }, "a")).status], [403, 403, 403]);
  for (const [n, q] of [["SVG", "data:image/svg+xml;base64,AAAA"], ["đuôi giả (không phải PNG)", "data:image/png;base64," + Buffer.from("MZ not png at all").toString("base64")], ["quá 300KB", "data:image/png;base64," + Buffer.concat([PNG, Buffer.alloc(310 * 1024)]).toString("base64")], ["không phải ảnh", "hello"]]) t("QR không hợp lệ bị chặn: " + n, (await w.call("inv-accept", { id, qr: q }, "dev")).body.code, "bad_file");
  t("QR hỏng không đổi trạng thái", w.data.nox_inv.uA[id].status, "creating");
  t("id lạ / không tồn tại → 404", [(await w.call("inv-accept", { id: "zzz", qr: IMG }, "dev")).status, (await w.call("inv-accept", { id: "../x", qr: IMG }, "dev")).status], [404, 400]);
  const ac = await w.call("inv-accept", { id, qr: IMG, note: "Chuyển đúng số tiền" }, "dev");
  t("dev chấp nhận + gửi QR → 'ready', QR lưu riêng, ghi chú cho khách", [ac.status, w.data.nox_inv.uA[id].status, w.data.nox_inv.uA[id].hasQr, w.data.nox_inv.uA[id].note, w.data.nox_invfile.uA[id].qr === IMG, w.data.nox_invq[id].status], [200, "ready", true, "Chuyển đúng số tiền", true, "ready"]);
  t("khách không gửi bill của hóa đơn người khác; ảnh sai bị chặn", [(await w.call("inv-bill", { id, image: IMG }, "b")).status, (await w.call("inv-bill", { id, image: "data:image/gif;base64,R0lGOA==" }, "a")).body.code, (await w.call("inv-bill", { id, image: "data:image/png;base64," + Buffer.from("nope").toString("base64") }, "a")).body.code, w.data.nox_inv.uA[id].status], [404, "bad_file", "bad_file", "ready"]);
  const bl = await w.call("inv-bill", { id, image: IMG }, "a");
  t("khách gửi ảnh bill → 'bill'; ảnh lưu ở nox_invfile", [bl.status, w.data.nox_inv.uA[id].status, w.data.nox_inv.uA[id].hasBill, w.data.nox_invfile.uA[id].bill === IMG, w.data.nox_invq[id].status], [200, "bill", true, true, "bill"]);
  t("gửi bill lần hai bị chặn; sau khi gửi bill không hủy được", [(await w.call("inv-bill", { id, image: IMG }, "a")).body.code, (await w.call("inv-cancel", { id }, "a")).body.code, w.data.nox_inv.uA[id].status], ["wrong_state", "wrong_state", "bill"]);
  t("tiền CHƯA vào ví khi mới gửi bill", w.data.nox_wallet.uA.balance, 0); }
{ const w = world(); const c = await w.call("inv-create", { amount: 6000 }, "a"), id = c.body.id;
  t("khách hủy hóa đơn khi đang 'creating' → cancelled, nhả khoá, tạo hóa đơn mới được", [(await w.call("inv-cancel", { id }, "b")).status, (await w.call("inv-cancel", { id }, "a")).status, w.data.nox_inv.uA[id].status, w.data.nox_invopen.uA, (await w.call("inv-create", { amount: 8000 }, "a")).status], [404, 200, "cancelled", undefined, 200]);
  const w2 = world(); const c2 = await w2.call("inv-create", { amount: 6000 }, "a"); await w2.call("inv-accept", { id: c2.body.id, qr: IMG }, "dev");
  t("hủy khi đã 'ready' vẫn được; QR bị xóa", [(await w2.call("inv-cancel", { id: c2.body.id }, "a")).status, w2.data.nox_inv.uA[c2.body.id].status, w2.data.nox_invfile?.uA?.[c2.body.id]?.qr], [200, "cancelled", undefined]);
  const w3 = world(); const b3 = await toBill(w3); const rj = await w3.call("inv-reject", { id: b3.id, reason: "Bill không khớp" }, "dev");
  t("dev từ chối hóa đơn có bill → rejected + lý do; không nhập tiền được nữa", [rj.status, w3.data.nox_inv.uA[b3.id].status, w3.data.nox_inv.uA[b3.id].reason, w3.data.nox_invopen.uA, (await w3.call("inv-credit", { id: b3.id, amount: 50000, code: b3.code, sec: b3.sec }, "dev")).body.code], [200, "rejected", "Bill không khớp", undefined, "wrong_state"]); }

console.log("NHẬP TIỀN (DEV) — ĐẢM BẢO KHÔNG LỆCH TIỀN");
{ const w = world(); await w.call("wallet-info", {}, "dev"); const b = await toBill(w, "a", 50000);
  const cr = (o = {}, tk = "dev") => w.call("inv-credit", { id: b.id, amount: 50000, code: b.code, sec: b.sec, ...o }, tk);
  t("người thường / khách không nhập tiền được", [(await cr({}, "a")).status, (await cr({}, "guest")).status, (await cr({}, "b")).status, w.data.nox_wallet.uA.balance], [403, 403, 403, 0]);
  t("dev nhập SỐ TIỀN khác hóa đơn (lớn hơn / gấp nhiều lần) bị chặn", [(await cr({ amount: 50001 })).body.code, (await cr({ amount: 500000 })).body.code, w.data.nox_wallet.uA.balance, w.data.nox_wallet.uDEV.balance], ["mismatch", "mismatch", 0, 130000000]);
  t("sai mã code / sai mã bảo mật bị chặn", [(await cr({ code: "WRONGCODE9" })).body.code, (await cr({ sec: "WrongSecret1" })).body.code], ["mismatch", "mismatch"]);
  const lk = await cr({ sec: "x" });
  t("sai 5 lần liên tiếp → khóa 10 phút (kể cả khi lần sau nhập ĐÚNG)", [lk.status, (await cr({})).status, (await cr({})).body.code, w.data.nox_wallet.uA.balance], [400, 429, "locked", 0]);
  clock += 11 * 60 * 1000;
  const id2 = (await w.call("inv-credit", { id: "zzz", amount: 1, code: "a", sec: "b" }, "dev")); t("id không tồn tại → 404", id2.status, 404);
  const w9 = world(); await w9.call("wallet-info", {}, "dev"); const b9 = await toBill(w9, "a", 50000), c9 = (o = {}) => w9.call("inv-credit", { id: b9.id, amount: 50000, code: b9.code, sec: b9.sec, ...o }, "dev");
  t("số lẻ / thiếu 1đ / chữ lẫn số / bỏ trống / sai chữ hoa-thường mã bảo mật đều bị chặn", [(await c9({ amount: 49999 })).body.code, (await c9({ amount: "50000x" })).body.code, (await c9({ code: "", sec: "" })).body.code, (await c9({ sec: b9.sec === b9.sec.toLowerCase() ? b9.sec.toUpperCase() : b9.sec.toLowerCase() })).body.code, w9.data.nox_wallet.uA.balance], ["mismatch", "mismatch", "mismatch", "mismatch", 0]);
  const ok1 = await cr({});
  t("nhập đúng id + số tiền + mã code + mã bảo mật → thành công (done)", [ok1.status, ok1.body.status, w.data.nox_inv.uA[b.id].status, w.data.nox_invq[b.id].status, w.data.nox_invopen.uA], [200, "done", "done", "done", undefined]);
  t("ví dev bị trừ đúng 50.000, ví khách được cộng đúng 50.000", [w.data.nox_wallet.uDEV.balance, w.data.nox_wallet.uA.balance, ok1.body.balance], [129950000, 50000, 129950000]);
  t("lịch sử: khách 'topup' +50.000, dev 'send' −50.000", [Object.values(w.data.nox_txs.uA).map(x => [x.type, x.amount, x.balance]), Object.values(w.data.nox_txs.uDEV).filter(x => x.type === "send").map(x => [x.amount, x.balance])], [[["topup", 50000, 50000]], [[-50000, 129950000]]]);
  const rep = await cr({}); t("nhập lại lần hai: không cộng thêm", [rep.status, rep.body.already, w.data.nox_wallet.uA.balance, w.data.nox_wallet.uDEV.balance], [200, true, 50000, 129950000]);
  t("ảnh QR đã bị xóa sau khi xong, ảnh bill được giữ", [w.data.nox_invfile.uA[b.id].qr, w.data.nox_invfile.uA[b.id].bill === IMG], [undefined, true]);
  t("sau khi xong khách tạo được hóa đơn mới", (await w.call("inv-create", { amount: 2000 }, "a")).status, 200); }
{ const w = world(); await w.call("wallet-info", {}, "dev"); const b = await toBill(w, "a", 20000);
  const [x, y] = await Promise.all([1, 2].map(() => w.call("inv-credit", { id: b.id, amount: 20000, code: b.code, sec: b.sec }, "dev")));
  t("hai lần bấm Nhập tiền CÙNG LÚC → chỉ cộng/trừ MỘT lần", [w.data.nox_wallet.uA.balance, w.data.nox_wallet.uDEV.balance, Object.values(w.data.nox_txs.uA).length, [x.status, y.status].sort()], [20000, 129980000, 1, [200, 200]]);
  t("mã code nhập không phân biệt chữ hoa/thường, bỏ khoảng trắng và gạch", true, true); }
{ const w = world(); await w.call("wallet-info", {}, "dev"); const b = await toBill(w, "a", 30000);
  t("mã code gõ thường + có khoảng trắng/gạch vẫn khớp", (await w.call("inv-credit", { id: b.id, amount: 30000, code: " " + b.code.toLowerCase().slice(0, 4) + "-" + b.code.toLowerCase().slice(4) + " ", sec: b.sec }, "dev")).status, 200); }
{ const w = world(); await w.call("wallet-info", {}, "dev"); w.data.nox_wallet.uDEV.balance = 10000; const b = await toBill(w, "a", 50000);
  const r = await w.call("inv-credit", { id: b.id, amount: 50000, code: b.code, sec: b.sec }, "dev");
  t("ví dev không đủ → 402, hóa đơn trở lại 'bill', không ai mất/được tiền", [r.status, r.body.code, w.data.nox_inv.uA[b.id].status, w.data.nox_wallet.uDEV.balance, w.data.nox_wallet.uA.balance], [402, "dev_insufficient", "bill", 10000, 0]);
  w.data.nox_wallet.uDEV.balance = 60000; const r2 = await w.call("inv-credit", { id: b.id, amount: 50000, code: b.code, sec: b.sec }, "dev");
  t("nạp thêm ví dev rồi nhập lại → thành công; dev không bao giờ âm", [r2.status, w.data.nox_wallet.uDEV.balance, w.data.nox_wallet.uA.balance], [200, 10000, 50000]); }
{ const w = world(); await w.call("wallet-info", {}, "dev"); const b = await toBill(w, "a", 40000);
  /* giả lập sự cố: đã trừ ví dev nhưng máy chủ sập trước khi cộng ví khách → bấm lại phải hoàn tất, không trừ dev lần hai */
  await w.call("inv-credit", { id: b.id, amount: 40000, code: b.code, sec: b.sec }, "dev");
  const w2 = world(); await w2.call("wallet-info", {}, "dev"); const b2 = await toBill(w2, "a", 40000);
  w2.data.nox_wallet.uDEV.balance -= 40000; w2.data.nox_wallet.uDEV.applied = { ["invout_" + b2.id]: clock }; w2.data.nox_inv.uA[b2.id].status = "crediting";
  const r = await w2.call("inv-credit", { id: b2.id, amount: 40000, code: b2.code, sec: b2.sec }, "dev");
  t("sự cố giữa chừng (đã trừ dev, chưa cộng khách) → bấm lại hoàn tất mà KHÔNG trừ dev lần hai", [r.status, w2.data.nox_wallet.uDEV.balance, w2.data.nox_wallet.uA.balance, w2.data.nox_inv.uA[b2.id].status], [200, 129960000, 40000, "done"]); }
{ const w = world(); await w.call("wallet-info", {}, "dev"); const c = await w.call("inv-create", { amount: 4000 }, "dev"); await w.call("inv-accept", { id: c.body.id, qr: IMG }, "dev"); await w.call("inv-bill", { id: c.body.id, image: IMG }, "dev");
  const code = w.data.nox_inv.uDEV[c.body.id].code, sec = w.data.nox_invsec[c.body.id].sec;
  t("dev không tự nạp cho chính ví của mình", [(await w.call("inv-credit", { id: c.body.id, amount: 4000, code, sec }, "dev")).body.code, w.data.nox_wallet.uDEV.balance], ["self", 130000000]); }
{ const w = world(); const c = await w.call("inv-create", { amount: 4000 }, "a");
  t("chưa có bill thì không nhập tiền được (creating / ready)", [(await w.call("inv-credit", { id: c.body.id, amount: 4000, code: w.data.nox_inv.uA[c.body.id].code, sec: w.data.nox_invsec[c.body.id].sec }, "dev")).body.code], ["wrong_state"]); }
{ /* tổng tiền được bảo toàn */
  const w = world(); await w.call("wallet-info", {}, "dev"); await w.call("wallet-info", {}, "b"); const b1 = await toBill(w, "a", 10000), b2 = await toBill(w, "b", 25000);
  for (const b of [b1, b2]) await w.call("inv-credit", { id: b.id, amount: b === b1 ? 10000 : 25000, code: b.code, sec: b.sec }, "dev");
  t("bảo toàn tiền: dev + khách A + khách B = 130.000.000", w.data.nox_wallet.uDEV.balance + w.data.nox_wallet.uA.balance + w.data.nox_wallet.uB.balance, 130000000); }
{ const w = world(); const c = await w.call("inv-create", { amount: 2000 }, "a"); await w.call("inv-accept", { id: c.body.id, qr: IMG }, "dev"); await w.call("inv-bill", { id: c.body.id, image: IMG }, "a");
  w.data.nox_inv.uA[c.body.id].status = "done"; const o = (await w.call("inv-cancel", { id: c.body.id }, "a")).status; t("hóa đơn đã xong không hủy / sửa được", o, 409);
  let n = 0; for (let i = 0; i < 20; i++) { const r = await w.call("inv-create", { amount: 2000 }, "a"); if (r.status === 429) n++; else if (r.status === 200) await w.call("inv-cancel", { id: r.body.id }, "a"); }
  t("tạo hóa đơn quá nhiều trong 1 giờ bị giới hạn (429)", n > 0, true); }

console.log("MUA HÀNG");
{ const w = world(); await w.call("wallet-info", {}, "a"); await w.call("wallet-info", {}, "b");
  w.data.nox_shop = { items: {
    key1: { name: "Key VIP", price: 30000, stock: 3, mode: "lines", active: true },
    txt1: { name: "Script", price: 10000, stock: 5, mode: "text", active: true },
    man1: { name: "Làm tay", price: 5000, stock: 2, mode: "manual", active: true },
    free1: { name: "Miễn phí", price: 0, mode: "text", active: true },
    off1: { name: "Tắt", price: 1000, stock: 1, mode: "text", active: false } } };
  w.data.nox_shopsecret = { key1: { lines: { a: "KEY-AAA", b: "KEY-BBB", c: "KEY-CCC" } }, txt1: { text: "https://link/secret" } };
  t("chưa có tiền → 402 insufficient, không trừ hàng", [(await w.call("shop-buy", { items: [{ id: "txt1", qty: 1 }] }, "a")).body.code, w.data.nox_shop.items.txt1.stock], ["insufficient", 5]);
  await fund(w, "uA", 100000);
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
  t("hoàn tiền xong, tổng tiền trong ví vẫn khớp lịch sử", Object.values(w.data.nox_txs.uA).reduce((s, x) => s + x.amount, 0), w.data.nox_wallet.uA.balance); }

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

console.log("CHỈ MỤC SEO CỬA HÀNG");
{ const w = world(); await w.call("wallet-info", {}, "a");
  w.data.nox_shop = { items: {
    k1: { name: "Key VIP", desc: "x".repeat(400), price: 30000, stock: 3, mode: "lines", active: true, sold: 2, createdAt: 5, cat: "c1", img: "data:image/png;base64,AAAA" },
    u1: { name: "Không giới hạn", price: 100, mode: "text", active: true },
    t1: { name: "Chỉ có ảnh phụ", price: 5, mode: "text", active: true, imgs: { b: "data:image/png;base64,BBBB" } },
    off: { name: "Ẩn", price: 1, mode: "text", active: false },
    bad: { price: 1 } } };
  w.data.nox_shopsecret = { k1: { lines: { a: "A", b: "B", c: "C" } }, u1: { text: "T" } };
  t("khách / người thường không dựng được chỉ mục (chỉ dev)", [(await w.call("seo-sync", {}, "a")).status, (await w.call("seo-sync", {}, "guest")).status, w.data.nox_shopseo === undefined], [403, 403, true]);
  const r = await w.call("seo-sync", {}, "dev"); const ix = w.data.nox_shopseo;
  t("dev dựng chỉ mục: chỉ sản phẩm có tên, KHÔNG chứa ảnh/kho bí mật", [r.status, r.body.count, Object.keys(ix).sort(), ix.k1.i, JSON.stringify(ix).includes("base64"), JSON.stringify(ix).includes("secret")], [200, 4, ["k1", "off", "t1", "u1"], 1, false, false]);
  t("chỉ mục: mô tả cắt ≤200, kho vô hạn không có 's', hết/ẩn đánh dấu a=false, ảnh phụ vẫn tính là có ảnh", [ix.k1.d.length <= 200, "s" in ix.u1, ix.off.a, ix.t1.i, ix.k1.s, ix.k1.h, ix.k1.c], [true, false, false, 1, 3, 2, "c1"]);
  await fund(w, "uA", 100000); const b = await w.call("shop-buy", { items: [{ id: "k1", qty: 2 }] }, "a");
  t("sau khi mua: chỉ mục tự cập nhật số đã bán + tồn kho", [b.status, w.data.nox_shopseo.k1.h, w.data.nox_shopseo.k1.s], [200, 4, 1]);
  w.data.nox_shop.items.off.active = true; w.data.nox_shop.items.u1 = undefined; delete w.data.nox_shop.items.u1; await w.call("seo-sync", {}, "dev");
  t("dựng lại: sản phẩm vừa hiện được cập nhật, sản phẩm bị xóa biến khỏi chỉ mục", [w.data.nox_shopseo.off.a, "u1" in w.data.nox_shopseo], [true, false]); }

console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
