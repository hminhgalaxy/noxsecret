/* Địa chỉ cũ chuyển sang địa chỉ mới (giữ liên kết cũ vẫn dùng được). def.to có thể chứa :tham-số. */
export function mount(ctx) {
  let to = String(ctx.def.to || "/");
  if (ctx.def.open === "chat") { import("../lib/auth.js").then(a => { if (a.session.isDev) ctx.navigate("/inbox/chat", { replace: true }); else { ctx.navigate("/", { replace: true }); setTimeout(() => import("../lib/chatwidget.js").then(m => m.openChat()), 200); } }); return; } Object.keys(ctx.params).forEach(k => { to = to.replace(":" + k, encodeURIComponent(ctx.params[k])); });
  const q = ctx.query.toString(); ctx.navigate(to + (q && !/\?/.test(to) ? "?" + q : ""), { replace: true });
  if (ctx.def.open) setTimeout(() => import("../lib/notifpanel.js").then(m => m.openNotifPanel(ctx.def.open)), 120);
}
