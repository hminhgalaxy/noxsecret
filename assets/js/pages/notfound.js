import { ICO } from "../lib/icons.js";
export function mount(ctx) {
  ctx.setPage({ hero: true, title: "Không tìm thấy trang", noindex: true });
  ctx.el.innerHTML = `<div class="statebox nf"><div class="nf-code" aria-hidden="true">404</div><h1 class="sr">Không tìm thấy trang</h1>
    <p>Trang bạn đang tìm không tồn tại hoặc đã được chuyển đi nơi khác.</p>
    <div class="acts"><a class="btn primary" href="/">${ICO.home}Về trang chủ</a><button class="btn ghost" type="button" id="bk">${ICO.back}Quay lại</button></div></div>`;
  ctx.el.querySelector("#bk").onclick = () => history.length > 1 ? history.back() : ctx.navigate("/");
}
