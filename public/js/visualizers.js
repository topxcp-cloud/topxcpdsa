/**
 * Top-X 3D Visualizers Suite (Powered by Three.js r128)
 * 1. Binary Search 3D Interactive Physical System
 * 2. Bubble Sort 3D Live Sort & Orbital Swaps
 * 3. Pathfinding 3D Maze (BFS vs Dijkstra vs A*)
 * Robust multi-tab & ResizeObserver support.
 */

window.TopXVisualizers = (function() {

  function watchCanvas(canvas, resume) {
    var visible = !('IntersectionObserver' in window), observer = null;
    function isActive() {
      return visible && !document.hidden;
    }
    function onVisibilityChange() {
      if (isActive()) resume();
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function(entries) {
        visible = entries.some(function(entry) { return entry.isIntersecting; });
        if (isActive()) resume();
      }, { rootMargin: '200px 0px' });
      observer.observe(canvas);
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return {
      isActive: isActive,
      destroy: function() {
        if (observer) observer.disconnect();
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }

  // Helper: Binary Search Steps
  function computeBinarySearchSteps(arr, target) {
    var lo = 0, hi = arr.length - 1, s = [];
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      s.push([lo, hi, mid]);
      if (arr[mid] === target) break;
      if (arr[mid] < target) lo = mid + 1;
      else hi = mid - 1;
    }
    return s;
  }

  // =========================================================================
  // 1. BINARY SEARCH 3D
  // =========================================================================
  function initBinarySearch(canvasId, readoutId) {
    var cv = document.getElementById(canvasId);
    if (!cv) return null;
    var ro = document.getElementById(readoutId);
    var stage = cv.parentElement || cv;

    var V = [2, 5, 8, 12, 17, 21, 29, 34, 41, 47, 55, 62, 70, 78, 85, 93];
    var N = 16, SP = 1.15;

    var R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    R.shadowMap.enabled = true;
    R.shadowMap.type = THREE.PCFSoftShadowMap;

    var S = new THREE.Scene();
    var C = new THREE.PerspectiveCamera(28, 2, 0.1, 100);
    S.add(new THREE.HemisphereLight(0xffffff, 0xb8b4a8, 0.75));

    var L = new THREE.DirectionalLight(0xfffaf2, 1.3);
    L.position.set(-8, 16, 9);
    L.castShadow = true;
    S.add(L);

    var fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.ShadowMaterial({ opacity: 0.3 }));
    fl.rotation.x = -Math.PI / 2;
    fl.receiveShadow = true;
    S.add(fl);

    function createLabelSprite(text, w, bg, fg) {
      var c = document.createElement('canvas');
      c.width = 160; c.height = 80;
      var x = c.getContext('2d');
      if (bg) {
        x.fillStyle = bg;
        x.fillRect(30, 16, 100, 48);
      }
      x.font = '600 38px Geist, Inter, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillStyle = fg;
      x.fillText(text, 80, 42);
      var s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c),
        transparent: true,
        depthTest: false
      }));
      s.scale.set(w, w / 2, 1);
      return s;
    }

    var sl = [], X = function(i) { return (i - (N - 1) / 2) * SP; };
    var cols = { a: new THREE.Color(0xC7C5BC), x: new THREE.Color(0x9A9890), m: new THREE.Color(0xFF5A36) };
    var lc = { a: new THREE.Color(0x171717), x: new THREE.Color(0x6B6B6B) };

    V.forEach(function(v, i) {
      var mt = new THREE.MeshStandardMaterial({ color: 0xC7C5BC, roughness: 0.62, metalness: 0 });
      var m = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1, 0.86), mt);
      m.castShadow = true;
      m.position.x = X(i);
      m.scale.y = 0.01;
      S.add(m);

      var l = createLabelSprite(String(v), 1.5, null, '#ffffff');
      l.position.x = X(i);
      S.add(l);
      sl.push({ m: m, l: l, h: 0.6 + v * 0.05, s: 0 });
    });

    var fr = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0xFF5A36 })
    );
    fr.position.y = 3.4;
    fr.scale.set(N * SP, 6.8, 1.5);
    S.add(fr);

    var mk = [
      createLabelSprite('lo', 1.5, '#171717', '#ffffff'),
      createLabelSprite('mid', 1.5, '#FF5A36', '#ffffff'),
      createLabelSprite('hi', 1.5, '#171717', '#ffffff')
    ];
    mk.forEach(function(k) { k.position.set(0, 0.5, 1.5); S.add(k); });

    var pg = new THREE.Group();
    S.add(pg);
    var pl = null;

    var TG = [21, 62, 5, 78], ti = 0, tgt = TG[0];
    var stp = computeBinarySearchSteps(V, tgt);
    var si = -1, nxt = performance.now() + 1800, vis = [], lo = 0, hi = N - 1, md = -1, tx = [0, 0, 0];

    function applyState() {
      var s = si < 0 ? [0, N - 1, -1] : stp[si];
      lo = s[0]; hi = s[1]; md = s[2];
      var f = si >= 0 && V[md] === tgt;
      sl.forEach(function(o, i) {
        o.s = si < 0 ? 0 : (i === md ? (f ? 3 : 2) : (i < lo || i > hi ? 1 : 0));
      });

      if (si >= 0) {
        vis.push(md);
        var d = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0xFF5A36, roughness: 0.4 }));
        d.position.set(X(md), 0.03, 2.8);
        pg.add(d);
        if (pl) pg.remove(pl);
        if (vis.length > 1) {
          pl = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(vis.map(function(i) { return new THREE.Vector3(X(i), 0.07, 2.8); })),
            new THREE.LineBasicMaterial({ color: 0xFF5A36 })
          );
          pg.add(pl);
        }
      }

      if (ro) {
        ro.innerHTML = 'target <b>' + tgt + '</b><br>low <b>' + lo + '</b>   mid <span style="color:var(--ac);font-weight:600">' + (md < 0 ? '-' : md) + '</span>   high <b>' + hi + '</b><br>' +
          (si < 0 ? 'ready' : 'step ' + (si + 1) + ' of ' + stp.length + (f ? ', match found ✓' : ''));
      }
    }

    applyState();

    var mx = 0, my = 0;
    stage.addEventListener('mousemove', function(e) {
      var b = this.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) {
        mx = (e.clientX - b.left) / b.width - 0.5;
        my = (e.clientY - b.top) / b.height - 0.5;
      }
    });

    var fitD = 36, sx = 0;
    function resize() {
      var b = stage.getBoundingClientRect();
      var w = b.width || stage.clientWidth || 600;
      var h = b.height || stage.clientHeight || 400;
      if (w <= 0 || h <= 0) return;

      R.setSize(w, h, false);
      C.aspect = w / h;
      if (!isFinite(C.aspect) || C.aspect <= 0) C.aspect = 1.6;
      C.updateProjectionMatrix();

      var t = Math.tan(14 * Math.PI / 180);
      fitD = Math.max(10.6 / (0.62 * t * C.aspect), 6.7 / t);
      sx = 0.26 * fitD * t * C.aspect;
    }

    resize();
    window.addEventListener('resize', resize);
    var roObs = null;
    if (window.ResizeObserver && stage) {
      roObs = new ResizeObserver(resize);
      roObs.observe(stage);
    }

    var t0 = performance.now();
    var animId = null;
    var visibility = watchCanvas(cv, function() {
      if (animId === null) animId = requestAnimationFrame(loop);
    });

    function loop() {
      animId = null;
      if (!visibility.isActive()) return;
      var n = performance.now(), e = Math.min((n - t0) / 2200, 1);
      if (n > nxt) {
        si++;
        if (si >= stp.length) {
          ti = (ti + 1) % TG.length;
          tgt = TG[ti];
          stp = computeBinarySearchSteps(V, tgt);
          si = -1;
          vis = [];
          while (pg.children.length) pg.remove(pg.children[0]);
          pl = null;
        }
        applyState();
        nxt = n + (si >= stp.length - 1 && V[md] === tgt ? 2800 : 1250);
      }

      sl.forEach(function(o) {
        var k = [1, 0.38, 1.18, 1.18][o.s] * o.h * Math.min(e * 1.6, 1);
        var m = o.m;
        m.scale.y += (k - m.scale.y) * 0.09;
        m.position.y = m.scale.y / 2;
        m.material.color.lerp(o.s === 1 ? cols.x : (o.s > 1 ? cols.m : cols.a), 0.1);
        o.l.position.y = m.scale.y + 0.55;
      });

      var cx = (X(lo) + X(hi)) / 2;
      var cw = (hi - lo + 1) * SP + 0.3;
      fr.position.x += (cx - fr.position.x) * 0.09;
      fr.scale.x += (cw - fr.scale.x) * 0.09;

      [lo, md < 0 ? (lo + hi) >> 1 : md, hi].forEach(function(v, i) {
        tx[i] += (X(v) - tx[i]) * 0.1;
        mk[i].position.x = tx[i];
        mk[i].position.z = 1.6;
        mk[i].material.opacity = i === 1 && md < 0 ? 0 : 1;
      });

      var posX = isFinite(mx) ? mx * 2.4 - sx : -sx;
      var posY = isFinite(my) ? fitD * 0.37 - my * 1.6 : fitD * 0.37;
      C.position.set(posX, posY, fitD * 0.93);
      C.lookAt(-sx, 2.3, 0.6);
      R.render(S, C);
      animId = requestAnimationFrame(loop);
    }

    if (visibility.isActive()) loop();

    return {
      resize: resize,
      setTarget: function(newTgt) {
        tgt = newTgt;
        stp = computeBinarySearchSteps(V, tgt);
        si = -1;
        vis = [];
        while (pg.children.length) pg.remove(pg.children[0]);
        pl = null;
        nxt = performance.now() + 500;
        applyState();
      },
      destroy: function() {
        if (animId) cancelAnimationFrame(animId);
        visibility.destroy();
        if (roObs) roObs.disconnect();
        window.removeEventListener('resize', resize);
        R.dispose();
      }
    };
  }

  // =========================================================================
  // 2. BUBBLE SORT 3D
  // =========================================================================
  function initBubbleSort(canvasId, readoutId, pauseBtnId, speedBtnId, shuffleBtnId) {
    var cv = document.getElementById(canvasId);
    if (!cv) return null;
    var stage = cv.parentElement || cv;
    var readout = document.getElementById(readoutId);

    var N = 12, SP = 1.3;
    var P = { a: 0xeceae2, k: 0x171717, t: '#171717', g1: 0xc9c9c3, g2: 0xdeded9 };
    var OR = 0xFF5A36;

    function bsSteps(S_arr) {
      var a = S_arr.map(function(_, i) { return i; }), st = [], dn = [], cmp = 0, sw = 0;
      function push(k, pr, ps, i, m, w) {
        st.push({ a: a.slice(), k: k, pr: pr, lo: i, d: dn.slice(), ps: ps, m: m, c: cmp, s: sw, w: w });
      }
      push('p', null, 0, 0, 'unsorted', 900);
      for (var i = 0; i < N - 1; i++) {
        var sd = false;
        for (var j = N - 1; j > i; j--) {
          cmp++;
          push('c', [j - 1, j], i + 1, i, 'compare ' + S_arr[a[j - 1]] + ' and ' + S_arr[a[j]], 230);
          if (S_arr[a[j]] > S_arr[a[j - 1]]) {
            var t = a[j]; a[j] = a[j - 1]; a[j - 1] = t;
            sw++; sd = true;
            push('s', [j - 1, j], i + 1, i, 'swap', 560);
          }
        }
        if (!sd) {
          for (var q = i; q < N; q++) dn.push(q);
          push('p', null, i + 1, N - 1, 'no swaps — sorted!', 900);
          break;
        }
        dn.push(i);
        push('p', null, i + 1, i + 1, 'rank ' + (i + 1) + ' locked', 650);
      }
      if (dn.length < N) dn.push(N - 1);
      st.push({ a: a.slice(), k: 'f', pr: null, lo: 0, d: dn.slice(), ps: st[st.length - 1].ps, m: 'sorted', c: cmp, s: sw, w: 3400 });
      return st;
    }

    function rnd() {
      var s = {}, o = [];
      while (o.length < N) {
        var v = 8 + Math.floor(Math.random() * 90);
        if (!s[v]) { s[v] = 1; o.push(v); }
      }
      return o;
    }

    var R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    var S3 = new THREE.Scene();
    var C = new THREE.PerspectiveCamera(28, 2, 0.1, 100);
    S3.add(new THREE.HemisphereLight(0xffffff, 0xc8c5bb, 0.85));

    var L = new THREE.DirectionalLight(0xffffff, 1);
    L.position.set(-8, 16, 9);
    S3.add(L);

    var gr = new THREE.GridHelper(48, Math.round(48 / SP), P.g1, P.g2);
    gr.position.y = 0.002;
    S3.add(gr);

    function createSortLabel(t, fg) {
      var c = document.createElement('canvas');
      c.width = 160; c.height = 80;
      var x = c.getContext('2d');
      x.font = '600 38px Geist, Inter, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillStyle = fg;
      x.fillText(t, 80, 42);
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
      s.scale.set(1.5, 0.75, 1);
      return s;
    }

    function X_sort(k) { return (k - (N - 1) / 2) * SP; }

    var S_data, st_data, si_sort, bars = [], nxt_sort = 0, paused = false, spd = 1, fw_sort = N * SP, ft_sort = null;
    var fr_sort = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: OR })
    );
    fr_sort.position.y = 2.1;
    fr_sort.scale.set(N * SP, 4.2, 2);
    S3.add(fr_sort);

    var cc = [new THREE.Color(P.a), new THREE.Color(OR), new THREE.Color(P.k)];
    var hs = [1, 1.12, 1], t0_sort = performance.now();

    function puckGeometry(r, h, b) {
      var pts = [], n = 8, k;
      pts.push(new THREE.Vector2(0, -h));
      for (k = 0; k <= n; k++) {
        var t = k / n * Math.PI / 2;
        pts.push(new THREE.Vector2(r - b + b * Math.sin(t), -h + b - b * Math.cos(t)));
      }
      for (k = 0; k <= n; k++) {
        var t = k / n * Math.PI / 2;
        pts.push(new THREE.Vector2(r - b + b * Math.cos(t), h - b + b * Math.sin(t)));
      }
      pts.push(new THREE.Vector2(0, h));
      return new THREE.LatheGeometry(pts, 56);
    }

    function buildPucks() {
      bars.forEach(function(b) {
        S3.remove(b.m);
        S3.remove(b.l);
        S3.remove(b.sh);
      });
      bars = [];
      S_data.forEach(function(v, i) {
        var r = 0.28 + v * 0.0034, h = 0.2 + v * 0.0022;
        var m = new THREE.Mesh(
          puckGeometry(r, h, Math.min(0.16, h * 0.8)),
          new THREE.MeshStandardMaterial({ color: P.a, roughness: 0.28, metalness: 0.05, side: THREE.DoubleSide })
        );
        m.position.set(X_sort(i), h, 0);
        m.scale.setScalar(0.01);
        S3.add(m);

        var sh = new THREE.Mesh(
          new THREE.CircleGeometry(r * 1.05, 32),
          new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.13, depthWrite: false })
        );
        sh.rotation.x = -Math.PI / 2;
        sh.position.set(X_sort(i), 0.01, 0);
        S3.add(sh);

        var l = createSortLabel(String(v), P.t);
        S3.add(l);
        bars.push({ m: m, l: l, sh: sh, r: h, s: 0, x: X_sort(i), z: 0, up: 0 });
      });
    }

    function resetSort() {
      S_data = rnd();
      st_data = bsSteps(S_data);
      si_sort = 0;
      buildPucks();
      nxt_sort = performance.now() + 1000;
      applySortState(0);
    }

    function applySortState(k) {
      var s = st_data[k], pos = {};
      s.a.forEach(function(id, p) { pos[id] = p; });
      bars.forEach(function(b, id) {
        var p = pos[id], c = 0;
        b.orb = null;
        if (s.k === 'f') c = p < 3 ? 1 : 2;
        else if (s.d.indexOf(p) > -1) c = 2;
        else if (s.pr && (p === s.pr[0] || p === s.pr[1])) {
          c = 1;
          if (s.k === 's') {
            b.orb = {
              cx: (X_sort(s.pr[0]) + X_sort(s.pr[1])) / 2,
              rx: SP / 2,
              rz: 1.15,
              a0: p === s.pr[0] ? 0 : Math.PI,
              t: performance.now(),
              d: s.w * 0.85 / spd
            };
          }
        }
        b.s = c; b.x = X_sort(p); b.z = 0; b.up = 0;
      });

      ft_sort = [(X_sort(s.lo) + X_sort(N - 1)) / 2, (N - s.lo) * SP + 0.3];
      var top = s.k === 'f' ? s.a.slice(0, 3).map(function(id) { return S_data[id]; }).join(' · ') : '';
      if (readout) {
        readout.innerHTML = (s.k === 'f' ? 'top 3 <b>' + top + '</b>' : 'pass <b>' + s.ps + '</b> of ' + (N - 1)) +
          '<br>compared <b>' + s.c + '</b>   swaps <b>' + s.s + '</b><br><span style="color:var(--ac);font-weight:600">' + s.m + '</span>';
      }
    }

    function resizeSort() {
      var b = stage.getBoundingClientRect();
      var w = b.width || stage.clientWidth || 600;
      var h = b.height || stage.clientHeight || 340;
      if (w <= 0 || h <= 0) return;

      R.setSize(w, h, false);
      C.aspect = w / h;
      if (!isFinite(C.aspect) || C.aspect <= 0) C.aspect = 1.6;

      var widthParam = N * SP / 2 + 1.4;
      var d = Math.max(widthParam / (Math.tan(C.fov * Math.PI / 360) * C.aspect), 17);
      C.position.set(0, d * 0.4, d);
      C.lookAt(0, 2.2, 0);
      C.updateProjectionMatrix();
    }

    resizeSort();
    window.addEventListener('resize', resizeSort);
    var sortResizeObserver = null;
    if (window.ResizeObserver && stage) {
      sortResizeObserver = new ResizeObserver(resizeSort);
      sortResizeObserver.observe(stage);
    }

    var mx_sort = 0;
    stage.addEventListener('mousemove', function(e) {
      var b = stage.getBoundingClientRect();
      if (b.width > 0) mx_sort = (e.clientX - b.left) / b.width - 0.5;
    });

    var pzBtn = document.getElementById(pauseBtnId);
    if (pzBtn) {
      pzBtn.onclick = function() {
        paused = !paused;
        this.textContent = paused ? 'Play' : 'Pause';
        nxt_sort = performance.now() + 500;
      };
    }
    var spBtn = document.getElementById(speedBtnId);
    if (spBtn) {
      spBtn.onclick = function() {
        spd = spd === 1 ? 2 : 1;
        this.textContent = 'Speed ' + spd + 'x';
      };
    }
    var shBtn = document.getElementById(shuffleBtnId);
    if (shBtn) {
      shBtn.onclick = resetSort;
    }

    resetSort();

    var animSortId = null;
    var sortVisibility = watchCanvas(cv, function() {
      if (animSortId === null) animSortId = requestAnimationFrame(sortLoop);
    });
    function sortLoop() {
      animSortId = null;
      if (!sortVisibility.isActive()) return;
      var n = performance.now(), e = Math.min((n - t0_sort) / 1800, 1);
      if (!paused && n > nxt_sort) {
        if (si_sort >= st_data.length - 1) {
          resetSort();
        } else {
          si_sort++;
          applySortState(si_sort);
          nxt_sort = n + st_data[si_sort].w / spd;
        }
      }

      bars.forEach(function(o) {
        var m = o.m, k = hs[o.s] * Math.min(e * 1.6, 1);
        var sc = m.scale.x + (k - m.scale.x) * 0.1;
        m.scale.setScalar(sc);

        if (o.orb) {
          var q = o.orb, u = Math.min((n - q.t) / q.d, 1);
          var ee = u * u * (3 - 2 * u), th = q.a0 + Math.PI * ee, e2 = 0.55;
          var cs = Math.cos(th), sn = Math.sin(th);
          m.position.x = q.cx + q.rx * Math.sign(cs) * Math.pow(Math.abs(cs), e2);
          m.position.z = q.rz * Math.sign(sn) * Math.pow(Math.abs(sn), e2);
          if (u >= 1) o.orb = null;
        } else {
          m.position.x += (o.x - m.position.x) * 0.16;
          m.position.z += (o.z - m.position.z) * 0.16;
        }

        m.position.y += (o.r * sc + o.up - m.position.y) * 0.16;
        m.material.color.lerp(cc[o.s], 0.14);
        o.l.position.set(m.position.x, m.position.y + o.r * sc + 0.5, m.position.z);
        o.sh.position.set(m.position.x, 0.01, m.position.z);
        o.sh.scale.setScalar(sc * Math.max(0.7, 1 - (m.position.y - o.r * sc) * 0.2));
      });

      if (ft_sort) {
        fr_sort.position.x += (ft_sort[0] - fr_sort.position.x) * 0.1;
        fw_sort += (ft_sort[1] - fw_sort) * 0.1;
        fr_sort.scale.x = fw_sort;
      }

      C.position.x = (isFinite(mx_sort) ? mx_sort : 0) * 3;
      C.lookAt(0, 2.2, 0);
      R.render(S3, C);
      animSortId = requestAnimationFrame(sortLoop);
    }

    if (sortVisibility.isActive()) sortLoop();

    return {
      resize: resizeSort,
      shuffle: resetSort,
      destroy: function() {
        if (animSortId) cancelAnimationFrame(animSortId);
        sortVisibility.destroy();
        if (sortResizeObserver) sortResizeObserver.disconnect();
        window.removeEventListener('resize', resizeSort);
        R.dispose();
      }
    };
  }

  // =========================================================================
  // 3. 3D PATHFINDING VISUALIZER (BFS vs Dijkstra vs A*)
  // =========================================================================
  function initPathfinding(canvasId, tableId, msgId, pauseBtnId, speedBtnId, mazeBtnId, algoButtonsSelector) {
    var cv = document.getElementById(canvasId);
    if (!cv) return null;
    var stage = cv.parentElement || cv;
    var tb = document.getElementById(tableId);

    var W = 21, H = 13, NA = ['BFS', 'Dijkstra', 'A*'];
    var wall = [], wt = [], SI = (H >> 1) * W + 1, TI = (H >> 1) * W + W - 2, res = [];

    function nb(i) {
      var x = i % W, y = (i / W) | 0, r = [];
      if (x > 0) r.push(i - 1);
      if (x < W - 1) r.push(i + 1);
      if (y > 0) r.push(i - W);
      if (y < H - 1) r.push(i + W);
      return r.filter(function(n) { return !wall[n]; });
    }

    function hh(i) {
      return Math.abs(i % W - TI % W) + Math.abs(((i / W) | 0) - ((TI / W) | 0));
    }

    function run(a) {
      var prev = [], disc = [], steps = [], g = [], i;
      if (a === 0) {
        var q = [SI];
        disc[SI] = 1;
        while (q.length) {
          var u = q.shift(), st = { v: u, f: [] };
          steps.push(st);
          if (u === TI) break;
          nb(u).forEach(function(n) {
            if (!disc[n]) {
              disc[n] = 1;
              prev[n] = u;
              q.push(n);
              st.f.push(n);
            }
          });
        }
      } else {
        for (i = 0; i < W * H; i++) g[i] = Infinity;
        g[SI] = 0;
        var open = [SI], cl = [];
        disc[SI] = 1;
        while (open.length) {
          var bi = 0, bf = Infinity, bh = 0;
          open.forEach(function(n, k) {
            var f = g[n] + (a === 2 ? hh(n) : 0);
            if (f < bf || (f === bf && hh(n) < bh)) {
              bf = f; bi = k; bh = hh(n);
            }
          });
          var u = open.splice(bi, 1)[0];
          if (cl[u]) continue;
          cl[u] = 1;
          var st = { v: u, f: [] };
          steps.push(st);
          if (u === TI) break;
          nb(u).forEach(function(n) {
            var ng = g[u] + wt[n];
            if (ng < g[n]) {
              g[n] = ng;
              prev[n] = u;
              open.push(n);
              if (!disc[n]) {
                disc[n] = 1;
                st.f.push(n);
              }
            }
          });
        }
      }
      var path = [], c = TI;
      if (c === SI || prev[c] !== undefined) {
        while (c !== undefined && c !== null) {
          path.unshift(c);
          c = prev[c];
        }
      }
      var cost = 0;
      if (path.length) {
        for (i = 1; i < path.length; i++) cost += (wt[path[i]] || 1);
      }
      return { steps: steps, path: path, vis: steps.length, len: Math.max(path.length - 1, 0), cost: cost, ok: path.length > 0 };
    }

    function all() { res = [0, 1, 2].map(run); }

    function gen() {
      for (var t = 0; t < 60; t++) {
        for (var i = 0; i < W * H; i++) {
          var x = i % W, y = (i / W) | 0, s = (i === SI || i === TI);
          wall[i] = !s && Math.random() < 0.25;
          wt[i] = !wall[i] && !s && Math.random() < 0.16 ? 5 : 1;
        }
        all();
        if (res[0] && res[0].ok) return;
      }
    }

    var P_path = { a: 0xeceae2, v: 0x8da2bd, wl: 0x1d2740, w: 0xd6c9a8, t: '#171717', k: 0x334155, ed: 0xd4d0c4 };
    var OR_path = 0xFF5A36;

    var R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    var S = new THREE.Scene();
    var C = new THREE.PerspectiveCamera(36, 1.6, 0.1, 100);
    C.position.set(0, 17, 18);
    C.lookAt(0, 0, 0);

    S.add(new THREE.HemisphereLight(0xffffff, 0xc8c5bb, 0.75));
    var L = new THREE.DirectionalLight(0xffffff, 1.2);
    L.position.set(-6, 16, 10);
    S.add(L);

    var curAlgo = 0, paused = false, spd = 1, si = 0, pi = 0, nxt = 0, state = 's';
    var cubes = [];
    var geom = new THREE.BoxGeometry(0.88, 0.24, 0.88);
    var eg = new THREE.EdgesGeometry(geom);

    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var mat = new THREE.MeshStandardMaterial({ color: P_path.a, roughness: 0.35, metalness: 0.05 });
        var m = new THREE.Mesh(geom, mat);
        m.position.set(x - W / 2 + 0.5, 0, y - H / 2 + 0.5);
        m.userData = { index: y * W + x };
        S.add(m);

        var e = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: P_path.ed, transparent: true, opacity: 0.6 }));
        m.add(e);
        cubes.push(m);
      }
    }

    function createMarker(text, bg, fg) {
      var c = document.createElement('canvas');
      c.width = 128; c.height = 128;
      var x = c.getContext('2d');
      x.fillStyle = bg;
      x.beginPath();
      x.arc(64, 64, 52, 0, Math.PI * 2);
      x.fill();
      x.font = '700 48px Geist, sans-serif';
      x.fillStyle = fg;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(text, 64, 68);
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
      s.scale.set(1.1, 1.1, 1);
      return s;
    }

    var smk = createMarker('S', '#171717', '#ffffff');
    var tmk = createMarker('T', '#FF5A36', '#ffffff');
    S.add(smk); S.add(tmk);

    function pos(i) { return new THREE.Vector3(i % W - W / 2 + 0.5, 0.5, ((i / W) | 0) - H / 2 + 0.5); }

    function resetMarkers() {
      smk.position.copy(pos(SI));
      tmk.position.copy(pos(TI));
    }

    function updateTable() {
      if (!tb) return;
      tb.innerHTML = NA.map(function(n, i) {
        var r = res[i] || { vis: 0, len: 0, cost: 0, ok: false };
        return '<tr class="' + (i === curAlgo ? 'on' : '') + '">' +
          '<td>' + n + '</td>' +
          '<td>' + r.vis + '</td>' +
          '<td>' + (r.ok ? r.len : '—') + '</td>' +
          '<td>' + (r.ok ? r.cost : '—') + '</td>' +
          '</tr>';
      }).join('');
    }

    function updateTile(i) {
      var m = cubes[i];
      if (!m) return;
      if (wall[i]) {
        m.scale.y = 2.4;
        m.position.y = 0.17;
        m.material.color.set(P_path.wl);
      } else if (wt[i] > 1) {
        m.scale.y = 1;
        m.position.y = 0;
        m.material.color.set(P_path.w);
      } else {
        m.scale.y = 1;
        m.position.y = 0;
        m.material.color.set(P_path.a);
      }
    }

    function resetVisuals() {
      for (var i = 0; i < W * H; i++) updateTile(i);
      resetMarkers();
    }

    function startAlgo(a) {
      curAlgo = a;
      si = 0; pi = 0; state = 's';
      nxt = performance.now();
      resetVisuals();
      updateTable();

      document.querySelectorAll(algoButtonsSelector).forEach(function(b) {
        b.classList.toggle('active', +b.dataset.a === a);
        b.classList.toggle('on', +b.dataset.a === a);
      });
    }

    gen();
    resetVisuals();
    updateTable();

    // Raycaster for tile clicking
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();

    cv.addEventListener('click', function(e) {
      var rect = cv.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, C);

      var hits = raycaster.intersectObjects(cubes, true);
      if (hits.length) {
        var obj = hits[0].object;
        while (obj && obj.userData.index === undefined && obj.parent) {
          obj = obj.parent;
        }
        if (obj && obj.userData.index !== undefined) {
          var idx = obj.userData.index;
          if (idx !== SI && idx !== TI && idx >= 0 && idx < W * H) {
            if (!wall[idx] && wt[idx] === 1) {
              wall[idx] = 1;
            } else if (wall[idx]) {
              wall[idx] = 0; wt[idx] = 5;
            } else {
              wt[idx] = 1;
            }
            all();
            startAlgo(curAlgo);
          }
        }
      }
    });

    // Controls
    var pz = document.getElementById(pauseBtnId);
    if (pz) {
      pz.onclick = function() {
        paused = !paused;
        this.textContent = paused ? 'Play' : 'Pause';
      };
    }
    var sp = document.getElementById(speedBtnId);
    if (sp) {
      sp.onclick = function() {
        spd = spd === 1 ? 2 : 1;
        this.textContent = 'Speed ' + spd + 'x';
      };
    }
    var nm = document.getElementById(mazeBtnId);
    if (nm) {
      nm.onclick = function() {
        gen();
        startAlgo(curAlgo);
      };
    }

    document.querySelectorAll(algoButtonsSelector).forEach(function(btn) {
      btn.onclick = function() {
        startAlgo(+this.dataset.a);
      };
    });

    function resizePath() {
      var b = stage.getBoundingClientRect();
      var w = b.width || stage.clientWidth || 600;
      var h = b.height || stage.clientHeight || 520;
      if (w <= 0 || h <= 0) return;

      R.setSize(w, h, false);
      C.aspect = w / h;
      if (!isFinite(C.aspect) || C.aspect <= 0) C.aspect = 1.6;
      C.updateProjectionMatrix();
    }

    resizePath();
    window.addEventListener('resize', resizePath);
    var pathResizeObserver = null;
    if (window.ResizeObserver && stage) {
      pathResizeObserver = new ResizeObserver(resizePath);
      pathResizeObserver.observe(stage);
    }

    var animPathId = null;
    var pathVisibility = watchCanvas(cv, function() {
      if (animPathId === null) animPathId = requestAnimationFrame(pathLoop);
    });
    function pathLoop() {
      animPathId = null;
      if (!pathVisibility.isActive()) return;
      var n = performance.now();
      var curRes = res[curAlgo];

      if (!paused && curRes && n > nxt) {
        if (state === 's') {
          if (si < curRes.steps.length) {
            var st = curRes.steps[si];
            var m = cubes[st.v];
            if (m && m.material) {
              m.material.color.set(P_path.v);
              m.scale.y = 1.35;
              m.position.y = 0.04;
            }

            if (st.f) {
              st.f.forEach(function(f) {
                var cf = cubes[f];
                if (cf && !wall[f] && cf.material) {
                  cf.material.color.set(OR_path);
                  cf.scale.y = 1.15;
                }
              });
            }

            si++;
            nxt = n + (38 / spd);
          } else {
            state = 'p';
            nxt = n + 200;
          }
        } else if (state === 'p') {
          if (curRes.path && pi < curRes.path.length) {
            var nodeIdx = curRes.path[pi];
            var cube = cubes[nodeIdx];
            if (cube && cube.material) {
              cube.material.color.set(OR_path);
              cube.scale.y = 1.8;
              cube.position.y = 0.1;
            }
            pi++;
            nxt = n + (42 / spd);
          } else {
            state = 'done';
            nxt = n + 3200;
          }
        } else if (state === 'done') {
          startAlgo((curAlgo + 1) % 3);
        }
      }

      R.render(S, C);
      animPathId = requestAnimationFrame(pathLoop);
    }

    if (pathVisibility.isActive()) pathLoop();

    return {
      resize: resizePath,
      setAlgo: startAlgo,
      newMaze: function() { gen(); startAlgo(curAlgo); },
      destroy: function() {
        if (animPathId) cancelAnimationFrame(animPathId);
        pathVisibility.destroy();
        if (pathResizeObserver) pathResizeObserver.disconnect();
        window.removeEventListener('resize', resizePath);
        R.dispose();
      }
    };
  }

  return {
    initBinarySearch: initBinarySearch,
    initBubbleSort: initBubbleSort,
    initPathfinding: initPathfinding
  };

})();
