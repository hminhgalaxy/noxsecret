/* Trình hiển thị Markdown nhỏ và AN TOÀN cho khung chat Skias (đáp án AI thường có **đậm**, danh sách, `mã`, liên kết…).
   Luôn thoát HTML trước rồi mới đổi cú pháp nên không thể chèn thẻ/thuộc tính lạ. Chỉ cho liên kết http(s) hoặc đường dẫn nội bộ "/…". */
const E = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const SAFE = u => /^(https?:\/\/[^\s<>"']+|\/[A-Za-z0-9_\-./?=&%#]*)$/.test(u);

/* Đổi phần "trong dòng": `mã`, **đậm**, *nghiêng*, [chữ](liên kết), liên kết trần. Đầu vào đã được thoát HTML. */
function inline(s) {
  const keep = []; const hold = h => "\u0000" + (keep.push(h) - 1) + "\u0000";
  s = s.replace(/`([^`\n]+)`/g, (_, c) => hold("<code>" + c + "</code>"));
  s = s.replace(/\[([^\]\n]{1,120})\]\(([^)\s]{1,300})\)/g, (m, t, u) => { u = u.replace(/&amp;/g, "&"); return SAFE(u) ? hold('<a href="' + E(u) + '" target="_blank" rel="noopener noreferrer">' + t + "</a>") : m; });
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<>"')]+[^\s<>"').,!?:;])/g, (m, a, u) => a + hold('<a href="' + E(u.replace(/&amp;/g, "&")) + '" target="_blank" rel="noopener noreferrer">' + u + "</a>"));
  s = s.replace(/\*\*(?=\S)([^\n]*?\S)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*(?=\S)([^*\n]*?\S)\*(?=$|[\s).,!?:;])/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]);
}

/* Markdown → HTML. Hỗ trợ: đoạn văn, xuống dòng, tiêu đề (#), danh sách (-, *, 1.), trích dẫn (>), khối mã (```), đường kẻ (---). */
export function md(src) {
  const text = String(src == null ? "" : src).replace(/\r\n?/g, "\n").slice(0, 8000), out = []; const lines = text.split("\n"); let i = 0;
  const para = [];
  const flush = () => { if (para.length) { out.push("<p>" + para.map(l => inline(E(l))).join("<br>") + "</p>"); para.length = 0; } };
  while (i < lines.length) {
    const ln = lines[i];
    if (/^\s*```/.test(ln)) { flush(); const code = []; i++; while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]); i++; out.push("<pre><code>" + E(code.join("\n")) + "</code></pre>"); continue; }
    if (!ln.trim()) { flush(); i++; continue; }
    let m;
    if ((m = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(ln))) { flush(); out.push('<p class="sk-h">' + inline(E(m[2])) + "</p>"); i++; continue; }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(ln)) { flush(); out.push("<hr>"); i++; continue; }
    if (/^\s*>\s?/.test(ln)) { flush(); const q = []; while (i < lines.length && /^\s*>\s?/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, "")); out.push("<blockquote>" + q.map(l => inline(E(l))).join("<br>") + "</blockquote>"); continue; }
    if (/^\s*([-*•])\s+\S/.test(ln) || /^\s*\d{1,3}[.)]\s+\S/.test(ln)) {
      flush(); const ord = /^\s*\d/.test(ln), re = ord ? /^\s*\d{1,3}[.)]\s+/ : /^\s*([-*•])\s+/, items = [];
      while (i < lines.length && (ord ? /^\s*\d{1,3}[.)]\s+\S/ : /^\s*([-*•])\s+\S/).test(lines[i])) items.push(lines[i++].replace(re, ""));
      out.push((ord ? "<ol>" : "<ul>") + items.map(x => "<li>" + inline(E(x)) + "</li>").join("") + (ord ? "</ol>" : "</ul>")); continue;
    }
    para.push(ln); i++;
  }
  flush(); return out.join("");
}

/* Cho hiệu ứng gõ chữ: đoạn đang gõ dở chưa có dấu đóng **, ` hay ``` thì tự đóng tạm để không thấy ký tự rác nhấp nháy. */
export function mdPartial(src) {
  let s = String(src || "");
  if ((s.match(/```/g) || []).length % 2) s += "\n```";
  else { const noBlocks = s.replace(/```[\s\S]*?```/g, ""); if ((noBlocks.match(/`/g) || []).length % 2) s += "`"; }
  if ((s.replace(/```[\s\S]*?```|`[^`\n]*`/g, "").match(/\*\*/g) || []).length % 2) s = /\*\*$/.test(s) ? s.slice(0, -2) : s + "**";
  return md(s);
}
