/* ===== Kích hoạt tài khoản (cửa sổ riêng) — dành cho người đăng nhập bằng Google =====
   Đăng nhập Google chỉ để xem. Khi cần đăng bài / thả tim / chat, người dùng đặt tên + mật khẩu một lần để có tài khoản đầy đủ. */
function openActivate() {
  if (!me || !me.google) return;
  $("acName").value = (me.name || "").replace(/[^\p{L}\p{N}_]/gu, "").slice(0, 24);
  $("acEmail").value = me.email || "";
  $("acPw").value = ""; $("acPw2").value = ""; setMsg("acMsg", "");
  openM($("mAct"));
}
async function submitActivate() {
  const name = $("acName").value.trim(), pw = $("acPw").value, pw2 = $("acPw2").value, email = String(me.email || "").toLowerCase();
  const err = vName(name) || pwErr(pw) || (pw !== pw2 ? t("act.same") : "");
  if (err) return setMsg("acMsg", err, "bad");
  const btn = $("acGo"); btn.disabled = true; setMsg("acMsg", t("act.wait"));
  try {
    if (!fbInit()) throw fbErr(0, t("fb.noload"));
    const owner = await dbGet(nameKey(name)).catch(() => null);
    if (owner) throw fbErr(409, t("auth.nametaken"));
    let u; try { u = (await fbAuth.createUserWithEmailAndPassword(email, pw)).user; } catch (x) { throw mapFb(x); }
    try { await claimName(name, u.uid); } catch (x) { await u.delete().catch(() => {}); throw x; }
    try { await fbDb.ref("pub/users/" + u.uid).set(clean({ name, pic: /^https:/.test(me.pic || "") ? me.pic : "", bio: "", createdAt: TS() })); } catch (x) { console.warn("[profile]", x); }
    try { await u.updateProfile({ displayName: name }); } catch (x) {}
    try { localStorage.removeItem(GKEY); } catch (x) {}
    me = await fbMe(u); myVotes = {};
    renderAuth(); closeM($("mAct")); toast(t("act.ok")); route();
  } catch (x) { setMsg("acMsg", x.message, "bad"); }
  btn.disabled = false;
}
;(window.__ok = window.__ok || []).push("app-activate.js");
