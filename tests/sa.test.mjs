/* Kiểm thử bộ đọc khóa Firebase service account (api/_lib/sa.js và bản trình duyệt assets/js/lib/sa.js phải cho CÙNG kết quả). */
import crypto from "node:crypto"; import fs from "node:fs"; import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const srv = require("../api/_lib/sa.js"); const cli = await import("../assets/js/lib/sa.js");
let pass = 0, fail = 0; const t = (n, a, e = true) => { const ok = JSON.stringify(a) === JSON.stringify(e); ok ? pass++ : (fail++, console.log("✗", n, "→", JSON.stringify(a), "≠", JSON.stringify(e))); if (ok) pass += 0; };
const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const good = { type: "service_account", project_id: "demo-proj-1", private_key_id: "ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12", private_key: privateKey, client_email: "firebase-adminsdk-abcde@demo-proj-1.iam.gserviceaccount.com", client_id: "107745592737192742799",
  auth_uri: "https://accounts.google.com/o/oauth2/auth", token_uri: "https://oauth2.googleapis.com/token", auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs", client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-abcde%40demo-proj-1.iam.gserviceaccount.com", universe_domain: "googleapis.com" };
const file = JSON.stringify(good, null, 2);
const both = (name, input, check) => { for (const [who, m] of [["server", srv], ["browser", cli]]) { const r = m.parseServiceAccount(input); try { check(r, who); } catch (e) { fail++; console.log("✗", name, who, e.message); } } };
const keyOk = r => crypto.createPrivateKey(r.sa.private_key).asymmetricKeyType === "rsa";

both("file gốc", file, (r, w) => { t("file gốc: ok " + w, [r.ok, r.sa.project_id, r.sa.client_email, keyOk(r), r.fixes.length], [true, "demo-proj-1", good.client_email, true, 0]); });
/* y hệt trường hợp thật: xuống dòng thật chen giữa private_key, "PRIVATE \nKEY", dấu * ở email/uri */
const lines = JSON.stringify(good).replace(/\\n/g, "\\n"); const broken = lines.replace(/(MII[A-Za-z0-9+/]{100})/, "$1\n").replace("END PRIVATE KEY", "END PRIVATE \nKEY").replace(/@demo-proj-1\.iam\.gserviceaccount\.com","client_id/, '@demo-proj-1.iam.gserv******nt.com","client_id').replace(/"auth_uri":"[^"]*"/, '"auth_uri":"https://account*******om/o/oaut*****th"');
both("dán hỏng (xuống dòng + dấu *)", broken, (r, w) => { t("hỏng: đọc được " + w, [r.ok, r.sa && r.sa.client_email, r.sa && keyOk(r), r.sa && r.sa.auth_uri], [true, good.client_email, true, good.auth_uri]); t("hỏng: có ghi chú sửa " + w, r.fixes.length >= 2, true); });
both("tiền tố + nháy", "FIREBASE_SERVICE_ACCOUNT='" + JSON.stringify(good) + "'", (r, w) => t("tiền tố/nháy " + w, [r.ok, r.sa.project_id], [true, "demo-proj-1"]));
both("bọc ```", "```json\n" + file + "\n```", (r, w) => t("khối code " + w, r.ok, true));
both("chuỗi JSON bọc ngoài", JSON.stringify(JSON.stringify(good)), (r, w) => t("JSON bọc 2 lần " + w, r.ok, true));
both("base64", Buffer.from(JSON.stringify(good)).toString("base64"), (r, w) => t("base64 " + w, [r.ok, r.fixes.some(x => /base64/.test(x))], [true, true]));
both("base64 có ngắt dòng", Buffer.from(JSON.stringify(good)).toString("base64").replace(/(.{76})/g, "$1\n"), (r, w) => t("base64 ngắt dòng " + w, r.ok, true));
both("thiếu ngoặc đóng", JSON.stringify(good).slice(0, -1), (r, w) => t("thiếu } vẫn cứu được " + w, r.ok, true));
both("đoạn Python", 'cred = credentials.Certificate("path/to/serviceAccountKey.json")', (r, w) => t("đoạn Python bị từ chối " + w, [r.ok, r.error.code], [false, "not_json"]));
both("rỗng", "  ", (r, w) => t("rỗng " + w, r.error.code, "empty"));
both("khóa bị che", JSON.stringify({ ...good, private_key: "-----BEGIN PRIVATE KEY-----\\nMIIE****************\\n-----END PRIVATE KEY-----\\n" }), (r, w) => t("khóa che * " + w, [r.ok, r.error.code], [false, "key_masked"]));
both("khóa cụt", JSON.stringify({ ...good, private_key: privateKey.slice(0, 200) }), (r, w) => t("khóa cụt " + w, [r.ok, r.error.code], [false, "no_key"]));
both("email che phần tên", JSON.stringify({ ...good, client_email: "fire*****@demo-proj-1.iam.gserviceaccount.com" }), (r, w) => t("email che tên " + w, [r.ok, r.error.code], [false, "email_masked"]));
both("sai loại", JSON.stringify({ ...good, type: "authorized_user" }), (r, w) => t("sai type " + w, [r.ok, r.error.code], [false, "bad_type"]));
/* giá trị dán Vercel */
const ev = srv.toEnvValues(srv.parseServiceAccount(file).sa), ec = cli.toEnvValues(cli.parseServiceAccount(file).sa);
t("env: JSON một dòng, không xuống dòng thật", !/\n/.test(ev.json) && JSON.parse(ev.json).client_email === good.client_email, true);
t("env: base64 giải ngược ra JSON đúng", JSON.parse(Buffer.from(ev.base64, "base64").toString("utf8")).project_id, "demo-proj-1");
t("env: server và trình duyệt cho cùng kết quả", [ev.json, ev.base64], [ec.json, ec.base64]);
/* khớp với bộ nạp của máy chủ (runtime.js) */
const rt = require("../api/_lib/runtime.js");
for (const [name, val] of [["JSON một dòng", ev.json], ["base64", ev.base64], ["dán hỏng", broken], ["file nhiều dòng", file]]) t("runtime đọc được: " + name, !!(rt.__loadServiceAccount && rt.__loadServiceAccount({ FIREBASE_SERVICE_ACCOUNT: val })), true);
t("trình duyệt = máy chủ về đồng bộ tệp", fs.readFileSync(new URL("../assets/js/lib/sa.js", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//, "").replace(/export \{[^}]*\};?\s*$/, "") === fs.readFileSync(new URL("../api/_lib/sa.js", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//, "").replace(/module\.exports = \{[^}]*\};?\s*$/, ""), true);
console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
