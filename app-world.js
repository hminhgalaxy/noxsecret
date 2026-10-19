/* ===== WORLD: bài viết + trả lời ===== */
let wTab="posts",wList=[],wMore=false,wImgs=[],wRep={},wOpen=new Set(),rImgs={};
let wFocus=null; /* bài World đang được mở từ link chia sẻ: {id,post,st:load|ok|gone|denied|err} */
const wFind=id=>wList.find(x=>x.id===id);
const bgRaw=u=>{const s=imgSrc(u);return s?`background-image:url("${s.replace(/["'()\\\s<>]/g,c=>"%"+c.charCodeAt(0).toString(16).padStart(2,"0"))}")`:""};
const canDel=a=>me&&(me.userId===a||me.role==="dev");
function loadWorld(){renderWComposer();renderWNote();wTabSet(wTab)}
function wTabSet(k){
  wTab=k;$("wtP").classList.toggle("on",k==="posts");$("wtG").classList.toggle("on",k==="groups");
  $("wPosts").hidden=k!=="posts";$("wGroups").hidden=k!=="groups";
  if(k==="posts")loadWPosts();else loadGroups();
}
function renderWComposer(){
  const el=$("wComp");
  if(!me){el.innerHTML=`<div class="cmpgate"><span class="mu" style="font-size:13px">${esc(t("w.login"))}</span><button class="pri" onclick="openAuth()">${esc(t("login"))}</button></div>`;return}
  el.innerHTML=`<div class="wc">${avatar(me.name,me.pic,true)}<div class="wcm"><textarea id="wText" maxlength="1500" rows="2" placeholder="${esc(t("w.ph"))}"></textarea><div class="gal sm" id="wGal"></div><div class="row" style="margin-top:6px"><button class="gh" onclick="addWImg()">${svg("image",16)}${esc(t("w.img"))}</button><button class="pri" id="wSend" onclick="sendWPost()" style="margin-left:auto">${esc(t("w.post"))}</button></div></div></div>`;
  renderWGal();
}
const thumbs=(arr,rm)=>arr.map((g,i)=>`<span class="gp"><img class="gi" src="${esc(imgSrc(g))}" alt=""><button type="button" onclick="${rm}(${i})" aria-label="${esc(t("del"))}">✕</button></span>`).join("");
function renderWGal(){const el=$("wGal");if(el)el.innerHTML=thumbs(wImgs,"rmWImg")}
function rmWImg(i){wImgs.splice(i,1);renderWGal()}
function addWImg(){if(wImgs.length>=4)return toast(t("w.max4"));pickFile(v=>{if(wImgs.length<4){wImgs.push(v);renderWGal()}})}
/* Mở link chia sẻ bài World: đọc đúng bản ghi gốc theo ID, đưa lên đầu bảng tin (không tạo bản sao) */
async function focusWPost(f){
  if(!/^[\w-]{1,60}$/.test(f.id)){f.st="gone";f.post=null;return}
  try{
    const d=await readShared("pub/world/posts/"+f.id);
    if(wFocus!==f)return;
    if(!d||typeof d!=="object"){f.st="gone";f.post=null;return}
    if(!rolesC)await loadRoles();
    const uid=(curUser()||{}).uid;
    f.post=wFix({id:f.id,...d},uid);f.st="ok";
  }catch(e){
    if(wFocus!==f)return;
    f.post=null;f.st=e&&(e.status===401||e.status===403)?"denied":"err";
  }
}
function renderWNote(){
  const el=$("wNote");if(!el)return;
  const f=wFocus;
  if(!f||f.st==="load"){el.innerHTML="";return}
  const m={ok:"sh.shared",gone:"sh.gone",denied:me?"sh.denied":"sh.denied.login",err:"sh.loaderr"}[f.st];
  const btn=f.st==="denied"&&!me?`<button class="pri" onclick="openAuth()">${esc(t("login"))}</button>`:f.st==="err"?`<button onclick="loadWPosts()">${esc(t("reload"))}</button>`:`<button onclick="go('world')">${esc(t("sh.all"))}</button>`;
  el.innerHTML=`<div class="ann">${svg(f.st==="ok"?"world":"flag",18)}<span style="flex:1;min-width:0">${esc(t(m))}</span>${btn}</div>`;
}
async function loadWPosts(more){
  const el=$("wFeed"),f=!more?wFocus:null;
  if(!more&&!wList.length)region(el,"loading");
  if(f){await focusWPost(f);renderWNote()}
  const pin=l=>f&&f.post?[f.post].concat(l.filter(x=>x.id!==f.post.id)):l;
  try{
    const q=more&&wList.length?"&before="+wList[wList.length-1].createdAt:"";
    const r=await api("/world/posts?limit=20"+q),ps=r.posts||[];
    wList=more?wList.concat(ps.filter(p=>!wList.some(x=>x.id===p.id))):pin(ps);wMore=ps.length>=20;
    renderWPosts();
  }catch(e){
    if(f&&f.post){wList=pin([]);renderWPosts();if(!gone(e))toast(e.message)}
    else if(wList.length)toast(e.message);
    else if(gone(e)){wList=[];renderWPosts()}
    else region(el,"error",e,()=>loadWPosts());
  }
}
function wpHtml(p){
  const open=wOpen.has(p.id),id=jsq(p.id);
  return `<article class="wp${wFocus&&wFocus.st==="ok"&&wFocus.id===p.id?" wfocus":""}" id="wp-${esc(p.id)}"><div class="wph"><div class="au lk" onclick="openProfile(${jsq(p.authorId||"")})">${avatar(p.authorName,p.authorPic,true)}<div><b>${esc(p.authorName||t("anon"))}${devTag(p.authorRole)}</b><span class="mu">${esc(ago(p.createdAt))}</span></div></div>${canDel(p.authorId)?`<button class="gh ic" onclick="delWPost(${id})" aria-label="${esc(t("del"))}">${svg("trash",16)}</button>`:""}</div>
  ${p.text?`<p class="wt">${esc(p.text)}</p>`:""}${imgsHtml(p.images)}
  <div class="wa"><button class="${p.liked?"on":""}" onclick="likeW(${id})" aria-label="${esc(t("v.like"))}">${svg("heart",15)}${p.likeCount||0}</button><button class="${open?"on":""}" onclick="toggleReplies(${id})" aria-label="${esc(t("w.replies"))}">${svg("msg",15)}${p.replyCount||0}</button><button onclick="openShare('w',${id})" aria-label="${esc(t("share"))}">${svg("share",15)}</button><button onclick="reportW(${id})" aria-label="${esc(t("report"))}">${svg("flag",15)}</button></div>
  <div class="wr" id="wr-${esc(p.id)}" ${open?"":"hidden"}></div></article>`;
}
function renderWPosts(){
  const el=$("wFeed");
  renderWNote();
  if(!wList.length)return region(el,"empty",t("w.none"));
  region(el,"success");
  el.innerHTML=wList.map(wpHtml).join("")+(wMore?`<div class="row c"><button onclick="loadWPosts(true)">${esc(t("more"))}</button></div>`:"");
  wOpen.forEach(id=>{if(wRep[id])paintReplies(id)});
}
function repaintWP(id){
  const p=wList.find(x=>x.id===id),el=$("wp-"+id);if(!p||!el)return;
  el.outerHTML=wpHtml(p);if(wOpen.has(id))paintReplies(id);
}
async function sendWPost(){
  const tx=$("wText").value.trim();if(!tx&&!wImgs.length)return toast(t("w.empty"));
  const b=$("wSend");b.disabled=true;
  try{
    const p=await api("/world/posts","POST",{text:tx,images:wImgs});wImgs=[];renderWComposer();
    if(p&&p.id){wList.unshift(p);renderWPosts()}else loadWPosts();
  }catch(e){toast(e.message);b.disabled=false}
}
async function delWPost(id){
  if(!await yes({title:t("w.del.t"),ok:t("del"),danger:true}))return;
  try{await api("/world/posts/"+id,"DELETE");wList=wList.filter(p=>p.id!==id);if(wFocus&&wFocus.id===id){wFocus.st="gone";wFocus.post=null}renderWPosts();toast(t("deleted"))}catch(e){toast(e.message)}
}
async function likeW(id){
  if(!me)return openAuth();
  try{const r=await api("/world/posts/"+id+"/like","POST"),p=wList.find(x=>x.id===id);if(p){p.liked=r.liked;p.likeCount=r.likeCount;repaintWP(id)}}catch(e){toast(e.message)}
}
function reportW(id){const p=wList.find(x=>x.id===id);openReport({type:"world",id,title:p?(p.text||"").slice(0,40)||p.authorName:id})}
function toggleReplies(id){
  if(wOpen.has(id)){wOpen.delete(id);const el=$("wr-"+id);if(el)el.hidden=true}else{wOpen.add(id);loadReplies(id)}
  const p=wList.find(x=>x.id===id);if(p){const b=document.querySelector("#wp-"+CSS.escape(id)+" .wa button:nth-child(2)");if(b)b.classList.toggle("on",wOpen.has(id))}
}
async function loadReplies(id){
  const el=$("wr-"+id);if(!el)return;el.hidden=false;
  if(!wRep[id])el.innerHTML='<div class="st" style="min-height:70px;padding:8px"><div class="sp" style="width:22px;height:22px;border-width:2px"></div></div>';
  try{wRep[id]=(await api("/world/posts/"+id+"/replies")).replies||[];paintReplies(id)}
  catch(e){el.innerHTML=`<div class="mu ln"><span>${esc(t("e.load"))}</span><button onclick="loadReplies(${jsq(id)})">${esc(t("reload"))}</button></div>`}
}
function replyHtml(pid,r){
  return `<div class="rp"><span onclick="openProfile(${jsq(r.authorId||"")})" style="cursor:pointer">${avatar(r.authorName,r.authorPic)}</span><div style="min-width:0"><div class="rb"><b onclick="openProfile(${jsq(r.authorId||"")})" style="cursor:pointer">${esc(r.authorName||t("anon"))}</b>${devTag(r.authorRole)}<div class="rt2">${esc(r.text||"")}</div>${imgsHtml(r.images)}</div>
  <div class="rm"><span>${esc(ago(r.createdAt))}</span>${me?`<button onclick="replyTo(${jsq(pid)},${jsq(r.authorName||"")})">${esc(t("w.replies"))}</button>`:""}${canDel(r.authorId)?`<button onclick="delReply(${jsq(pid)},${jsq(r.id)})">${esc(t("del"))}</button>`:""}</div></div></div>`;
}
function paintReplies(id){
  const el=$("wr-"+id);if(!el)return;
  const old=$("ri-"+id),keep=old?old.value:"";
  const form=me?`<div class="gal sm" id="rg-${esc(id)}"></div><div class="rf"><input id="ri-${esc(id)}" maxlength="500" placeholder="${esc(t("w.reply.ph"))}" onkeydown="if(event.key==='Enter')sendReply(${jsq(id)})"><button class="ic gh" onclick="addRImg(${jsq(id)})" aria-label="${esc(t("w.img"))}">${svg("image")}</button><button class="pri ic" onclick="sendReply(${jsq(id)})" aria-label="${esc(t("send"))}">${svg("send",16)}</button></div>`:`<div class="mu ln"><span>${esc(t("w.reply.login"))}</span><button onclick="openAuth()">${esc(t("login"))}</button></div>`;
  el.hidden=false;el.innerHTML=(wRep[id]||[]).map(r=>replyHtml(id,r)).join("")+form;
  const i=$("ri-"+id);if(i&&keep)i.value=keep;renderRGal(id);
}
function renderRGal(id){const el=$("rg-"+id);if(el)el.innerHTML=thumbs(rImgs[id]||[],`rmRImg.bind(null,${jsq(id)})`)}
function rmRImg(id,i){(rImgs[id]||[]).splice(i,1);renderRGal(id)}
function addRImg(id){const a=rImgs[id]=rImgs[id]||[];if(a.length>=4)return toast(t("w.max4"));pickFile(v=>{if(a.length<4){a.push(v);renderRGal(id)}})}
function replyTo(pid,name){const i=$("ri-"+pid);if(!i)return;if(name)i.value="@"+name+" "+i.value.replace(/^@\S+\s/,"");i.focus()}
async function sendReply(pid){
  if(!me)return openAuth();
  const inp=$("ri-"+pid),text=inp.value.trim(),imgs=rImgs[pid]||[];if(!text&&!imgs.length)return;
  inp.disabled=true;
  try{
    const r=await api("/world/posts/"+pid+"/replies","POST",{text,images:imgs});
    (wRep[pid]=wRep[pid]||[]).push(r);rImgs[pid]=[];
    const p=wList.find(x=>x.id===pid);if(p)p.replyCount=(p.replyCount||0)+1;
    inp.value="";repaintWP(pid);
  }catch(e){toast(e.message);inp.disabled=false}
}
async function delReply(pid,rid){
  if(!await yes({title:t("w.delr.t"),ok:t("del"),danger:true}))return;
  try{
    await api("/world/posts/"+pid+"/replies/"+rid,"DELETE");wRep[pid]=(wRep[pid]||[]).filter(r=>r.id!==rid);
    const p=wList.find(x=>x.id===pid);if(p)p.replyCount=Math.max(0,(p.replyCount||1)-1);repaintWP(pid);
  }catch(e){toast(e.message)}
}
;(window.__ok = window.__ok || []).push("app-world.js"); (window.__v = window.__v || {})["app-world.js"] = "20261019c";
