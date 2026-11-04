
import { TURNSTILE_SITE_KEY } from "./config.js";

let scriptPromise = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-turnstile]');
    if (existing) {
      existing.addEventListener("load", resolve, { once:true });
      existing.addEventListener("error", reject, { once:true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.defer = true; s.dataset.turnstile = "1";
    s.onload = resolve; s.onerror = () => { scriptPromise = null; reject(new Error("Không tải được xác minh bảo mật.")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export async function mountTurnstile(container, action) {
  await loadScript();
  if (!window.turnstile) throw new Error("Xác minh bảo mật chưa sẵn sàng.");
  let token = "";
  const widgetId = window.turnstile.render(container, {
    sitekey: TURNSTILE_SITE_KEY, action, theme:"dark", size:"normal",
    appearance:"always",
    callback: value => { token = value || ""; container.dataset.verified = token ? "1" : ""; },
    "expired-callback": () => { token = ""; container.dataset.verified = ""; },
    "error-callback": () => { token = ""; container.dataset.verified = ""; }
  });
  return {
    getToken: () => token,
    reset: () => { token = ""; container.dataset.verified = ""; try { window.turnstile.reset(widgetId); } catch (_) {} },
    remove: () => { try { window.turnstile.remove(widgetId); } catch (_) {} }
  };
}

export async function verifyTurnstile(widget, action) {
  const token = widget && widget.getToken();
  if (!token) throw new Error("Vui lòng hoàn tất bước xác minh trước khi tiếp tục.");
  try {
    const response = await fetch("/api/turnstile-verify", {
      method:"POST", headers:{"Content-Type":"application/json"},
      credentials:"same-origin", cache:"no-store",
      body:JSON.stringify({ token, action })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || "Xác minh chưa thành công. Vui lòng thử lại.");
    return true;
  } finally {
    widget.reset();
  }
}
