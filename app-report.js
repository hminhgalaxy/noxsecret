/* ===== BÁO CÁO → hòm thư dev ===== */
const RK=["bug","link","abuse","account","idea","other"],RS=["low","mid","high"];
let rpRef=null,rpSev="mid",rpKindV="bug";
function openReport(ref){
  if(!me)return openAuth();
  rpRef=ref||null;rpSev="mid";
  rpKindV=ref&&(ref.type==="user"||ref.type==="world")?"abuse":ref&&ref.type==="post"?"link":"bug";paintKind();
  $("rpCtx").textContent=ref?t("r.about",ref.title||ref.id):t("r.general");
  $("rpText").value="";$("rpCnt").textContent="0";paintSev();setMsg("rpMsg","");openM($("mReport"));
}
function paintKind(){$("rpKind").innerHTML=RK.map(k=>`<button type="button" class="${rpKindV===k?"on":""}" onclick="rpKindV='${k}';paintKind()">${esc(t("rk."+k))}</button>`).join("")}
function paintSev(){$("rpSev").innerHTML=RS.map(s=>`<button type="button" class="${rpSev===s?"on":""}" onclick="rpSev='${s}';paintSev()">${esc(t("rs."+s))}</button>`).join("")}
async function submitReport(){
  const text=$("rpText").value.trim();
  if(text.length<10)return setMsg("rpMsg",t("r.short"),"bad");
  const b={kind:rpKindV,severity:rpSev,text,reason:text};
  if(rpRef){b.refType=rpRef.type;b.refId=rpRef.id;if(rpRef.type==="post")b.postId=rpRef.id}
  const btn=$("rpGo");btn.disabled=true;
  try{await api("/reports","POST",b);closeM($("mReport"));toast(t("r.sent"))}catch(e){setMsg("rpMsg",e.message,"bad")}
  btn.disabled=false;
}
;(window.__ok=window.__ok||[]).push("app-report.js");
