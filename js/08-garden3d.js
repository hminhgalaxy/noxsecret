/* NOXGARDEN — GARDEN 3D (Three.js) + fallback 2D */
(function(){
'use strict';
var NG = window.NG;

var G3D = NG.G3D = {
  ok:false, paused:true, shadows:true,
  renderer:null, scene:null, cam:null, ray:null,
  plotHits:[], plotGroups:[], decorG:null, lampBulbs:[],
  theta:.65, phi:.92, radius:17, _raf:0,
  _down:false, _lx:0, _ly:0, _moved:0, _pinch:0, _pters:{},

  init: function(){
    var box = NG.$('#g3d');
    if(!box) return;
    if(typeof THREE === 'undefined'){ this.fallback(); return; }
    try{
      this.renderer = new THREE.WebGLRenderer({ antialias: !NG.LOWEND });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, NG.LOWEND ? 1.4 : 2));
      this.renderer.setSize(box.clientWidth, box.clientHeight);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      box.appendChild(this.renderer.domElement);
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x16301f);
      this.scene.fog = new THREE.Fog(0x16301f, 26, 60);
      this.cam = new THREE.PerspectiveCamera(50, box.clientWidth/box.clientHeight, .1, 120);
      this.ray = new THREE.Raycaster();
      this.scene.add(new THREE.HemisphereLight(0xcfe8d0, 0x1a2e1c, .85));
      this.sun = new THREE.DirectionalLight(0xffe8c0, 1.1);
      this.sun.position.set(8, 14, 6);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(NG.LOWEND ? 1024 : 2048, NG.LOWEND ? 1024 : 2048);
      this.sun.shadow.camera.left = -18; this.sun.shadow.camera.right = 18;
      this.sun.shadow.camera.top = 18;  this.sun.shadow.camera.bottom = -18;
      this.scene.add(this.sun);
      this.buildWorld();
      this.bindControls(box);
      this.ok = true;
      this.applyDayNight(); this.resize();
      console.log('[NOXG] Garden 3D sẵn sàng');
    }catch(e){
      console.error('[NOXG] 3D init lỗi — fallback 2D:', e);
      this.fallback();
    }
  },
  fallback: function(){
    this.ok = false;
    NG.$('#g3d').style.display = 'none';
    NG.$('#g2d').classList.add('on');
    var tip = NG.$('#g3dTip'); if(tip) tip.textContent = 'Chế độ 2D (thiết bị không hỗ trợ WebGL)';
    if(NG.G2D) NG.G2D.render();
  },

  buildWorld: function(){
    var S = this.scene, self = this;
    var ground = new THREE.Mesh(new THREE.CircleGeometry(15, 48),
      new THREE.MeshLambertMaterial({ color:0x3f7a42 }));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; S.add(ground);
    var dirt = new THREE.Mesh(new THREE.CircleGeometry(10.5, 40),
      new THREE.MeshLambertMaterial({ color:0x5a4028 }));
    dirt.rotation.x = -Math.PI/2; dirt.position.y = .02; dirt.receiveShadow = true; S.add(dirt);
    var pond = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32),
      new THREE.MeshPhongMaterial({ color:0x3f7fae, transparent:true, opacity:.85, shininess:90 }));
    pond.rotation.x = -Math.PI/2; pond.position.set(-7.5, .04, -4.5); S.add(pond);
    this.pond = pond;
    var pathM = new THREE.MeshLambertMaterial({ color:0x8a8a80 });
    for(var i = 0; i < 7; i++){
      var st = new THREE.Mesh(new THREE.BoxGeometry(.9, .12, .7), pathM);
      st.position.set(Math.sin(i*.5)*1.4, .07, 7 - i*1.15);
      st.receiveShadow = true; S.add(st);
    }
    var fenceM = new THREE.MeshLambertMaterial({ color:0x6b4a2b });
    for(var f = 0; f < 26; f++){
      var a = f/26*Math.PI*2, fx = Math.cos(a)*13.5, fz = Math.sin(a)*13.5;
      var post = new THREE.Mesh(new THREE.BoxGeometry(.18, 1.1, .18), fenceM);
      post.position.set(fx, .55, fz); post.castShadow = true; S.add(post);
      if(f % 2 === 0){
        var rail = new THREE.Mesh(new THREE.BoxGeometry(.1, .12, 1.15), fenceM);
        rail.position.set(fx, .85, fz); rail.rotation.y = a; S.add(rail);
      }
    }
    this.lampM = new THREE.MeshLambertMaterial({ color:0x3a3a34 });
    [[-6, 5.5],[6, 5.5]].forEach(function(p){ self.addLamp(p[0], p[1]); });
    var wood = new THREE.MeshLambertMaterial({ color:0x7a5a38 });
    var bench = new THREE.Group();
    var seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, .14, .6), wood);
    seat.position.y = .5; seat.castShadow = true; bench.add(seat);
    var back = new THREE.Mesh(new THREE.BoxGeometry(2.2, .5, .1), wood);
    back.position.set(0, .85, -.26); back.castShadow = true; bench.add(back);
    [[-.9],[.9]].forEach(function(l){
      var leg = new THREE.Mesh(new THREE.BoxGeometry(.12, .5, .5), wood);
      leg.position.set(l[0], .25, 0); bench.add(leg);
    });
    bench.position.set(5.5, 0, -5); bench.rotation.y = -.6; S.add(bench);
    var rockM = new THREE.MeshLambertMaterial({ color:0x7a8078 });
    [[-4.5,4.2,.5],[3.2,4.8,.35],[-8.8,1,.6],[8.6,-2.5,.4],[-3,-8.6,.5]].forEach(function(r){
      var rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r[2], 0), rockM);
      rock.position.set(r[0], r[2]*.6, r[1]); rock.castShadow = true;
      rock.rotation.set(Math.random(), Math.random(), 0); S.add(rock);
    });
    var bushM = new THREE.MeshLambertMaterial({ color:0x2f6b3a });
    [[-10,3],[9.5,2],[-9,-6.5],[10,-6]].forEach(function(b){
      var bu = new THREE.Mesh(new THREE.SphereGeometry(.75, 10, 8), bushM);
      bu.position.set(b[0], .5, b[1]); bu.scale.y = .75; bu.castShadow = true; S.add(bu);
    });
    var grassM = new THREE.MeshLambertMaterial({ color:0x4f9448 });
    for(var g = 0; g < 14; g++){
      var ga = Math.random()*Math.PI*2, gr = Math.random()*9 + 2;
      var tuft = new THREE.Mesh(new THREE.ConeGeometry(.14, .5, 5), grassM);
      tuft.position.set(Math.cos(ga)*gr, .25, Math.sin(ga)*gr); S.add(tuft);
    }
    var plotM = new THREE.MeshLambertMaterial({ color:0x5a4028 });
    var rimM = new THREE.MeshLambertMaterial({ color:0x6b4a2b });
    var hitM = new THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false });
    this.plotHits = []; this.plotGroups = [];
    for(var p = 0; p < NG.NPLOTS; p++){
      var px = (p % 4 - 1.5) * 2.5, pz = (Math.floor(p/4) - 1) * 2.5;
      var plot = new THREE.Mesh(new THREE.BoxGeometry(2, .35, 2), plotM);
      plot.position.set(px, .18, pz); plot.receiveShadow = true; S.add(plot);
      var rim = new THREE.Mesh(new THREE.BoxGeometry(2.2, .4, 2.2), rimM);
      rim.position.set(px, .16, pz); rim.receiveShadow = true; S.add(rim);
      var hit = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 2.4), hitM.clone());
      hit.position.set(px, 1.4, pz); hit.userData.plot = p; S.add(hit);
      this.plotHits.push(hit); this.plotGroups.push(null);
    }
    this.decorG = new THREE.Group(); S.add(this.decorG);
  },
  addLamp: function(x, z){
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 2.2, 8), this.lampM);
    pole.position.set(x, 1.1, z); pole.castShadow = true; this.scene.add(pole);
    var bulb = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8),
      new THREE.MeshBasicMaterial({ color:0xffd98a }));
    bulb.position.set(x, 2.3, z); this.scene.add(bulb);
    this.lampBulbs.push(bulb);
  },

  /* mesh theo shape + màu loài */
  buildPlantMesh: function(sp, stage){
    var grp = new THREE.Group();
    var sc = [.22, .38, .58, .78, .92, 1][stage] || 1;
    var glow = sp.glow;
    function mat(c){ return glow ? new THREE.MeshBasicMaterial({ color:new THREE.Color(c) })
                                 : new THREE.MeshLambertMaterial({ color:new THREE.Color(c) }); }
    var trunkM = mat(sp.bark), folM = mat(sp.f2), folM2 = mat(sp.f3);
    var H = (sp.big ? 2.8 : sp.small ? 1 : 1.9) * sc;
    function mesh(geo, m, x, y, z){ var o = new THREE.Mesh(geo, m);
      o.position.set(x||0, y||0, z||0); o.castShadow = !glow; grp.add(o); return o; }
    var sh = sp.shape;
    if(sh === 'round'){
      mesh(new THREE.CylinderGeometry(.09*sc, .13*sc, H, 7), trunkM, 0, H/2, 0);
      var fr = H*.42;
      mesh(new THREE.SphereGeometry(fr, NG.LOWEND?9:13, NG.LOWEND?7:10), folM, 0, H+fr*.3, 0);
      mesh(new THREE.SphereGeometry(fr*.62, 8, 7), folM2, -fr*.5, H+fr*.1, fr*.3);
      mesh(new THREE.SphereGeometry(fr*.58, 8, 7), folM2, fr*.48, H+fr*.05, -fr*.28);
      if(sp.fr && stage >= 5){
        var fm = new THREE.MeshLambertMaterial({ color:new THREE.Color(sp.fr) });
        mesh(new THREE.SphereGeometry(.11*sc, 6, 6), fm, -fr*.45, H+fr*.05, fr*.35);
        mesh(new THREE.SphereGeometry(.11*sc, 6, 6), fm, fr*.4, H+fr*.22, -fr*.3);
      }
      if(sp.sakura && stage >= 4){
        var pm = mat(sp.f3);
        mesh(new THREE.SphereGeometry(.06*sc, 5, 5), pm, -fr*.3, H+fr*.65, fr*.3);
        mesh(new THREE.SphereGeometry(.06*sc, 5, 5), pm, fr*.3, H+fr*.75, -fr*.2);
      }
    }
    else if(sh === 'cone'){
      mesh(new THREE.CylinderGeometry(.08*sc, .12*sc, H*.5, 7), trunkM, 0, H*.25, 0);
      mesh(new THREE.ConeGeometry(H*.42, H*.95, 8), folM, 0, H*.65, 0);
      mesh(new THREE.ConeGeometry(H*.3, H*.6, 8), folM2, 0, H*.95, 0);
    }
    else if(sh === 'palm'){
      mesh(new THREE.CylinderGeometry(.08*sc, .14*sc, H*1.15, 7), trunkM, 0, H*.57, 0);
      for(var j = 0; j < 5; j++){
        var a = j/5*Math.PI*2;
        var frond = new THREE.Mesh(new THREE.ConeGeometry(.16*sc, H*.7, 5), folM);
        frond.position.set(Math.cos(a)*H*.32, H*1.15, Math.sin(a)*H*.32);
        frond.rotation.z = Math.cos(a)*1.25; frond.rotation.x = Math.sin(a)*1.25;
        frond.castShadow = !glow; grp.add(frond);
      }
    }
    else if(sh === 'flower'){
      var fh = H*.9;
      mesh(new THREE.CylinderGeometry(.045*sc, .06*sc, fh, 6), trunkM, 0, fh/2, 0);
      mesh(new THREE.SphereGeometry(.1*sc, 5, 5), folM2, -.16*sc, fh*.42, .05);
      mesh(new THREE.SphereGeometry(.1*sc, 5, 5), folM2, .16*sc, fh*.6, -.04);
      var pr = (sp.big ? .3 : .2)*sc;
      var flM = glow ? mat(sp.fl) : new THREE.MeshLambertMaterial({ color:new THREE.Color(sp.fl || sp.f3) });
      for(var p2 = 0; p2 < 6; p2++){
        var a2 = p2/6*Math.PI*2;
        var pet = new THREE.Mesh(new THREE.SphereGeometry(pr*.55, 6, 5), flM);
        pet.position.set(Math.cos(a2)*pr*1.15, fh + Math.sin(a2)*pr*.4, 0);
        pet.scale.set(1, .45, .7); pet.rotation.z = Math.cos(a2)*.7; grp.add(pet);
      }
      mesh(new THREE.SphereGeometry(pr*.55, 7, 6), mat(sp.fc || 0xd9b23c), 0, fh, 0);
    }
    else if(sh === 'bamboo'){
      for(var b = 0; b < 3; b++){
        var bx = (b-1)*.24*sc, bh = H*(.55 + b*.22);
        mesh(new THREE.CylinderGeometry(.05*sc, .06*sc, bh, 6), mat(sp.f2), bx, bh/2, b*.14-.14);
      }
    }
    else if(sh === 'bush'){
      mesh(new THREE.SphereGeometry(H*.42, 9, 7), folM, 0, H*.4, 0).scale.y = .8;
      mesh(new THREE.SphereGeometry(H*.28, 7, 6), folM2, -H*.3, H*.3, H*.1);
      mesh(new THREE.SphereGeometry(H*.28, 7, 6), folM2, H*.3, H*.3, -.1);
      if(sp.fr && stage >= 5){
        var bm = new THREE.MeshLambertMaterial({ color:new THREE.Color(sp.fr) });
        mesh(new THREE.SphereGeometry(.08*sc, 5, 5), bm, -H*.2, H*.35, H*.3);
        mesh(new THREE.SphereGeometry(.08*sc, 5, 5), bm, H*.25, H*.45, H*.25);
      }
    }
    else if(sh === 'fern'){
      for(var f = 0; f < 5; f++){
        var a3 = f/5*Math.PI*2;
        var lea = new THREE.Mesh(new THREE.ConeGeometry(.1*sc, H*.6, 5), folM);
        lea.position.set(Math.cos(a3)*.2*sc, H*.3, Math.sin(a3)*.2*sc);
        lea.rotation.z = Math.cos(a3)*.9; lea.rotation.x = Math.sin(a3)*.9;
        lea.castShadow = !glow; grp.add(lea);
      }
    }
    else if(sh === 'mushroom'){
      mesh(new THREE.CylinderGeometry(.14*sc, .17*sc, H*.45, 7), mat(0xe8ddc8), 0, H*.22, 0);
      var cap = mesh(new THREE.SphereGeometry(H*.36, 10, 8), folM, 0, H*.45, 0);
      cap.scale.y = .55;
    }
    else if(sh === 'crystal'){
      var cm = glow ? mat(sp.f2) : new THREE.MeshPhongMaterial({ color:new THREE.Color(sp.f2), shininess:100, transparent:true, opacity:.92 });
      mesh(new THREE.OctahedronGeometry(H*.34, 0), cm, 0, H*.5, 0).scale.y = 1.6;
      mesh(new THREE.OctahedronGeometry(H*.16, 0), cm, H*.2, H*.25, .1).scale.y = 1.4;
      mesh(new THREE.OctahedronGeometry(H*.13, 0), cm, -H*.18, H*.3, -.08).scale.y = 1.3;
    }
    else if(sh === 'star'){
      mesh(new THREE.CylinderGeometry(.04*sc, .05*sc, H*.7, 6), trunkM, 0, H*.35, 0);
      mesh(new THREE.OctahedronGeometry(H*.26, 0), mat(sp.f2), 0, H*.85, 0);
      for(var s3 = 0; s3 < 4; s3++){
        var a4 = s3/4*Math.PI*2;
        mesh(new THREE.OctahedronGeometry(.07*sc, 0), mat(sp.f3),
          Math.cos(a4)*H*.3, H*(.5 + (s3%2)*.2), Math.sin(a4)*H*.3);
      }
    }
    return grp;
  },

  refresh: function(){
    if(!this.ok || !NG.G) return;
    var self = this;
    NG.G.plots.forEach(function(p, i){
      var g = self.plotGroups[i], base = self.plotHits[i];
      if(p.st !== 'grow' && p.st !== 'ready'){
        if(g){ self.scene.remove(g); self.plotGroups[i] = null; }
        return;
      }
      var sp = NG.plantById(p.seed); if(!sp) return;
      var st = p.st === 'ready' ? 5 : NG.stageOf(p);
      if(!g){
        g = self.buildPlantMesh(sp, st);
        g.position.copy(base.position); g.position.y = .35;
        self.scene.add(g); self.plotGroups[i] = g;
      } else if(g.userData.st !== st || g.userData.sid !== p.seed){
        self.scene.remove(g);
        g = self.buildPlantMesh(sp, st);
        g.position.copy(base.position); g.position.y = .35;
        self.scene.add(g); self.plotGroups[i] = g;
      }
      g.userData.st = st; g.userData.sid = p.seed;
      var gr = 1 + (p.prog || 0) * .15;
      g.scale.set(gr, gr, gr);
      if(!g.userData.ind){
        var im = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6),
          new THREE.MeshBasicMaterial({ color:0xffd98a }));
        im.position.y = 2.6; im.visible = false; g.add(im);
        g.userData.ind = im;
      }
      if(p.st === 'ready'){ g.userData.ind.visible = true; g.userData.ind.material.color.setHex(0xffd98a); }
      else if((p.water || 0) <= 25){ g.userData.ind.visible = true; g.userData.ind.material.color.setHex(0x6cb3f0); }
      else g.userData.ind.visible = false;
    });
    /* decor */
    while(this.decorG.children.length) this.decorG.remove(this.decorG.children[0]);
    var dg = this.decorG;
    if(NG.G.decor.lamp){
      var l2 = new THREE.Group();
      var pl = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 2.2, 8), this.lampM);
      pl.position.y = 1.1; pl.castShadow = true; l2.add(pl);
      var bl = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8),
        new THREE.MeshBasicMaterial({ color:0xffd98a }));
      bl.position.y = 2.3; l2.add(bl);
      l2.position.set(-3.5, 0, 5.5); dg.add(l2);
    }
    if(NG.G.decor.gnome){
      var gm = new THREE.Group();
      var body = new THREE.Mesh(new THREE.ConeGeometry(.3, .7, 8),
        new THREE.MeshLambertMaterial({ color:0x3f6b8a }));
      body.position.y = .35; body.castShadow = true; gm.add(body);
      var head = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 7),
        new THREE.MeshLambertMaterial({ color:0xe8c49a }));
      head.position.y = .78; gm.add(head);
      var hat = new THREE.Mesh(new THREE.ConeGeometry(.14, .3, 8),
        new THREE.MeshLambertMaterial({ color:0xc93b3b }));
      hat.position.y = 1; gm.add(hat);
      gm.position.set(3, 0, 4.8); dg.add(gm);
    }
    if(NG.G.decor.fountain){
      var fo = new THREE.Group();
      var bas = new THREE.Mesh(new THREE.CylinderGeometry(1, .9, .3, 16),
        new THREE.MeshLambertMaterial({ color:0x8a8a80 }));
      bas.position.y = .15; bas.castShadow = true; fo.add(bas);
      var wat = new THREE.Mesh(new THREE.CylinderGeometry(.85, .85, .1, 16),
        new THREE.MeshPhongMaterial({ color:0x4f9ad0, transparent:true, opacity:.8 }));
      wat.position.y = .32; fo.add(wat);
      var col = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, .8, 8),
        new THREE.MeshLambertMaterial({ color:0x8a8a80 }));
      col.position.y = .6; fo.add(col);
      fo.position.set(0, 0, -5.5); dg.add(fo);
    }
    if(NG.G.decor.arch){
      var ar = new THREE.Group();
      var am = new THREE.MeshLambertMaterial({ color:0x6b4a2b });
      [[-.9],[.9]].forEach(function(x){
        var po = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 2.6, 7), am);
        po.position.set(x[0], 1.3, 0); po.castShadow = true; ar.add(po);
      });
      var top = new THREE.Mesh(new THREE.TorusGeometry(.9, .07, 8, 16, Math.PI), am);
      top.position.y = 2.6; ar.add(top);
      ar.position.set(0, 0, 6.5); dg.add(ar);
    }
  },

  bindControls: function(box){
    var self = this, P = this._pters;
    function upd(){
      self.phi = Math.max(.28, Math.min(1.35, self.phi));
      self.radius = Math.max(8, Math.min(30, self.radius));
      self.cam.position.set(
        Math.sin(self.theta)*Math.sin(self.phi)*self.radius,
        Math.cos(self.phi)*self.radius,
        Math.cos(self.theta)*Math.sin(self.phi)*self.radius);
      self.cam.lookAt(0, 1, 0);
    }
    this._upd = upd; upd();
    box.addEventListener('pointerdown', function(e){
      self._down = true; self._moved = 0;
      self._lx = e.clientX; self._ly = e.clientY;
      P[e.pointerId] = [e.clientX, e.clientY];
      if(box.setPointerCapture) try{ box.setPointerCapture(e.pointerId); }catch(_){}
    });
    box.addEventListener('pointermove', function(e){
      if(!self._down) return;
      if(P[e.pointerId]) P[e.pointerId] = [e.clientX, e.clientY];
      var keys = Object.keys(P);
      if(keys.length >= 2){
        var dx = P[keys[0]][0] - P[keys[1]][0], dy = P[keys[0]][1] - P[keys[1]][1];
        var d = Math.sqrt(dx*dx + dy*dy);
        if(self._pinch) self.radius = Math.max(8, Math.min(30, self.radius - (d - self._pinch)*.05));
        self._pinch = d; self._moved = 99; upd(); return;
      }
      var mx = e.clientX - self._lx, my = e.clientY - self._ly;
      self._moved += Math.abs(mx) + Math.abs(my);
      self.theta -= mx * .006; self.phi -= my * .005;
      self._lx = e.clientX; self._ly = e.clientY; upd();
    });
    function up(e){
      if(e.type === 'pointerup' && self._moved < 7) self.tap(e);
      delete P[e.pointerId]; self._pinch = 0;
      if(!Object.keys(P).length) self._down = false;
    }
    box.addEventListener('pointerup', up);
    box.addEventListener('pointercancel', up);
    box.addEventListener('wheel', function(e){
      e.preventDefault();
      self.radius = Math.max(8, Math.min(30, self.radius + e.deltaY * .015)); upd();
    }, {passive:false});
    this.tap = function(e){
      if(!this.ok) return;
      var r = this.renderer.domElement.getBoundingClientRect();
      var nd = new THREE.Vector2(((e.clientX - r.left)/r.width)*2 - 1, -((e.clientY - r.top)/r.height)*2 + 1);
      this.ray.setFromCamera(nd, this.cam);
      var hits = this.ray.intersectObjects(this.plotHits);
      if(hits.length) NG.plotClick(hits[0].object.userData.plot, null);
    };
  },

  applyDayNight: function(){
    if(!this.ok) return;
    var h = new Date().getHours();
    var night = h >= 19 || h < 6, sunset = h >= 16 && h < 19;
    if(night){
      this.scene.background.setHex(0x0a1220); this.scene.fog.color.setHex(0x0a1220);
      this.sun.intensity = .25; this.sun.color.setHex(0x9ab0e0); this.sun.position.set(-6, 10, -4);
      this.lampBulbs.forEach(function(b){ b.visible = true; });
    } else if(sunset){
      this.scene.background.setHex(0x2a1f22); this.scene.fog.color.setHex(0x2a1f22);
      this.sun.intensity = .9; this.sun.color.setHex(0xff9a5c); this.sun.position.set(10, 6, 4);
      this.lampBulbs.forEach(function(b){ b.visible = false; });
    } else {
      this.scene.background.setHex(0x16301f); this.scene.fog.color.setHex(0x16301f);
      this.sun.intensity = 1.1; this.sun.color.setHex(0xffe8c0); this.sun.position.set(8, 14, 6);
      this.lampBulbs.forEach(function(b){ b.visible = false; });
    }
    var wt = NG.$('#lbWTx');
    if(wt) wt.textContent = night ? '🌙 Đêm' : sunset ? '🌅 Hoàng hôn' : h < 9 ? '🌤 Sáng' : '☀️ Trưa';
    var wi = NG.$('#lbWIc'); if(wi) wi.innerHTML = night ? '🌙' : '☀️';
    var hc = NG.$('#hsOrb'); if(hc) hc.className = 'horb ' + (night ? 'moon' : 'sun');
    var hs = NG.$('#homeScene .sky');
    if(hs) hs.style.background = night ? 'linear-gradient(#0a1226,#12203a)' : 'linear-gradient(#2a5a4a,#16301f)';
  },
  resetCam: function(){ this.theta = .65; this.phi = .92; this.radius = 17; if(this._upd) this._upd(); },
  resize: function(){
    if(!this.ok) return;
    var box = NG.$('#g3d');
    if(!box || !box.clientWidth) return;
    this.renderer.setSize(box.clientWidth, box.clientHeight);
    this.cam.aspect = box.clientWidth / box.clientHeight;
    this.cam.updateProjectionMatrix();
  },
  enter: function(){
    if(this.ok){ this.paused = false; this.resize(); if(NG.G) this.refresh(); this.loop(); }
    else if(NG.G2D) NG.G2D.render();
  },
  pause: function(){ this.paused = true; },
  loop: function(){
    var self = this;
    if(this._raf) cancelAnimationFrame(this._raf);
    function tick(){
      if(self.paused || document.hidden){ self._raf = 0; return; }
      self._raf = requestAnimationFrame(tick);
      if(self.pond) self.pond.position.y = .04 + Math.sin(performance.now()*.001)*.02;
      self.renderer.render(self.scene, self.cam);
    }
    tick();
  },
  toggleShadow: function(){
    if(!this.ok) return;
    this.shadows = !this.shadows;
    this.renderer.shadowMap.enabled = this.shadows;
    this.sun.castShadow = this.shadows;
    this.scene.traverse(function(o){ if(o.material) o.material.needsUpdate = true; });
    NG.notify('Bóng đổ: ' + (this.shadows ? 'BẬT' : 'TẮT'), '🔧', 'sh');
  }
};

/* ---- 2D FALLBACK ---- */
var G2D = NG.G2D = {
  render: function(){
    var box = NG.$('#g2dPlots');
    if(!box || !NG.G) return;
    box.innerHTML = NG.G.plots.map(function(p, i){
      if(p.st === 'locked')
        return '<div class="p2 lk" data-act="plot" data-id="'+i+'" role="button" tabindex="0" aria-label="Ô đất khóa"><div class="st">🔒</div></div>';
      if(p.st === 'empty')
        return '<div class="p2" data-act="plot" data-id="'+i+'" role="button" tabindex="0" aria-label="Ô trống — trồng"><div class="st">➕</div></div>';
      var sp = NG.plantById(p.seed); if(!sp) return '<div class="p2" data-act="plot" data-id="'+i+'"></div>';
      var st = p.st === 'ready' ? 5 : NG.stageOf(p);
      return '<div class="p2" data-act="plot" data-id="'+i+'" role="button" tabindex="0" aria-label="'+NG.esc(p.name || sp.n)+'">'+
        '<div class="st">'+(p.st === 'ready' ? '✨' : (p.water || 0) <= 25 ? '💧' : '🌱')+'</div>'+
        NG.plantIcon(sp, st)+
        '<div class="pb2"><i style="width:'+Math.round((p.prog||0)*100)+'%"></i></div></div>';
    }).join('');
  }
};
})();
