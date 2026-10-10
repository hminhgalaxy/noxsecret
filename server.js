// npm i express cors firebase-admin google-auth-library
// ENV: GOOGLE_CLIENT_ID, DB_URL, ORIGIN (https://skibidiscript.vercel.app), GOOGLE_APPLICATION_CREDENTIALS (service account JSON)
const express = require("express"), cors = require("cors"), admin = require("firebase-admin");
const { OAuth2Client } = require("google-auth-library");
admin.initializeApp({ credential: admin.credential.applicationDefault(), databaseURL: process.env.DB_URL });
const db = admin.database(), CID = process.env.GOOGLE_CLIENT_ID, DEV = "hminhgalaxy@gmail.com";
const gc = new OAuth2Client(CID);
const app = express();
app.use(cors({ origin: process.env.ORIGIN }), express.json({ limit: "200kb" }));

const TYPES = ["SCRIPT", "APK", "IOS", "LINK"];
const lastPost = new Map();
const s = (v, n) => String(v ?? "").trim().slice(0, n);
const url = (v) => { try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href : ""; } catch { return ""; } };
const val = async (p) => (await db.ref(p).get()).val();

// Xác minh chữ ký, audience, issuer, hạn dùng của Google ID token
async function auth(req, res, next) {
  try {
    const t = (req.headers.authorization || "").replace("Bearer ", "");
    const tk = await gc.verifyIdToken({ idToken: t, audience: CID });
    const p = tk.getPayload();
    if (!["accounts.google.com", "https://accounts.google.com"].includes(p.iss) || !p.email_verified) throw new Error("bad");
    req.u = { uid: p.sub, email: p.email, name: p.name || p.email, pic: p.picture || "", dev: p.email === DEV };
  } catch { return res.status(401).json({ error: "Token không hợp lệ" }); }
  const u = (await val("priv/users/" + req.u.uid)) || {};
  if (u.banned && !req.u.dev) return res.status(403).json({ error: "Tài khoản bị hạn chế đăng bài" });
  await db.ref("priv/users/" + req.u.uid).update({ email: req.u.email, name: req.u.name, pic: req.u.pic, seen: Date.now() });
  next();
}
const dev = (req, res, next) => (req.u.dev ? next() : res.status(403).json({ error: "Chỉ Dev" }));
const wrap = (f) => (req, res) => f(req, res).catch((e) => { console.error(e); res.status(500).json({ error: "Lỗi máy chủ" }); });

// Đồng bộ bản công khai: chỉ bài "published" nằm trong /pub
async function sync(id) {
  const p = await val("priv/posts/" + id);
  if (!p || p.status !== "published") return db.ref("pub/posts/" + id).remove();
  const { uid, authorEmail, status, rejectReason, locked, ...pub } = p;
  return db.ref("pub/posts/" + id).set(pub);
}
async function syncGame(id) {
  const g = await val("priv/games/" + id);
  if (!g || g.published === false) return db.ref("pub/games/" + id).remove();
  const { published, ...pub } = g;
  return db.ref("pub/games/" + id).set(pub);
}
const list = (o) => Object.entries(o || {}).map(([id, v]) => ({ id, ...v }));

app.get("/me", auth, wrap(async (req, res) => res.json({ name: req.u.name, email: req.u.email, role: req.u.dev ? "dev" : "user" })));

app.get("/me/posts", auth, wrap(async (req, res) => {
  const d = await db.ref("priv/posts").orderByChild("uid").equalTo(req.u.uid).get();
  res.json({ posts: list(d.val()).sort((a, b) => b.createdAt - a.createdAt) });
}));

app.post("/posts", auth, wrap(async (req, res) => {
  const b = req.body, now = Date.now();
  const title = s(b.title, 120);
  if (!title) return res.status(400).json({ error: "Thiếu tiêu đề" });
  if (!/^[A-Z0-9-]{1,20}$/.test(String(b.type)) || !(TYPES.includes(b.type) || (await val("pub/categories/" + b.type)))) return res.status(400).json({ error: "Mục không hợp lệ" });
  if (b.url && !url(b.url)) return res.status(400).json({ error: "URL không hợp lệ" });
  if (b.thumb && !url(b.thumb)) return res.status(400).json({ error: "URL ảnh không hợp lệ" });
  if (b.gameId && !(await val("pub/games/" + b.gameId))) return res.status(400).json({ error: "Game không tồn tại" });
  if (!req.u.dev && now - (lastPost.get(req.u.uid) || 0) < 20000) return res.status(429).json({ error: "Đăng quá nhanh, thử lại sau ít giây" });
  lastPost.set(req.u.uid, now);
  const data = { title, type: b.type, gameId: s(b.gameId, 60), desc: s(b.desc, 2000), thumb: url(b.thumb), code: String(b.code ?? "").slice(0, 30000),
    url: url(b.url), version: s(b.version, 30), note: s(b.note, 300), tags: (Array.isArray(b.tags) ? b.tags : []).slice(0, 8).map((t) => s(t, 24)).filter(Boolean) };
  const moderation = (await val("priv/settings/moderation")) !== false;
  let id = b.id;
  if (id) {
    const old = await val("priv/posts/" + id);
    if (!old) return res.status(404).json({ error: "Không tìm thấy bài" });
    if (old.uid !== req.u.uid && !req.u.dev) return res.status(403).json({ error: "Không phải bài của bạn" });
    if (old.locked && !req.u.dev) return res.status(403).json({ error: "Bài đã bị khóa chỉnh sửa" });
    const status = req.u.dev ? old.status : moderation ? "pending" : "published";
    await db.ref("priv/posts/" + id).update({ ...data, status, updatedAt: now, rejectReason: null });
  } else {
    id = db.ref("priv/posts").push().key;
    await db.ref("priv/posts/" + id).set({ ...data, uid: req.u.uid, authorName: req.u.name, authorPic: req.u.pic, authorEmail: req.u.email, createdAt: now,
      status: req.u.dev || !moderation ? "published" : "pending" });
  }
  await sync(id);
  const st = (await val("priv/posts/" + id + "/status"));
  res.json({ id, status: st, message: st === "published" ? "Bài đã được xuất bản" : "Bài đã gửi, đang chờ Dev duyệt" });
}));

app.delete("/posts/:id", auth, wrap(async (req, res) => {
  const p = await val("priv/posts/" + req.params.id);
  if (!p) return res.status(404).json({ error: "Không tìm thấy" });
  if (p.uid !== req.u.uid && !req.u.dev) return res.status(403).json({ error: "Không phải bài của bạn" });
  await Promise.all([db.ref("priv/posts/" + req.params.id).remove(), db.ref("pub/posts/" + req.params.id).remove(), db.ref("priv/likes/" + req.params.id).remove(), db.ref("priv/ratings/" + req.params.id).remove()]);
  res.json({ ok: true });
}));

app.post("/reports", auth, wrap(async (req, res) => {
  await db.ref("priv/reports").push({ postId: s(req.body.postId, 80), reason: s(req.body.reason, 500), by: req.u.uid, at: Date.now() });
  res.json({ ok: true });
}));

/* ---- Tim & đánh giá (mỗi tài khoản 1 tim và 1 đánh giá cho mỗi bài) ---- */
const okId = (id) => /^[\w-]{1,40}$/.test(id);
const isPub = async (id) => okId(id) && (await val("priv/posts/" + id + "/status")) === "published";
async function recount(id) {
  const [l, r] = await Promise.all([val("priv/likes/" + id), val("priv/ratings/" + id)]);
  const vals = Object.values(r || {});
  const u = { likeCount: Object.keys(l || {}).length, ratingCount: vals.length, ratingSum: vals.reduce((a, c) => a + c, 0) };
  await Promise.all([db.ref("priv/posts/" + id).update(u), db.ref("pub/posts/" + id).update(u)]);
  return u;
}
const myVote = async (id, uid) => ({ liked: !!(await val(`priv/likes/${id}/${uid}`)), stars: (await val(`priv/ratings/${id}/${uid}`)) || 0 });
app.get("/posts/:id/vote", auth, wrap(async (req, res) => res.json(okId(req.params.id) ? await myVote(req.params.id, req.u.uid) : { liked: false, stars: 0 })));
app.post("/posts/:id/like", auth, wrap(async (req, res) => {
  const id = req.params.id;
  if (!(await isPub(id))) return res.status(404).json({ error: "Không tìm thấy bài" });
  const ref = db.ref(`priv/likes/${id}/${req.u.uid}`), had = (await ref.get()).exists();
  if (had) await ref.remove(); else await ref.set(true);
  res.json({ ...(await recount(id)), ...(await myVote(id, req.u.uid)) });
}));
app.post("/posts/:id/rate", auth, wrap(async (req, res) => {
  const id = req.params.id, stars = Math.round(+req.body.stars);
  if (!(stars >= 1 && stars <= 5)) return res.status(400).json({ error: "Số sao không hợp lệ" });
  if (!(await isPub(id))) return res.status(404).json({ error: "Không tìm thấy bài" });
  await db.ref(`priv/ratings/${id}/${req.u.uid}`).set(stars);
  res.json({ ...(await recount(id)), ...(await myVote(id, req.u.uid)) });
}));

/* ---- Mục do người dùng tạo (lưu ở /pub/categories) ---- */
const lastCat = new Map(), BN = { SCRIPT: "Script", APK: "APK", IOS: "iOS", LINK: "Link" };
app.post("/categories", auth, wrap(async (req, res) => {
  const name = s(req.body.name, 20);
  const id = name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D").replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (name.length < 2 || !id) return res.status(400).json({ error: "Tên mục không hợp lệ" });
  if (TYPES.includes(id)) return res.json({ id, name: BN[id] });
  const all = (await val("pub/categories")) || {};
  if (all[id]) return res.json({ id, name: all[id] });
  if (Object.keys(all).length >= 40) return res.status(400).json({ error: "Đã đạt số mục tối đa" });
  if (!req.u.dev && Date.now() - (lastCat.get(req.u.uid) || 0) < 60000) return res.status(429).json({ error: "Thử lại sau ít phút" });
  lastCat.set(req.u.uid, Date.now());
  await db.ref("pub/categories/" + id).set(name);
  res.json({ id, name });
}));
app.delete("/dev/categories/:id", auth, dev, wrap(async (req, res) => { await db.ref("pub/categories/" + req.params.id).remove(); res.json({ ok: true }); }));

/* ---- Dev ---- */
app.get("/dev/posts", auth, dev, wrap(async (req, res) => {
  let posts = list(await val("priv/posts"));
  if (req.query.status) posts = posts.filter((p) => p.status === req.query.status);
  res.json({ posts: posts.sort((a, b) => b.createdAt - a.createdAt).slice(0, 300) });
}));
app.post("/dev/posts/:id", auth, dev, wrap(async (req, res) => {
  const b = req.body, u = { updatedAt: Date.now() };
  if (["published", "pending", "rejected", "hidden"].includes(b.status)) { u.status = b.status; u.rejectReason = b.status === "rejected" ? s(b.reason || "Không đạt yêu cầu", 300) : null; }
  for (const k of ["featured", "pinned", "locked"]) if (typeof b[k] === "boolean") u[k] = b[k];
  if (Array.isArray(b.labels)) u.labels = b.labels.slice(0, 5).map((x) => s(x, 20));
  await db.ref("priv/posts/" + req.params.id).update(u);
  await sync(req.params.id);
  res.json({ ok: true });
}));
app.get("/dev/games", auth, dev, wrap(async (req, res) => {
  const g = list(await val("priv/games")), posts = list(await val("priv/posts"));
  res.json({ games: g.map((x) => ({ ...x, count: posts.filter((p) => p.gameId === x.id).length })).sort((a, b) => (a.order || 0) - (b.order || 0)) });
}));
app.post("/dev/games", auth, dev, wrap(async (req, res) => {
  const b = req.body, id = b.id || db.ref("priv/games").push().key, u = {};
  if (b.name !== undefined) { u.name = s(b.name, 80); if (!u.name) return res.status(400).json({ error: "Thiếu tên game" }); }
  if (b.img !== undefined) u.img = url(b.img);
  if (b.desc !== undefined) u.desc = s(b.desc, 300);
  if (b.order !== undefined) u.order = +b.order || 0;
  if (typeof b.published === "boolean") u.published = b.published;
  await db.ref("priv/games/" + id).update(u);
  await syncGame(id);
  res.json({ id });
}));
app.delete("/dev/games/:id", auth, dev, wrap(async (req, res) => {
  await Promise.all([db.ref("priv/games/" + req.params.id).remove(), db.ref("pub/games/" + req.params.id).remove()]);
  res.json({ ok: true });
}));
app.get("/dev/reports", auth, dev, wrap(async (req, res) => res.json({ reports: list(await val("priv/reports")) })));
app.delete("/dev/reports/:id", auth, dev, wrap(async (req, res) => { await db.ref("priv/reports/" + req.params.id).remove(); res.json({ ok: true }); }));
app.get("/dev/settings", auth, dev, wrap(async (req, res) => res.json((await val("priv/settings")) || {})));
app.post("/dev/settings", auth, dev, wrap(async (req, res) => {
  await db.ref("priv/settings").update({ moderation: req.body.moderation !== false, announcement: s(req.body.announcement, 300) });
  res.json({ ok: true });
}));

app.listen(process.env.PORT || 8080);
