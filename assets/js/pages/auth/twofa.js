/* Bước 2 khi đăng nhập: nhập mã 6 số được gửi qua email (hoặc qua email khôi phục). */
import { session, twofaSend, twofaVerify, signOut } from "../../lib/auth.js";
import { friendly } from "../../lib/messages.js";
import { navigate } from "../../lib/router.js";
import { esc } from "../../lib/util.js";
import { shell, busy, nextOf } from "./shared.js";

const mask = e => { const [l = "", d = ""] = String(e).split("@"); return (l.length <= 2 ? l.slice(0, 1) + "*" : l[0] + "*".repeat(Math.min(l.length - 2, 6)) + l.slice(-1)) + "@" + d; };

export function mount(ctx) {
  ctx.setPage({ hero: true, title: "Xác minh 2 bước", desc: "Nhập mã xác minh để hoàn tất đăng nhập." });
  const u = session.user, hasRec = !!(session.sec && session.sec.recovery && session.sec.recovery.verified);
  let purpose = "login", sentTo = mask((u && u.email) || ""), timer = null; ctx.cleanup(() => clearInterval(timer));
  const sub = () => "Nhập mã gồm 6 chữ số chúng tôi vừa gửi tới " + sentTo + ".";
  ctx.el.innerHTML = shell("Xác minh 2 bước", sub(), `<form id="f" novalidate class="form">
      <div class="field"><label for="code">Mã xác minh</label><input id="code" name="code" class="code-in" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000000" aria-describedby="codeErr"><p class="field-error" id="codeErr" data-err="code" role="alert"></p></div>
      <p class="form-error" id="err" role="alert" aria-live="polite"></p><p class="form-ok" id="ok" role="status"></p>
      <button class="btn primary lg block" type="submit">Xác minh</button>
    </form>
    <div class="tf-links"><button class="linkbtn" type="button" id="resend">Gửi lại mã</button>${hasRec ? `<button class="linkbtn" type="button" id="alt">Dùng email khôi phục</button>` : ""}</div>
    <p class="sub-note">Mã có hiệu lực trong 10 phút. Kiểm tra cả mục thư rác.</p>
    <p class="auth-foot"><button class="linkbtn" type="button" id="out">Đăng xuất</button></p>`);
  const $ = s => ctx.el.querySelector(s), f = $("#f"), err = $("#err"), ok = $("#ok"), codeErr = $("#codeErr"), btn = f.querySelector("button[type=submit]"), resend = $("#resend"), alt = $("#alt"), subEl = ctx.el.querySelector(".auth-sub");
  const cool = () => { let left = 30; resend.disabled = true; clearInterval(timer); resend.textContent = "Gửi lại sau " + left + "s"; timer = setInterval(() => { left--; if (left <= 0) { clearInterval(timer); resend.disabled = false; resend.textContent = "Gửi lại mã"; } else resend.textContent = "Gửi lại sau " + left + "s"; }, 1000); };
  async function send(first) {
    err.textContent = ""; ok.textContent = "";
    try { const r = await twofaSend(purpose); if (r.sentTo) sentTo = r.sentTo; subEl.textContent = sub(); if (!first) ok.textContent = "Đã gửi mã mới."; cool(); }
    catch (ex) { if (first && /too_fast/.test(ex.code || "")) { cool(); return; } err.textContent = friendly(ex); }
  }
  /* Tự gửi mã một lần cho mỗi phiên đăng nhập (tải lại trang không gửi lại) */
  const key = "ssw_2fa_sent", sig = (u ? u.uid : "") + "|" + ((u && u.metadata && u.metadata.lastSignInTime) || "");
  let already = false; try { already = sessionStorage.getItem(key) === sig; } catch (_) {}
  if (already) cool(); else { try { sessionStorage.setItem(key, sig); } catch (_) {} send(true); }
  resend.addEventListener("click", () => send(false));
  if (alt) alt.addEventListener("click", () => { purpose = purpose === "login" ? "recovery-login" : "login"; alt.textContent = purpose === "login" ? "Dùng email khôi phục" : "Dùng email đăng nhập"; sentTo = purpose === "login" ? mask((u && u.email) || "") : "email khôi phục của bạn"; subEl.textContent = sub(); send(false); });
  $("#out").addEventListener("click", async () => { try { await signOut(); } catch (_) {} navigate("/login", { replace: true }); });
  f.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; ok.textContent = ""; codeErr.textContent = "";
    const code = f.code.value.replace(/\s+/g, ""); if (!/^\d{6}$/.test(code)) { codeErr.textContent = "Nhập mã gồm 6 chữ số."; f.code.setAttribute("aria-invalid", "true"); f.code.focus(); return; }
    f.code.removeAttribute("aria-invalid"); busy(btn, true);
    try { await twofaVerify(purpose, code); try { sessionStorage.removeItem(key); } catch (_) {} navigate(nextOf(ctx) || "/", { replace: true }); }
    catch (ex) { err.textContent = friendly(ex); busy(btn, false); f.code.select(); }
  });
  f.code.focus();
}
