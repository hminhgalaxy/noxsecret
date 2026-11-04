
import { esc, safeNext, toast } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import { signInEmail, signUpEmail, resetPassword, authErrMsg, renderGoogleButton } from "../lib/auth.js";
import { dlog } from "../lib/log.js";
import { mountTurnstile, verifyTurnstile } from "../lib/turnstile.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const next = ctx => safeNext(ctx.query.get("next"));
const withNext = (p, ctx) => { const n = next(ctx); return n ? p + "?next=" + encodeURIComponent(n) : p; };
const shell = (title, body) => `<div class="authwrap"><section class="authcard"><div class="authlogo" aria-hidden="true">${ICO.key}</div><p class="auth-eyebrow">SKIBIDI SCRIPT</p><h2>${esc(title)}</h2>${body}</section></div>`;
const pw = (id, label, ac) => `<div class="fld"><label for="${id}">${label}</label><div class="pw"><input id="${id}" name="${id}" type="password" autocomplete="${ac}" required><button class="eye" type="button" data-eye="${id}" aria-label="Hiện hoặc ẩn mật khẩu">${ICO.eye}</button></div><p class="ferr" data-err="${id}" role="alert"></p></div>`;
function wireEyes(root) { root.querySelectorAll("[data-eye]").forEach(b => b.addEventListener("click", () => { const i = root.querySelector("#" + b.dataset.eye); i.type = i.type === "password" ? "text" : "password"; })); }
function setErr(form, errs) {
  form.querySelectorAll(".ferr").forEach(e => { e.textContent = ""; });
  Object.keys(errs).forEach(k => { const e = form.querySelector(`[data-err="${k}"]`); if (e) e.textContent = errs[k]; });
  const f = Object.keys(errs)[0]; if (f && form.elements[f]) form.elements[f].focus();
}
function busy(btn, on, txt) { btn.disabled = on; const span=btn.querySelector("span"); if(span) span.textContent = on ? "Đang xử lý…" : txt; }
async function captcha(ctx, action, errNode) {
  const mount = ctx.el.querySelector("#turnstile");
  let widget;
  try { widget = await mountTurnstile(mount, action); }
  catch (e) { errNode.textContent = e.message || "Không tải được bước xác minh."; }
  ctx.cleanup(() => widget && widget.remove());
  return async () => {
    if (!widget) throw new Error("Không thể tải bước xác minh. Hãy tải lại trang.");
    await verifyTurnstile(widget, action);
  };
}
function captchaMarkup(){return `<div class="captcha-frame"><div id="turnstile"></div></div>`;}
function googleMarkup(){return `<div class="divider"><span>HOẶC</span></div><div class="gwrap" id="g"></div>`;}

export function login(ctx) {
  ctx.setPage({ hero:true, title:null }); document.title = "Đăng nhập · SKIBIDI SCRIPT WEB";
  const n = next(ctx);
  ctx.el.innerHTML = shell("Chào mừng trở lại", `${n ? `<p class="hint">Đăng nhập để tiếp tục.</p>` : `<p class="hint">Đăng nhập để tiếp tục khám phá.</p>`}
    <form id="f" novalidate class="stack">
      <div class="fld"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" placeholder="you@example.com" required><p class="ferr" data-err="email" role="alert"></p></div>
      ${pw("password","Mật khẩu","current-password")}
      <div class="auth-between"><a href="${withNext("/forgot-password",ctx)}">Quên mật khẩu?</a></div>
      ${captchaMarkup()}<p class="form-err" id="err" role="alert" aria-live="polite"></p>
      <button class="btn btn-p btn-wide" type="submit">${ICO.key}<span>Đăng nhập</span></button>
    </form>${googleMarkup()}<p class="gnote">Chưa có tài khoản? <a href="${withNext("/register",ctx)}">Tạo tài khoản</a></p>`);
  const f=ctx.el.querySelector("#f"), err=ctx.el.querySelector("#err"), btn=f.querySelector("button[type=submit]");
  wireEyes(ctx.el);
  const verifyPromise=captcha(ctx,"login",err);
  f.addEventListener("submit",async e=>{
    e.preventDefault();err.textContent="";const errs={},email=f.email.value.trim(),pass=f.password.value;
    if(!EMAIL_RE.test(email))errs.email="Email không hợp lệ.";
    if(!pass)errs.password="Vui lòng nhập mật khẩu.";
    setErr(f,errs);if(Object.keys(errs).length)return;
    busy(btn,true);
    try{await (await verifyPromise)();await signInEmail(email,pass);toast("Đăng nhập thành công.");}
    catch(ex){dlog("er","Login: "+(ex.code||ex.message));err.textContent=ex.code==="app/no-sdk"?ex.message:(authErrMsg(ex).includes("Thao tác thất bại")?ex.message:authErrMsg(ex));busy(btn,false,"Đăng nhập");}
  });
  renderGoogleButton(ctx.el.querySelector("#g"),{beforeSignIn:async()=>{err.textContent="";await (await verifyPromise)();},onDone:()=>toast("Đăng nhập Google thành công."),onError:m=>{err.textContent=m;}});
}

export function register(ctx) {
  ctx.setPage({hero:true,title:null});document.title="Đăng ký · SKIBIDI SCRIPT WEB";
  ctx.el.innerHTML=shell("Tạo tài khoản mới",`<p class="hint">Chỉ mất một phút để bắt đầu.</p>
    <form id="f" novalidate class="stack">
      <div class="fld"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" placeholder="you@example.com" required><p class="ferr" data-err="email" role="alert"></p></div>
      ${pw("password","Mật khẩu","new-password")}${pw("confirm","Nhập lại mật khẩu","new-password")}
      ${captchaMarkup()}<p class="form-err" id="err" role="alert" aria-live="polite"></p>
      <button class="btn btn-p btn-wide" type="submit">${ICO.plus}<span>Tạo tài khoản</span></button>
    </form>${googleMarkup()}<p class="gnote">Đã có tài khoản? <a href="${withNext("/login",ctx)}">Đăng nhập</a></p>`);
  const f=ctx.el.querySelector("#f"),err=ctx.el.querySelector("#err"),btn=f.querySelector("button[type=submit]");
  wireEyes(ctx.el);const verifyPromise=captcha(ctx,"register",err);
  f.addEventListener("submit",async e=>{
    e.preventDefault();err.textContent="";const errs={},email=f.email.value.trim(),p=f.password.value,c=f.confirm.value;
    if(!EMAIL_RE.test(email))errs.email="Email không hợp lệ.";
    if(p.length<8)errs.password="Mật khẩu cần ít nhất 8 ký tự.";
    if(c!==p)errs.confirm="Mật khẩu nhập lại chưa khớp.";
    setErr(f,errs);if(Object.keys(errs).length)return;
    busy(btn,true);
    try{await (await verifyPromise)();await signUpEmail(email,p);toast("Tạo tài khoản thành công. Hãy kiểm tra email để xác minh.");}
    catch(ex){dlog("er","Register: "+(ex.code||ex.message));err.textContent=ex.code==="app/no-sdk"?ex.message:(ex.message||authErrMsg(ex));}
    busy(btn,false,"Tạo tài khoản");
  });
  renderGoogleButton(ctx.el.querySelector("#g"),{beforeSignIn:async()=>{err.textContent="";await (await verifyPromise)();},onDone:()=>toast("Đăng nhập Google thành công."),onError:m=>{err.textContent=m;}});
}

export function forgot(ctx) {
  ctx.setPage({hero:true,title:null});document.title="Khôi phục mật khẩu · SKIBIDI SCRIPT WEB";
  ctx.el.innerHTML=shell("Khôi phục mật khẩu",`<p class="hint">Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.</p>
    <form id="f" novalidate class="stack"><div class="fld"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required><p class="ferr" data-err="email" role="alert"></p></div>
      ${captchaMarkup()}<p class="form-err" id="err" role="alert" aria-live="polite"></p><p class="okmsg" id="ok" role="status"></p>
      <button class="btn btn-p btn-wide" type="submit">${ICO.key}<span>Gửi hướng dẫn</span></button></form>
    <p class="gnote"><a href="${withNext("/login",ctx)}">← Quay lại đăng nhập</a></p>`);
  const f=ctx.el.querySelector("#f"),err=ctx.el.querySelector("#err"),ok=ctx.el.querySelector("#ok"),btn=f.querySelector("button[type=submit]");
  const verifyPromise=captcha(ctx,"forgot-password",err);
  f.addEventListener("submit",async e=>{
    e.preventDefault();err.textContent="";ok.textContent="";const email=f.email.value.trim(),errs={};
    if(!EMAIL_RE.test(email))errs.email="Email không hợp lệ.";setErr(f,errs);if(Object.keys(errs).length)return;
    busy(btn,true);
    try{await (await verifyPromise)();await resetPassword(email);ok.textContent="Nếu email tồn tại, hướng dẫn khôi phục đã được gửi. Hãy kiểm tra cả thư rác.";}
    catch(ex){err.textContent=ex.message||authErrMsg(ex);}
    busy(btn,false,"Gửi hướng dẫn");
  });
}
