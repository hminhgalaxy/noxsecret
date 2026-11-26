/* Lò xo nhỏ: dùng cho thanh trượt "thấu kính" (nhún dẻo khi chạy tới đích). Không phụ thuộc thư viện. */
export function makeSpring(init, { k = 320, c = 21, onUpdate, eps = .02 } = {}) {
  let x = init, v = 0, target = init, raf = 0, last = 0;
  const step = t => {
    const dt = Math.min(.034, (t - (last || t)) / 1000 || .016); last = t;
    const a = -k * (x - target) - c * v; v += a * dt; x += v * dt;
    onUpdate && onUpdate(x, v);
    if (Math.abs(x - target) < eps && Math.abs(v) < eps * 4) { x = target; v = 0; onUpdate && onUpdate(x, 0); raf = 0; last = 0; return; }
    raf = requestAnimationFrame(step);
  };
  return {
    to(t, jump) { target = t; if (jump) { x = t; v = 0; onUpdate && onUpdate(x, 0); return; } if (!raf) raf = requestAnimationFrame(step); },
    get value() { return x; }, get target() { return target; }, stop() { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
  };
}
