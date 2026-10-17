/* ===== CÀI ĐẶT ===== */
function openSettings(sec){openM($("mSet"));renderSettings();if(sec){const e=$("sec-"+sec);if(e)setTimeout(()=>e.scrollIntoView({block:"start",behavior:"smooth"}),80)}}
function seg(items,cur,fn){return `<div class="seg">${items.map(([k,l])=>`<button class="${cur===k?"on":""}" onclick="${fn}('${k}')">${esc(l)}</button>`).join("")}</div>`}
function renderSettings(){
  let h=`<div class="sec"><h3>${esc(t("s.theme"))}</h3>${seg([["light",t("s.light")],["dark",t("s.dark")],["system",t("s.system")]],themePref,"setTheme")}</div>
  <div class="sec"><h3>${esc(t("s.lang"))}</h3>${seg([["vi","Tiếng Việt"],["en","English"]],lang,"setLang")}</div>`;
  if(!me)h+=`<div class="sec"><p class="mu" style="font-size:13px">${esc(t("s.guest"))}</p><div class="row"><button class="pri" onclick="closeM($('mSet'));openAuth()">${esc(t("login"))}</button></div></div>`;
  else{
    const hasPw=me.hasPassword!==false;
    const nameLock=(me.nameChangedAt||0)+NAME_CD>srvNow(),idLock=!!(me.handleSet||me.handle);
    h+=`<div class="sec" id="sec-profile"><h3>${esc(t("s.profile"))}</h3>
      <div class="prow">${avatar(me.name,me.pic,"xl")}<div><button onclick="pickFile(setAvatar,300)">${svg("image",16)}${esc(t("s.avatar"))}</button></div></div>
      <label class="mu" style="display:block;margin:12px 0 4px" for="stBio">${esc(t("s.bio"))}</label><textarea id="stBio" maxlength="200" placeholder="${esc(t("s.bio.ph"))}">${esc(me.bio||"")}</textarea>
      <div class="row"><button class="pri" onclick="saveProfile()">${esc(t("save"))}</button></div></div>
    <div class="sec"><h3>${esc(t("s.name"))}</h3><input id="stName" maxlength="24" value="${esc(me.name)}" autocapitalize="off" spellcheck="false" ${nameLock?"disabled":""}><div class="fm${nameLock?" warn":""}" id="stNameMsg">${esc(nameLock?t("s.name.cool",new Date((me.nameChangedAt||0)+NAME_CD).toLocaleString(loc())):t("s.name.hint"))}</div><div class="row" style="margin-top:0"><button class="pri" onclick="saveName()" ${nameLock?"disabled":""}>${esc(t("save"))}</button></div></div>
    <div class="sec" id="sec-id"><h3>${esc(t("s.id"))}</h3><p class="mu" style="font-size:13px;word-break:break-all">${esc(t("s.id.now",idOf(me)))}</p>
      ${idLock?`<p class="fm ok">${esc(t("s.id.locked"))}</p>`:`<p class="mu" style="margin:4px 0 8px">${esc(t("s.id.hint"))}</p><input id="stId" maxlength="20" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="${esc(t("s.id.ph"))}"><div class="fm" id="stIdMsg"></div><div class="row" style="margin-top:0"><button class="pri" onclick="saveHandle()">${esc(t("s.id.save"))}</button></div>`}</div>
    <div class="sec"><h3>${esc(t("s.pass"))}</h3>
      ${hasPw?`<div class="pw"><input id="pwCur" type="password" maxlength="64" autocomplete="current-password" placeholder="${esc(t("s.pass.cur"))}"><button type="button" class="eye" onclick="eye('pwCur',this)">${svg("eye")}</button></div>`:""}
      <div class="pw" style="margin-top:8px"><input id="pwNew" type="password" maxlength="64" autocomplete="new-password" placeholder="${esc(t("s.pass.new"))}"><button type="button" class="eye" onclick="eye('pwNew',this)">${svg("eye")}</button></div>
      <div class="pw" style="margin-top:8px"><input id="pwNew2" type="password" maxlength="64" autocomplete="new-password" placeholder="${esc(t("s.pass.new2"))}"><button type="button" class="eye" onclick="eye('pwNew2',this)">${svg("eye")}</button></div>
      <div class="fm" id="stPwMsg"></div><div class="row" style="margin-top:0"><button class="pri" onclick="savePass()">${esc(t("save"))}</button></div></div>
    <div class="sec"><h3>Gmail</h3><p class="mu" style="font-size:13px">${me.email?esc(me.email):esc(t("s.gmail.none"))}</p>
      ${me.google?`<p class="fm ok">Google</p>`:""}
      <div class="fm" id="gLinkMsg"></div></div>`;
  }
  $("setBody").innerHTML=h;
}
function setTheme(p){applyTheme(p,true);renderSettings()}
function setAvatar(id){
  api("/me/profile","POST",{pic:id,bio:me.bio||""}).then(u=>{bustUser();Object.assign(me,u,{pic:u.pic||id});renderAuth();renderSettings();toast(t("s.profile.done"))}).catch(e=>toast(e.message));
}
async function saveProfile(){
  try{const u=await api("/me/profile","POST",{bio:$("stBio").value.trim(),pic:me.pic||""});bustUser();Object.assign(me,u);renderAuth();toast(t("s.profile.done"))}catch(e){toast(e.message)}
}
async function saveName(){
  const v=$("stName").value.trim(),e=vName(v);
  if(e)return setMsg("stNameMsg",e,"bad");
  if(v===me.name)return setMsg("stNameMsg",t("s.name.same"),"warn");
  if(!await yes({title:t("s.name.confirm"),text:t("s.name.confirm.t"),ok:t("save")}))return;
  try{const u=await api("/me/name","POST",{name:v});bustUser();Object.assign(me,u,{name:u.name||v});renderAuth();renderSettings();toast(t("s.name.done"))}
  catch(er){setMsg("stNameMsg",er.status===409?t("n.taken"):er.message,"bad")}
}
async function saveHandle(){
  const v=$("stId").value.trim().replace(/^@/,""),e=vHandle(v);
  if(e)return setMsg("stIdMsg",e,"bad");
  if(!await yes({title:t("s.id.confirm"),text:t("s.id.confirm.t",v),ok:t("s.id.save"),danger:true}))return;
  try{const u=await api("/me/handle","POST",{handle:v});Object.assign(me,u);renderAuth();renderSettings();toast(t("s.id.done"))}
  catch(er){setMsg("stIdMsg",er.message,"bad")}
}
async function savePass(){
  const cur=$("pwCur")?$("pwCur").value:"",n1=$("pwNew").value,n2=$("pwNew2").value;
  if($("pwCur")&&!cur)return setMsg("stPwMsg",t("v.pw.empty"),"bad");
  const e=pwErr(n1);if(e)return setMsg("stPwMsg",e,"bad");
  if(n1!==n2)return setMsg("stPwMsg",t("v.pw.diff"),"bad");
  if(cur&&cur===n1)return setMsg("stPwMsg",t("s.pass.same"),"bad");
  try{await api("/me/password","POST",{current:cur,password:n1});me.hasPassword=true;renderSettings();toast(t("s.pass.done"))}
  catch(er){setMsg("stPwMsg",er.status===401?t("s.pass.wrong"):er.message,"bad")}
}

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

