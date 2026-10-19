/* ===== HỒ SƠ NGƯỜI DÙNG ===== */
const openProfile=id=>{if(!id)return;go("u/"+encodeURIComponent(id))};
async function loadProfile(id){
  const el=$("profile");region(el,"loading");
  try{
    const u=await api("/users/"+encodeURIComponent(id));
    if(view!=="profile"||viewArg!==id)return;
    let posts=[];try{posts=(await api("/users/"+encodeURIComponent(u.userId)+"/posts")).posts||[]}catch(e){}
    if(view!=="profile"||viewArg!==id)return;
    posts.forEach(p=>{curPosts[p.id]=p});
    const mine=me&&me.userId===u.userId;
    if(mine)Object.assign(u,{name:me.name,pic:me.pic,bio:me.bio,handle:me.handle});
    const likes=posts.reduce((n,p)=>n+(p.likeCount||0),0);
    region(el,"success");
    el.innerHTML=`<div class="pcard">${avatar(u.name,u.pic,"xl")}<div class="pi"><h2>${esc(u.name)}${devTag(u.role)}</h2><span class="mu">ID ${esc(idOf(u))}</span>
    <p style="margin-top:8px;white-space:pre-wrap;word-break:break-word;color:${u.bio?"inherit":"var(--mu)"}">${esc(u.bio||t("p.nobio"))}</p>
    <div class="pst"><div><b>${posts.length}</b><span class="mu">${esc(t("p.posts"))}</span></div><div><b>${likes}</b><span class="mu">${esc(t("p.likes"))}</span></div>${u.createdAt?`<div><b>${esc(new Date(u.createdAt).toLocaleDateString(loc()))}</b><span class="mu">${esc(t("p.joined"))}</span></div>`:""}</div>
    <div class="row" style="margin-top:4px">${mine?`<button class="pri" onclick="openSettings('profile')">${svg("gear",16)}${esc(t("p.edit"))}</button>`:`<button class="pri" onclick="msgUser(${jsq(u.userId)})">${svg("mail",16)}${esc(t("in.msg"))}</button><button onclick="openReport({type:'user',id:${jsq(u.userId)},title:${jsq(u.name)}})">${svg("flag",16)}${esc(t("report"))}</button>`}</div></div></div>
    <div class="hrow"><h2>${esc(t("p.posts"))}</h2></div>
    ${posts.length?`<div class="grid">${posts.map(cardHtml).join("")}</div>`:`<div class="st" style="min-height:160px">${esc(t("p.none"))}</div>`}`;
  }catch(e){region(el,"error",e,()=>loadProfile(id))}
}
function msgUser(id){if(!me)return openAuth();go("inbox/"+encodeURIComponent(id))}

/* ===== POLLING ===== */
const polls={};
function startPoll(k,ms,fn){stopPoll(k);polls[k]=setInterval(()=>{if(!document.hidden)fn()},ms)}
function stopPoll(k){clearInterval(polls[k]);delete polls[k]}
let unreadFails=0;
function setUnread(n){unread=n||0;$("inDot").hidden=!unread;renderNav()}
async function pollUnread(){
  if(!me||unreadFails>=3)return;
  try{const r=await api("/inbox/unread");unreadFails=0;if((r.unread||0)!==unread)setUnread(r.unread||0)}catch(e){unreadFails++}
}
;(window.__ok=window.__ok||[]).push("app-profile.js");
