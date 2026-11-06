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
