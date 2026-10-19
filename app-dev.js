/* ===== DEV PANEL (mọi thao tác kiểm tra quyền ở backend) ===== */
function devBanner(){
  if(!isDevEmail()||me.role==="dev")return"";
  const u=fbAuth&&fbAuth.currentUser;
  if(me.google&&!u)return`<p class="mu" style="margin-top:10px;font-size:13px">${esc(t("dv.google"))}</p>`;
  if(u&&!u.emailVerified)return`<div class="sec" style="margin-top:10px"><p class="mu" style="font-size:13px">${esc(t("dv.verify"))}</p><div class="row"><button class="pri" onclick="devVerifySend(this)">${esc(t("dv.send"))}</button><button onclick="devVerifyDone(this)">${esc(t("dv.done"))}</button></div></div>`;
  return"";
}
async function devVerifySend(b){b.disabled=true;try{await fbAuth.currentUser.sendEmailVerification();toast(t("dv.sent"))}catch(e){toast(t("e.gen"))}b.disabled=false}
async function devVerifyDone(b){b.disabled=true;try{const u=fbAuth.currentUser;await u.reload();await u.getIdToken(true);if(u.emailVerified){toast(t("dv.ok"));devRender()}else toast(t("dv.not"))}catch(e){toast(t("e.gen"))}b.disabled=false}
let devTab="pending";
const DT={pending:"Chờ duyệt",all:"Tất cả bài",games:"Game",cats:"Mục",menu:"Hiển thị menu",reports:"Báo cáo",settings:"Cài đặt"};
const rid=b=>b.closest(".item").dataset.id;
function openDev(){if(!isDev())return toast(t("e.403"));openM($("mDev"));devRender()}
const actChk=a=>[["copy","Sao chép"],["open","Mở"],["download","Tải xuống"]].map(([k,l])=>`<label class="mu cl"><input type="checkbox" value="${k}" ${a.includes(k)?"checked":""}>${l}</label>`).join("");
async function devRender(){
  if(!$("mDev").classList.contains("on"))return;
  $("devBox").innerHTML=`<div class="row" style="margin-top:0;padding-right:40px"><b>Dev Panel</b></div>${devBanner()}<div class="seg" style="margin-top:10px">${Object.entries(DT).map(([k,l])=>`<button class="${devTab===k?"on":""}" onclick="devTab='${k}';devRender()">${l}</button>`).join("")}</div><div id="devBody" style="margin-top:6px"></div>`;
  const body=$("devBody");region(body,"loading");
  try{
    if(devTab==="pending"||devTab==="all"){
      const {posts}=await api("/dev/posts"+(devTab==="pending"?"?status=pending":""));
      if(!posts||!posts.length)return region(body,"empty","Không có bài nào.");
      window._dp=Object.fromEntries(posts.map(p=>[p.id,p]));region(body,"success");
      body.innerHTML=posts.map(p=>`<div class="item"><div><b>${esc(p.title)}</b> ${badge(p.type)} <span class="tag">${esc(p.status)}</span><div class="mu">${esc(p.authorName)} · ${esc(p.authorId||"")}</div></div>
      <div class="row" style="margin:0">${["published","rejected","hidden"].map(s=>`<button onclick="devSet(${jsq(p.id)},{status:'${s}'})">${s}</button>`).join("")}
      <button onclick="devSet(${jsq(p.id)},{featured:${!p.featured}})">★</button><button onclick="devSet(${jsq(p.id)},{pinned:${!p.pinned}})">Ghim</button><button onclick="devSet(${jsq(p.id)},{locked:${!p.locked}})">Khóa</button>
      <button onclick="openForm(_dp[${jsq(p.id)}])">Sửa</button><button class="danger" onclick="devDel(${jsq(p.id)})">Xóa</button></div></div>`).join("");
    }else if(devTab==="games"){
      const {games:g}=await api("/dev/games");region(body,"success");
      body.innerHTML=`<div class="row"><input id="gN" placeholder="Tên game" style="flex:1 1 140px"><input id="gI" placeholder="Ảnh (https hoặc tải lên)" style="flex:1 1 160px"><button onclick="pickFile(v=>{$('gI').value=v},420)">Tải ảnh</button><input id="gD" placeholder="Mô tả" style="flex:1 1 140px"><input id="gO" type="number" placeholder="Thứ tự" style="width:90px"><button class="pri" onclick="devGame()">Thêm</button></div>`+
      (g||[]).map(x=>`<div class="item" data-id="${esc(x.id)}" data-n="${esc(x.name)}"><span style="display:flex;align-items:center;gap:8px">${x.img&&imgSrc(x.img)?`<span class="ci" style="${bgs(x.img)}"></span>`:""}${esc(x.name)} <span class="mu">(${x.published===false?"ẩn":"hiển thị"})</span></span><div class="row" style="margin:0"><button onclick="pickFile(v=>devGame(rid(this),{img:v}),420)">Đổi ảnh</button><button onclick="devGame(rid(this),{published:${x.published===false}})">${x.published===false?"Xuất bản":"Ẩn"}</button><button onclick="devRename(this)">Đổi tên</button><button class="danger" onclick="devGameDel(rid(this))">Xóa</button></div></div>`).join("");
    }else if(devTab==="cats"){
      region(body,"success");
      body.innerHTML=`<div class="item cf"><b>Thêm mục mới (hiện trong menu)</b>
        <input data-k="name" placeholder="Tên mục, ví dụ: Discord" maxlength="24">
        <div class="row" style="margin:0"><input data-k="img" placeholder="Ảnh của mục (https hoặc tải lên)" style="flex:1"><button onclick="pickFile(v=>{this.previousElementSibling.value=v},420)">Tải ảnh</button></div>
        <div class="row" style="margin:0">${actChk(["detail"])}<button class="pri" onclick="devAddCat(this)" style="margin-left:auto">Thêm mục</button></div></div>`+
      (catIds().length?catIds().map(c=>`<div class="item cf" data-id="${esc(c)}"><div class="row" style="margin:0">${ico(c)}<input data-k="name" value="${esc(catName(c))}" maxlength="24" style="flex:1"></div>
        <div class="row" style="margin:0"><input data-k="img" value="${esc(catImg(c))}" placeholder="Ảnh của mục (https hoặc tải lên)" style="flex:1"><button onclick="pickFile(v=>{this.previousElementSibling.value=v},420)">Tải ảnh</button></div>
        <div class="row" style="margin:0">${actChk(catActions(c))}<span style="margin-left:auto;display:flex;gap:8px"><button onclick="saveCat(this)">Lưu</button><button class="danger" onclick="delCat(this)">Xóa</button></span></div></div>`).join(""):'<div class="st" style="min-height:120px">Chưa có mục nào. Thêm mục đầu tiên ở trên.</div>');
    }else if(devTab==="menu"){
      try{const s=await api("/dev/settings");if(s&&s.hiddenNav)siteCfg.hiddenNav=s.hiddenNav}catch(e){}
      region(body,"success");
      const rowH=(k,icon,name,shown)=>`<div class="item"><span style="display:flex;align-items:center;gap:10px">${icon}${esc(name)}</span><label class="sw"><input type="checkbox" ${shown?"checked":""} onchange="toggleNav(${jsq(k)},this.checked)"><i></i><span>Hiện</span></label></div>`;
      body.innerHTML=`<p class="mu" style="margin:10px 0 0">Tắt công tắc để ẩn mục khỏi menu của người dùng. Dev vẫn thấy mục bị ẩn (có nhãn "Đang ẩn") để bật lại.</p>`+
        rowH("games",svg("game"),"Game",!navHidden("games"))+rowH("world",svg("world"),"World",!navHidden("world"))+
        catIds().map(c=>rowH("c:"+c,ico(c)||svg("hash"),catName(c),!catHidden(c))).join("");
    }else if(devTab==="reports"){
      const {reports}=await api("/dev/reports");
      if(!reports||!reports.length)return region(body,"empty","Không có báo cáo.");
      region(body,"success");
      body.innerHTML=reports.map(r=>`<div class="item" data-id="${esc(r.id)}"><div style="min-width:0;flex:1"><div class="row" style="margin:0">${r.kind?`<span class="tag bd">${esc(t("rk."+r.kind))}</span>`:""}${r.severity?`<span class="tag">${esc(t("rs."+r.severity))}</span>`:""}<span class="mu">${esc(r.authorName||"")}${r.refType?" · "+esc(r.refType)+" "+esc(r.refId||""):r.postId?" · bài "+esc(r.postId):""}</span></div><div style="margin-top:6px;white-space:pre-wrap;word-break:break-word">${esc(r.text||r.reason||"")}</div></div>
        <div class="row" style="margin:0">${r.authorId?`<button onclick="devReply(${jsq(r.authorId)})">Trả lời</button>`:""}<button onclick="devDone(rid(this))">Đã xử lý</button></div></div>`).join("");
    }else{
      const s=await api("/dev/settings");region(body,"success");
      body.innerHTML=`<label class="row sw" style="margin-top:14px"><input type="checkbox" id="sMod" ${s.moderation===true?"checked":""}><i></i><span>Bật kiểm duyệt bài mới</span></label><div class="row"><input id="sAnn" placeholder="Thông báo hiển thị ở trang chủ" value="${esc(s.announcement||"")}" style="flex:1"><button class="pri" onclick="devSettings()">Lưu</button></div>`;
    }
  }catch(e){region(body,"error",e,devRender)}
}
function devReply(uid){closeM($("mDev"));go("inbox/"+encodeURIComponent(uid))}
async function devDone(id){try{await api("/dev/reports/"+id,"DELETE");devRender()}catch(e){toast(e.message)}}
async function devSettings(){
  const hn=siteCfg.hiddenNav||{};
  try{await api("/dev/settings","POST",{moderation:$("sMod").checked,announcement:$("sAnn").value,hiddenNav:hn});siteCfg.announcement=$("sAnn").value;if(view==="home")renderHead();toast(t("saved"))}catch(e){toast(e.message)}
}
async function toggleNav(k,show){
  try{
    if(k.startsWith("c:")){
      const c=k.slice(2),d={name:catName(c),img:catImg(c),actions:catActions(c),hidden:!show};
      const r=await api("/dev/categories/"+c,"POST",d);cats[c]=r&&typeof r==="object"&&r.name?r:{...cats[c],...d};
    }else{
      const hn={...(siteCfg.hiddenNav||{}),[k]:!show};
      let s={};try{s=await api("/dev/settings")}catch(e){}
      await api("/dev/settings","POST",{moderation:s.moderation===true,announcement:s.announcement||"",hiddenNav:hn});siteCfg.hiddenNav=hn;
    }
    renderNav();renderPop();toast(t("saved"));
  }catch(e){toast(e.message);devRender()}
}
const catData=it=>({name:it.querySelector('[data-k=name]').value.trim(),img:it.querySelector('[data-k=img]').value.trim(),actions:[...it.querySelectorAll("input[type=checkbox]:checked")].map(i=>i.value)});
function catOk(d){
  if(!d.name)return"Hãy nhập tên mục";
  if(d.img&&!imgSrc(d.img))return"Ảnh không hợp lệ (cần https:// hoặc tải ảnh lên)";
  return"";
}
async function devAddCat(b){
  const d=catData(b.closest(".item")),er=catOk(d);if(er)return toast(er);
  if(!d.actions.length)d.actions=["detail"];
  try{
    const r=await api("/categories","POST",d);
    let c=r;try{c=await api("/dev/categories/"+r.id,"POST",d)}catch(e){}
    cats[r.id]=c&&typeof c==="object"?c:r;fillCats();devRender();toast("Đã thêm mục "+d.name);
  }catch(e){toast(e.message)}
}
async function saveCat(b){
  const it=b.closest(".item"),c=it.dataset.id,d=catData(it),er=catOk(d);if(er)return toast(er);
  if(!d.actions.length)d.actions=["detail"];
  d.hidden=catHidden(c);
  try{cats[c]=await api("/dev/categories/"+c,"POST",d);fillCats();devRender();toast(t("saved"))}catch(e){toast(e.message)}
}
async function delCat(b){
  const c=rid(b);if(!await yes({title:"Xóa mục này?",ok:t("del"),danger:true}))return;
  try{await api("/dev/categories/"+c,"DELETE");delete cats[c];fillCats();devRender()}catch(e){toast(e.message)}
}
const devSet=async(id,b)=>{try{await api("/dev/posts/"+id,"POST",b);devRender();loadPosts()}catch(e){toast(e.message)}};
const devDel=async id=>{if(!await yes({title:"Xóa vĩnh viễn?",ok:t("del"),danger:true}))return;try{await api("/posts/"+id,"DELETE");devRender();loadPosts()}catch(e){toast(e.message)}};
async function devGame(id,patch){
  try{
    if(!patch){
      const d={name:$("gN").value.trim(),img:$("gI").value.trim(),desc:$("gD").value,order:+$("gO").value||0};
      if(!d.name)return toast("Hãy nhập tên game");
      if(d.img&&!imgSrc(d.img))return toast("Ảnh không hợp lệ (cần https:// hoặc tải ảnh lên)");
      await api("/dev/games","POST",d);
    }else await api("/dev/games","POST",{id,...patch});
    devRender();loadGames();
  }catch(e){toast(e.message)}
}
async function devRename(b){const n=await ask({title:"Tên mới",input:"text",value:b.closest(".item").dataset.n,max:40,ok:t("save")});if(n&&n.trim())devGame(rid(b),{name:n.trim()})}
async function devGameDel(id){if(!await yes({title:"Xóa game?",ok:t("del"),danger:true}))return;try{await api("/dev/games/"+id,"DELETE");devRender();loadGames()}catch(e){toast(e.message)}}
;(window.__ok=window.__ok||[]).push("app-dev.js");
