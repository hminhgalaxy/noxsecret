/* Lõi xử lý của /api/account (không phụ thuộc Vercel/Firebase thật → kiểm thử được bằng đối tượng giả).
   deps = { auth, db, sendMail, env, now, randomInt }
   - auth: verifyIdToken, getUser, getUserByEmail, setCustomUserClaims, updateUser, revokeRefreshTokens,
           generateEmailVerificationLink, generatePasswordResetLink, generateVerifyAndChangeEmailLink
   - db:   get(path), set(path, v), update(path, o), remove(path)
   - sendMail({ to, subject, html, text }); verifyPassword(email, password) → boolean */
const crypto = require("crypto");
const T = require("./templates");

const PERM = T.PERM, MIN = 60 * 1000, HOUR = 60 * MIN;
const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,255}\.[^\s@<>"']{2,}$/;
const ok = (o) => ({ status: 200, body: Object.assign({ ok: true }, o || {}) });
const fail = (status, code, message) => ({ status, body: { ok: false, code, message } });
const lc = s => String(s || "").trim().toLowerCase();
const key = s => String(s).replace(/[.#$\[\]\/]/g, "_");
const sha = s => crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 24);
const oob = link => { try { return new URL(link).searchParams.get("oobCode"); } catch (_) { return null; } };

function createApi(deps) {
  const { auth, db, sendMail } = deps;
  const env = deps.env || {};
  const now = deps.now || (() => Date.now());
  const rnd = deps.randomInt || ((a, b) => crypto.randomInt(a, b));
  const DEV = lc(env.DEV_EMAIL || "hminhgalaxy@gmail.com");
  const SITE = (env.SITE_URL || T.SITE).replace(/\/+$/, "");
  const salt = env.CODE_SALT || "skibidiscript";
  const configured = () => !!(auth && db && sendMail);
  const actionLink = (mode, code) => SITE + "/auth/action?mode=" + mode + "&oobCode=" + encodeURIComponent(code);
  const hashCode = (uid, purpose, code) => crypto.createHmac("sha256", salt).update(uid + "|" + purpose + "|" + code).digest("hex");
  const strongPw = p => typeof p === "string" && p.length >= 8 && p.length <= 200 && /[A-Za-z]/.test(p) && /\d/.test(p);
  /* Chỉ lưu dấu vân tay (HMAC) của dải IP, không lưu IP thật. IPv4: /24, IPv6: 3 nhóm đầu. */
  const ipPrefix = ip => { ip = String(ip || "").trim(); if (!ip) return ""; return ip.includes(":") ? ip.split(":").slice(0, 3).join(":") : ip.split(".").slice(0, 3).join("."); };
  const fpOf = ip => { const p = ipPrefix(ip); return p ? crypto.createHmac("sha256", salt).update("ip|" + p).digest("hex").slice(0, 16) : ""; };
  const placeOf = geo => { const g = geo || {}; return [g.city, g.country].filter(Boolean).join(", "); };
  async function trustIp(u, ip, geo) {
    const fp = fpOf(ip); if (!fp) return;
    const known = Object.assign({}, u.sec.known || {}); known[fp] = { ts: now(), c: String((geo && geo.country) || "").slice(0, 2) };
    const keys = Object.keys(known).sort((a, b) => (known[b].ts || 0) - (known[a].ts || 0)).slice(0, 10), out = {}; keys.forEach(k => { out[k] = known[k]; });
    await db.update("nox_security/" + u.uid, { known: out });
  }
  const mail = async (to, tpl) => { await sendMail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text }); };

  async function limit(k, max, windowMs) {
    const p = "nox_rate/" + key(k), r = (await db.get(p)) || {}, t = now();
    if (!r.t || t - r.t > windowMs) { await db.set(p, { n: 1, t }); return true; }
    if (r.n >= max) return false;
    await db.update(p, { n: r.n + 1 }); return true;
  }
  async function who(token, { needVerifiedSession = false } = {}) {
    if (!token) return { err: fail(401, "unauthenticated", "Please sign in.") };
    let d; try { d = await auth.verifyIdToken(token); } catch (_) { return { err: fail(401, "unauthenticated", "Your session expired. Please sign in again.") }; }
    if (d.firebase && d.firebase.sign_in_provider === "anonymous") return { err: fail(403, "guest", "Guests can't use this.") };
    const u = { uid: d.uid, email: lc(d.email), verified: d.email_verified === true, authTime: d.auth_time, provider: d.firebase && d.firebase.sign_in_provider, claims: d };
    u.sec = (await db.get("nox_security/" + u.uid)) || {};
    u.sessionOk = !(u.sec.twofa || u.sec.gate) || [d.tf1, d.tf2, d.tf3].includes(d.auth_time);
    if (needVerifiedSession && !u.sessionOk) return { err: fail(403, "twofa_required", "Enter your two-step verification code first.") };
    return { u };
  }
  const nameOf = async uid => { try { const r = await auth.getUser(uid); return r.displayName || ""; } catch (_) { return ""; } };
  const nameOfProfile = async uid => (await db.get("nox_users/" + uid + "/name")) || "";

  async function issueCode(u, purpose, to, tplName, extra) {
    const slot = "nox_codes/" + u.uid + "/" + purpose, cur = await db.get(slot), t = now();
    if (cur && cur.sentAt && cur.to === lc(to) && t - cur.sentAt < 30 * 1000) return fail(429, "too_fast", "Please wait a few seconds before asking for another code.");
    if (!(await limit("code:" + u.uid, 8, HOUR))) return fail(429, "rate_limited", "Too many codes requested. Try again in a while.");
    const code = String(rnd(0, 1e6)).padStart(6, "0");
    await db.set(slot, { hash: hashCode(u.uid, purpose, code), exp: t + 10 * MIN, tries: 0, sentAt: t, to: lc(to) });
    await mail(to, T.render(tplName, Object.assign({ name: await nameOfProfile(u.uid) || await nameOf(u.uid), code, minutes: 10, accountEmail: u.email }, extra)));
    return ok({ sentTo: mask(to) });
  }
  async function checkCode(u, purpose, code) {
    const slot = "nox_codes/" + u.uid + "/" + purpose, c = await db.get(slot);
    if (!c || c.exp < now()) return { err: fail(400, "code_expired", "That code has expired. Request a new one.") };
    if (c.tries >= 5) { await db.remove(slot); return { err: fail(429, "too_many_tries", "Too many wrong attempts. Request a new code.") }; }
    const given = String(code || "").replace(/\s+/g, "");
    const a = Buffer.from(hashCode(u.uid, purpose, given)), b = Buffer.from(c.hash);
    if (!/^\d{6}$/.test(given) || a.length !== b.length || !crypto.timingSafeEqual(a, b)) { await db.update(slot, { tries: c.tries + 1 }); return { err: fail(400, "wrong_code", "That code isn't right. Check it and try again.") }; }
    await db.remove(slot); return { c };
  }
  function mask(e) { const [l, d] = String(e).split("@"); return (l.length <= 2 ? l[0] + "*" : l[0] + "*".repeat(Math.min(l.length - 2, 6)) + l[l.length - 1]) + "@" + d; }
  async function grantSession(u) {
    let cl = {}; try { cl = (await auth.getUser(u.uid)).customClaims || {}; } catch (_) {}
    const list = [u.authTime, cl.tf1, cl.tf2, cl.tf3].filter((x, i, a) => typeof x === "number" && a.indexOf(x) === i).slice(0, 3);
    await auth.setCustomUserClaims(u.uid, { tf1: list[0], tf2: list[1], tf3: list[2] });
  }

  const A = {
    async status() { return ok({ mail: configured(), twofa: configured(), problems: deps.diagnose ? deps.diagnose().map(x => x.msg) : [] }); },
    async "mail-check"({ token }) {
      const { err } = await devOnly(token); if (err) return err;
      return ok({ checks: deps.liveCheck ? await deps.liveCheck() : [], problems: deps.diagnose ? deps.diagnose().map(x => x.msg) : [] });
    },

    async "verify-email"({ token }) {
      const { u, err } = await who(token); if (err) return err;
      if (u.verified) return ok({ already: true });
      if (u.provider !== "password") return fail(400, "not_password", "This account doesn't use an email and password.");
      if (!(await limit("verify:" + u.uid, 5, HOUR))) return fail(429, "rate_limited", "Too many emails. Try again in a while.");
      const link = await auth.generateEmailVerificationLink(u.email);
      await mail(u.email, T.render("verifyEmail", { name: await nameOf(u.uid), email: u.email, url: actionLink("verifyEmail", oob(link)) }));
      return ok();
    },
    async welcome({ token }) {
      const { u, err } = await who(token); if (err) return err;
      if (u.sec.welcomed) return ok({ already: true });
      await db.update("nox_security/" + u.uid, { welcomed: now() });
      await mail(u.email, T.render("welcome", { name: await nameOf(u.uid) }));
      return ok();
    },
    /* Đặt lại mật khẩu bằng MÃ gửi qua email. Không bao giờ tiết lộ email có tồn tại hay không: luôn trả ok. */
    async reset({ body, ip }) {
      const email = lc(body.email); if (!EMAIL_RE.test(email)) return fail(400, "invalid_email", "Enter a valid email address.");
      if (!(await limit("reset:" + sha(email), 5, HOUR)) || !(await limit("resetip:" + sha(ip || "?"), 30, HOUR))) return fail(429, "rate_limited", "Too many requests. Try again in a while.");
      try {
        const r = await auth.getUserByEmail(email);
        if (r && !r.disabled) {
          const hasPw = (r.providerData || []).some(p => p.providerId === "password");
          if (hasPw) await issueCode({ uid: r.uid, email }, "reset", email, "resetCode", { name: r.displayName || "" });
          else await mail(email, T.render("googleOnly", { name: r.displayName || "" }));
        }
      } catch (_) {}
      return ok();
    },
    async recover({ body, ip }) {
      const email = lc(body.email); if (!EMAIL_RE.test(email)) return fail(400, "invalid_email", "Enter a valid email address.");
      if (!(await limit("recover:" + sha(email), 3, HOUR)) || !(await limit("resetip:" + sha(ip || "?"), 30, HOUR))) return fail(429, "rate_limited", "Too many requests. Try again in a while.");
      try {
        const r = await auth.getUserByEmail(email); const sec = r && !r.disabled ? await db.get("nox_security/" + r.uid) : null;
        if (sec && sec.recovery && sec.recovery.verified && (r.providerData || []).some(p => p.providerId === "password"))
          await issueCode({ uid: r.uid, email }, "reset", sec.recovery.email, "recoverCode", { name: r.displayName || "", accountEmail: email });
      } catch (_) {}
      return ok();
    },
    /* Nhập mã + mật khẩu mới → đổi mật khẩu (không cần đăng nhập). */
    async "reset-confirm"({ body, ip }) {
      const email = lc(body.email); if (!EMAIL_RE.test(email)) return fail(400, "invalid_email", "Enter a valid email address.");
      if (!(await limit("resetconf:" + sha(email), 12, HOUR)) || !(await limit("resetconfip:" + sha(ip || "?"), 60, HOUR))) return fail(429, "rate_limited", "Too many attempts. Try again in a while.");
      if (!strongPw(body.password)) return fail(400, "weak_password", "Use at least 8 characters, with letters and numbers.");
      let r; try { r = await auth.getUserByEmail(email); } catch (_) { return fail(400, "code_expired", "That code has expired. Request a new one."); }
      if (!r || r.disabled || !(r.providerData || []).some(p => p.providerId === "password")) return fail(400, "code_expired", "That code has expired. Request a new one.");
      const c = await checkCode({ uid: r.uid }, "reset", body.code); if (c.err) return c.err;
      await auth.updateUser(r.uid, Object.assign({ password: body.password }, c.c.to === email ? { emailVerified: true } : {}));
      await auth.revokeRefreshTokens(r.uid);
      try { await mail(email, T.render("passwordChangedAlert", { name: r.displayName || "" })); } catch (_) {}
      return ok();
    },
    /* Đổi mật khẩu khi đang đăng nhập: cần mật khẩu hiện tại + mã gửi về email. */
    async "password-code-send"({ token }) {
      const { u, err } = await who(token, { needVerifiedSession: true }); if (err) return err;
      if (u.provider !== "password") return fail(400, "not_password", "Your account signs in with Google, so there's no password to change here.");
      if (!u.verified) return fail(403, "unverified", "Verify your email first.");
      return issueCode(u, "password", u.email, "passwordCode");
    },
    async "password-change"({ token, body, geo }) {
      const { u, err } = await who(token, { needVerifiedSession: true }); if (err) return err;
      if (u.provider !== "password") return fail(400, "not_password", "Your account signs in with Google, so there's no password to change here.");
      if (!u.verified) return fail(403, "unverified", "Verify your email first.");
      if (!(await limit("pwchg:" + u.uid, 8, HOUR))) return fail(429, "rate_limited", "Too many attempts. Try again in a while.");
      if (typeof body.currentPassword !== "string" || !body.currentPassword || !(await deps.verifyPassword(u.email, body.currentPassword))) return fail(403, "wrong_password", "That password isn't right.");
      if (!strongPw(body.password)) return fail(400, "weak_password", "Use at least 8 characters, with letters and numbers.");
      if (body.password === body.currentPassword) return fail(400, "same_password", "Choose a password you haven't used here before.");
      const c = await checkCode(u, "password", body.code); if (c.err) return c.err;
      await auth.updateUser(u.uid, { password: body.password }); await auth.revokeRefreshTokens(u.uid);
      try { await mail(u.email, T.render("passwordChangedAlert", { name: await nameOfProfile(u.uid) || await nameOf(u.uid), place: placeOf(geo) })); } catch (_) {}
      return ok({ relogin: true });
    },
    /* Gọi ngay sau mỗi lần đăng nhập: cấp "thẻ phiên" tự động nếu IP quen và không bật 2 bước; ngược lại yêu cầu mã. */
    async "login-check"({ token, ip, geo }) {
      const { u, err } = await who(token); if (err) return err;
      if (!u.verified) return ok({ need: null, skipped: "unverified" });
      const fp = fpOf(ip), known = u.sec.known || {}, first = Object.keys(known).length === 0, newIp = !!fp && !first && !known[fp];
      if (!u.sec.gate) await db.update("nox_security/" + u.uid, { gate: true });
      if (u.sessionOk && u.sec.gate) return ok({ need: null });
      if (u.sec.twofa) return ok({ need: "twofa" });
      if (newIp) return ok({ need: "new_ip", place: placeOf(geo) });
      if (first) await trustIp(u, ip, geo);
      await grantSession(u); return ok({ need: null, refresh: true });
    },

    /* Xác nhận bằng mật khẩu hiện tại (kiểm tra qua REST, không làm đổi phiên đăng nhập của người dùng). */
    async "change-email"({ token, body }) {
      const { u, err } = await who(token, { needVerifiedSession: true }); if (err) return err;
      if (u.provider !== "password") return fail(400, "not_password", "Your account signs in with Google, so its email can't be changed here.");
      if (!u.verified) return fail(403, "unverified", "Verify your current email first.");
      if (!(await limit("chgpw:" + u.uid, 6, HOUR))) return fail(429, "rate_limited", "Too many attempts. Try again in a while.");
      if (typeof body.password !== "string" || !body.password || !(await deps.verifyPassword(u.email, body.password))) return fail(403, "wrong_password", "That password isn't right.");
      const to = lc(body.newEmail); if (!EMAIL_RE.test(to)) return fail(400, "invalid_email", "Enter a valid email address.");
      if (to === u.email) return fail(400, "same_email", "That's already your email.");
      if (!(await limit("chg:" + u.uid, 3, HOUR))) return fail(429, "rate_limited", "Too many attempts. Try again in a while.");
      try { await auth.getUserByEmail(to); return fail(409, "email_taken", "That email is already used by another account."); } catch (e) { if (e && e.code && e.code !== "auth/user-not-found") throw e; }
      const link = await auth.generateVerifyAndChangeEmailLink(u.email, to), name = await nameOf(u.uid);
      await mail(to, T.render("changeEmail", { name, newEmail: to, url: actionLink("verifyAndChangeEmail", oob(link)) }));
      try { await mail(u.email, T.render("changeEmailNotice", { name, newEmail: to })); } catch (_) {}
      return ok({ sentTo: mask(to) });
    },
    async "password-changed"({ token }) {
      const { u, err } = await who(token); if (err) return err;
      if (!(await limit("pwn:" + u.uid, 3, HOUR))) return ok();
      await mail(u.email, T.render("passwordChanged", { name: await nameOf(u.uid) })); return ok();
    },

    /* ───── Xác minh 2 bước bằng mã gửi qua email ───── */
    async "twofa-send"({ token, body, geo }) {
      const purpose = body.purpose, { u, err } = await who(token); if (err) return err;
      if (!u.verified) return fail(403, "unverified", "Verify your email first.");
      const to = u.email;
      if (purpose === "enable") { if (u.sec.twofa) return fail(400, "already_on", "Two-step verification is already on."); return issueCode(u, "enable", to, "enableCode"); }
      if (purpose === "login") { if (!(u.sec.twofa || u.sec.gate)) return fail(400, "not_on", "Two-step verification isn't on."); return issueCode(u, "login", to, u.sec.twofa ? "loginCode" : "newLocationCode", { place: placeOf(geo) }); }
      if (purpose === "recovery-login") {
        if (!(u.sec.twofa || u.sec.gate)) return fail(400, "not_on", "Two-step verification isn't on.");
        if (!u.sec.recovery || !u.sec.recovery.verified) return fail(400, "no_recovery", "You haven't set up a recovery email.");
        return issueCode(u, "login", u.sec.recovery.email, "recoveryLoginCode");
      }
      if (purpose === "disable") { if (!u.sessionOk) return fail(403, "twofa_required", "Enter your two-step verification code first."); if (!u.sec.twofa) return fail(400, "not_on", "Two-step verification isn't on."); return issueCode(u, "disable", to, "disableCode"); }
      return fail(400, "bad_request", "Unknown request.");
    },
    async "twofa-verify"({ token, body, ip, geo }) {
      const purpose = body.purpose === "recovery-login" ? "login" : body.purpose;
      if (!["login", "enable", "disable"].includes(purpose)) return fail(400, "bad_request", "Unknown request.");
      const { u, err } = await who(token); if (err) return err;
      if (purpose === "login" && !(u.sec.twofa || u.sec.gate)) return fail(400, "not_on", "Two-step verification isn't on.");
      if (purpose === "disable" && !u.sessionOk) return fail(403, "twofa_required", "Enter your two-step verification code first.");
      const r = await checkCode(u, purpose, body.code); if (r.err) return r.err;
      if (purpose === "login") { await grantSession(u); try { await trustIp(u, ip, geo); } catch (_) {} return ok({ refresh: true }); }
      const name = await nameOfProfile(u.uid) || await nameOf(u.uid);
      if (purpose === "enable") { await grantSession(u); await db.update("nox_security/" + u.uid, { twofa: true, gate: true, twofaAt: now() }); try { await mail(u.email, T.render("twofaEnabled", { name })); } catch (_) {} return ok({ refresh: true, twofa: true }); }
      await db.update("nox_security/" + u.uid, { twofa: false }); try { await mail(u.email, T.render("twofaDisabled", { name })); } catch (_) {} return ok({ refresh: true, twofa: false });
    },

    /* ───── Email khôi phục ───── */
    async "recovery-start"({ token, body }) {
      const { u, err } = await who(token, { needVerifiedSession: true }); if (err) return err;
      if (!u.verified) return fail(403, "unverified", "Verify your email first.");
      const to = lc(body.email); if (!EMAIL_RE.test(to)) return fail(400, "invalid_email", "Enter a valid email address.");
      if (to === u.email) return fail(400, "same_email", "The recovery email must be different from your sign-in email.");
      return issueCode(u, "recovery", to, "recoveryCode");
    },
    async "recovery-confirm"({ token, body }) {
      const { u, err } = await who(token, { needVerifiedSession: true }); if (err) return err;
      const r = await checkCode(u, "recovery", body.code); if (r.err) return r.err;
      await db.update("nox_security/" + u.uid, { recovery: { email: r.c.to, verified: true, at: now() } });
      try { await mail(u.email, T.render("recoveryAdded", { name: await nameOfProfile(u.uid) || await nameOf(u.uid), recoveryEmail: r.c.to })); } catch (_) {}
      return ok({ email: r.c.to });
    },
    async "recovery-remove"({ token }) {
      const { u, err } = await who(token, { needVerifiedSession: true }); if (err) return err;
      if (!u.sec.recovery) return ok();
      await db.remove("nox_security/" + u.uid + "/recovery");
      try { await mail(u.email, T.render("recoveryRemoved", { name: await nameOfProfile(u.uid) || await nameOf(u.uid) })); } catch (_) {}
      return ok();
    },

    /* ───── Chỉ DEV ───── */
    async moderate(ctx) {
      const { u, err } = await devOnly(ctx.token); if (err) return err;
      const b = ctx.body, uid = String(b.uid || ""), op = b.op;
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return fail(400, "bad_request", "Missing user.");
      let target; try { target = await auth.getUser(uid); } catch (_) { return fail(404, "not_found", "User not found."); }
      if (lc(target.email) === DEV) return fail(400, "bad_request", "You can't moderate the owner account.");
      const t = now(), reason = String(b.reason || "").slice(0, 200), until = Number(b.until) || 0, base = { by: u.email.slice(0, 200), ts: t };
      const prev = (await db.get("nox_admin/" + uid)) || {}, patch = {}, name = (await nameOfProfile(uid)) || target.displayName || "";
      let tpl = null;
      if (op === "role") { patch.role = "editor"; tpl = "roleGranted"; }
      else if (op === "unrole") { patch.role = "user"; tpl = "roleRemoved"; }
      else if (op === "mute") { if (!(until > t)) return fail(400, "bad_request", "Pick a duration."); patch.muteUntil = until; patch.muteReason = reason; tpl = "muted"; }
      else if (op === "unmute") { patch.muteUntil = null; patch.muteReason = null; tpl = "unmuted"; }
      else if (op === "ban") { if (!(until > t)) return fail(400, "bad_request", "Pick a duration."); patch.banUntil = until; patch.banReason = reason; tpl = "banned"; }
      else if (op === "unban") { patch.banUntil = null; patch.banReason = null; tpl = "unbanned"; }
      else return fail(400, "bad_request", "Unknown action.");
      await db.update("nox_admin/" + uid, Object.assign({}, patch, base));
      if (op === "ban") { if (until >= PERM) await auth.updateUser(uid, { disabled: true }); await auth.revokeRefreshTokens(uid); }
      if (op === "unban" && target.disabled) await auth.updateUser(uid, { disabled: false });
      let emailed = false;
      if (target.email) { try { await mail(target.email, T.render(tpl, { name, until, reason })); emailed = true; } catch (_) {} }
      return ok({ emailed, prev: Object.keys(prev).length > 0 });
    },
    async "dev-templates"({ token }) { const { err } = await devOnly(token); if (err) return err; return ok({ replies: T.REPLIES, system: Object.keys(T.SYSTEM) }); },
    async "dev-preview"({ token, body }) {
      const { err } = await devOnly(token); if (err) return err;
      const r = body.type === "custom" ? T.custom({ subject: body.subject, body: body.body, name: body.name || T.SAMPLE.name }) : T.preview(String(body.type));
      return r ? ok({ subject: r.subject, html: r.html }) : fail(404, "not_found", "Unknown template.");
    },
    async "dev-send"({ token, body }) {
      const { u, err } = await devOnly(token); if (err) return err;
      if (!(await limit("devmail:" + u.uid, 40, HOUR))) return fail(429, "rate_limited", "Hourly sending limit reached.");
      let to = lc(body.to), name = String(body.name || "");
      if (body.uid) { try { const r = await auth.getUser(String(body.uid)); to = lc(r.email); name = name || (await nameOfProfile(r.uid)) || r.displayName || ""; } catch (_) { return fail(404, "not_found", "User not found."); } }
      if (!EMAIL_RE.test(to)) return fail(400, "invalid_email", "Enter a valid email address.");
      if (body.test === true) to = u.email;
      let tpl;
      if (body.template === "custom" || body.template == null) { if (!String(body.body || "").trim()) return fail(400, "bad_request", "Write a message first."); tpl = T.custom({ subject: body.subject, body: body.body, name }); }
      else tpl = T.preview(String(body.template));
      if (!tpl) return fail(404, "not_found", "Unknown template.");
      await mail(to, tpl); return ok({ sentTo: mask(to) });
    }
  };
  async function devOnly(token) {
    const r = await who(token); if (r.err) return r;
    if (!(r.u.verified && r.u.email === DEV)) return { err: fail(403, "forbidden", "Only the website owner can do this.") };
    if (!r.u.sessionOk) return { err: fail(403, "twofa_required", "Enter your two-step verification code first.") };
    return r;
  }

  /* Điểm vào: req = { action, body, token, ip } → { status, body } */
  return async function handle(req) {
    const action = String(req.action || "");
    if (!Object.prototype.hasOwnProperty.call(A, action)) return fail(400, "bad_request", "Unknown request.");
    if (action !== "status" && !configured()) return fail(501, "not_configured", "The email service isn't set up yet.");
    /* Tường lửa lớp ứng dụng: mỗi IP tối đa 240 yêu cầu / 10 phút (chặn dồn dập); chi tiết từng hành động còn có giới hạn riêng. */
    if (req.ip && action !== "status" && !(await limit("ipall:" + sha(req.ip), 240, 10 * 60 * 1000))) return fail(429, "rate_limited", "Too many requests. Slow down and try again in a few minutes.");
    try { return await A[action]({ token: req.token, body: req.body || {}, ip: req.ip, geo: req.geo || {} }); }
    catch (e) { console.error("account:" + action, e && e.code, e && e.message); if (e && e.code === "mail_failed") return fail(502, "mail_failed", "We couldn't send the email right now. The site owner has been notified in the server log."); return fail(500, "server_error", "Something went wrong. Please try again."); }
  };
}
module.exports = { createApi, EMAIL_RE };
