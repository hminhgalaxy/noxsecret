/* ===== GIAO DIỆN SÁNG / TỐI ===== */
let themePref="light";try{themePref=localStorage.getItem("theme")||"light"}catch(e){}
const mq=window.matchMedia?matchMedia("(prefers-color-scheme:dark)"):null;
function applyTheme(p,save){
  themePref=p;if(save){try{localStorage.setItem("theme",p)}catch(e){}}
  const d=p==="system"?(mq&&mq.matches?"dark":"light"):p;
  document.documentElement.dataset.theme=d;$("tc").content=d==="dark"?"#09090b":"#f4f4f5";
}
if(mq&&mq.addEventListener)mq.addEventListener("change",()=>{if(themePref==="system")applyTheme("system")});
function setLang(l){
  lang=l==="en"?"en":"vi";try{localStorage.setItem("lang",lang)}catch(e){}
  applyStatic();renderAuth();if(view==="home")renderPosts();else show(view,viewArg,true);
  if($("mSet").classList.contains("on"))renderSettings();
}

/* ===== MỤC (do dev tạo) + ẩn/hiện menu ===== */
const catIds=()=>Object.keys(cats).filter(c=>!BASE.includes(c)&&/^[\w-]+$/.test(c));
const catHidden=c=>!!(cats[c]&&cats[c].hidden);
const navCats=()=>catIds().filter(c=>isDev()||!catHidden(c));
const navHidden=k=>!!(siteCfg.hiddenNav&&siteCfg.hiddenNav[k]);
const catName=c=>(cats[c]&&cats[c].name)||BN[c]||c;
const catActions=c=>(cats[c]&&cats[c].actions)||DEFACT[c]||["detail"];
const catImg=c=>(cats[c]&&cats[c].img)||"";
const badge=ty=>`<span class="tag bd">${esc(catName(ty))}</span>`;
const ico=c=>catImg(c)&&imgSrc(catImg(c))?`<span class="ci" style="${bgs(catImg(c))}"></span>`:"";
const isDev=()=>isDevMe();
function fillType(sel){
  const ids=navCats();if(sel&&!ids.includes(sel))ids.push(sel);
  $("fpType").innerHTML=ids.length?ids.map(i=>`<option value="${esc(i)}">${esc(catName(i))}</option>`).join(""):`<option value="">${esc(t("f.nocat"))}</option>`;
  if(sel&&ids.includes(sel))$("fpType").value=sel;
}
function fillCats(){fillType($("fpType").value);renderNav();renderPop();if(all.length&&view==="home")renderPosts()}
async function loadCats(){
  try{const d=(await dbGet("pub/categories"))||{};cats={};for(const[k,v]of Object.entries(d))cats[k]=typeof v==="string"?{name:v,actions:["detail"]}:v}catch(e){cats={}}
  fillCats();
}
async function loadCfg(){
  try{siteCfg=(await dbGet("pub/settings"))||{}}catch(e){siteCfg={}}
  renderNav();renderPop();if(view==="home")renderHead();
  if(!isDev()&&((view==="games"&&navHidden("games"))||(view==="world"&&navHidden("world"))))go("");
}
function addCat(){if(!isDev())return toast(t("f.onlydev"));closeM($("mForm"));devTab="cats";openDev()}

/* ===== TÀI KHOẢN ===== */
function renderAuth(){
  const a=$("accBtn"),d=$("dauth");
  $("inboxBtn").hidden=!me;
  if(!me){
    a.innerHTML=svg("user");a.setAttribute("aria-label",t("login"));
    d.innerHTML=authReady?`<button class="pri" onclick="openAuth('login');toggleMenu(false)">${esc(t("login"))}</button><button onclick="openAuth('reg');toggleMenu(false)">${esc(t("register"))}</button>`:"";
  }else{
    a.innerHTML=avatar(me.name,me.pic);a.setAttribute("aria-label",t("a.profile"));
    d.innerHTML=`<div class="au lk" onclick="openProfile(${jsq(me.userId)});toggleMenu(false)">${avatar(me.name,me.pic,true)}<div><b>${esc(me.name)}${devTag(me.role)}</b><span class="mu">${esc(idOf(me))}</span></div></div><button onclick="logout()">${svg("logout",16)}${esc(t("logout"))}</button>`;
  }
  renderNav();renderPop();
}
const onAcc=()=>me?openProfile(me.userId):openAuth();
/* Đăng nhập / đăng ký là TRANG RIÊNG (login.html / register.html), không còn popup. Quay lại đúng chỗ đang xem sau khi xong. */
function openAuth(m){
  const next=location.pathname+location.search+location.hash;
  location.href=(m==="reg"?"register.html":"login.html")+"?next="+encodeURIComponent(next);
}
function eye(id,b){const i=$(id),s=i.type==="password";i.type=s?"text":"password";b.innerHTML=svg(s?"eyeoff":"eye");b.setAttribute("aria-label",t(s?"a.hidepw":"a.showpw"))}
function vName(v){
  if(!v)return t("v.name.empty");
  if(/\s/.test(v))return t("v.name.space");
  if(v.length<3)return t("v.name.short");
  if(v.length>24)return t("v.name.long");
  if(!/^[\p{L}\p{N}_]+$/u.test(v))return t("v.name.chars");
  return"";
}
function vHandle(v){
  if(!v)return t("v.id.empty");
  if(/\s/.test(v))return t("v.name.space");
  if(v.length<3)return t("v.id.short");
  if(v.length>20)return t("v.id.long");
  if(!/^[A-Za-z0-9_]+$/.test(v))return t("v.id.chars");
  return"";
}
function vEmail(v){
  if(!v)return t("v.em.empty");
  if(/\s/.test(v))return t("v.em.space");
  if(!v.includes("@"))return t("v.em.at");
  const p=v.split("@");
  if(p.length>2)return t("v.em.at2");
  if(p[1]!=="gmail.com")return t("v.em.dom");
  if(p[0].length<6||p[0].length>30)return t("v.em.len");
  if(!/^[a-z0-9.]+$/.test(p[0]))return t("v.em.chars");
  if(/^\.|\.$|\.\./.test(p[0]))return t("v.em.dots");
  return"";
}
function pwCheck(p){
  const r={len:p.length>=8,up:/\p{Lu}/u.test(p),sp:/[^\p{L}\p{N}\s]/u.test(p),ns:!/\s/.test(p)};
  const extra=[/\p{Ll}/u.test(p),/\d/.test(p),p.length>=12].filter(Boolean).length;
  let lv=p?1:0;
  if(r.len&&r.up&&r.sp&&r.ns){lv=2;if(extra===3)lv=3}
  return{r,lv};
}
function pwErr(p){
  if(!p)return t("v.pw.empty");
  if(/\s/.test(p))return t("v.pw.space");
  if(pwCheck(p).lv<2)return t("v.pw.weak");
  return"";
}
function afterAuth(){
  /* làm mới toàn bộ dữ liệu theo tài khoản mới, không cần tải lại trang */
  wList=[];wRep={};wGroups=[];homeDirty=true;unreadFails=0;
  renderAuth();pollUnread();loadRoles();loadCats();loadCfg();loadGames();
  show(view,viewArg,true);if(/^#\/post\//.test(location.hash)&&!openId)openFromHash();
}
async function logout(){
  try{localStorage.removeItem(GKEY)}catch(e){}
  try{await api("/auth/logout","POST")}catch(e){}
  me=null;myVotes={};wList=[];wRep={};wGroups=[];setUnread(0);toggleMenu(false);closeRoom();renderAuth();
  if(["mine","liked","inbox"].includes(view))go("");else show(view,viewArg,true);
}
/* Khôi phục phiên: tối đa chờ 3 giây — web (bài, game, mục…) KHÔNG phụ thuộc đăng nhập nên luôn hiện được dù Auth chậm */
let booted=false;
async function restore(){
  const gs=googleSession();
  if(gs){try{me=await googleMe(gs)}catch(e){console.warn("[google]",e)}loadRoles();authReady=true;return}
  try{
    if(fbInit()){
      let first;const fp=new Promise(r=>first=r);
      fbAuth.onAuthStateChanged(async()=>{
        try{await syncAuth(!booted)}catch(e){console.warn("[auth]",e)}
        first();
      });
      await Promise.race([fp,new Promise(r=>setTimeout(r,3000))]);
    }
  }catch(e){console.warn("[restore]",e)}
  loadRoles();authReady=true;
}

/* --- Gắn Gmail vào tài khoản đang đăng nhập (đăng nhập Google nằm ở login.html) --- */
async function linkGoogle(btn){
  if(btn)btn.disabled=true;setMsg("gLinkMsg",t("g.verify"));
  try{const u=await api("/me/link-popup","POST");Object.assign(me,u,{googleLinked:true});renderAuth();renderSettings();toast(t("s.gmail.done"))}
  catch(e){setMsg("gLinkMsg",e.message,"bad");if(btn)btn.disabled=false}
}

/* ===== ĐIỀU HƯỚNG ===== */
const viewHash=()=>"#/"+({home:curGame?"g/"+curGame:curType?"c/"+curType:"",games:"games",world:"world",liked:"liked",mine:"mine",inbox:"inbox"+(viewArg?"/"+encodeURIComponent(viewArg):""),profile:"u/"+encodeURIComponent(viewArg)}[view]||"");
function go(h){
  const n="#/"+h;
  if(location.hash===n||(h===""&&(location.hash===""||location.hash==="#"||location.hash==="#/")))route();
  else location.hash=n;
}
function route(){
  const p=location.hash.replace(/^#\/?/,"").split("/").map(x=>{try{return decodeURIComponent(x)}catch(e){return x}});let k=p[0];
  if(k!=="post"&&openId)closeDetail(true);
  if(k!=="w")wFocus=null;
  closeRoom();
  if(["liked","mine","inbox"].includes(k)&&!me){openAuth("login");history.replaceState(null,"","#/");k=""}
  if((k==="games"||k==="world")&&navHidden(k)&&!isDev()){history.replaceState(null,"","#/");k=""}
  if(k==="games"||k==="world"||k==="liked"||k==="mine")show(k);
  else if(k==="inbox")show("inbox",p[1]||"");
  else if(k==="u"&&p[1])show("profile",p[1]);
  else if(k==="c"&&p[1])showHome(p[1]);
  else if(k==="g"&&p[1])showHome("",p[1]);
  else if(k==="w"&&p[1]){
    if(navHidden("world")&&!isDev()){if(!viewReady)showHome();showUnavailable("sh.denied");return}
    wFocus={id:p[1],post:null,st:"load"};wTab="posts";show("world");
  }
  else if(k==="post"&&p[1]){if(!viewReady)showHome();openFromHash()}
  else showHome();
}
function showHome(type="",game=""){
  const ch=curType!==type||curGame!==game||view!=="home";
  curType=type;curGame=game;$("q").value="";
  if(ch){limit=PAGE;homeDirty=true}
  show("home");
}
function show(v,arg="",keep){
  const prevV=view;view=v;viewArg=arg;viewReady=true;document.body.dataset.view=v;
  for(const k of ["home","games","world","liked","mine","inbox","profile"])$("v"+k[0].toUpperCase()+k.slice(1)).hidden=k!==v;
  stopPoll("thread");
  if(v==="home"){if(homeDirty||!all.length){homeDirty=false;loadPosts()}else renderPosts()}
  else if(v==="games"){if(Object.keys(games).length)renderGames();else loadGames()}
  else if(v==="world")loadWorld();
  else if(v==="liked")loadLiked();
  else if(v==="mine")loadMine();
  else if(v==="inbox"){if(arg)openThread(arg);else loadInbox()}
  else if(v==="profile")loadProfile(arg);
  renderNav();renderPop();
  if(!keep&&prevV!==undefined)scrollTo({top:0,behavior:"smooth"});
}
const activeKey=()=>view==="home"?(curGame?"games":curType?"c:"+curType:"home"):view;
function navList(){
  const L=[{k:"home",l:t("nav.home"),i:svg("home"),h:""}];
  if(!navHidden("games")||isDev())L.push({k:"games",l:t("nav.games"),i:svg("game"),h:"games",hid:navHidden("games")});
  if(!navHidden("world")||isDev())L.push({k:"world",l:"World",i:svg("world"),h:"world",hid:navHidden("world")});
  navCats().forEach(c=>L.push({k:"c:"+c,l:catName(c),i:ico(c)||svg("hash"),h:"c/"+c,hid:catHidden(c)}));
  return L;
}
function renderNav(){
  const act=activeKey();
  const btn=(k,l,i,h,x)=>`<button class="${act===k?"on":""}" onclick="go(${jsq(h)});toggleMenu(false)">${i}<span>${esc(l)}</span>${x||""}</button>`;
  let h=navList().map(x=>btn(x.k,x.l,x.i,x.h,x.hid?`<em class="tag">${esc(t("hidden"))}</em>`:"")).join("");
  if(me){
    h+='<div class="dsep"></div>'+btn("liked",t("nav.liked"),svg("heart"),"liked")+btn("mine",t("nav.mine"),svg("doc"),"mine")+btn("inbox",t("nav.inbox"),svg("mail"),"inbox",unread?'<i class="dot in"></i>':"");
    h+=`<button onclick="openForm();toggleMenu(false)">${svg("plus")}<span>${esc(t("nav.post"))}</span></button>`;
    if(isDev())h+=`<button onclick="openDev();toggleMenu(false)">${svg("shield")}<span>Dev Panel</span></button>`;
  }
  h+=`<div class="dsep"></div><button onclick="openReport();toggleMenu(false)">${svg("flag")}<span>${esc(t("nav.report"))}</span></button><button onclick="openSettings();toggleMenu(false)">${svg("gear")}<span>${esc(t("nav.settings"))}</span></button>`;
  $("dnav").innerHTML=h;
}
const toggleMenu=o=>{$("drawer").classList.toggle("on",o);document.body.classList.toggle("lock",o||!!document.querySelector(".modal.on"))};
function renderPop(){
  const act=activeKey();
  $("popCats").innerHTML=navList().map(x=>`<button class="${act===x.k?"on":""}" onclick="go(${jsq(x.h)});closePop()">${x.k.startsWith("c:")?ico(x.k.slice(2)):""}${esc(x.l)}</button>`).join("")+(isDev()?`<button onclick="addCat();closePop()">${esc(t("newcat"))}</button>`:"");
  $("popSort").innerHTML=[["new","sort.new"],["views","sort.views"],["likes","sort.likes"]].map(([k,l])=>`<button class="${sortBy===k?"on":""}" onclick="sortBy='${k}';renderPosts();renderPop()">${esc(t(l))}</button>`).join("");
}
function togglePop(e){e.stopPropagation();const o=!$("pop").classList.contains("on");$("pop").classList.toggle("on",o);$("upBtn").classList.toggle("open",o)}
function closePop(){$("pop").classList.remove("on");$("upBtn").classList.remove("open")}
document.addEventListener("click",e=>{if(!e.target.closest("#pop,#sbar"))closePop()});
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  if($("mAsk").classList.contains("on"))return askDone(null);
  if($("mImg").classList.contains("on"))return closeM($("mImg"));
  closePop();toggleMenu(false);
  const ms=[...document.querySelectorAll(".modal.on")],m=ms[ms.length-1];if(!m)return;
  if(m.id==="mDetail")closeDetail();else if(m.id==="mRoom")closeRoom();else closeM(m);
});
;(window.__ok=window.__ok||[]).push("app-nav.js");
