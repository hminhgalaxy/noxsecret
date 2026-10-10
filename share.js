/* Vercel Serverless Function — bản xem trước (Open Graph) cho link chia sẻ của SKIBIDISCRIPT.
   /p/:id  -> bài trong pub/posts (Script, APK, iOS, Link và các mục khác)
   /w/:id  -> bài World trong pub/world/posts
   Chỉ ĐỌC dữ liệu công khai của Firebase Realtime Database qua REST, không dùng khóa bí mật.
   Bài đã xóa / đang chờ duyệt / bị ẩn (không nằm trong pub/*) sẽ không có bản xem trước và không bị lộ nội dung.
   Trình duyệt thật được chuyển sang giao diện chính: /#/post/:id hoặc /#/w/:id. */

const DB = "https://skibidiscriptdvminh-default-rtdb.firebaseio.com";
const SITE = "https://skibidiscript.vercel.app";
const ID = /^[\w-]{1,60}$/;

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const oneLine = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

function originOf(req) {
  const h = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  return /^[a-z0-9.-]+(:\d+)?$/i.test(h) ? "https://" + h : SITE;
}

/* ok = có bản ghi · gone = không tồn tại · denied = Rules chặn · error = lỗi mạng/máy chủ */
async function read(path) {
  try {
    const r = await fetch(DB + "/" + path + ".json", { signal: AbortSignal.timeout(4000) });
    if (r.status === 401 || r.status === 403) return { state: "denied" };
    if (!r.ok) return { state: "error" };
    const d = await r.json();
    return d && typeof d === "object" ? { state: "ok", data: d } : { state: "gone" };
  } catch (e) {
    return { state: "error" };
  }
}

const DATA_IMG = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
function httpsUrl(u) {
  try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch (e) { return ""; }
}
function coverOf(k, d) {
  let src = "";
  if (k === "w") {
    const a = Array.isArray(d.images) ? d.images : Object.values(d.images || {});
    src = a.find(x => typeof x === "string" && (DATA_IMG.test(x) || httpsUrl(x))) || "";
  } else {
    src = typeof d.thumb === "string" ? d.thumb : "";
  }
  return DATA_IMG.test(src) || httpsUrl(src) ? src : "";
}

function page({ title, desc, url, image, hash, found }) {
  const target = JSON.stringify(hash);
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="SKIBIDISCRIPT">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n` : ""}<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
${image ? `<meta name="twitter:image" content="${esc(image)}">\n` : ""}<style>
:root{color-scheme:light dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;font:15px/1.6 system-ui,sans-serif;background:#fff;color:#0a0a0a}
@media(prefers-color-scheme:dark){body{background:#09090b;color:#fafafa}}
main{max-width:520px;padding:24px;text-align:center}
a{color:inherit;font-weight:600}
</style>
</head>
<body>
<main>
<h1 style="font-size:20px;margin:0 0 8px">${esc(title)}</h1>
<p style="margin:0 0 16px;opacity:.7">${esc(desc)}</p>
<p><a href="${esc(hash)}">${found ? "Mở trên SKIBIDISCRIPT" : "Về SKIBIDISCRIPT"}</a></p>
</main>
<script>location.replace(${target})</script>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const k = q.k === "w" ? "w" : "p";
  const id = String(q.id || "");

  if (!ID.test(id)) {
    res.statusCode = 302;
    res.setHeader("Location", "/");
    return res.end();
  }

  const r = await read((k === "w" ? "pub/world/posts/" : "pub/posts/") + id);

  /* ---- ảnh xem trước: giải mã ảnh base64 đang lưu trong Firebase, hoặc chuyển tới ảnh https ---- */
  if ("img" in q) {
    const src = r.state === "ok" ? coverOf(k, r.data) : "";
    const m = DATA_IMG.exec(src);
    if (m) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "image/" + m[1]);
      res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
      return res.end(Buffer.from(m[2], "base64"));
    }
    if (src) {
      res.statusCode = 302;
      res.setHeader("Location", src);
      res.setHeader("Cache-Control", "public, max-age=600, s-maxage=600");
      return res.end();
    }
    res.statusCode = 404;
    return res.end();
  }

  const origin = originOf(req);
  const url = origin + "/" + k + "/" + id;
  const hash = (k === "w" ? "/#/w/" : "/#/post/") + id;

  let meta, status = 200, cache = "public, s-maxage=60, stale-while-revalidate=300";
  if (r.state === "ok") {
    const d = r.data;
    const cover = coverOf(k, d);
    if (k === "w") {
      const who = oneLine(d.authorName, 40) || "Anonymous";
      meta = {
        title: "World post by " + who + " — SKIBIDISCRIPT",
        desc: oneLine(d.text, 160) || "A post on SKIBIDISCRIPT World.",
      };
    } else {
      meta = {
        title: (oneLine(d.title, 100) || "SKIBIDISCRIPT") + " — SKIBIDISCRIPT",
        desc: oneLine(d.desc, 160) || oneLine(d.title, 160) || "Shared on SKIBIDISCRIPT.",
      };
    }
    meta.image = cover ? origin + "/api/share?k=" + k + "&id=" + encodeURIComponent(id) + "&img=1" : "";
    meta.found = true;
  } else if (r.state === "gone") {
    status = 404;
    cache = "public, s-maxage=10";
    meta = { title: "Content not found — SKIBIDISCRIPT", desc: "This content was deleted or doesn't exist.", image: "", found: false };
  } else {
    /* denied / error: không khẳng định là đã xóa; để giao diện chính tự xử lý và báo đúng lý do */
    cache = "no-store";
    meta = { title: "SKIBIDISCRIPT", desc: "Scripts, APKs, iOS files and community links.", image: "", found: true };
  }

  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  return res.end(page({ ...meta, url, hash }));
};
