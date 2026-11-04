const SITE_KEY = "0x4AAAAAAFy8pCjf3xX4v_aO";
let apiPromise;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!apiPromise) apiPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => window.turnstile
      ? resolve(window.turnstile)
      : reject(new Error("Không tải được xác minh bảo mật."));
    s.onerror = () => {
      apiPromise = null;
      reject(new Error("Không tải được xác minh bảo mật."));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

export async function mountCaptcha(container, action) {
  if (!container) return;
  if (!["login", "signup"].includes(action)) {
    throw new Error("Không xác định được thao tác xác minh.");
  }

  container.dataset.action = action;
  container.dataset.token = "";
  container.innerHTML = '<div class="captcha-loading">Đang tải xác minh bảo mật…</div>';

  try {
    const ts = await loadTurnstile();
    container.innerHTML = "";
    const widgetId = ts.render(container, {
      sitekey: SITE_KEY,
      action,
      theme: "dark",
      size: "flexible",
      callback: token => {
        container.dataset.token = token;
        container.dataset.error = "";
      },
      "expired-callback": () => {
        container.dataset.token = "";
        container.dataset.error = "Mã xác minh đã hết hạn. Vui lòng xác minh lại.";
      },
      "error-callback": () => {
        container.dataset.token = "";
        container.dataset.error = "Không thể xác minh. Hãy tải lại thử thách.";
      }
    });
    container.dataset.widgetId = widgetId;
  } catch (e) {
    container.dataset.error = e.message;
    container.innerHTML = '<p class="captcha-error">Không tải được xác minh bảo mật. Hãy kiểm tra kết nối rồi tải lại trang.</p>';
  }
}

export async function verifyCaptcha(container, expectedAction) {
  const token = container && container.dataset.token;
  if (!token) {
    throw new Error((container && container.dataset.error) || "Vui lòng hoàn tất xác minh bảo mật.");
  }
  if (!["login", "signup"].includes(expectedAction) ||
      container.dataset.action !== expectedAction) {
    throw new Error("Phiên xác minh không khớp. Vui lòng tải lại trang.");
  }

  try {
    const response = await fetch("/api/turnstile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: expectedAction })
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Xác minh không thành công. Hãy thử lại.");
    }
  } finally {
    // Siteverify tokens are single-use. Reset even after a failed request:
    // the backend may already have redeemed the token before the connection failed.
    const ts = window.turnstile;
    if (ts && container.dataset.widgetId) {
      try { ts.reset(container.dataset.widgetId); } catch (_) {}
    }
    container.dataset.token = "";
  }
}
