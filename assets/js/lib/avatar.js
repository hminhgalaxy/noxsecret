/* Ảnh đại diện: cắt vuông, thu nhỏ, nén JPEG để chỉ còn vài chục KB rồi lưu thẳng vào hồ sơ (không cần Firebase Storage). */
export const AVATAR_MAX_CHARS = 20000; // Rules cho tối đa 24000
export async function fileToAvatar(file) {
  if (!file || !/^image\/(jpeg|png|webp|gif|bmp)$/i.test(file.type || "")) throw Object.assign(new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP."), { code: "avatar/type" });
  if (file.size > 12 * 1024 * 1024) throw Object.assign(new Error("Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn."), { code: "avatar/size" });
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch (_) {
    bmp = await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("Không đọc được ảnh này.")); }; im.src = u; });
  }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight, side = Math.min(w, h), sx = (w - side) / 2, sy = (h - side) / 2;
  for (const size of [192, 160, 128, 96]) {
    const c = document.createElement("canvas"); c.width = c.height = size; const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, size, size); x.imageSmoothingQuality = "high"; x.drawImage(bmp, sx, sy, side, side, 0, 0, size, size);
    for (const q of [0.85, 0.72, 0.6, 0.48]) { const d = c.toDataURL("image/jpeg", q); if (d.length <= AVATAR_MAX_CHARS) return d; }
  }
  throw Object.assign(new Error("Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn."), { code: "avatar/size" });
}

/* Ảnh minh họa của mục: chọn từ máy, thu nhỏ (tối đa 640px) và nén tới khi đủ nhẹ để lưu cùng dữ liệu. */
export const ITEM_IMG_MAX_CHARS = 30000; // Rules cho tối đa 36000
export const isLocalImg = v => typeof v === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= 36000;
export async function fileToItemImage(file) {
  if (!file || !/^image\/(jpeg|png|webp|gif|bmp)$/i.test(file.type || "")) throw Object.assign(new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP."), { code: "img/type" });
  if (file.size > 15 * 1024 * 1024) throw Object.assign(new Error("Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn."), { code: "img/size" });
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch (_) {
    bmp = await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(Object.assign(new Error("Không đọc được ảnh này."), { code: "img/read" })); }; im.src = u; });
  }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
  for (const maxW of [640, 520, 420, 320]) {
    const k = Math.min(1, maxW / w), cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    const c = document.createElement("canvas"); c.width = cw; c.height = ch; const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, cw, ch); x.imageSmoothingQuality = "high"; x.drawImage(bmp, 0, 0, cw, ch);
    for (const q of [0.8, 0.68, 0.56, 0.45]) { const d = c.toDataURL("image/jpeg", q); if (d.length <= ITEM_IMG_MAX_CHARS) return d; }
  }
  throw Object.assign(new Error("Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn."), { code: "img/size" });
}
