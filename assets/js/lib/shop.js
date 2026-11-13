/* Tầng dữ liệu cửa hàng: hàng hóa, mục lục, ví, đơn hàng, lịch sử giao dịch, giỏ hàng.
   Trình duyệt CHỈ ĐỌC ví / đơn / giao dịch; mọi thay đổi tiền đi qua /api/account (máy chủ), xem api/_lib/shop.js. */
import { db } from "./firebase.js";
import { session, onAuth } from "./auth.js";
import { api, apiMessage } from "./account.js";
import { dlog } from "./log.js";

export const SHOP = "nox_shop";
export const shop = { items: null, cats: null, wallet: null, orders: null, txs: null, topups: null, info: null, connected: false };
const subs = new Set();
export const subscribeShop = fn => { subs.add(fn); return () => subs.delete(fn); };
const emit = t => subs.forEach(f => { try { f(t); } catch (e) { console.error(e); } });

/* ───── Định dạng ───── */
const NF = new Intl.NumberFormat("vi-VN");
export const money = n => NF.format(Math.max(0, Math.floor(Number(n) || 0))) + " ₫";
export const moneyShort = n => { n = Math.floor(Number(n) || 0); return n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace(/\.0$/, "") + "tr" : n >= 1e3 ? Math.floor(n / 1e3) + "k" : String(n); };
export const signedMoney = n => (n > 0 ? "+" : n < 0 ? "−" : "") + money(Math.abs(n));

/* ───── Chuẩn hóa dữ liệu ───── */
export const MODES = { text: "Giao tự động: cùng một nội dung (link, mã…)", lines: "Giao tự động: mỗi dòng là một sản phẩm (key, tài khoản…)", manual: "Giao tay: dev gửi qua hộp thư" };
export function normProduct(id, o) {
  o = o && typeof o === "object" ? o : {};
  const imgs = Object.keys(o.imgs || {}).sort().map(k => o.imgs[k]).filter(v => typeof v === "string");
  const gallery = [o.img].concat(imgs).filter(v => typeof v === "string" && v);
  return {
    id, name: String(o.name || "(không tên)"), desc: String(o.desc || ""), price: Math.max(0, Math.floor(Number(o.price) || 0)), cat: String(o.cat || ""),
    stock: typeof o.stock === "number" ? Math.max(0, Math.floor(o.stock)) : null, mode: o.mode === "lines" || o.mode === "manual" ? o.mode : "text",
    gallery, img: gallery[0] || "", active: o.active !== false, sold: Math.floor(Number(o.sold) || 0), sort: Number(o.sort) || 0, createdAt: Number(o.createdAt) || 0
  };
}
export const soldOut = p => p.stock !== null && p.stock <= 0;
export const stockLabel = p => (p.stock === null ? "Còn hàng" : p.stock <= 0 ? "Hết hàng" : "Còn " + p.stock);
export const productById = id => (shop.items || []).find(p => p.id === id) || null;
export const visibleProducts = () => (shop.items || []).filter(p => p.active);
export const catList = () => (shop.cats || []).slice();
export const catName = id => { const c = (shop.cats || []).find(x => x.id === id); return c ? c.name : ""; };

/* ───── Lắng nghe ───── */
const live = (path, cb) => { if (!db) { cb(null, true); return () => {}; } const ref = db.ref(path), h = ref.on("value", s => cb(s.val(), false), e => { dlog("er", "Shop: " + (e.code || e.message)); cb(null, true); }); return () => ref.off("value", h); };
let offPub = [], offUser = [], uidNow = "", started = false;
const rows = v => Object.keys(v || {}).map(k => ({ id: k, ...v[k] }));
export function startShop() {
  if (started) return; started = true;
  offPub = [
    live(SHOP + "/items", v => { shop.items = rows(v).map(r => normProduct(r.id, r)).sort((a, b) => (b.sort - a.sort) || (b.createdAt - a.createdAt)); emit("items"); }),
    live(SHOP + "/cats", v => { shop.cats = rows(v).map(r => ({ id: r.id, name: String(r.name || ""), sort: Number(r.sort) || 0, icon: r.icon || "" })).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "vi")); emit("cats"); })
  ];
  onAuth(syncUser);
}
const real = () => !!(session.user && !session.isGuest);
function syncUser() {
  const uid = real() ? session.user.uid : "";
  if (uid === uidNow) return; uidNow = uid;
  offUser.forEach(f => f()); offUser = [];
  shop.wallet = null; shop.orders = null; shop.txs = null; shop.topups = null; shop.info = null; emit("wallet");
  if (!uid) return;
  offUser = [
    live("nox_wallet/" + uid, v => { shop.wallet = v ? { balance: Math.floor(v.balance || 0), code: v.code || "" } : { balance: 0, code: "" }; emit("wallet"); }),
    live("nox_orders/" + uid, v => { shop.orders = rows(v).sort((a, b) => (b.ts || 0) - (a.ts || 0)); emit("orders"); }),
    live("nox_txs/" + uid, v => { shop.txs = rows(v).sort((a, b) => (b.ts || 0) - (a.ts || 0)); emit("txs"); }),
    live("nox_topups/" + uid, v => { shop.topups = rows(v).sort((a, b) => (b.ts || 0) - (a.ts || 0)); emit("topups"); })
  ];
}
export const balance = () => (shop.wallet ? shop.wallet.balance : 0);
export const canUseWallet = () => real() && !!session.user.emailVerified;

/* ───── Giỏ hàng (lưu trong trình duyệt này) ───── */
const CK = "ssw_cart";
let cart = (() => { try { const v = JSON.parse(localStorage.getItem(CK)); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch (_) { return {}; } })();
const saveCart = () => { try { localStorage.setItem(CK, JSON.stringify(cart)); } catch (_) {} emit("cart"); };
export const cartCount = () => Object.values(cart).reduce((s, q) => s + (Number(q) || 0), 0);
export const cartLines = () => Object.keys(cart).map(id => ({ id, qty: cart[id], p: productById(id) })).filter(l => l.p && l.p.active);
export const cartTotal = () => cartLines().reduce((s, l) => s + l.p.price * l.qty, 0);
export function addToCart(id, qty = 1) {
  const p = productById(id); const max = p && p.stock !== null ? p.stock : 99;
  cart[id] = Math.max(1, Math.min(99, Math.min(max || 1, (cart[id] || 0) + qty))); saveCart();
}
export function setQty(id, qty) { qty = Math.floor(Number(qty) || 0); if (qty <= 0) delete cart[id]; else { const p = productById(id); cart[id] = Math.min(99, p && p.stock !== null ? Math.max(1, p.stock) : 99, qty); } saveCart(); }
export function clearCart(ids) { (ids || Object.keys(cart)).forEach(id => { delete cart[id]; }); saveCart(); }
addEventListener("storage", e => { if (e.key === CK) { try { cart = JSON.parse(e.newValue) || {}; } catch (_) { cart = {}; } emit("cart"); } });

/* ───── Gọi máy chủ ───── */
const err = (r, extra) => Object.assign(new Error((extra && extra[r.code]) || SHOP_MSG[r.code] || apiMessage(r)), { code: "api/" + r.code, res: r });
const SHOP_MSG = {
  bad_amount: "Số tiền từ 10.000 đến 50.000.000 ₫, làm tròn đến nghìn đồng.", insufficient: "Số dư không đủ. Hãy nạp thêm tiền vào ví.", out_of_stock: "Rất tiếc, có món đã hết hàng hoặc không đủ số lượng.",
  gone: "Có món trong giỏ không còn bán nữa.", bad_cart: "Giỏ hàng không hợp lệ. Hãy kiểm tra lại số lượng.", banned: "Tài khoản này đang bị khóa.", conflict: "Hệ thống đang bận, hãy thử lại.",
  bad_file: "Tệp này không được hỗ trợ. Hãy gửi ảnh, video, PDF, ZIP hoặc tệp văn bản.", too_big: "Tệp quá lớn.", too_many_files: "Cuộc trò chuyện này đã đạt giới hạn số tệp.", closed: "Cuộc trò chuyện này đã đóng.", muted: "Bạn đang bị tắt tiếng nên chưa gửi được tệp.",
  unverified: "Hãy xác minh email trước khi dùng ví và mua hàng.", not_configured: "Cửa hàng chưa được bật trên máy chủ. Quản trị viên cần cấu hình Firebase Admin."
};
async function call(action, body) { const r = await api(action, body); if (!r.ok) throw err(r); return r; }
export async function loadWalletInfo(force) { if (shop.info && !force) return shop.info; const r = await call("wallet-info"); shop.info = r; emit("info"); return r; }
export const createTopup = amount => call("topup-create", { amount });
export async function checkout(lines) { const r = await call("shop-buy", { items: lines.map(l => ({ id: l.id, qty: l.qty })) }); clearCart(lines.map(l => l.id)); return r; }
export const devAdjust = (uid, amount, note) => call("wallet-adjust", { uid, amount, note });
export const devAssign = (hook, uid) => call("bank-assign", { hook, uid });
export const devRefund = (uid, oid) => call("order-refund", { uid, oid });
export const devShopStatus = () => call("shop-status");
