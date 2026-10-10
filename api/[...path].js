'use strict';
/* Backend xác thực SkibidiScript — Vercel Serverless Function (catch-all cho /api/*).
   Kiến trúc: Google Identity Services (frontend) → server xác minh ID token → cookie phiên HttpOnly.
   Dữ liệu người dùng lưu ở Firebase Realtime Database qua Admin SDK (không bao giờ lộ ra frontend). */
const L = require('../server/lib');
const { HttpError } = L;

const FAKE_CRED_ERR = 'Dữ liệu không hợp lệ';

async function newUserFromGoogle(p, devKeys) {
  const uid = await L.nextUserId();
  const ek = L.emailKey(p.email);
  if (!(await L.reserve('usersByEmail/' + ek, uid))) throw new HttpError(409, 'email đã tồn tại');
  // Tên hiển thị lấy từ Google, làm sạch và đảm bảo không trùng
  let base = String(p.name || p.email.split('@')[0]).normalize('NFC').replace(/[^\p{L}\p{N}_]/gu, '').slice(0, 24);
  if (base.length < 3) base = 'user' + base;
  let name = null;
  for (let i = 0; i < 8 && !name; i++) {
    const cand = i === 0 ? base : base.slice(0, 19) + String(Math.floor(1000 + Math.random() * 9000));
    if (await L.reserve('usersByName/' + L.nameKey(cand), uid)) name = cand;
  }
  if (!name) { await L.release('usersByEmail/' + ek, uid); throw new HttpError(409, 'không tạo được tên hiển thị'); }
  if (!(await L.reserve('googleSub/' + p.sub, uid))) {
    await L.release('usersByEmail/' + ek, uid); await L.release('usersByName/' + L.nameKey(name), uid);
    throw new HttpError(409, 'tài khoản Google đã được liên kết');
  }
  const user = {
    name, nameKey: L.nameKey(name), email: p.email.toLowerCase(), emailKey: ek, googleSub: p.sub,
    pic: /^https:\/\//.test(p.picture || '') ? p.picture.slice(0, 500) : '', bio: '',
    role: devKeys.has(ek) ? 'dev' : 'user', sv: 0, createdAt: Date.now(),
  };
  await L.db().ref('users/' + uid).set(user);
  return { id: uid, ...user };
}

const routes = {
  /* GET /api/auth/check-name?name= */
  'GET /auth/check-name': async (req, res, { url }) => {
    L.rateLimit('cn:' + L.clientIp(req), 40, 60_000);
    const name = (url.searchParams.get('name') || '').trim();
    const e = L.vName(name);
    if (e) return { ok: false, error: e };
    const taken = await L.val('usersByName/' + L.nameKey(name));
    return taken ? { ok: false, error: 'Tên này đã có người sử dụng' } : { ok: true };
  },

  /* POST /api/auth/register {name,email,password} */
  'POST /auth/register': async (req, res, { body }) => {
    L.rateLimit('reg:' + L.clientIp(req), 10, 3600_000);
    const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase(), pw = body.password;
    const e = L.vName(name) || L.vEmail(email) || L.vPassword(pw);
    if (e) throw new HttpError(400, e);
    const ek = L.emailKey(email);
    // Email chưa được xác minh khi đăng ký bằng mật khẩu ⇒ không cho chiếm Gmail của Dev; Dev phải vào bằng Google.
    if (L.devEmailKeys().has(ek)) throw new HttpError(403, 'Gmail này chỉ đăng nhập bằng Google');
    const uid = await L.nextUserId();
    if (!(await L.reserve('usersByEmail/' + ek, uid))) throw new HttpError(409, 'đã tồn tại');
    const nk = L.nameKey(name);
    if (!(await L.reserve('usersByName/' + nk, uid))) { await L.release('usersByEmail/' + ek, uid); throw new HttpError(409, 'đã tồn tại'); }
    const user = {
      name, nameKey: nk, email, emailKey: ek, passwordHash: await L.hashPassword(pw),
      pic: '', bio: '', role: 'user', sv: 0, createdAt: Date.now(),
    };
    try { await L.db().ref('users/' + uid).set(user); }
    catch (err) { await L.release('usersByEmail/' + ek, uid); await L.release('usersByName/' + nk, uid); throw err; }
    const u = { id: uid, ...user };
    L.setSession(req, res, u);
    return L.publicMe(u);
  },

  /* POST /api/auth/login {email,password} */
  'POST /auth/login': async (req, res, { body }) => {
    const email = String(body.email || '').trim().toLowerCase(), pw = body.password;
    if (typeof pw !== 'string' || !pw || pw.length > 128 || !email || email.length > 60) throw new HttpError(400, FAKE_CRED_ERR);
    L.rateLimit('li:' + L.clientIp(req), 20, 300_000);
    L.rateLimit('lie:' + L.emailKey(email), 10, 300_000);
    const uid = await L.val('usersByEmail/' + L.emailKey(email));
    const user = uid ? await L.val('users/' + uid) : null;
    const ok = await L.verifyPassword(pw, (user && user.passwordHash) || (await L.dummyHash()));
    if (!user || !user.passwordHash || !ok) throw new HttpError(401, 'sai thông tin');
    const u = { id: uid, ...user };
    L.setSession(req, res, u);
    return L.publicMe(u);
  },

  /* POST /api/auth/google {credential} — credential là Google ID token */
  'POST /auth/google': async (req, res, { body }) => {
    L.rateLimit('go:' + L.clientIp(req), 30, 300_000);
    const p = await L.verifyGoogle(body.credential);
    const ek = L.emailKey(p.email), devKeys = L.devEmailKeys();
    let uid = await L.val('googleSub/' + p.sub), user = uid ? await L.val('users/' + uid) : null;
    let u;
    if (user) {
      u = { id: uid, ...user };
    } else {
      const euid = await L.val('usersByEmail/' + ek);
      if (euid) {
        // Gmail trùng với tài khoản mật khẩu cũ: Google đã chứng minh quyền sở hữu Gmail ⇒ liên kết,
        // đồng thời vô hiệu mật khẩu cũ + mọi phiên cũ (phòng người khác đã đăng ký trước bằng Gmail này).
        const eu = await L.val('users/' + euid);
        if (!eu) throw new HttpError(500, 'dữ liệu tài khoản không nhất quán');
        if (eu.googleSub && eu.googleSub !== p.sub) throw new HttpError(409, 'Gmail đã liên kết với tài khoản Google khác');
        if (!(await L.reserve('googleSub/' + p.sub, euid)) && (await L.val('googleSub/' + p.sub)) !== euid) throw new HttpError(409, 'xung đột liên kết');
        const upd = { googleSub: p.sub };
        if (eu.passwordHash) { upd.passwordHash = null; upd.sv = (eu.sv || 0) + 1; }
        await L.db().ref('users/' + euid).update(upd);
        u = { id: euid, ...eu, ...upd };
        if (upd.passwordHash === null) delete u.passwordHash;
      } else {
        u = await newUserFromGoogle(p, devKeys);
      }
    }
    if (devKeys.has(ek) && u.role !== 'dev') { await L.db().ref('users/' + u.id + '/role').set('dev'); u.role = 'dev'; }
    L.setSession(req, res, u);
    return L.publicMe(u);
  },

  /* POST /api/auth/logout */
  'POST /auth/logout': async (req, res) => { L.clearSession(req, res); return { ok: true }; },

  /* GET /api/me */
  'GET /me': async (req) => {
    const u = await L.sessionUser(req);
    if (!u) throw new HttpError(401, 'chưa đăng nhập');
    return L.publicMe(u);
  },

  /* POST /api/me/link-google {credential} — gắn Gmail vào tài khoản đang đăng nhập */
  'POST /me/link-google': async (req, res, { body }) => {
    const u = await L.sessionUser(req);
    if (!u) throw new HttpError(401, 'chưa đăng nhập');
    const p = await L.verifyGoogle(body.credential);
    if (u.googleSub && u.googleSub !== p.sub) throw new HttpError(409, 'Tài khoản đã liên kết với Google khác');
    if (!(await L.reserve('googleSub/' + p.sub, u.id)) && (await L.val('googleSub/' + p.sub)) !== u.id) throw new HttpError(409, 'Google này đã gắn với tài khoản khác');
    await L.db().ref('users/' + u.id + '/googleSub').set(p.sub);
    return { googleLinked: true };
  },

  /* POST /api/me/name {name} */
  'POST /me/name': async (req, res, { body }) => {
    const u = await L.sessionUser(req);
    if (!u) throw new HttpError(401, 'chưa đăng nhập');
    const name = String(body.name || '').trim(), e = L.vName(name);
    if (e) throw new HttpError(400, e);
    const nk = L.nameKey(name);
    if (nk !== u.nameKey) {
      if (!(await L.reserve('usersByName/' + nk, u.id))) throw new HttpError(409, 'tên đã có người dùng');
      await L.db().ref('users/' + u.id).update({ name, nameKey: nk });
      if (u.nameKey) await L.release('usersByName/' + u.nameKey, u.id);
    } else {
      await L.db().ref('users/' + u.id + '/name').set(name);
    }
    return L.publicMe({ ...u, name, nameKey: nk });
  },

  /* POST /api/me/profile {pic,bio} */
  'POST /me/profile': async (req, res, { body }) => {
    const u = await L.sessionUser(req);
    if (!u) throw new HttpError(401, 'chưa đăng nhập');
    const bio = String(body.bio || '').slice(0, 300), pic = String(body.pic || '');
    if (pic && !/^img:[\w-]{1,40}$/.test(pic) && !/^https:\/\/[^\s]{1,480}$/.test(pic)) throw new HttpError(400, 'ảnh đại diện không hợp lệ');
    await L.db().ref('users/' + u.id).update({ bio, pic });
    return L.publicMe({ ...u, bio, pic });
  },

  /* POST /api/me/password {current,password} — tài khoản chỉ có Google (chưa có mật khẩu) không cần "current" */
  'POST /me/password': async (req, res, { body }) => {
    const u = await L.sessionUser(req);
    if (!u) throw new HttpError(401, 'chưa đăng nhập');
    L.rateLimit('pw:' + u.id, 8, 300_000);
    if (u.passwordHash) {
      if (typeof body.current !== 'string' || !(await L.verifyPassword(body.current, u.passwordHash))) throw new HttpError(401, 'sai mật khẩu hiện tại');
    }
    const e = L.vPassword(body.password);
    if (e) throw new HttpError(400, e);
    const upd = { passwordHash: await L.hashPassword(body.password), sv: (u.sv || 0) + 1 };
    await L.db().ref('users/' + u.id).update(upd);
    const nu = { ...u, ...upd };
    L.setSession(req, res, nu); // phiên hiện tại sống tiếp, các phiên khác bị thu hồi
    return L.publicMe(nu);
  },
};

module.exports = async (req, res) => {
  const send = (status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    if (method !== 'GET') {
      // Chống CSRF: bắt buộc header tùy biến (frontend luôn gửi) và Origin phải cùng host nếu có.
      const origin = req.headers.origin;
      if (req.headers['x-skibidi'] !== '1') throw new HttpError(403, 'thiếu header xác thực yêu cầu');
      if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'origin không hợp lệ');
    }
    const h = routes[method + ' ' + path];
    if (!h) {
      const known = Object.keys(routes).some((k) => k.split(' ')[1] === path);
      return send(known ? 405 : 404, { error: known ? 'method không được hỗ trợ' : 'endpoint chưa được triển khai: ' + path });
    }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== 'object') body = {};
    const out = await h(req, res, { body, url });
    send(200, out);
  } catch (e) {
    if (e instanceof HttpError) return send(e.status, { error: e.message });
    console.error('[api] lỗi không mong đợi:', e && e.stack || e); // không log body/mật khẩu/token
    send(500, { error: 'lỗi máy chủ' });
  }
};
