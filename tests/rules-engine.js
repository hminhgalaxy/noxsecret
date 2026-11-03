/* Bộ mô phỏng Firebase Realtime Database Rules (đơn giản hóa, chạy được cả Node lẫn trình duyệt).
   KHÔNG phải engine thật của Firebase — chỉ để bắt lỗi logic. Hãy kiểm tra lại bằng Rules Playground / Emulator trước khi triển khai. */
(function (g) {
  const SP = String.prototype;
  SP.matches = SP.matches || function (re) { return re.test(String(this)); };
  SP.contains = SP.contains || function (s) { return String(this).includes(s); };
  SP.beginsWith = SP.beginsWith || function (s) { return String(this).startsWith(s); };
  SP.endsWith = SP.endsWith || SP.endsWith;
  const clone = x => (x === undefined || x === null) ? null : JSON.parse(JSON.stringify(x));
  const split = p => String(p).split("/").filter(Boolean);
  function getAt(t, segs) { let n = t; for (const s of segs) { if (n === null || typeof n !== "object") return null; n = n[s]; if (n === undefined) return null; } return n === undefined ? null : n; }
  function prune(n) { if (n === null || typeof n !== "object") return n; Object.keys(n).forEach(k => { n[k] = prune(n[k]); if (n[k] === null || (typeof n[k] === "object" && !Object.keys(n[k]).length)) delete n[k]; }); return n; }
  function setAt(t, segs, v) {
    if (!segs.length) return v === undefined ? null : clone(v);
    const root = (t && typeof t === "object") ? clone(t) : {}; let n = root;
    for (let i = 0; i < segs.length - 1; i++) { if (n[segs[i]] === null || typeof n[segs[i]] !== "object") n[segs[i]] = {}; n = n[segs[i]]; }
    const last = segs[segs.length - 1]; if (v === null || v === undefined) delete n[last]; else n[last] = clone(v);
    return prune(root) || {};
  }
  class Snap {
    constructor(root, segs) { this.root = root; this.segs = segs; }
    _v() { return getAt(this.root, this.segs); }
    val() { return this._v(); } exists() { return this._v() !== null; }
    child(p) { return new Snap(this.root, this.segs.concat(split(p))); } parent() { return new Snap(this.root, this.segs.slice(0, -1)); }
    hasChild(k) { return this.child(k).exists(); }
    hasChildren(ks) { const v = this._v(); if (v === null || typeof v !== "object") return false; return ks ? ks.every(k => k in v) : Object.keys(v).length > 0; }
    isString() { return typeof this._v() === "string"; } isNumber() { return typeof this._v() === "number"; } isBoolean() { return typeof this._v() === "boolean"; }
    getPriority() { return null; }
  }
  function create(json) {
    const rules = json.rules;
    const pick = (node, seg) => {
      if (node[seg] !== undefined && seg[0] !== "." && seg[0] !== "$") return { node: node[seg], v: null };
      const w = Object.keys(node).find(k => k[0] === "$"); return w ? { node: node[w], v: [w, seg] } : null;
    };
    const ev = (expr, env) => {
      if (typeof expr === "boolean") return expr;
      try { const names = Object.keys(env); return !!new Function(...names, "return (" + expr + ");")(...names.map(n => env[n])); } catch (e) { return false; }
    };
    const mkEnv = (auth, oldRoot, newRoot, segs, vars) => Object.assign({ auth, now: Date.now(), root: new Snap(oldRoot, []), data: new Snap(oldRoot, segs), newData: new Snap(newRoot, segs) }, vars);
    function can(kind, segs, auth, oldRoot, newRoot) {
      let node = rules, vars = {};
      for (let i = 0; i <= segs.length; i++) {
        if (node[".kind".replace("kind", kind)] !== undefined && ev(node["." + kind], mkEnv(auth, oldRoot, newRoot, segs.slice(0, i), vars))) return true;
        if (i === segs.length) break;
        const c = pick(node, segs[i]); if (!c) return false; node = c.node; if (c.v) vars = Object.assign({}, vars, { [c.v[0]]: c.v[1] });
      }
      return false;
    }
    function validate(segs, auth, oldRoot, newRoot) {
      let node = rules, vars = {};
      for (const s of segs) { const c = pick(node, s); if (!c) return []; node = c.node; if (c.v) vars = Object.assign({}, vars, { [c.v[0]]: c.v[1] }); }
      const errs = [];
      (function walk(n, v, p) {
        const nv = getAt(newRoot, p); if (nv === null) return;
        if (n[".validate"] !== undefined && !ev(n[".validate"], mkEnv(auth, oldRoot, newRoot, p, v))) errs.push("/" + p.join("/"));
        if (typeof nv === "object") Object.keys(nv).forEach(k => { const c = pick(n, k); if (c) walk(c.node, c.v ? Object.assign({}, v, { [c.v[0]]: c.v[1] }) : v, p.concat(k)); });
      })(node, vars, segs);
      return errs;
    }
    return {
      canRead: (segs, auth, root) => can("read", segs, auth, root, root),
      /* sets: [{segs, value}] — trả về {ok, reason, root} */
      write(sets, auth, root) {
        let nr = root; sets.forEach(s => { nr = setAt(nr, s.segs, s.value); });
        for (const s of sets) if (!can("write", s.segs, auth, root, nr)) return { ok: false, reason: "PERMISSION_DENIED: write /" + s.segs.join("/") };
        for (const s of sets) { const e = validate(s.segs, auth, root, nr); if (e.length) return { ok: false, reason: "PERMISSION_DENIED: validate " + e.join(",") }; }
        return { ok: true, root: nr };
      }
    };
  }
  g.RulesEngine = { create, getAt, setAt, split, clone };
})(globalThis);
