
const test=require("node:test");
const assert=require("node:assert/strict");
const handler=require("../api/turnstile-verify.js");
function response(){
  return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};
}
const oldFetch=global.fetch;
test("Turnstile chấp nhận token hợp lệ đúng action và hostname",async()=>{
  process.env.TURNSTILE_SECRET="server-secret";
  process.env.TURNSTILE_HOSTNAMES="example.com,www.example.com";
  global.fetch=async()=>({ok:true,json:async()=>({success:true,action:"login",hostname:"example.com"})});
  const res=response();
  await handler({method:"POST",body:{token:"token-123",action:"login"},headers:{}},res);
  assert.equal(res.statusCode,200);assert.equal(res.body.success,true);
});
test("Turnstile từ chối action không khớp",async()=>{
  process.env.TURNSTILE_SECRET="server-secret";process.env.TURNSTILE_HOSTNAMES="example.com";
  global.fetch=async()=>({ok:true,json:async()=>({success:true,action:"register",hostname:"example.com"})});
  const res=response();
  await handler({method:"POST",body:{token:"token-123",action:"login"},headers:{}},res);
  assert.equal(res.statusCode,403);
});
test("Turnstile từ chối hostname ngoài danh sách",async()=>{
  process.env.TURNSTILE_SECRET="server-secret";process.env.TURNSTILE_HOSTNAMES="example.com";
  global.fetch=async()=>({ok:true,json:async()=>({success:true,action:"login",hostname:"evil.example"})});
  const res=response();
  await handler({method:"POST",body:{token:"token-123",action:"login"},headers:{}},res);
  assert.equal(res.statusCode,403);
});
test("API không mở nếu thiếu secret",async()=>{
  delete process.env.TURNSTILE_SECRET;process.env.TURNSTILE_HOSTNAMES="example.com";
  const res=response();
  await handler({method:"POST",body:{token:"token-123",action:"login"},headers:{}},res);
  assert.equal(res.statusCode,503);
});
test.after(()=>{global.fetch=oldFetch;delete process.env.TURNSTILE_SECRET;delete process.env.TURNSTILE_HOSTNAMES;});
