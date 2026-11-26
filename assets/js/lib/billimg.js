/* Thu nhỏ ảnh (bill chuyển tiền, mã QR) về JPEG ≤ ~280 KB trong trình duyệt trước khi gửi lên máy chủ. */
export const BILL_MAX_BYTES = 280 * 1024;
const bytesOf = d => Math.floor((d.length - d.indexOf(",") - 1) * 0.75);
export async function fileToBill(file, widths = [1100, 900, 720, 560, 420]) {
  if (!file || !/^image\/(jpeg|png|webp|gif|bmp)$/i.test(file.type || "")) throw Object.assign(new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP."), { code: "img/type" });
  if (file.size > 20 * 1024 * 1024) throw Object.assign(new Error("Ảnh quá lớn, hãy chọn ảnh nhỏ hơn."), { code: "img/size" });
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch (_) {
    bmp = await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(Object.assign(new Error("Không đọc được ảnh này."), { code: "img/read" })); }; im.src = u; });
  }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
  if (!w || !h) throw Object.assign(new Error("Không đọc được ảnh này."), { code: "img/read" });
  for (const maxW of widths) {
    const k = Math.min(1, maxW / w), cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    const c = document.createElement("canvas"); c.width = cw; c.height = ch; const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, cw, ch); x.imageSmoothingQuality = "high"; x.drawImage(bmp, 0, 0, cw, ch);
    for (const q of [0.86, 0.74, 0.62, 0.5]) { const d = c.toDataURL("image/jpeg", q); if (bytesOf(d) <= BILL_MAX_BYTES) return d; }
  }
  throw Object.assign(new Error("Ảnh vẫn quá nặng, hãy chọn ảnh khác."), { code: "img/size" });
}
