
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const ctx={console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("./rules-engine.js",import.meta.url),"utf8"),ctx);
const rules=JSON.parse(fs.readFileSync(new URL("../database.rules.json",import.meta.url),"utf8"));
const engine=ctx.RulesEngine.create(rules);
const uid="user_123", other={uid:"other",email:"other@example.com",email_verified:true};
const auth={uid,email:"user@example.com",email_verified:true};
const now=Date.now();
let root={};
const profile={displayName:"Minh",handle:"user_123",avatarData:"",coverData:"",createdAt:now,displayNameChangedAt:now-8*86400000};
let r=engine.write([
 {segs:["nox_profiles",uid],value:profile},
 {segs:["nox_profile_ids","user_123"],value:uid}
],auth,root);
assert.equal(r.ok,true,"tạo hồ sơ và ID ban đầu");
root=r.root;
test("Hồ sơ chỉ chủ tài khoản đọc được",()=>{
 assert.equal(engine.canRead(["nox_profiles",uid],auth,root),true);
 assert.equal(engine.canRead(["nox_profiles",uid],other,root),false);
});
test("Tên hiển thị bị khóa trong 7 ngày",()=>{
 const recent={...root.nox_profiles[uid],displayNameChangedAt:now};
 const base={...root,nox_profiles:{...root.nox_profiles,[uid]:recent}};
 const changed={...recent,displayName:"Tên mới",displayNameChangedAt:now+1};
 const out=engine.write([{segs:["nox_profiles",uid],value:changed}],auth,base);
 assert.equal(out.ok,false);
});
test("ID chỉ được đổi một lần",()=>{
 const updated={...profile,handle:"minh_01",idChangedAt:now};
 const out=engine.write([
  {segs:["nox_profiles",uid],value:updated},
  {segs:["nox_profile_ids","minh_01"],value:uid}
 ],auth,root);
 assert.equal(out.ok,true,"lần đổi ID đầu tiên được phép");
 const twice={...updated,handle:"minh_02"};
 const second=engine.write([{segs:["nox_profiles",uid],value:twice}],auth,out.root);
 assert.equal(second.ok,false,"không được đổi ID lần thứ hai");
});
