/* Hình minh họa của Skib OS — vẽ hoàn toàn bằng code (canvas), không dùng ảnh có sẵn. */
let cache = "";
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function blob(g, x, y, r, c, a) { const k = g.createRadialGradient(x, y, 0, x, y, r); k.addColorStop(0, c.replace("A", a)); k.addColorStop(1, c.replace("A", 0)); g.fillStyle = k; g.fillRect(x - r, y - r, r * 2, r * 2); }
export function drawOsArt(W = 960, H = 600) {
  if (cache) return cache; const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#16286e"); bg.addColorStop(.45, "#6a3fd0"); bg.addColorStop(1, "#ff7ab8"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  blob(g, W * .18, H * .2, 360, "rgba(111,155,255,A)", .85); blob(g, W * .86, H * .28, 330, "rgba(79,227,211,A)", .55); blob(g, W * .62, H * .98, 420, "rgba(255,143,196,A)", .8); blob(g, W * .3, H * .9, 300, "rgba(185,131,255,A)", .6);
  /* sóng kính */
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, H * (.62 + i * .08)); for (let x = 0; x <= W; x += 20) g.lineTo(x, H * (.62 + i * .08) + Math.sin(x / 90 + i * 1.7) * (16 + i * 5)); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fillStyle = `rgba(255,255,255,${.05 + i * .035})`; g.fill(); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.5; g.stroke(); }
  /* ba tấm kính xếp lớp */
  const tiles = [[W * .14, H * .26, 300, 190, -9, .16], [W * .6, H * .18, 270, 170, 8, .14], [W * .36, H * .52, 310, 150, -3, .12]];
  tiles.forEach(([x, y, w, h, a, al]) => { g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(a * Math.PI / 180); g.translate(-w / 2, -h / 2); rr(g, 0, 0, w, h, 44);
    const f = g.createLinearGradient(0, 0, w, h); f.addColorStop(0, `rgba(255,255,255,${al + .2})`); f.addColorStop(1, `rgba(255,255,255,${al * .3})`); g.fillStyle = f; g.shadowColor = "rgba(10,16,60,.4)"; g.shadowBlur = 40; g.shadowOffsetY = 18; g.fill(); g.shadowColor = "transparent";
    g.lineWidth = 2.2; const s = g.createLinearGradient(0, 0, w, h); s.addColorStop(0, "rgba(255,255,255,.95)"); s.addColorStop(.4, "rgba(255,255,255,.1)"); s.addColorStop(.7, "rgba(255,255,255,.05)"); s.addColorStop(1, "rgba(255,255,255,.6)"); g.strokeStyle = s; g.stroke(); g.restore(); });
  /* giọt kính ở giữa với chữ S */
  const cx = W / 2, cy = H * .47, R = 118; g.save(); g.shadowColor = "rgba(30,20,100,.55)"; g.shadowBlur = 50; g.shadowOffsetY = 26;
  const orb = g.createRadialGradient(cx - R * .35, cy - R * .45, R * .1, cx, cy, R * 1.05); orb.addColorStop(0, "rgba(255,255,255,.98)"); orb.addColorStop(.28, "rgba(214,226,255,.75)"); orb.addColorStop(.7, "rgba(160,150,255,.5)"); orb.addColorStop(1, "rgba(255,150,210,.55)");
  rr(g, cx - R, cy - R, R * 2, R * 2, R * .72); g.fillStyle = orb; g.fill(); g.restore();
  rr(g, cx - R, cy - R, R * 2, R * 2, R * .72); g.lineWidth = 3; const rim = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); rim.addColorStop(0, "rgba(255,255,255,1)"); rim.addColorStop(.45, "rgba(255,255,255,.12)"); rim.addColorStop(1, "rgba(255,255,255,.7)"); g.strokeStyle = rim; g.stroke();
  g.beginPath(); g.ellipse(cx - R * .3, cy - R * .62, R * .5, R * .17, -.45, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,.7)"; g.fill();
  g.lineCap = "round"; g.lineWidth = 24; g.strokeStyle = "rgba(255,255,255,.96)"; g.shadowColor = "rgba(40,30,140,.45)"; g.shadowBlur = 16; g.shadowOffsetY = 8;
  g.beginPath(); g.moveTo(cx + 40, cy - 44); g.bezierCurveTo(cx + 34, cy - 74, cx + 6, cy - 88, cx - 20, cy - 86); g.bezierCurveTo(cx - 62, cy - 82, cx - 80, cy - 52, cx - 62, cy - 26); g.bezierCurveTo(cx - 44, cy - 2, cx + 6, cy - 8, cx + 28, cy + 14); g.bezierCurveTo(cx + 54, cy + 40, cx + 30, cy + 80, cx - 14, cy + 80); g.bezierCurveTo(cx - 44, cy + 80, cx - 66, cy + 66, cx - 74, cy + 40); g.stroke();
  g.shadowColor = "transparent"; for (let i = 0; i < 26; i++) { const x = (i * 197 + 41) % W, y = (i * 113 + 17) % (H * .5); g.beginPath(); g.arc(x, y, 1 + (i % 3), 0, Math.PI * 2); g.fillStyle = `rgba(255,255,255,${.25 + (i % 4) * .12})`; g.fill(); }
  cache = c.toDataURL("image/jpeg", .92); return cache;
}
