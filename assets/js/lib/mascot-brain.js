/* "Bộ não" của Scott: hiểu câu hỏi đơn giản bằng khớp từ khóa (không cần máy chủ, không gọi AI).
   Thuần logic (không đụng DOM) để kiểm thử được trong Node. Hiểu tiếng Việt có dấu / không dấu và English, có bỏ qua lỗi gõ nhẹ. */
import { KB, JOKES, DICT, TIPS, SUGGEST } from "./mascot-kb.js";

export const norm = s => String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const VI_CH = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const VI_W = new Set("ban toi minh la gi khong nhu the nao cho oi co nay duoc lam sao mua nap tien vi hang cua toi rat va hay nhe nha vay sao tai khoan dang nhap cai dat giup gui tin nhan xin chao cam on bao nhieu o dau khi nao tai sao roi chua da bi loi mat that ra vao di den".split(" "));
const EN_W = new Set("i you the is are what how do does can my me to a an and of in on it this that where when why please not with for my your site shop wallet buy sell have has was were be will would could should from about there here hi hello thanks".split(" "));
/* Ngôn ngữ của câu: có dấu → vi; ngược lại đếm từ đặc trưng; hòa → ngôn ngữ giao diện */
export function detectLang(raw, ui = "en") {
  if (VI_CH.test(String(raw || ""))) return "vi";
  const tk = norm(raw).split(" ").filter(Boolean); let v = 0, e = 0;
  for (const w of tk) { if (VI_W.has(w)) v++; if (EN_W.has(w)) e++; }
  return v > e ? "vi" : e > v ? "en" : ui === "vi" ? "vi" : "en";
}

const pad = n => String(n).padStart(2, "0");
const lev1 = (a, b) => { /* khoảng cách sửa ≤ 1 */
  if (a === b) return true; const la = a.length, lb = b.length; if (Math.abs(la - lb) > 1) return false;
  let i = 0; while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return la > lb ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
};
const KN = KB.map(e => ({ e, ks: e.k.map(norm).filter(Boolean) }));

/* ── Tính nhẩm an toàn (không dùng eval) ── */
function calc(src) {
  let i = 0; const s = src.replace(/\s+/g, "");
  const num = () => { const m = /^\d+(?:\.\d+)?/.exec(s.slice(i)); if (!m) throw 0; i += m[0].length; let v = parseFloat(m[0]); while (s[i] === "%") { v /= 100; i++; } return v; };
  const prim = () => { if (s[i] === "(") { i++; const v = add(); if (s[i] !== ")") throw 0; i++; let r = v; while (s[i] === "%") { r /= 100; i++; } return r; } return num(); };
  const un = () => { if (s[i] === "-") { i++; return -un(); } if (s[i] === "+") { i++; return un(); } return prim(); };
  const pow = () => { const b = un(); if (s[i] === "^") { i++; const e = pow(); if (Math.abs(e) > 1000) throw 0; return Math.pow(b, e); } return b; };
  const mul = () => { let v = pow(); while (s[i] === "*" || s[i] === "/") { const o = s[i++], r = pow(); if (o === "/" && r === 0) throw "div0"; v = o === "*" ? v * r : v / r; } return v; };
  const add = () => { let v = mul(); while (s[i] === "+" || s[i] === "-") { const o = s[i++], r = mul(); v = o === "+" ? v + r : v - r; } return v; };
  const v = add(); if (i !== s.length || !isFinite(v)) throw 0; return v;
}
const fmtNum = (v, lang) => { const r = Math.round(v * 1e8) / 1e8; return r.toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { maximumFractionDigits: 8 }); };
function mathAnswer(raw, lang) {
  let s = String(raw).toLowerCase().replace(/[×]/g, "*").replace(/[÷:]/g, "/").replace(/(\d)\s*x\s*(?=[\d(])/g, "$1*");
  /* "15% của 200" / "15% of 200" */
  const pc = /(\d+(?:[.,]\d+)?)\s*%\s*(?:của|cua|of)\s*(\d+(?:[.,]\d+)?)/.exec(s);
  if (pc) { const a = parseFloat(pc[1].replace(",", ".")), b = parseFloat(pc[2].replace(",", ".")); return fmtNum(a * b / 100, lang); }
  s = s.replace(/(\d),(\d{3})(?!\d)/g, "$1$2").replace(/(\d),(\d)/g, "$1.$2");
  s = s.replace(/\b(tinh|tính|bằng bao nhiêu|bang bao nhieu|bằng|bang|hãy|hay|giúp|giup|mình|minh|cho|calculate|calc|compute|what is|what's|whats|equals|solve|how much is)\b/g, " ").replace(/[=?]/g, " ").trim();
  if (!/^[\d\s+\-*/().%^]+$/.test(s) || !/\d/.test(s) || !/[+\-*/^%]/.test(s.replace(/^\s*-/, "")) || s.length > 80) return null;
  try { return fmtNum(calc(s), lang); } catch (e) { return e === "div0" ? "div0" : null; }
}

const GREET = new Set(["xin chao", "chao", "chao ban", "hello", "hi", "hey", "hii", "alo", "yo", "helo", "hallo", "good morning", "chao buoi sang", "good evening", "good afternoon", "chao buoi toi", "chao buoi chieu", "xin chao scott", "hello scott", "hi scott", "hey scott", "chao scott"]);
const THANKS = /^(?:cam on|camon|cam on ban|cam on nhieu|thanks|thank you|thank u|thx|tks|ty|thanks a lot|many thanks|cam on scott|thanks scott|thank you scott)\b/;
const BYE = /^(?:tam biet|bye|goodbye|bye bye|see you|see ya|hen gap lai|ngu ngon|good night|chuc ngu ngon|bai bai|pp)\b/;
const REPORT = /(?:^| )(?:gui|nhan|bao|chuyen|forward|send|tell|message|msg|contact|report|ping|ask|lien he|nho)(?: [a-z0-9]+){0,5} (?:cho |to |with |toi |voi )?(?:the )?(?:dev|developer|admin|quan tri|chu web|owner)(?: |$)|(?:^| )(?:bao loi|bao cao loi|report (?:a |an |the )?(?:bug|error|problem|issue)|found (?:a )?bug|co loi|bi loi|gap loi|something (?:is )?(?:broken|wrong)|not working|khong hoat dong|bi hong|hong roi|bug|support|ho tro|send (?:a )?report)(?: |$)/;
const DAYS = { vi: ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };

/* ── Dịch từ Anh ↔ Việt trong DICT ── */
const DICT_EN = new Map(DICT.map(([e, v]) => [norm(e), [e, v]])), DICT_VI = new Map(DICT.map(([e, v]) => [norm(v), [e, v]]));
const T_STRIP = /\b(?:dich|translate|translation|nghia|nghia cua|la gi|trong|sang|bang|tieng anh|tieng viet|in english|in vietnamese|to english|to vietnamese|into english|into vietnamese|english|vietnamese|how do you say|how to say|how do i say|say|what is|what s|whats|what does|mean|means|meaning|the word|word|cua|tu|cho minh biet|hay|giup|ban|vay|nhe|nha|is|a|an|the)\b/g;
const T_TRIG = /\b(?:tieng anh|tieng viet|in english|in vietnamese|to english|to vietnamese|how do you say|how to say|how do i say|translate|dich|nghia la gi|means?|meaning)\b/;
const T_VERB = /\b(?:translate|dich|how do you say|how to say|how do i say|nghia la gi|means?|meaning)\b|(?:^| )la gi$|(?:^| )tieng (?:anh|viet) la gi/;
function translateAnswer(nq, lang) {
  if (!T_TRIG.test(nq)) return null;
  const term = nq.replace(T_STRIP, " ").replace(/\s+/g, " ").trim();
  if (!term) return null;
  const hitE = DICT_EN.get(term), hitV = DICT_VI.get(term), hit = hitE || hitV;
  if (hit) return { text: hitE ? (lang === "vi" ? `“${hit[0]}” trong tiếng Việt là “${hit[1]}”.` : `“${hit[0]}” in Vietnamese is “${hit[1]}”.`) : (lang === "vi" ? `“${hit[1]}” trong tiếng Anh là “${hit[0]}”.` : `“${hit[1]}” in English is “${hit[0]}”.`) };
  if (!T_VERB.test(nq) || term.split(" ").length > 4) return null;
  return { text: lang === "vi" ? `Mình chỉ biết vài chục từ liên quan đến website thôi, chưa có từ “${term}”. Bạn thử công cụ dịch như Google Dịch nhé!` : `I only know a few dozen words about the website, and “${term}” isn't one of them yet. Try a translator like Google Translate!` };
}

const lk = (go, lang) => (go || []).map(([href, v, e]) => ({ href, label: lang === "vi" ? v : e }));

/* Trả lời một câu. opts: { ui, now: Date, rnd: () => số [0,1) }. Kết quả { kind, lang, text, go[], report, id } */
export function answer(raw, opts = {}) {
  const { ui = "en", now = new Date(), rnd = Math.random } = opts, text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const lang = detectLang(text, ui), nq = norm(text), tk = nq.split(" ").filter(Boolean), R = (o) => Object.assign({ lang, go: [], report: false }, o);
  if (GREET.has(nq) || (tk.length <= 3 && GREET.has(tk.slice(0, 2).join(" "))) || (tk.length <= 2 && GREET.has(tk[0]))) return R({ kind: "greet", text: lang === "vi" ? "Xin chào! Mình là Scott 👋 Bạn cần mình giúp gì nào?" : "Hi there! I'm Scott 👋 What can I help you with?" });
  if (THANKS.test(nq) && tk.length <= 6) return R({ kind: "thanks", text: lang === "vi" ? "Không có gì đâu! Cần gì cứ gọi mình nhé. 😊" : "You're welcome! Just call me if you need anything. 😊" });
  if (BYE.test(nq) && tk.length <= 5) return R({ kind: "bye", text: lang === "vi" ? "Tạm biệt nhé! Mình vẫn đứng đây nếu bạn cần. 👋" : "Bye for now! I'll be right here if you need me. 👋" });
  const m = mathAnswer(text, lang);
  if (m === "div0") return R({ kind: "math", text: lang === "vi" ? "Chia cho 0 thì ngay cả người que cũng chịu thua! 🤯" : "Dividing by zero beats even a stick figure! 🤯" });
  if (m) return R({ kind: "math", text: lang === "vi" ? `Kết quả là ${m}.` : `That's ${m}.` });
  if (/(?:^| )(?:may gio|gio hien tai|bay gio la may gio|what time|time is it|current time|time now|the time)(?: |$)/.test(nq)) return R({ kind: "time", text: lang === "vi" ? `Bây giờ là ${pad(now.getHours())}:${pad(now.getMinutes())} (giờ trên thiết bị của bạn).` : `It's ${pad(now.getHours())}:${pad(now.getMinutes())} (your device's clock).` });
  if (/(?:^| )(?:hom nay|today|what day|what date|ngay may|thu may|date today|todays date|ngay bao nhieu)(?: |$)/.test(nq) && /(?:ngay|thu|date|day)/.test(nq)) { const d = now, ds = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; return R({ kind: "date", text: lang === "vi" ? `Hôm nay là ${DAYS.vi[d.getDay()]}, ngày ${ds}.` : `Today is ${DAYS.en[d.getDay()]}, ${ds} (day/month/year).` }); }
  if (/(?:^| )(?:ke chuyen cuoi|chuyen cuoi|lam toi cuoi|chuyen vui|joke|funny|make me laugh|tell me a joke|cuoi di|cho cuoi)(?: |$)/.test(nq)) { const j = JOKES[Math.floor(rnd() * JOKES.length) % JOKES.length]; return R({ kind: "joke", text: j[lang] }); }
  const tr = translateAnswer(nq, lang); if (tr) return R({ kind: "translate", text: tr.text });
  if (REPORT.test(" " + nq + " ")) return R({ kind: "report", text: "", report: true });
  /* khớp kho câu hỏi */
  let best = null, bs = 0;
  for (const { e, ks } of KN) {
    let sc = 0;
    for (const k of ks) {
      const w = k.split(" ").length, base = w * 3 + Math.min(k.length, 20) / 10;
      if ((" " + nq + " ").includes(" " + k + " ")) sc += base;
      else if (w === 1 && k.length >= 5 && tk.some(t => t.length >= 4 && t[0] === k[0] && lev1(t, k))) sc += base * 0.7;
      else if (w > 1 && k.length >= 8) { const kt = k.split(" "); if (kt.length <= 3 && kt.every(x => tk.includes(x) || (x.length >= 5 && tk.some(t => t.length >= 4 && t[0] === x[0] && lev1(t, x))))) sc += base * 0.8; }
    }
    if (sc > bs) { bs = sc; best = e; }
  }
  if (best && bs >= 3) return R({ kind: "kb", id: best.id, text: best[lang], go: lk(best.go, lang), report: !!best.report });
  return R({ kind: "unknown", text: lang === "vi" ? "Hmm, câu này hơi khó với mình. Bạn thử hỏi ngắn gọn hơn (ví dụ “nạp tiền”, “đơn hàng”, “quên mật khẩu”), hoặc để mình gửi câu hỏi cho dev nhé." : "Hmm, that one's a bit tricky for me. Try asking it shorter (e.g. “top up”, “orders”, “forgot password”), or let me send your question to the dev.", report: true });
}

/* Chọn mẹo: ưu tiên mẹo hợp trang hiện tại; idx để xoay vòng. */
export function tip(path = "/", idx = 0) {
  const here = TIPS.filter(t => t.at && t.at.test(path)), rest = TIPS.filter(t => !t.at);
  const pool = here.length && idx % 2 === 0 ? here : rest.concat(here);
  return pool[Math.abs(idx) % pool.length];
}
export const suggest = (lang = "en", n = 4, seed = 0) => { const L = SUGGEST.slice(), out = []; let s = seed || 1; while (out.length < n && L.length) { s = (s * 9301 + 49297) % 233280; out.push(L.splice(Math.floor(s / 233280 * L.length), 1)[0][lang === "vi" ? 0 : 1]); } return out; };
export const KB_SIZE = KB.length;
