/* Đoạn quá dài thì thu gọn, kèm nút "Hiển thị tất cả" / "Thu gọn". Nút chỉ hiện khi nội dung thật sự dài hơn khung. */
let uid = 0;
const mkBtn = (target, labelOpen = "Thu gọn", labelClosed = "Hiển thị tất cả") => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "more-btn"; b.textContent = labelClosed; b.setAttribute("aria-expanded", "false");
  if (!target.id) target.id = "cl" + (++uid);
  b.setAttribute("aria-controls", target.id);
  b.addEventListener("click", () => {
    const open = target.classList.toggle("open");
    b.textContent = open ? labelOpen : labelClosed; b.setAttribute("aria-expanded", String(open));
  });
  return b;
};
/* Đoạn văn: thêm class "clamp" (cao tối đa --cl dòng); nếu ngắn hơn thì bỏ clamp, không có nút */
export function clampText(el, lines = 6) {
  if (!el || el.dataset.clampDone) return;
  el.dataset.clampDone = "1"; el.classList.add("clamp"); el.style.setProperty("--cl", String(lines));
  const check = () => {
    if (!el.isConnected) return;
    if (el.scrollHeight <= el.clientHeight + 2) { el.classList.remove("clamp"); return; }
    el.after(mkBtn(el));
  };
  requestAnimationFrame(() => requestAnimationFrame(check));
}
/* Danh sách dài: chỉ hiện n mục đầu, phần còn lại ẩn tới khi bấm "Hiển thị tất cả" */
export function clampList(box, n = 5) {
  const kids = [...box.children]; if (kids.length <= n + 1) return;
  box.classList.add("clist"); kids.slice(n).forEach(k => k.classList.add("xtra"));
  const b = mkBtn(box, "Thu gọn", "Hiển thị tất cả (" + (kids.length - n) + " mục nữa)");
  b.addEventListener("click", () => { if (!box.classList.contains("open")) b.textContent = "Hiển thị tất cả (" + (kids.length - n) + " mục nữa)"; });
  box.after(b);
}
