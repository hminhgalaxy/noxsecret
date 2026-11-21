/* Đọc "khóa dịch vụ" Firebase (service account) một cách khoan dung: người dùng hay dán sai định dạng
   (xuống dòng thật giữa chuỗi, dấu ***, bọc ngoặc kép, base64…). Hàm thuần — KHÔNG gọi mạng, KHÔNG ghi gì.
   Bản dành cho trình duyệt: assets/js/lib/sa.js (tạo từ tệp này bằng tools/sync-sa.sh — đừng sửa tay). */
const MASK = /\*/;
const CONST = { auth_uri: "https://accounts.google.com/o/oauth2/auth", token_uri: "https://oauth2.googleapis.com/token", auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs", universe_domain: "googleapis.com" };
const EMAIL = /^[A-Za-z0-9._-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/;

function unwrap(raw) {
  let s = String(raw == null ? "" : raw).replace(/^﻿/, "").trim(); const fixes = [];
  const pre = s.match(/^(?:export\s+)?FIREBASE_SERVICE_ACCOUNT\s*=\s*/i); if (pre) { s = s.slice(pre[0].length).trim(); fixes.push("Đã bỏ phần \"FIREBASE_SERVICE_ACCOUNT=\" ở đầu."); }
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  if (/^```/.test(s)) { s = s.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim(); fixes.push("Đã bỏ dấu ``` bao quanh."); }
  if (s.length > 1 && ((s[0] === "'" && s.endsWith("'")) || (s[0] === '"' && s.endsWith('"') && !s.startsWith('{')))) {
    const inner = s.slice(1, -1).trim(); let done = false;
    if (s[0] === '"') { try { const j = JSON.parse(s); if (typeof j === "string") { s = j.trim(); fixes.push("Đã giải mã chuỗi JSON bọc ngoài."); done = true; } } catch (_) {} }
    if (!done && inner[0] === "{") { s = inner; fixes.push("Đã bỏ dấu nháy bao quanh."); }
  }
  if (s[0] !== "{") {
    const b = s.replace(/\s+/g, "");
    if (/^[A-Za-z0-9+/_-]{40,}={0,2}$/.test(b)) { try { const d = decodeB64(b); if (d.trim()[0] === "{") { s = d.trim(); fixes.push("Đã giải mã base64."); } } catch (_) {} }
  }
  return { s, fixes };
}
function decodeB64(b) { b = b.replace(/-/g, "+").replace(/_/g, "/"); while (b.length % 4) b += "="; const bin = atob(b); let out = ""; try { out = decodeURIComponent(bin.split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")); } catch (_) { out = bin; } return out; }

/* Duyệt từng ký tự: trong chuỗi "..." mọi xuống dòng thật/tab được đổi thành \n / khoảng trắng để JSON.parse đọc được */
function sanitize(s) {
  let out = "", inStr = false, esc = false, changed = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) { out += c; esc = false; continue; }
      if (c === "\\") { out += c; esc = true; continue; }
      if (c === '"') { inStr = false; out += c; continue; }
      if (c === "\n") { out += "\\n"; changed = true; continue; }
      if (c === "\r") { changed = true; continue; }
      if (c === "\t") { out += " "; changed = true; continue; }
      out += c;
    } else { if (c === '"') inStr = true; out += c; }
  }
  return { s: out.replace(/,\s*([}\]])/g, "$1"), changed };
}
function field(text, name) { const m = text.match(new RegExp('"' + name + '"\\s*:\\s*"([^"]*)"')); return m ? m[1] : null; }
function extractKey(text) {
  const m = text.match(/"private_key"\s*:\s*"([\s\S]*?)"\s*(?:,|\})/); return m ? m[1] : null;
}
/* Lấy phần base64 của khóa PEM bất kể bị chèn \n, xuống dòng thật, khoảng trắng; dựng lại PEM chuẩn (64 ký tự/dòng) */
function normalizeKey(k) {
  let b = String(k || "").replace(/\\r/g, "").replace(/\\n/g, "").replace(/\s+/g, "");
  const m = b.match(/-----BEGIN(?:RSA)?PRIVATEKEY-----([A-Za-z0-9+/=]+)-----END(?:RSA)?PRIVATEKEY-----/);
  if (!m) return null; const body = m[1];
  if (body.length < 800) return null;
  return "-----BEGIN PRIVATE KEY-----\n" + body.match(/.{1,64}/g).join("\n") + "\n-----END PRIVATE KEY-----\n";
}

/* Kết quả: { ok, sa, fixes[], error:{code,msg}|null }.  code: empty | not_json | no_key | key_masked | no_email | email_masked | no_project | bad_type */
function parseServiceAccount(raw) {
  const fixes = []; const fail = (code, msg) => ({ ok: false, sa: null, fixes, error: { code, msg } });
  if (raw == null || !String(raw).trim()) return fail("empty", "Chưa có nội dung.");
  const u = unwrap(raw); fixes.push(...u.fixes); let text = u.s; let obj = null;
  if (text[0] !== "{") return fail("not_json", "Nội dung không phải JSON (phải bắt đầu bằng { ). Hãy mở file .json tải từ Firebase, chọn tất cả và dán vào.");
  try { obj = JSON.parse(text); } catch (_) {
    const sz = sanitize(text); if (sz.changed) fixes.push("Đã sửa các chỗ xuống dòng nằm giữa chuỗi (thường do chat/ứng dụng tự ngắt dòng).");
    try { obj = JSON.parse(sz.s); } catch (_2) { obj = null; }
  }
  if (!obj || typeof obj !== "object") {
    /* cứu hộ: lấy từng trường bằng biểu thức chính quy */
    const pk = extractKey(text), em = field(text, "client_email"), pj = field(text, "project_id");
    if (!pk && !em && !pj) return fail("not_json", "Không đọc được JSON. Có thể bị thiếu dấu { } hoặc dấu nháy. Hãy dán lại nguyên file.");
    obj = { type: field(text, "type") || "service_account", project_id: pj, private_key_id: field(text, "private_key_id"), private_key: pk, client_email: em, client_id: field(text, "client_id") };
    fixes.push("JSON hỏng nặng nên đã lấy riêng từng trường cần thiết.");
  }
  const key = normalizeKey(obj.private_key);
  if (!obj.private_key || /^\s*$/.test(String(obj.private_key))) return fail("no_key", "Thiếu trường private_key.");
  if (MASK.test(String(obj.private_key).replace(/-----[A-Z ]+-----/g, "").replace(/\\n/g, "")) && !key) return fail("key_masked", "private_key đang bị che bằng dấu *: đó là bản đã bị che, không dùng được. Hãy mở file .json gốc.");
  if (!key) return fail("no_key", "private_key bị thiếu hoặc cụt (không thấy -----BEGIN PRIVATE KEY----- … -----END PRIVATE KEY----- đầy đủ).");
  if (String(obj.private_key).replace(/\\n/g, "\n") !== key) fixes.push("Đã chuẩn hóa private_key (gộp các dòng bị ngắt, dựng lại đúng định dạng).");
  let pj = String(obj.project_id || "").trim();
  let em = String(obj.client_email || "").trim();
  if (!pj) { const m = em.match(/@([a-z0-9-]+)\.iam\.gserviceaccount\.com$/); if (m) { pj = m[1]; fixes.push("Thiếu project_id: đã suy ra từ client_email."); } }
  if (!pj || MASK.test(pj)) return fail("no_project", "Thiếu hoặc hỏng project_id.");
  if (!EMAIL.test(em)) {
    const local = em.split("@")[0] || "";
    if (local && !MASK.test(local) && /^[A-Za-z0-9._-]+$/.test(local)) { em = local + "@" + pj + ".iam.gserviceaccount.com"; fixes.push("client_email bị che/hỏng: đã dựng lại từ phần tên và project_id."); }
    else return fail(em ? "email_masked" : "no_email", em ? "client_email bị che bằng dấu * hoặc sai định dạng." : "Thiếu trường client_email.");
  }
  if (obj.type && obj.type !== "service_account") return fail("bad_type", "Đây không phải khóa \"service_account\" (trường type = " + String(obj.type).slice(0, 30) + ").");
  const sa = { type: "service_account", project_id: pj, private_key_id: /^[a-f0-9]{20,}$/i.test(String(obj.private_key_id || "")) ? String(obj.private_key_id) : undefined, private_key: key, client_email: em,
    client_id: /^\d{10,}$/.test(String(obj.client_id || "")) ? String(obj.client_id) : undefined, auth_uri: CONST.auth_uri, token_uri: CONST.token_uri, auth_provider_x509_cert_url: CONST.auth_provider_x509_cert_url,
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/" + encodeURIComponent(em), universe_domain: CONST.universe_domain };
  Object.keys(sa).forEach(k => sa[k] === undefined && delete sa[k]);
  const maskedOther = ["client_id", "auth_uri", "client_x509_cert_url", "token_uri", "auth_provider_x509_cert_url"].some(k => obj[k] && MASK.test(String(obj[k])));
  if (maskedOther) fixes.push("Các trường phụ bị che bằng dấu * đã được dựng lại đúng giá trị chuẩn (Firebase không cần chúng ở dạng gốc).");
  return { ok: true, sa, fixes, error: null };
}
/* Chuỗi để dán vào Vercel: JSON một dòng, hoặc base64 của nó (an toàn nhất, không dính xuống dòng/nháy) */
function toEnvValues(sa) {
  const one = JSON.stringify(sa); let b64;
  if (typeof Buffer !== "undefined") b64 = Buffer.from(one, "utf8").toString("base64"); else { const bytes = new TextEncoder().encode(one); let bin = ""; bytes.forEach(x => (bin += String.fromCharCode(x))); b64 = btoa(bin); }
  return { json: one, base64: b64 };
}
module.exports = { parseServiceAccount, toEnvValues, normalizeKey };
