/* Tạo chuỗi VietQR (chuẩn EMVCo / NAPAS 247) để mọi ứng dụng ngân hàng quét được.
   Khung chuỗi được đối chiếu với đúng mã QR tĩnh của Techcombank mà chủ web cung cấp
   (xem tests/shop.test.mjs: dựng lại "không số tiền" phải trùng từng ký tự, kể cả CRC). */

const tlv = (id, v) => id + String(v.length).padStart(2, "0") + v;

function crc16(s) { /* CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF */
  let c = 0xffff;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}
/* Chỉ giữ ký tự an toàn (không dấu, chữ + số + khoảng trắng) và tối đa 25 ký tự cho nội dung chuyển khoản */
const clean = (s, max) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, c => (c === "đ" ? "d" : "D")).replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, max);

/* o: { bin, account, amount?, content?, merchant?, city? } → chuỗi dữ liệu của mã QR */
function vietqr(o) {
  const bin = String(o.bin || ""), acc = String(o.account || "");
  if (!/^\d{6}$/.test(bin) || !/^\d{6,19}$/.test(acc)) throw new Error("bad bank");
  const amount = o.amount != null ? Math.round(Number(o.amount)) : 0;
  const dynamic = amount > 0;
  const member = tlv("00", bin) + tlv("01", acc);
  const merchantInfo = tlv("00", "A000000727") + tlv("01", member) + tlv("02", "QRIBFTTA");
  let s = tlv("00", "01") + tlv("01", dynamic ? "12" : "11") + tlv("38", merchantInfo) + tlv("52", "6011") + tlv("53", "704");
  if (dynamic) s += tlv("54", String(amount));
  s += tlv("58", "VN") + tlv("59", clean(o.merchant || "TCB", 25) || "TCB") + tlv("60", clean(o.city || "Hanoi", 15) || "Hanoi");
  const content = clean(o.content, 25);
  if (content) s += tlv("62", tlv("08", content));
  s += "6304";
  return s + crc16(s);
}
module.exports = { vietqr, crc16, clean };
