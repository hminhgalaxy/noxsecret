/* Địa chỉ cũ chuyển sang địa chỉ mới (giữ liên kết cũ vẫn dùng được). def.to có thể chứa :tham-số. */
export function mount(ctx) {
  let to = String(ctx.def.to || "/"); Object.keys(ctx.params).forEach(k => { to = to.replace(":" + k, encodeURIComponent(ctx.params[k])); });
  const q = ctx.query.toString(); ctx.navigate(to + (q && !/\?/.test(to) ? "?" + q : ""), { replace: true });
  if (ctx.def.open) setTimeout(() => import("../lib/notifpanel.js").then(m => m.openNotifPanel(ctx.def.open)), 120);
}
