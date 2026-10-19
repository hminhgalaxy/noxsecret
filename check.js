/* ===== Trang kiểm tra hệ thống: tự dò xem thiếu bước nào và chỉ cách sửa bằng lời dễ hiểu ===== */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const cfg = window.FIREBASE_CONFIG || {}, gcfg = window.GOOGLE_CONFIG || {};
  const out = $("out");
  function row(state, title, fix) {
    const d = document.createElement("div"); d.className = "ck " + state;
    d.innerHTML = '<b>' + ({ ok: "✔", bad: "✘", warn: "!" }[state]) + '</b><div><strong></strong><p></p></div>';
    d.querySelector("strong").textContent = title; d.querySelector("p").textContent = fix || ""; out.appendChild(d);
  }
  async function post(url, body) {
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 10000);
    try { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ac.signal }); return { status: r.status, json: await r.json().catch(() => ({})) }; }
    catch (e) { return { err: true }; } finally { clearTimeout(tm); }
  }
  async function get(url) {
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 10000);
    try { const r = await fetch(url, { signal: ac.signal }); return { status: r.status }; } catch (e) { return { err: true }; } finally { clearTimeout(tm); }
  }

  async function files() {
    const F = window.SKIBIDI_FILES;
    if (!F) return row("bad", "Thiếu file app-files.js", "Hãy tải file app-files.js lên cùng thư mục với index.html.");
    const all = [...F.pages, ...F.css, ...F.js, "database.rules.json"], miss = [];
    await Promise.all(all.map(async f => {
      try { const r = await fetch(f + "?c=" + Date.now(), { cache: "no-store" }); if (!r.ok) miss.push(f); } catch (e) { miss.push(f); }
    }));
    if (miss.length) row("bad", "Web đang thiếu " + miss.length + " file", "Hãy tải lên các file này (cùng thư mục với index.html): " + miss.join(", "));
    else row("ok", "Đủ " + all.length + " file của web", "");
  }
  async function run() {
    out.innerHTML = ""; $("again").disabled = true;
    await files();
    /* 1. Đăng ký / đăng nhập bằng Gmail + mật khẩu */
    if (!cfg.apiKey) row("bad", "Thiếu cấu hình đăng nhập", "File firebase-config.js chưa được tải lên cùng chỗ với trang web.");
    else {
      const r = await post("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + encodeURIComponent(cfg.apiKey), { email: "kiem-tra-he-thong@example.com", password: "KiemTra#12345", returnSecureToken: true });
      const m = String((r.json && r.json.error && r.json.error.message) || "");
      if (r.err) row("bad", "Không kết nối được tới hệ thống đăng nhập", "Kiểm tra mạng của bạn, hoặc tắt trình chặn quảng cáo rồi thử lại.");
      else if (/EMAIL_NOT_FOUND|INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS|TOO_MANY_ATTEMPTS/.test(m)) row("ok", "Đăng ký và đăng nhập bằng Gmail + mật khẩu: đã bật", "");
      else if (/OPERATION_NOT_ALLOWED/.test(m)) row("bad", "Đăng nhập bằng Gmail + mật khẩu CHƯA được bật", "Vào console.firebase.google.com → chọn dự án → Authentication → Sign-in method → bấm Email/Password → bật Enable → Save.");
      else if (/CONFIGURATION_NOT_FOUND/.test(m)) row("bad", "Chưa kích hoạt mục Authentication", "Vào console.firebase.google.com → chọn dự án → Authentication → bấm Get started, rồi bật Email/Password.");
      else if (/API key|API_KEY/i.test(m)) row("bad", "Mã khóa (apiKey) trong firebase-config.js bị sai", "Vào Project settings → General → kéo xuống phần Your apps → chép lại đúng đoạn cấu hình.");
      else if (r.status === 403 || /blocked|referer|restrict/i.test(m)) row("bad", "Mã khóa đang bị giới hạn tên miền", "Vào console.cloud.google.com → APIs & Services → Credentials → mở Browser key → mục Website restrictions: thêm https://skibidiscript.vercel.app/* hoặc chọn None.");
      else row("warn", "Có phản hồi lạ từ hệ thống đăng nhập", m || ("Mã " + r.status));
    }
    /* 2. Database */
    if (!cfg.databaseURL) row("bad", "Thiếu địa chỉ database", "Kiểm tra dòng databaseURL trong firebase-config.js.");
    else {
      const d = await get(cfg.databaseURL.replace(/\/$/, "") + "/pub/names/kiem-tra.json");
      if (d.err || d.status === 404 || d.status === 400) row("bad", "Chưa có database hoặc sai địa chỉ", "Vào Firebase Console → Realtime Database → bấm Create Database (chọn Singapore), rồi chép đúng địa chỉ vào dòng databaseURL.");
      else if (d.status === 200) row("ok", "Database đã sẵn sàng và đọc được", "");
      else if (d.status === 401) row("bad", "Database đang khóa hết, chưa dán Rules", "Vào Realtime Database → tab Rules → xóa hết, dán nội dung file database.rules.json → Publish.");
      else row("warn", "Database trả về mã " + d.status, "");
    }
    /* 3. Google */
    const ru = new URL("login.html", location.href).href.split(/[?#]/)[0];
    if (location.protocol !== "https:") row("warn", "Trang đang mở không phải https", "Đăng nhập Google chỉ chạy trên địa chỉ https (như trang Vercel của bạn).");
    row("warn", "Google: kiểm tra 3 việc (không tự dò được)",
      "1) Google Cloud → APIs & Services → Credentials → Client ID → ô Authorized redirect URIs có đúng dòng: " + ru + "\n" +
      "2) Google Cloud → OAuth consent screen: nếu đang ở chế độ Testing thì thêm Gmail của bạn vào Test users, hoặc bấm Publish app.\n" +
      "3) Client ID đang dùng: " + (gcfg.clientId || "(chưa có)"));
    $("again").disabled = false;
  }
  $("again").addEventListener("click", run);
  run();
})();
