/* Cloudflare Turnstile (captcha) cho đăng nhập và đăng ký. Nạp lười — chỉ tải ở trang cần dùng. */
export const TURNSTILE_SITEKEY = "0x4AAAAAAFy8pCjf3xX4v_aO";
let loading = null;
function load() {
  if (window.turnstile) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.defer = true;
    s.onload = () => res(); s.onerror = () => { loading = null; rej(new Error("captcha")); };
    document.head.appendChild(s);
  });
  return loading;
}
/* Trả về { token(), reset(), destroy(), ready } — token() là chuỗi hoặc "" nếu chưa xác minh */
export function mountCaptcha(box, { onChange } = {}) {
  let id = null, tok = "", dead = false;
  box.classList.add("loading");
  const set = t => { tok = t || ""; onChange && onChange(!!tok); };
  const ready = load().then(() => {
    if (dead || !window.turnstile) return;
    box.classList.remove("loading");
    id = window.turnstile.render(box, {
      sitekey: TURNSTILE_SITEKEY, theme: document.documentElement.dataset.theme === "light" ? "light" : "dark", language: "vi",
      size: box.clientWidth && box.clientWidth < 300 ? "compact" : "normal", appearance: "always",
      callback: t => set(t), "expired-callback": () => set(""), "error-callback": () => set(""), "timeout-callback": () => set("")
    });
  }).catch(() => { box.classList.remove("loading"); box.innerHTML = '<span class="field-hint">Không tải được phần xác minh. Hãy kiểm tra mạng rồi tải lại trang.</span>'; });
  return {
    ready, token: () => tok,
    reset() { set(""); try { if (id != null && window.turnstile) window.turnstile.reset(id); } catch (_) {} },
    destroy() { dead = true; try { if (id != null && window.turnstile) window.turnstile.remove(id); } catch (_) {} }
  };
}
/* Xác minh token ở máy chủ (api/verify-captcha). Nếu máy chủ chưa được cấu hình thì chỉ dùng kiểm tra phía trình duyệt. */
export async function verifyCaptcha(token) {
  if (!token) return { ok: false };
  try {
    const r = await fetch("/api/verify-captcha", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    if (!r.ok && r.status !== 400 && r.status !== 403) return { ok: true, soft: true };
    const j = await r.json().catch(() => null);
    if (!j) return { ok: true, soft: true };
    if (j.configured === false) return { ok: true, soft: true };
    return { ok: !!j.ok };
  } catch (_) { return { ok: true, soft: true }; }
}
