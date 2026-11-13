/* Cửa hàng + ví + nạp tiền ngân hàng + tệp đính kèm chat (chạy trên máy chủ, ghi bằng quyền Admin).
   NGUYÊN TẮC AN TOÀN TIỀN: trình duyệt KHÔNG BAO GIỜ ghi vào ví / đơn hàng / lịch sử giao dịch (Rules đóng hết);
   mọi thay đổi số dư đi qua `walletApply` — một giao dịch (transaction) nguyên tử của Realtime Database:
   (1) không cho âm tiền, (2) mỗi khoản có "khoá chống cộng trùng" (applied/<key>) nên webhook gửi lại nhiều lần cũng chỉ cộng một lần.
   Dữ liệu (trong nox_*):
     wallet/<uid>     { code, balance, applied{key:ts}, createdAt }
     topcodes/<MÃ>    uid                          (tra ngược mã chuyển khoản → tài khoản)
     topups/<uid>/<id>{ amount, status: pending|done|expired, ts }
     txs/<uid>/<id>   { type: topup|purchase|refund|adjust, amount(+/-), balance, note, ref, ts }
     orders/<uid>/<id>{ status: pending|paid|refunded, items[], total, delivery[], ts }
     bankhook/<khoá>  { status: processing|credited|unmatched|ignored, amount, content, uid, ts }
     shop/{cats,items}  (công khai, chỉ DEV ghi) · shopsecret/<id> (chỉ DEV: nội dung giao hàng)
     files/<uid>/<tid>/<fid> (tệp đính kèm chat, chỉ API ghi) · filemeta (bản nhỏ để Rules kiểm tra) · filecount/<uid>/<tid> */
const crypto = require("crypto");
const { vietqr } = require("./vietqr");

const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const MIN_TOPUP = 10000, MAX_TOPUP = 50000000, MAX_ORDER = 1000000000;
const ID_RE = /^[A-Za-z0-9_-]{1,60}$/;
const CODE_PREFIX = "SKN";
const BANK_DEFAULT = { bin: "970407", account: "19077584659010", name: "TANG HOANG MINH", bank: "Techcombank" };

/* Tệp đính kèm chat: đuôi tệp → loại. Mọi thứ khác (đặc biệt tệp chạy được như .exe/.bat) đều bị từ chối. */
const EXT = {
  jpg: ["image/jpeg", "image"], jpeg: ["image/jpeg", "image"], png: ["image/png", "image"], webp: ["image/webp", "image"], gif: ["image/gif", "image"],
  mp4: ["video/mp4", "video"], webm: ["video/webm", "video"],
  pdf: ["application/pdf", "file"], zip: ["application/zip", "file"],
  txt: ["text/plain", "file"], lua: ["text/plain", "file"], json: ["text/plain", "file"], md: ["text/plain", "file"], csv: ["text/plain", "file"], log: ["text/plain", "file"], js: ["text/plain", "file"]
};
const LIMIT = { image: 300 * 1024, video: 450 * 1024, file: 450 * 1024 };
const MAX_FILES_PER_THREAD = 30;
function sniff(buf, ext) { /* chữ ký đầu tệp phải khớp đuôi tệp (chặn đổi đuôi) */
  const h = buf.subarray(0, 16), s = (a) => a.every((b, i) => h[i] === b);
  if (ext === "jpg" || ext === "jpeg") return s([0xff, 0xd8, 0xff]);
  if (ext === "png") return s([0x89, 0x50, 0x4e, 0x47]);
  if (ext === "gif") return s([0x47, 0x49, 0x46, 0x38]);
  if (ext === "webp") return buf.length > 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP";
  if (ext === "mp4") return buf.length > 12 && buf.toString("latin1", 4, 8) === "ftyp";
  if (ext === "webm") return s([0x1a, 0x45, 0xdf, 0xa3]);
  if (ext === "pdf") return buf.toString("latin1", 0, 5) === "%PDF-";
  if (ext === "zip") return s([0x50, 0x4b, 0x03, 0x04]) || s([0x50, 0x4b, 0x05, 0x06]);
  return !buf.subarray(0, 2048).includes(0); /* văn bản: không có byte rỗng */
}

function createShop(deps) {
  const { db, who, limit, devOnly, ok, fail } = deps;
  const env = deps.env || {}, now = deps.now || (() => Date.now()), rnd = deps.rnd || ((a, b) => crypto.randomInt(a, b));
  const bank = { bin: String(env.BANK_BIN || BANK_DEFAULT.bin), account: String(env.BANK_ACCOUNT || BANK_DEFAULT.account), name: String(env.BANK_ACCOUNT_NAME || BANK_DEFAULT.name), bank: String(env.BANK_NAME || BANK_DEFAULT.bank) };
  const newId = (p) => p + now().toString(36) + crypto.randomBytes(5).toString("hex");
  const int = (v) => (Number.isFinite(Number(v)) && Math.floor(Number(v)) === Number(v) ? Number(v) : NaN);

  /* ───── Giao dịch nguyên tử trên ví ───── */
  async function walletApply(uid, delta, { key, allowNegative = false } = {}) {
    let st = null;
    const r = await db.tx("nox_wallet/" + uid, (cur) => {
      st = null;
      if (cur === null || typeof cur !== "object") { st = { reason: "nowallet" }; return cur; }
      if (key && cur.applied && cur.applied[key]) { st = { dup: true, balance: cur.balance || 0 }; return cur; }
      const b = Math.floor(cur.balance || 0), nb = b + delta;
      if (nb < 0 && !allowNegative) { st = { reason: "insufficient", balance: b }; return undefined; }
      const next = Object.assign({}, cur, { balance: nb });
      if (key) { const ap = Object.assign({}, cur.applied || {}); ap[key] = now(); const ks = Object.keys(ap).sort((x, y) => ap[y] - ap[x]).slice(0, 300); next.applied = {}; ks.forEach(k => { next.applied[k] = ap[k]; }); }
      st = { ok: true, balance: nb }; return next;
    });
    if (st && st.ok && r.committed) return { ok: true, balance: st.balance };
    if (st && st.dup) return { ok: false, dup: true, balance: st.balance };
    if (st && st.reason === "insufficient") return { ok: false, reason: "insufficient", balance: st.balance };
    return { ok: false, reason: (st && st.reason) || "conflict" };
  }
  const logTx = (uid, id, o) => db.set("nox_txs/" + uid + "/" + id, Object.assign({ ts: now() }, o));

  /* ───── Mã nạp riêng của từng tài khoản ───── */
  async function ensureWallet(uid) {
    let w = await db.get("nox_wallet/" + uid);
    if (w && w.code) return w;
    for (let i = 0; i < 12; i++) {
      const code = CODE_PREFIX + String(rnd(0, 1e8)).padStart(8, "0");
      const claim = await db.tx("nox_topcodes/" + code, (cur) => (cur === null ? uid : cur));
      if (!claim.committed || claim.value !== uid) continue;
      const set = await db.tx("nox_wallet/" + uid, (cur) => { if (cur && cur.code) return cur; return Object.assign({}, cur || {}, { code, balance: Math.floor((cur && cur.balance) || 0), createdAt: (cur && cur.createdAt) || now() }); });
      w = set.value;
      if (w && w.code !== code) await db.remove("nox_topcodes/" + code); /* có yêu cầu khác tạo trước → trả lại mã thừa */
      return w;
    }
    throw new Error("no code");
  }
  const bankInfo = () => ({ bin: bank.bin, account: bank.account, name: bank.name, bank: bank.bank });
  const verifiedUser = async (token) => {
    const r = await who(token, { needVerifiedSession: true }); if (r.err) return r;
    if (!r.u.verified) return { err: fail(403, "unverified", "Verify your email first.") };
    const adm = (await db.get("nox_admin/" + r.u.uid)) || {};
    if (typeof adm.banUntil === "number" && adm.banUntil > now()) return { err: fail(403, "banned", "This account is suspended.") };
    return r;
  };

  const A = {
    /* Số dư + mã nạp + thông tin ngân hàng (tạo ví lần đầu) */
    async "wallet-info"({ token }) {
      const { u, err } = await verifiedUser(token); if (err) return err;
      const w = await ensureWallet(u.uid);
      return ok({ code: w.code, balance: Math.floor(w.balance || 0), bank: bankInfo(), min: MIN_TOPUP, max: MAX_TOPUP });
    },
    /* Tạo yêu cầu nạp số tiền cố định → trả chuỗi VietQR kèm số tiền + nội dung (= mã của tài khoản) */
    async "topup-create"({ token, body }) {
      const { u, err } = await verifiedUser(token); if (err) return err;
      const amount = int(body.amount);
      if (!(amount >= MIN_TOPUP && amount <= MAX_TOPUP) || amount % 1000 !== 0) return fail(400, "bad_amount", "Choose an amount between 10,000 and 50,000,000 VND, in steps of 1,000.");
      if (!(await limit("topup:" + u.uid, 20, HOUR))) return fail(429, "rate_limited", "Too many requests. Try again in a while.");
      const w = await ensureWallet(u.uid), id = newId("t"), t = now();
      const old = (await db.get("nox_topups/" + u.uid)) || {};
      for (const k of Object.keys(old)) if (t - (old[k].ts || 0) > 3 * DAY) await db.remove("nox_topups/" + u.uid + "/" + k);
      await db.set("nox_topups/" + u.uid + "/" + id, { amount, status: "pending", ts: t });
      return ok({ id, amount, code: w.code, bank: bankInfo(), qr: vietqr({ bin: bank.bin, account: bank.account, amount, content: w.code, merchant: "TCB" }), expiresAt: t + DAY });
    },

    /* Mua hàng: trừ ví + giữ hàng + giao hàng trong một luồng; lỗi giữa chừng thì hoàn lại hàng và xoá đơn */
    async "shop-buy"({ token, body }) {
      const { u, err } = await verifiedUser(token); if (err) return err;
      if (!(await limit("buy:" + u.uid, 30, HOUR))) return fail(429, "rate_limited", "Too many orders. Try again in a while.");
      const raw = Array.isArray(body.items) ? body.items : [];
      if (!raw.length || raw.length > 10) return fail(400, "bad_cart", "Your cart is empty or too large.");
      const want = new Map();
      for (const x of raw) { const id = String((x && x.id) || ""), q = int(x && x.qty); if (!ID_RE.test(id) || !(q >= 1 && q <= 99)) return fail(400, "bad_cart", "Your cart has an invalid item."); want.set(id, (want.get(id) || 0) + q); }
      const lines = []; let total = 0;
      for (const [id, qty] of want) {
        const p = await db.get("nox_shop/items/" + id);
        if (!p || p.active === false) return fail(404, "gone", "An item in your cart is no longer available.");
        const price = int(p.price); if (!(price >= 0)) return fail(400, "bad_cart", "An item has an invalid price.");
        lines.push({ id, name: String(p.name || "").slice(0, 120), price, qty, mode: p.mode === "lines" || p.mode === "manual" ? p.mode : "text", unlimited: p.stock == null && p.mode !== "lines" });
        total += price * qty;
      }
      if (total > MAX_ORDER) return fail(400, "bad_cart", "This order is too large.");
      const w = await ensureWallet(u.uid);
      if ((w.balance || 0) < total) return fail(402, "insufficient", "Not enough balance. Top up your wallet first.");
      const oid = newId("o"), t = now();
      await db.set("nox_orders/" + u.uid + "/" + oid, { status: "pending", total, ts: t, items: lines.map(l => ({ id: l.id, name: l.name, price: l.price, qty: l.qty })) });
      const reserved = [], delivery = [];
      const rollback = async () => {
        for (const r of reserved) {
          try {
            if (r.lines) { await db.update("nox_shopsecret/" + r.id + "/lines", r.lines); const all = (await db.get("nox_shopsecret/" + r.id + "/lines")) || {}; await db.set("nox_shop/items/" + r.id + "/stock", Object.keys(all).length); }
            if (r.stock) await db.tx("nox_shop/items/" + r.id + "/stock", (c) => (c === null ? c : c + r.stock));
          } catch (_) {}
        }
        try { await db.remove("nox_orders/" + u.uid + "/" + oid); } catch (_) {}
      };
      try {
        for (const l of lines) {
          const rec = { id: l.id };
          if (l.mode === "lines") { /* mỗi đơn vị = một dòng bí mật; lấy nguyên tử đúng qty dòng đầu */
            let taken = null;
            const r = await db.tx("nox_shopsecret/" + l.id + "/lines", (cur) => {
              taken = null; if (cur === null || typeof cur !== "object") return cur;
              const ks = Object.keys(cur).sort(); if (ks.length < l.qty) return undefined;
              const next = Object.assign({}, cur); taken = {}; ks.slice(0, l.qty).forEach(k => { taken[k] = cur[k]; delete next[k]; });
              return Object.keys(next).length ? next : null;
            });
            if (!taken || !r.committed) { await rollback(); return fail(409, "out_of_stock", "Sorry, \"" + l.name + "\" doesn't have enough stock."); }
            rec.lines = taken;
            const left = r.value ? Object.keys(r.value).length : 0; await db.set("nox_shop/items/" + l.id + "/stock", left);
            delivery.push({ id: l.id, name: l.name, qty: l.qty, lines: Object.keys(taken).sort().map(k => taken[k]) });
          } else {
            if (!l.unlimited) {
              let okk = false;
              const r = await db.tx("nox_shop/items/" + l.id + "/stock", (cur) => { okk = false; if (cur === null) return cur; if (cur < l.qty) return undefined; okk = true; return cur - l.qty; });
              if (!okk || !r.committed) { await rollback(); return fail(409, "out_of_stock", "Sorry, \"" + l.name + "\" doesn't have enough stock."); }
              rec.stock = l.qty;
            }
            if (l.mode === "text") { const s = await db.get("nox_shopsecret/" + l.id + "/text"); delivery.push({ id: l.id, name: l.name, qty: l.qty, text: String(s || "") }); }
            else delivery.push({ id: l.id, name: l.name, qty: l.qty, manual: true });
          }
          reserved.push(rec);
        }
      } catch (e) { await rollback(); throw e; }
      const pay = await walletApply(u.uid, -total);
      if (!pay.ok) { await rollback(); return pay.reason === "insufficient" ? fail(402, "insufficient", "Not enough balance. Top up your wallet first.") : fail(409, "conflict", "Please try again."); }
      const manual = delivery.some(d => d.manual);
      await db.update("nox_orders/" + u.uid + "/" + oid, { status: "paid", delivery, balanceAfter: pay.balance, paidAt: now(), ...(manual ? { manual: true } : {}) });
      await logTx(u.uid, oid, { type: "purchase", amount: -total, balance: pay.balance, ref: oid, note: lines.map(l => l.name + " x" + l.qty).join(", ").slice(0, 200) });
      for (const l of lines) { try { await db.tx("nox_shop/items/" + l.id + "/sold", (c) => (c || 0) + l.qty); } catch (_) {} }
      return ok({ orderId: oid, balance: pay.balance, total, delivery, manual });
    },

    /* ───── Chỉ DEV ───── */
    /* Trạng thái cấu hình nhận tiền tự động (chỉ báo "đã đặt khoá hay chưa", KHÔNG lộ khoá) */
    async "shop-status"({ token }) {
      const { err } = await devOnly(token); if (err) return err;
      return ok({ bank: bankInfo(), hook: { sepayKey: !!env.SEPAY_API_KEY, sepaySecret: !!env.SEPAY_SECRET, casso: !!env.CASSO_SECURE_TOKEN }, adminDb: true });
    },
    async "wallet-adjust"({ token, body }) { /* cộng/trừ tay (bù tiền, xử lý giao dịch khách ghi sai nội dung) */
      const { u, err } = await devOnly(token); if (err) return err;
      let uid = String(body.uid || ""); if (!ID_RE.test(uid)) return fail(400, "bad_request", "Missing user.");
      const amount = int(body.amount); if (!(amount !== 0 && Math.abs(amount) <= MAX_ORDER)) return fail(400, "bad_amount", "Enter a non-zero whole amount.");
      await ensureWallet(uid);
      const id = newId("a"), r = await walletApply(uid, amount, { key: id });
      if (!r.ok) return r.reason === "insufficient" ? fail(400, "insufficient", "That would make the balance negative.") : fail(409, "conflict", "Please try again.");
      await logTx(uid, id, { type: "adjust", amount, balance: r.balance, note: String(body.note || "Admin adjustment").slice(0, 200), by: u.email.slice(0, 120) });
      return ok({ balance: r.balance });
    },
    async "bank-assign"({ token, body }) { /* gán giao dịch ngân hàng "chưa khớp" cho một tài khoản */
      const { u, err } = await devOnly(token); if (err) return err;
      const key = String(body.hook || ""), uid = String(body.uid || "");
      if (!ID_RE.test(key) || !ID_RE.test(uid)) return fail(400, "bad_request", "Missing data.");
      const h = await db.get("nox_bankhook/" + key); if (!h || h.status !== "unmatched") return fail(404, "not_found", "That transaction can't be assigned.");
      await ensureWallet(uid);
      const r = await walletApply(uid, h.amount, { key: "h_" + key });
      if (!r.ok && !r.dup) return fail(409, "conflict", "Please try again.");
      if (r.ok) await logTx(uid, "h_" + key, { type: "topup", amount: h.amount, balance: r.balance, note: "Bank transfer (assigned by admin)", ref: key, by: u.email.slice(0, 120) });
      await db.update("nox_bankhook/" + key, { status: "credited", uid, assignedBy: u.email.slice(0, 120), ts: now() });
      return ok({ balance: r.balance });
    },
    async "order-refund"({ token, body }) {
      const { u, err } = await devOnly(token); if (err) return err;
      const uid = String(body.uid || ""), oid = String(body.oid || ""); if (!ID_RE.test(uid) || !ID_RE.test(oid)) return fail(400, "bad_request", "Missing data.");
      const o = await db.get("nox_orders/" + uid + "/" + oid); if (!o || o.status !== "paid") return fail(404, "not_found", "That order can't be refunded.");
      const r = await walletApply(uid, o.total, { key: "r_" + oid });
      if (!r.ok && !r.dup) return fail(409, "conflict", "Please try again.");
      if (r.ok) await logTx(uid, "r_" + oid, { type: "refund", amount: o.total, balance: r.balance, ref: oid, note: "Refund", by: u.email.slice(0, 120) });
      await db.update("nox_orders/" + uid + "/" + oid, { status: "refunded", refundedAt: now() });
      return ok({ balance: r.balance });
    },

    /* ───── Tệp đính kèm trong chat (ảnh / video / tệp). Lưu trong Realtime Database nên giới hạn dung lượng. ───── */
    async "chat-file"({ token, body }) {
      const { u, err } = await who(token, { needVerifiedSession: true }); if (err) return err;
      const isDev = await (async () => { const d = await devOnly(token); return !d.err; })();
      const owner = isDev && body.owner ? String(body.owner) : u.uid, tid = String(body.tid || "");
      if (!ID_RE.test(owner) || !ID_RE.test(tid)) return fail(400, "bad_request", "Missing data.");
      const adm = (await db.get("nox_admin/" + u.uid)) || {};
      if (!isDev && ((typeof adm.banUntil === "number" && adm.banUntil > now()) || (typeof adm.muteUntil === "number" && adm.muteUntil > now()))) return fail(403, "muted", "You can't send files right now.");
      const th = await db.get("nox_threads/" + owner + "/" + tid); if (!th) return fail(404, "not_found", "That conversation doesn't exist.");
      if (!isDev && th.status === "closed") return fail(403, "closed", "This conversation is closed.");
      if (!(await limit("cfile:" + u.uid, isDev ? 80 : 15, HOUR))) return fail(429, "rate_limited", "Too many files. Try again in a while.");
      const name = String(body.name || "").replace(/[\\/\u0000-\u001f]/g, "").trim().slice(0, 80), ext = (name.split(".").pop() || "").toLowerCase();
      if (!name || !EXT[ext]) return fail(400, "bad_file", "That file type isn't supported. Send an image, video, PDF, ZIP or a text file.");
      const m = /^data:[^;,]{0,60};base64,([A-Za-z0-9+/=]+)$/.exec(String(body.data || "")); if (!m) return fail(400, "bad_file", "That file couldn't be read.");
      const buf = Buffer.from(m[1], "base64"), [mime, kind] = EXT[ext];
      if (!buf.length) return fail(400, "bad_file", "That file is empty.");
      if (buf.length > LIMIT[kind]) return fail(413, "too_big", "That file is too large (max " + Math.round(LIMIT[kind] / 1024) + " KB for this type).");
      if (!sniff(buf, ext)) return fail(400, "bad_file", "That file doesn't look like a ." + ext + " file.");
      const cnt = await db.tx("nox_filecount/" + owner + "/" + tid, (c) => ((c || 0) >= MAX_FILES_PER_THREAD ? undefined : (c || 0) + 1));
      if (!cnt.committed) return fail(429, "too_many_files", "This conversation has reached its file limit.");
      const fid = newId("f");
      const meta = { name, mime, kind, size: buf.length, by: u.uid, ts: now() };
      await db.set("nox_filemeta/" + owner + "/" + tid + "/" + fid, meta); /* bản nhỏ để Rules kiểm tra (không phải đọc cả tệp) */
      await db.set("nox_files/" + owner + "/" + tid + "/" + fid, Object.assign({}, meta, { data: "data:" + mime + ";base64," + buf.toString("base64") }));
      return ok({ att: { id: fid, name, mime, kind, size: buf.length } });
    }
  };

  /* ───── Webhook ngân hàng (SePay / Casso) ───── */
  const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
  const eq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
  function authenticate(h, raw) {
    const g = (k) => String(h[k] || h[k.toLowerCase()] || "");
    const apikey = env.SEPAY_API_KEY, secret = env.SEPAY_SECRET, casso = env.CASSO_SECURE_TOKEN;
    if (!apikey && !secret && !casso) return "off";
    const a = g("authorization");
    if (apikey && /^apikey /i.test(a) && eq(a.slice(7).trim(), apikey)) return "sepay";
    if (secret && g("x-sepay-signature") && g("x-sepay-timestamp")) {
      const ts = Number(g("x-sepay-timestamp")); if (!Number.isFinite(ts) || Math.abs(now() / 1000 - ts) > 600) return "";
      const want = "sha256=" + crypto.createHmac("sha256", secret).update(ts + "." + raw).digest("hex");
      if (eq(g("x-sepay-signature"), want)) return "sepay";
    }
    if (casso && g("secure-token") && eq(g("secure-token"), casso)) return "casso";
    return "";
  }
  const codeFrom = (text) => { const t = String(text || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); const m = new RegExp(CODE_PREFIX + "(\\d{8})").exec(t); return m ? CODE_PREFIX + m[1] : ""; };
  function normalize(provider, j) {
    const out = [];
    if (provider === "casso" || (j && Array.isArray(j.data))) {
      for (const x of (j && j.data) || []) out.push({ key: "casso_" + x.id, amount: int(x.amount), text: (x.description || "") + " " + (x.tid || ""), content: String(x.description || "").slice(0, 300), dir: x.amount > 0 ? "in" : "out" });
    } else if (j && j.id != null) {
      out.push({ key: "sepay_" + j.id, amount: int(j.transferAmount), text: (j.content || "") + " " + (j.description || "") + " " + (j.code || ""), content: String(j.content || j.description || "").slice(0, 300), dir: j.transferType === "in" ? "in" : "out", account: j.accountNumber != null ? String(j.accountNumber) : "" });
    }
    return out.filter(x => /^[A-Za-z0-9_]{3,60}$/.test(x.key));
  }
  async function processOne(x) {
    if (x.dir !== "in" || !(x.amount > 0)) return "ignored";
    if (x.account && x.account !== bank.account) return "ignored";
    const t = now(); let first = false;
    await db.tx("nox_bankhook/" + x.key, (cur) => { first = false; if (cur === null) { first = true; return { status: "processing", amount: x.amount, content: x.content, ts: t }; } if (cur.status === "processing" && t - (cur.ts || 0) > 2 * MIN) { first = true; return Object.assign({}, cur, { ts: t }); } return cur; });
    if (!first) return "duplicate";
    const code = codeFrom(x.text), uid = code ? await db.get("nox_topcodes/" + code) : null;
    if (!uid) { await db.update("nox_bankhook/" + x.key, { status: "unmatched", code: code || null }); return "unmatched"; }
    const r = await walletApply(uid, x.amount, { key: "h_" + x.key });
    if (r.ok) {
      await logTx(uid, "h_" + x.key, { type: "topup", amount: x.amount, balance: r.balance, note: "Bank transfer", ref: x.key });
      const ps = (await db.get("nox_topups/" + uid)) || {}; const hit = Object.keys(ps).filter(k => ps[k].status === "pending" && ps[k].amount === x.amount).sort((a, b) => ps[a].ts - ps[b].ts)[0];
      if (hit) await db.update("nox_topups/" + uid + "/" + hit, { status: "done", doneAt: t });
    } else if (!r.dup) throw new Error("credit failed " + (r.reason || ""));
    await db.update("nox_bankhook/" + x.key, { status: "credited", uid, code });
    return "credited";
  }
  async function webhook({ headers, raw, ip }) {
    const h = {}; Object.keys(headers || {}).forEach(k => { h[k.toLowerCase()] = headers[k]; });
    const provider = authenticate(h, raw);
    if (provider === "off") return { status: 503, body: { success: false, message: "not configured" } };
    if (!provider) { if (ip && !(await limit("hookfail:" + sha(ip).toString("hex").slice(0, 16), 60, 10 * MIN))) return { status: 429, body: { success: false } }; return { status: 401, body: { success: false } }; }
    let j; try { j = JSON.parse(raw); } catch (_) { return { status: 400, body: { success: false } }; }
    const list = normalize(provider, j), res = [];
    for (const x of list) res.push(await processOne(x));
    return { status: 200, body: { success: true, results: res } };
  }
  return { actions: A, webhook, bank: bankInfo, codeFrom, ensureWallet };
}
module.exports = { createShop, MIN_TOPUP, MAX_TOPUP, EXT, sniff };
