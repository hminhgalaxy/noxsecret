'use strict';
/* Thư viện dùng chung cho backend xác thực SkibidiScript (Vercel Serverless + Firebase Realtime Database).
   Không có bí mật nào nằm trong file này: tất cả lấy từ biến môi trường. */
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

const DEFAULT_DB_URL = 'https://noxgalaxy-2cd71-default-rtdb.asia-southeast1.firebasedatabase.app';
const SESSION_COOKIE = 'sk_session';
const SESSION_TTL_S = 30 * 24 * 3600;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/* ---------- Firebase Admin ---------- */
let _db = null;
function setDb(mock) { _db = mock; } // chỉ dùng cho kiểm thử
function db() {
  if (_db) return _db;
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    let cred;
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        cred = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
      } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        cred = admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
      }
    } catch (e) {
      console.error('[config] service account không hợp lệ:', e.message);
      throw new HttpError(500, 'cấu hình Firebase không hợp lệ');
    }
    if (!cred) {
      console.error('[config] thiếu FIREBASE_SERVICE_ACCOUNT (hoặc FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)');
      throw new HttpError(500, 'thiếu cấu hình Firebase');
    }
    admin.initializeApp({ credential: cred, databaseURL: process.env.FIREBASE_DATABASE_URL || DEFAULT_DB_URL });
  }
  _db = admin.database();
  return _db;
}
const val = async (path) => (await db().ref(path).once('value')).val();

/* Giữ chỗ một khóa duy nhất (email, tên, googleSub). Trả về true nếu giữ được. */
async function reserve(path, uid) {
  const r = await db().ref(path).transaction((cur) => (cur === null ? uid : undefined));
  return !!r.committed;
}
async function release(path, uid) {
  await db().ref(path).transaction((cur) => (cur === uid ? null : undefined));
}
async function nextUserId() {
  const r = await db().ref('meta/userCounter').transaction((cur) => (cur || 100000) + 1);
  return String(r.snapshot.val());
}

/* ---------- Kiểm tra dữ liệu (giống frontend) ---------- */
function vName(v) {
  if (typeof v !== 'string' || !v) return 'Chưa nhập tên hiển thị';
  if (/\s/.test(v)) return 'Tên không được chứa khoảng trắng';
  if (v.length < 3) return 'Tên cần ít nhất 3 ký tự';
  if (v.length > 24) return 'Tên tối đa 24 ký tự';
  if (!/^[\p{L}\p{N}_]+$/u.test(v)) return 'Tên chỉ gồm chữ, số và dấu gạch dưới';
  return '';
}
const nameKey = (n) => n.normalize('NFC').toLowerCase();

function vEmail(v) {
  if (typeof v !== 'string' || !v) return 'Chưa nhập Gmail';
  if (/\s/.test(v) || v.length > 60) return 'Gmail không hợp lệ';
  const p = v.split('@');
  if (p.length !== 2) return 'Gmail không hợp lệ';
  if (p[1] !== 'gmail.com') return 'Chỉ chấp nhận Gmail (@gmail.com)';
  if (p[0].length < 6 || p[0].length > 30) return 'Gmail không hợp lệ';
  if (!/^[a-z0-9.]+$/.test(p[0]) || /^\.|\.$|\.\./.test(p[0])) return 'Gmail không hợp lệ';
  return '';
}
function vPassword(p) {
  if (typeof p !== 'string' || !p) return 'Chưa nhập mật khẩu';
  if (p.length > 128) return 'Mật khẩu quá dài';
  if (/\s/.test(p)) return 'Mật khẩu không được chứa khoảng trắng';
  if (p.length < 8 || !/\p{Lu}/u.test(p) || !/[^\p{L}\p{N}\s]/u.test(p)) return 'Mật khẩu chưa đủ mạnh';
  return '';
}
/* Khóa email dùng chung: Gmail bỏ dấu chấm và phần +alias; thay "." vì Firebase không cho "." trong khóa. */
function emailKey(email) {
  const [l, d] = String(email).toLowerCase().trim().split('@');
  let local = l || '', dom = d || '';
  if (dom === 'gmail.com' || dom === 'googlemail.com') { local = local.split('+')[0].replace(/\./g, ''); dom = 'gmail.com'; }
  return (local + '@' + dom).replace(/[.$#[\]/]/g, ',');
}
const devEmailKeys = () =>
  new Set((process.env.DEV_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean).map(emailKey));

/* ---------- Mật khẩu (scrypt) ---------- */
const SCRYPT_N = 16384;
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = await scrypt(pw, salt, 64, { N: SCRYPT_N, r: 8, p: 1 });
  return `scrypt$${SCRYPT_N}$${salt.toString('base64')}$${h.toString('base64')}`;
}
async function verifyPassword(pw, stored) {
  try {
    const [alg, n, s, h] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const want = Buffer.from(h, 'base64');
    const got = await scrypt(pw, Buffer.from(s, 'base64'), want.length, { N: Number(n), r: 8, p: 1 });
    return got.length === want.length && crypto.timingSafeEqual(got, want);
  } catch { return false; }
}
let _dummy = null;
const dummyHash = async () => (_dummy ||= await hashPassword('dummy-Password!'));

/* ---------- Phiên đăng nhập: cookie HttpOnly ký HMAC ---------- */
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    console.error('[config] SESSION_SECRET thiếu hoặc ngắn hơn 32 ký tự');
    throw new HttpError(500, 'thiếu cấu hình phiên đăng nhập');
  }
  return s;
}
const b64u = (b) => Buffer.from(b).toString('base64url');
const mac = (body) => crypto.createHmac('sha256', secret()).update(body).digest('base64url');
function signSession(uid, sv) {
  const body = b64u(JSON.stringify({ u: uid, sv: sv || 0, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S }));
  return body + '.' + mac(body);
}
function readSession(token) {
  if (typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = Buffer.from(mac(body)), got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p && p.u && p.exp > Date.now() / 1000 ? p : null;
  } catch { return null; }
}
function parseCookies(h) {
  const o = {};
  String(h || '').split(';').forEach((c) => {
    const i = c.indexOf('=');
    if (i > 0) { try { o[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); } catch {} }
  });
  return o;
}
function cookieStr(req, value, maxAge) {
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(req.headers.host || '');
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${local ? '' : '; Secure'}`;
}
const setSession = (req, res, user) => res.setHeader('Set-Cookie', cookieStr(req, signSession(user.id, user.sv), SESSION_TTL_S));
const clearSession = (req, res) => res.setHeader('Set-Cookie', cookieStr(req, '', 0));

async function sessionUser(req) {
  const p = readSession(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
  if (!p) return null;
  const u = await val('users/' + p.u);
  if (!u || (u.sv || 0) !== p.sv) return null;
  return { id: p.u, ...u };
}

const publicMe = (u) => ({
  userId: u.id, name: u.name, pic: u.pic || '', bio: u.bio || '', role: u.role || 'user',
  email: u.email || '', googleLinked: !!u.googleSub, hasPassword: !!u.passwordHash,
});

/* ---------- Giới hạn tốc độ (theo từng instance, chỉ là lớp bảo vệ bổ sung) ---------- */
const hits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  let h = hits.get(key);
  if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
  if (++h.n > max) throw new HttpError(429, 'quá nhiều yêu cầu');
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
}
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();

/* ---------- Google ID token (xác minh phía server) ---------- */
async function verifyGoogle(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) { console.error('[config] thiếu GOOGLE_CLIENT_ID'); throw new HttpError(500, 'thiếu cấu hình Google'); }
  if (typeof credential !== 'string' || credential.length < 100 || credential.length > 4096) throw new HttpError(400, 'token Google không hợp lệ');
  let p;
  try {
    const { OAuth2Client } = require('google-auth-library');
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
    p = ticket.getPayload();
  } catch (e) {
    console.warn('[google] verifyIdToken thất bại:', e.message); // không log token
    throw new HttpError(401, 'Google token không hợp lệ hoặc đã hết hạn');
  }
  if (!p || !p.sub || !p.email) throw new HttpError(401, 'Google token thiếu thông tin');
  if (p.email_verified !== true) throw new HttpError(401, 'Gmail chưa được Google xác minh');
  return p;
}

module.exports = {
  HttpError, setDb, db, val, reserve, release, nextUserId,
  vName, nameKey, vEmail, vPassword, emailKey, devEmailKeys,
  hashPassword, verifyPassword, dummyHash,
  setSession, clearSession, sessionUser, publicMe, rateLimit, clientIp, verifyGoogle,
};
