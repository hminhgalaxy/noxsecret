/* ===== TIỆN ÍCH ===== */
const BASE=["SCRIPT","APK","IOS","LINK"],BN={SCRIPT:"Script",APK:"APK",IOS:"iOS",LINK:"Link"},PAGE=24;
const DEFACT={SCRIPT:["detail","copy"],APK:["detail","download","open"],IOS:["detail","open","download"],LINK:["detail","open"]};
let me=null,authReady=false,games={},cats={},siteCfg={},all=[],limit=PAGE,view="home",viewArg="",viewReady=false,homeDirty=true,curType="",curGame="",sortBy="new",editing=null,gal=[],curPosts={},myVotes={},openId=null,loadKey="",unread=0;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const jsq=s=>esc(JSON.stringify(String(s))); /* chuỗi JS an toàn trong thuộc tính onclick */
const safeUrl=u=>{try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:""}catch{return ""}};
const imgSrc=v=>typeof v==="string"&&v.length<700000&&/^data:image\/(?:jpeg|png|webp);base64,/.test(v)?v:/^img:[\w-]{1,40}$/.test(v||"")?API+"/img/"+v.slice(4):safeUrl(v);
const bgs=u=>{const s=imgSrc(u);return s?`background-image:url(&quot;${esc(s.replace(/["'()\\\s<>]/g,c=>"%"+c.charCodeAt(0).toString(16).padStart(2,"0")))}&quot;)`:""};
const fmt=ts=>new Date(ts).toLocaleString(loc(),{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit",year:"numeric"});
const hm=ts=>new Date(ts).toLocaleTimeString(loc(),{hour:"2-digit",minute:"2-digit"});
function ago(ts){const s=Math.max(0,(Date.now()-ts)/1000);if(s<60)return t("now");if(s<3600)return t("m.ago",Math.floor(s/60));if(s<86400)return t("h.ago",Math.floor(s/3600));if(s<604800)return t("d.ago",Math.floor(s/86400));return new Date(ts).toLocaleDateString(loc())}
const avatar=(n,pic,big)=>`<span class="av${big===true?" l":big==="xl"?" xl":""}">${esc((n||"?").trim().charAt(0).toUpperCase())}${/^u:[\w-]{1,40}$/.test(pic||"")?`<img data-u="${esc(pic.slice(2))}" alt="" loading="lazy" onerror="this.remove()">`:imgSrc(pic)?`<img src="${esc(imgSrc(pic))}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">`:""}</span>`;
/* ảnh đại diện lưu trong hồ sơ được tải lười theo uid, để bài/tin nhắn không phải mang theo ảnh nặng */
const picC={};
function hydratePics(){document.querySelectorAll("img[data-u]").forEach(i=>{const id=i.dataset.u;i.removeAttribute("data-u");(picC[id]=picC[id]||dbGet("pub/users/"+encodeURIComponent(id)+"/pic").catch(()=>null)).then(v=>{const sr=v&&imgSrc(v);if(sr)i.src=sr;else i.remove()})})}
const imgsHtml=a=>{a=(a||[]).filter(i=>imgSrc(i));return a.length?`<div class="gal${a.length===1?" n1":""}">${a.map(i=>`<img class="gi" src="${esc(imgSrc(i))}" alt="" loading="lazy" onclick="viewImg(this.src)">`).join("")}</div>`:""};
const devTag=r=>r==="dev"?'<em class="tag bd">DEV</em>':"";
const idOf=u=>u&&u.handle?"@"+u.handle:(u&&u.userId)||"";
new MutationObserver(()=>hydratePics()).observe(document.documentElement,{childList:true,subtree:true});
function viewImg(src){$("bigImg").src=src;openM($("mImg"))}
function toast(m){
  const el=$("toast");el.textContent="";
  const s=document.createElement("span");s.textContent=m;
  const b=document.createElement("button");b.className="tx";b.type="button";b.setAttribute("aria-label",t("close"));b.textContent="✕";b.onclick=()=>{el.style.display="none"};
  el.append(s,b);el.style.display="flex";clearTimeout(el._t);el._t=setTimeout(()=>{el.style.display="none"},4500);
}
function setMsg(id,txt,k){const el=$(id);el.textContent=txt||"";el.className="fm"+(id==="aMsg"?" al":"")+(k?" "+k:"")}
const openM=m=>{m.classList.add("on");document.body.classList.add("lock")};
const closeM=m=>{m.classList.remove("on");document.body.classList.toggle("lock",!!document.querySelector(".modal.on"))};

/* Trạng thái vùng nội dung: loading | success | empty | error.
   Lỗi tải: tự thử lại âm thầm vài lần, sau đó hiện nút "Tải lại" — không nêu chi tiết kỹ thuật. */
function skel(kind){
  /* mọi vùng đang tải đều hiện vòng xoay (không dùng khung xám đứng yên nữa) */
  return '<div class="st"><div class="sp"></div></div>';
}
function region(el,state,msg,retry){
  clearTimeout(el._rt);el.dataset.state=state;
  if(state==="success"){el._n=0;return}
  if(state==="empty"){el._n=0;el.innerHTML=`<div class="st"><span class="sti">${svg("doc",22)}</span><span>${esc(msg)}</span></div>`;return}
  if(state==="error"&&msg&&msg.need){   /* tài khoản Google chưa kích hoạt: mời kích hoạt thay vì báo lỗi tải */
    el._n=0;el.innerHTML=`<div class="st"><span class="sti">${svg("user",22)}</span><b>${esc(t("act.title"))}</b><span>${esc(t("act.need"))}</span><button class="pri" onclick="openActivate()">${esc(t("act.go"))}</button></div>`;return;
  }
  if(state==="error"){
    console.warn("[load]",msg);
    const n=el._n=(el._n||0)+1;
    if(n<=2&&retry){el.innerHTML=skel(el.dataset.sk);el._rt=setTimeout(retry,700*n);return}
    el._n=0;
    el.innerHTML=`<div class="st"><span class="sti">${svg("doc",22)}</span><b>${esc(t("e.load"))}</b><span>${esc(t("e.loadsub"))}</span><button class="pri" data-rt>${esc(t("reload"))}</button></div>`;
    const b=el.querySelector("[data-rt]");if(b&&retry)b.onclick=()=>{b.disabled=true;retry()};
    return;
  }
  el.innerHTML=skel(el.dataset.sk);
}

/* ===== HỘP THOẠI (thay cho confirm / prompt) ===== */
let askRes=null;
function ask(o){
  return new Promise(res=>{
    askRes=res;$("askT").textContent=o.title||"";$("askD").textContent=o.text||"";
    $("askIn").innerHTML=o.input?`<div class="pw"><input id="askI" type="${o.input}" maxlength="${o.max||64}" placeholder="${esc(o.ph||"")}" autocomplete="off" value="${esc(o.value||"")}">${o.input==="password"?`<button type="button" class="eye" onclick="eye('askI',this)">${svg("eye")}</button>`:""}</div>`:"";
    $("askOk").textContent=o.ok||t("ok");$("askOk").className=o.danger?"danger-b":"pri";$("askNo").textContent=t("cancel");
    $("askErr").textContent="";openM($("mAsk"));
    const i=$("askI");if(i){setTimeout(()=>i.focus(),60);i.onkeydown=e=>{if(e.key==="Enter")$("askOk").click()}}
    $("askOk").onclick=()=>{const v=i?i.value:true;if(o.validate){const e=o.validate(v);if(e){$("askErr").textContent=e;return}}askDone(v)};
    $("askNo").onclick=()=>askDone(null);
  });
}
function askDone(v){closeM($("mAsk"));const r=askRes;askRes=null;if(r)r(v)}
const yes=async o=>(await ask(o))===true;
;(window.__ok=window.__ok||[]).push("app-utils.js");
