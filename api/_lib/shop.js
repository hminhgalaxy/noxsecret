/* Cửa hàng + ví + nạp tiền THỦ CÔNG qua hóa đơn + tệp đính kèm chat (chạy trên máy chủ, ghi bằng quyền Admin).
   NGUYÊN TẮC AN TOÀN TIỀN: trình duyệt KHÔNG BAO GIỜ ghi vào ví / đơn hàng / lịch sử giao dịch / hóa đơn (Rules đóng hết);
   mọi thay đổi số dư đi qua `walletApply` — một giao dịch (transaction) nguyên tử của Realtime Database:
   (1) không cho âm tiền, (2) mỗi khoản có "khoá chống cộng trùng" (applied/<key>) nên gọi lại nhiều lần cũng chỉ cộng một lần.
   Luồng nạp tiền (không còn webhook / QR tự động):
     khách tạo hóa đơn (creating) → DEV nhận + gửi mã QR (ready) → khách chuyển tiền rồi gửi ảnh bill (bill)
     → DEV vào "Nhập tiền", nhập mã code + mã bảo mật (ngẫu nhiên, sinh ở máy chủ) → máy chủ đối chiếu rồi chuyển tiền từ ví DEV sang ví khách (done).
     DEV không thể nhập số tiền khác hóa đơn hay đổi id: số tiền/ id lấy từ hóa đơn trên máy chủ, ô nhập chỉ để xác nhận.
   Dữ liệu (trong nox_*):
     wallet/<uid>     { balance, applied{key:ts}, createdAt, devGrant? }
     inv/<uid>/<id>   { amount, code, status: creating|ready|bill|crediting|done|rejected|cancelled|expired, ts, upd, note?, reason?, hasQr?, hasBill? }
     invq/<id>        { uid, amount, status, ts, upd }  (chỉ mục cho DEV)
     invsec/<id>      { sec, tries, lockUntil }         (mã bảo mật: chỉ DEV đọc)
     invfile/<uid>/<id>/{qr,bill}  (ảnh QR do DEV gửi, ảnh bill của khách)
     invopen/<uid>    id hóa đơn đang mở (mỗi khách chỉ một hóa đơn mở)
     txs/<uid>/<id>   { type: topup|purchase|refund|adjust|send, amount(+/-), balance, note, ref, ts }
     orders/<uid>/<id>{ status: pending|paid|refunded, items[], total, delivery[], ts }
     shop/{cats,items}  (công khai, chỉ DEV ghi) · shopsecret/<id> (chỉ DEV: nội dung giao hàng)
     files/<uid>/<tid>/<fid> (tệp đính kèm chat, chỉ API ghi) · filemeta (bản nhỏ để Rules kiểm tra) · filecount/<uid>/<tid> */
const crypto = require("crypto");

const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const MIN_TOPUP = 2000, MAX_TOPUP = 50000000, MAX_ORDER = 1000000000, DEV_GRANT = 130000000;
const CREATING_TTL = 3 * DAY, READY_TTL = DAY, KEEP_TTL = 30 * DAY, WRONG_MAX = 5, LOCK_MS = 10 * MIN;
const OPEN = ["creating", "ready", "bill", "crediting"];
const ID_RE = /^[A-Za-z0-9_-]{1,60}$/;
const cleanTxt = (v, max) => String(v == null ? "" : v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, c => (c === "đ" ? "d" : "D")).replace(/[^A-Za-z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

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
  const DEV = String(env.DEV_EMAIL || "hminhgalaxy@gmail.com").trim().toLowerCase();
  /* Chỉ mục nhẹ cho SEO (nox_shopseo, ai cũng đọc, chỉ máy chủ ghi): tên, mô tả ngắn, giá, mục, tồn kho… KHÔNG có ảnh/nội dung bán,
     để trang chủ/danh mục dựng sẵn cho Google mà không phải tải ảnh base64 của mọi sản phẩm. */
  const seoOf = it => { it = it || {}; const o = { n: String(it.name || "").slice(0, 120), d: String(it.desc || "").replace(/\s+/g, " ").trim().slice(0, 200), p: Math.max(0, Math.floor(Number(it.price) || 0)), c: String(it.cat || "").slice(0, 40), t: Number(it.createdAt) || 0, h: Math.floor(Number(it.sold) || 0), a: it.active !== false };
    if (typeof it.stock === "number") o.s = Math.max(0, Math.floor(it.stock)); if (it.img || (it.imgs && typeof it.imgs === "object" && (it.imgs.a || it.imgs.b || it.imgs.c))) o.i = 1; return o; };
  async function seoSyncAll() {
    const items = (await db.get("nox_shop/items")) || {}, idx = {};
    for (const [k, it] of Object.entries(items)) if (ID_RE.test(k) && it && typeof it === "object" && it.name) idx[k] = seoOf(it);
    await db.set("nox_shopseo", idx); return Object.keys(idx).length;
  }
  async function seoTouch(ids) { /* sau khi bán: cập nhật tồn kho + số đã bán trong chỉ mục (không lỗi thì thôi) */
    for (const id of ids) { try { const b = "nox_shop/items/" + id, [stock, sold] = await Promise.all([db.get(b + "/stock"), db.get(b + "/sold")]); await db.update("nox_shopseo/" + id, { s: typeof stock === "number" ? Math.max(0, Math.floor(stock)) : null, h: Math.floor(Number(sold) || 0) }); } catch (_) {} }
  }
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

  /* ───── Ví: tạo lần đầu; tài khoản DEV được cấp sẵn 130.000.000₫ đúng MỘT lần (cờ devGrant nằm trong cùng giao dịch nên không thể cấp lại) ───── */
  async function ensureWallet(uid, email) {
    const isDev = !!email && String(email).trim().toLowerCase() === DEV;
    let granted = false;
    const r = await db.tx("nox_wallet/" + uid, (cur) => {
      granted = false;
      const w = cur && typeof cur === "object" ? cur : { balance: 0, createdAt: now() };
      if (!w.createdAt) w.createdAt = now();
      if (isDev && !w.devGrant) { w.balance = Math.floor(w.balance || 0) + DEV_GRANT; w.devGrant = now(); granted = true; }
      else if (cur && typeof cur === "object") return cur;
      return w;
    });
    const w = r.value || { balance: 0 };
    if (granted) { try { await logTx(uid, "devgrant", { type: "adjust", amount: DEV_GRANT, balance: Math.floor(w.balance || 0), note: "Starting balance for the website owner" }); } catch (_) {} }
    return w;
  }
  const verifiedUser = async (token) => {
    const r = await who(token, { needVerifiedSession: true }); if (r.err) return r;
    if (!r.u.verified) return { err: fail(403, "unverified", "Verify your email first.") };
    const adm = (await db.get("nox_admin/" + r.u.uid)) || {};
    if (typeof adm.banUntil === "number" && adm.banUntil > now()) return { err: fail(403, "banned", "This account is suspended.") };
    return r;
  };

  /* ───── Hóa đơn nạp tiền ───── */
  const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", MIXED = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const randStr = (alpha, min, max) => { const n = rnd(min, max + 1); let o = ""; for (let i = 0; i < n; i++) o += alpha[rnd(0, alpha.length)]; return o; };
  const normCode = (v) => String(v == null ? "" : v).toUpperCase().replace(/[\s-]/g, "");
  const same = (a, b) => { const x = crypto.createHash("sha256").update(String(a)).digest(), y = crypto.createHash("sha256").update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };
  const IMG_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;
  function readImage(data) { /* data URL ảnh png/jpeg/webp ≤ 300 KB, chữ ký đầu tệp phải khớp */
    const m = IMG_RE.exec(String(data || "")); if (!m) return null;
    const buf = Buffer.from(m[2], "base64"), ext = m[1] === "jpeg" ? "jpg" : m[1];
    if (!buf.length || buf.length > LIMIT.image || !sniff(buf, ext)) return null;
    return "data:image/" + m[1] + ";base64," + buf.toString("base64");
  }
  const invPath = (uid, id) => "nox_inv/" + uid + "/" + id;
  /* Chuyển trạng thái nguyên tử: chỉ chạy khi trạng thái hiện tại nằm trong `from`; trả hóa đơn mới hoặc null */
  async function moveInv(uid, id, from, patch) {
    let hit = null;
    await db.tx(invPath(uid, id), (cur) => {
      hit = null;
      if (!cur || typeof cur !== "object" || !from.includes(cur.status)) return cur;
      hit = Object.assign({}, cur, patch, { upd: now() }); return hit;
    });
    if (hit) { try { await db.update("nox_invq/" + id, { status: hit.status, upd: hit.upd }); } catch (_) {} }
    return hit;
  }
  async function release(uid, id) { await db.tx("nox_invopen/" + uid, (cur) => (cur === id ? null : cur)); }
  async function finish(uid, id, from, patch) { /* sang trạng thái kết thúc: nhả khoá "đang mở" + xoá ảnh QR (không còn cần) */
    const h = await moveInv(uid, id, from, patch);
    if (h) { try { await release(uid, id); await db.remove("nox_invfile/" + uid + "/" + id + "/qr"); } catch (_) {} }
    return h;
  }
  const expiredInv = (v, t) => v && ((v.status === "creating" && t - (v.ts || 0) > CREATING_TTL) || (v.status === "ready" && t - (v.upd || v.ts || 0) > READY_TTL));
  async function pruneOld(uid) { /* dọn hóa đơn đã kết thúc quá 30 ngày của chính người này */
    const t = now(), all = (await db.get("nox_inv/" + uid)) || {};
    for (const k of Object.keys(all)) { const v = all[k] || {}; if (!OPEN.includes(v.status) && t - (v.upd || v.ts || 0) > KEEP_TTL) { await db.remove(invPath(uid, k)); await db.remove("nox_invq/" + k); await db.remove("nox_invsec/" + k); await db.remove("nox_invfile/" + uid + "/" + k); } }
  }
  /* Hóa đơn đang mở của một người (nếu đã hết hạn thì đóng luôn) */
  async function openOf(uid) {
    const id = await db.get("nox_invopen/" + uid); if (!id) return null;
    const v = await db.get(invPath(uid, id));
    if (!v || !OPEN.includes(v.status)) { await release(uid, id); return null; }
    if (expiredInv(v, now())) { await finish(uid, id, [v.status], { status: "expired" }); return null; }
    return Object.assign({ id }, v);
  }
  const devInvoice = async (body) => { /* DEV chỉ chọn hóa đơn bằng id; mọi thứ còn lại lấy từ máy chủ */
    const id = String(body.id || ""); if (!ID_RE.test(id)) return { err: fail(400, "bad_request", "Missing invoice.") };
    const q = await db.get("nox_invq/" + id); if (!q || !ID_RE.test(String(q.uid || ""))) return { err: fail(404, "not_found", "That invoice doesn't exist.") };
    const v = await db.get(invPath(q.uid, id)); if (!v) return { err: fail(404, "not_found", "That invoice doesn't exist.") };
    return { id, uid: q.uid, v };
  };

  const A = {
    /* Số dư + hóa đơn nạp đang mở (tạo ví lần đầu) */
    async "wallet-info"({ token }) {
      const { u, err } = await verifiedUser(token); if (err) return err;
      const w = await ensureWallet(u.uid, u.email), o = await openOf(u.uid);
      return ok({ balance: Math.floor(w.balance || 0), min: MIN_TOPUP, max: MAX_TOPUP, open: o ? o.id : null });
    },
    /* Khách tạo hóa đơn nạp: số tiền ≥ 2.000₫, bội của 1.000₫. Mỗi khách chỉ có một hóa đơn mở. */
    async "inv-create"({ token, body }) {
      const { u, err } = await verifiedUser(token); if (err) return err;
      const amount = int(body.amount);
      if (!(amount >= MIN_TOPUP && amount <= MAX_TOPUP) || amount % 1000 !== 0) return fail(400, "bad_amount", "Choose an amount from 2,000 to 50,000,000 VND, in steps of 1,000.");
      if (!(await limit("inv:" + u.uid, 12, HOUR))) return fail(429, "rate_limited", "Too many requests. Try again in a while.");
      await ensureWallet(u.uid, u.email);
      const o = await openOf(u.uid); if (o) return fail(409, "open_invoice", "You already have an open top-up invoice.", { id: o.id });
      const id = newId("i"), t = now();
      const claim = await db.tx("nox_invopen/" + u.uid, (cur) => (cur === null ? id : cur));
      if (!claim.committed || claim.value !== id) { const o2 = await openOf(u.uid); return fail(409, "open_invoice", "You already have an open top-up invoice.", o2 ? { id: o2.id } : undefined); }
      const code = randStr(ALNUM, 9, 12), sec = randStr(MIXED, 10, 14);
      try {
        await db.set("nox_invsec/" + id, { sec, tries: 0 });
        await db.set("nox_invq/" + id, { uid: u.uid, amount, status: "creating", ts: t, upd: t });
        await db.set(invPath(u.uid, id), { amount, code, status: "creating", ts: t, upd: t });
      } catch (e) { try { await release(u.uid, id); } catch (_) {} throw e; }
      try { await pruneOld(u.uid); } catch (_) {}
      return ok({ id, amount, code, status: "creating" });
    },
    /* Khách hủy khi chưa gửi bill */
    async "inv-cancel"({ token, body }) {
      const { u, err } = await verifiedUser(token); if (err) return err;
      const id = String(body.id || ""); if (!ID_RE.test(id)) return fail(400, "bad_request", "Missing invoice.");
      const v = await db.get(invPath(u.uid, id)); if (!v) return fail(404, "not_found", "That invoice doesn't exist.");
      const h = await finish(u.uid, id, ["creating", "ready"], { status: "cancelled" });
      if (!h) return fail(409, "wrong_state", v.status === "cancelled" ? "That invoice was already cancelled." : "This invoice can't be cancelled any more.");
      return ok({ status: "cancelled" });
    },
    /* Khách gửi ảnh bill chuyển tiền (chỉ khi DEV đã gửi QR) */
    async "inv-bill"({ token, body }) {
      const { u, err } = await verifiedUser(token); if (err) return err;
      const id = String(body.id || ""); if (!ID_RE.test(id)) return fail(400, "bad_request", "Missing invoice.");
      if (!(await limit("invbill:" + u.uid, 10, HOUR))) return fail(429, "rate_limited", "Too many requests. Try again in a while.");
      const v = await db.get(invPath(u.uid, id)); if (!v) return fail(404, "not_found", "That invoice doesn't exist.");
      if (v.status !== "ready") return fail(409, "wrong_state", "This invoice isn't waiting for a receipt.");
      const img = readImage(body.image); if (!img) return fail(400, "bad_file", "Send a PNG, JPG or WebP picture (up to 300 KB).");
      await db.set("nox_invfile/" + u.uid + "/" + id + "/bill", img);
      const h = await moveInv(u.uid, id, ["ready"], { status: "bill", billAt: now(), hasBill: true });
      if (!h) return fail(409, "wrong_state", "This invoice isn't waiting for a receipt.");
      return ok({ status: "bill" });
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
      const w = await ensureWallet(u.uid, u.email);
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
      await seoTouch(lines.map(l => l.id));
      return ok({ orderId: oid, balance: pay.balance, total, delivery, manual });
    },

    /* ───── Chỉ DEV ───── */
    /* DEV nhận yêu cầu và gửi mã QR để khách chuyển tiền */
    async "inv-accept"({ token, body }) {
      const { err } = await devOnly(token); if (err) return err;
      const d = await devInvoice(body); if (d.err) return d.err;
      const qr = readImage(body.qr); if (!qr) return fail(400, "bad_file", "Upload the QR as a PNG, JPG or WebP picture (up to 300 KB).");
      const note = String(body.note || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 200);
      await db.set("nox_invfile/" + d.uid + "/" + d.id + "/qr", qr);
      const h = await moveInv(d.uid, d.id, ["creating", "ready"], { status: "ready", hasQr: true, note });
      if (!h) { await db.remove("nox_invfile/" + d.uid + "/" + d.id + "/qr"); return fail(409, "wrong_state", "This invoice can't take a QR any more."); }
      return ok({ status: "ready" });
    },
    async "inv-reject"({ token, body }) {
      const { err } = await devOnly(token); if (err) return err;
      const d = await devInvoice(body); if (d.err) return d.err;
      const reason = String(body.reason || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 200);
      const h = await finish(d.uid, d.id, ["creating", "ready", "bill"], { status: "rejected", reason });
      if (!h) return fail(409, "wrong_state", "This invoice can't be declined any more.");
      return ok({ status: "rejected" });
    },
    /* "Nhập tiền": DEV nhập mã code + mã bảo mật; số tiền và id do hóa đơn quyết định, không sửa được */
    async "inv-credit"({ token, body }) {
      const { u, err } = await devOnly(token); if (err) return err;
      if (!(await limit("invcredit:" + u.uid, 60, HOUR))) return fail(429, "rate_limited", "Too many attempts. Try again in a while.");
      const d = await devInvoice(body); if (d.err) return d.err;
      const { id, uid } = d; let v = d.v;
      if (v.status === "done") return ok({ already: true, status: "done" });
      if (!["bill", "crediting"].includes(v.status)) return fail(409, "wrong_state", v.status === "creating" || v.status === "ready" ? "The customer hasn't sent the receipt yet." : "This invoice can't be paid any more.");
      if (uid === u.uid) return fail(400, "self", "You can't top up your own wallet this way.");
      const sec = (await db.get("nox_invsec/" + id)) || {}, t = now();
      if (sec.lockUntil && sec.lockUntil > t) return fail(429, "locked", "Too many wrong entries. Try again in " + Math.ceil((sec.lockUntil - t) / 60000) + " minute(s).");
      const amount = int(body.amount);
      const good = amount === v.amount && same(normCode(body.code), normCode(v.code)) && typeof sec.sec === "string" && same(String(body.sec || "").trim(), sec.sec);
      if (!good) {
        const tries = (sec.tries || 0) + 1;
        await db.update("nox_invsec/" + id, tries >= WRONG_MAX ? { tries: 0, lockUntil: t + LOCK_MS } : { tries });
        return fail(400, "mismatch", amount !== v.amount ? "The amount must be exactly " + v.amount + " VND for this invoice." : "The code or security code doesn't match this invoice.");
      }
      if ((sec.tries || 0) > 0) await db.update("nox_invsec/" + id, { tries: 0 });
      /* Từ đây mọi bước đều có khoá chống trùng nên gọi lại sau khi lỗi giữa chừng vẫn an toàn (không cộng/trừ hai lần) */
      v = await moveInv(uid, id, ["bill"], { status: "crediting" }) || v;
      const dw = await ensureWallet(u.uid, u.email); void dw;
      const out = await walletApply(u.uid, -v.amount, { key: "invout_" + id });
      if (!out.ok && !out.dup) {
        await moveInv(uid, id, ["crediting"], { status: "bill" });
        return out.reason === "insufficient" ? fail(402, "dev_insufficient", "Your wallet doesn't have enough balance (" + out.balance + " VND).") : fail(409, "conflict", "Please try again.");
      }
      if (out.ok) await logTx(u.uid, "invout_" + id, { type: "send", amount: -v.amount, balance: out.balance, ref: id, note: "Top-up " + v.code });
      await ensureWallet(uid);
      const inn = await walletApply(uid, v.amount, { key: "inv_" + id });
      if (!inn.ok && !inn.dup) return fail(409, "conflict", "The money left your wallet but the customer isn't credited yet. Press the button again to finish.");
      if (inn.ok) await logTx(uid, "inv_" + id, { type: "topup", amount: v.amount, balance: inn.balance, ref: id, note: "Top-up " + v.code });
      await finish(uid, id, ["crediting", "bill"], { status: "done", doneAt: now() });
      return ok({ status: "done", balance: out.ok ? out.balance : undefined });
    },
    async "seo-sync"({ token }) { /* dựng lại chỉ mục SEO của cửa hàng từ toàn bộ sản phẩm (DEV; tự gọi sau mỗi lần lưu/xóa/ẩn sản phẩm) */
      const { err } = await devOnly(token); if (err) return err;
      return ok({ count: await seoSyncAll() });
    },
    async "order-deliver"({ token, body }) { /* đánh dấu đơn giao tay đã giao xong */
      const { u, err } = await devOnly(token); if (err) return err;
      const uid = String(body.uid || ""), oid = String(body.oid || ""); if (!ID_RE.test(uid) || !ID_RE.test(oid)) return fail(400, "bad_request", "Missing data.");
      const o = await db.get("nox_orders/" + uid + "/" + oid); if (!o || o.status !== "paid" || !o.manual) return fail(404, "not_found", "That order doesn't need manual delivery.");
      await db.update("nox_orders/" + uid + "/" + oid, { delivered: true, deliveredAt: now(), deliveredBy: u.email.slice(0, 120) });
      return ok({});
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

  return { actions: A, ensureWallet };
}
module.exports = { createShop, MIN_TOPUP, MAX_TOPUP, DEV_GRANT, EXT, sniff };
