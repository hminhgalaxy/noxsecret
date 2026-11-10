/* Nguồn cấp Atom (feed.xml) cho các bài "Cập nhật này có gì": người dùng và công cụ tìm kiếm theo dõi được thay đổi mới. */
const SITE = "https://skibidiscript.vercel.app";
const DB = "https://noxgalaxy-2cd71-default-rtdb.asia-southeast1.firebasedatabase.app";
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TAGS = { new: "Tính năng mới", improve: "Cải tiến", fix: "Sửa lỗi", security: "Bảo mật" };
module.exports = async (req, res) => {
  let list = [];
  try {
    const r = await fetch(DB + "/nox_updates.json?orderBy=%22ts%22&limitToLast=30");
    if (r.ok) { const v = (await r.json()) || {}; list = Object.keys(v).map(k => ({ id: k, ...v[k] })).filter(x => x && x.title && Number(x.ts) > 0).sort((a, b) => b.ts - a.ts); }
  } catch (_) {}
  const upd = list.length ? new Date(list[0].ts).toISOString() : new Date().toISOString();
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="vi">\n' +
    `  <title>SKIBIDI SCRIPT WEB (skibidiscript) — Cập nhật</title>\n  <subtitle>Tin mới và thay đổi của SKIBIDI SCRIPT WEB</subtitle>\n  <id>${SITE}/</id>\n  <link rel="self" type="application/atom+xml" href="${SITE}/feed.xml"/>\n  <link rel="alternate" type="text/html" href="${SITE}/notifications"/>\n  <updated>${upd}</updated>\n  <author><name>SKIBIDI SCRIPT WEB</name><uri>${SITE}/</uri></author>\n  <icon>${SITE}/assets/img/icon-192.png</icon>\n  <logo>${SITE}/assets/img/icon-512.png</logo>\n` +
    list.map(u => `  <entry>\n    <title>${esc(u.title)}</title>\n    <id>${SITE}/notifications#${esc(u.id)}</id>\n    <link rel="alternate" type="text/html" href="${SITE}/notifications"/>\n    <updated>${new Date(u.ts).toISOString()}</updated>${TAGS[u.tag] ? `\n    <category term="${esc(u.tag)}" label="${esc(TAGS[u.tag])}"/>` : ""}\n    <summary type="text">${esc(String(u.body || "").slice(0, 600))}</summary>\n  </entry>`).join("\n") + "\n</feed>\n";
  res.setHeader("Content-Type", "application/atom+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=86400");
  res.status(200).send(xml);
};
