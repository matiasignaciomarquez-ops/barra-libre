// Barra Libre — figura humana 3D para yoga. Funciona sin conexión, se dibuja en SVG.
// Mundo: x = izquierda de la persona, y = arriba, z = adelante (hacia donde mira). Unidades ≈ cm. Piso en y = 0.
(function (G) {
  'use strict';
  const L = { hipW: 9, lum: 24, tho: 26, shW: 17, neck: 9, headUp: 11, ua: 31, fa: 27, palm: 9, hand: 17, th: 45, sh: 44 };
  const C = {
    top: '#3E9C8F', leg: '#3A4766', band: '#2C3753', skin: '#EFC3A0', palm: '#F8DCC8', sole: '#F4D2BC', hair: '#3D2B22',
    eye: '#2B2320', brow: '#5A4033', lip: '#C47A68', blush: '#F2A68C',
    mat: '#DCD6F7', matEdge: '#C4BCEF', prop: '#D2B48C', mark: '#BA7517', markBg: '#FAEEDA', markTx: '#633806', gaze: '#378ADD'
  };
  // Oscurece un color para el lado lejano.
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * f)); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };

  // ---------- vectores y rotaciones ----------
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
  };
  const D = Math.PI / 180;
  const mm = (A, B) => A.map((r, i) => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const mv = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
  const Rx = a => { const c = Math.cos(a * D), s = Math.sin(a * D); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
  const Ry = a => { const c = Math.cos(a * D), s = Math.sin(a * D); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
  const Rz = a => { const c = Math.cos(a * D), s = Math.sin(a * D); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
  // e = [giro (yaw), flexión adelante (pitch), inclinación a la derecha (roll)]
  const E = e => mm(Ry(e[0] || 0), mm(Rx(e[1] || 0), Rz(e[2] || 0)));
  const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  // Interpolación esférica de direcciones (los brazos se mueven en arco, no en línea recta).
  function slerpDir(a, b, k) {
    a = V.norm(a); b = V.norm(b);
    let d = Math.max(-1, Math.min(1, V.dot(a, b)));
    if (d > 0.9995) return V.norm(V.lerp(a, b, k));
    if (d < -0.999) { const ax = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; const m = V.norm(V.cross(a, ax)); return k < .5 ? V.norm(V.lerp(a, m, k * 2)) : V.norm(V.lerp(m, b, k * 2 - 1)); }
    const w = Math.acos(d), s = Math.sin(w);
    return V.add(V.mul(a, Math.sin((1 - k) * w) / s), V.mul(b, Math.sin(k * w) / s));
  }

  // ---------- cuerpo ----------
  function body(P) {
    const B = {};
    B.Rp = mm(E(P.pr || [0, 0, 0]), Ry(P.ptw || 0));
    const sp = P.sp || [0, 0, 0], half = [sp[0] / 2, sp[1] / 2, sp[2] / 2];
    B.R1 = mm(B.Rp, E(half)); B.R2 = mm(B.R1, E(half));
    const hd = P.hd || [0, 0, 0];
    B.Rn = mm(B.R2, E([hd[0] / 2, hd[1] / 2, hd[2] / 2])); B.Rh = mm(B.R2, E(hd));
    B.pelvis = P.pel;
    B.hipL = V.add(B.pelvis, mv(B.Rp, [L.hipW, -2, 0])); B.hipR = V.add(B.pelvis, mv(B.Rp, [-L.hipW, -2, 0]));
    B.waist = V.add(B.pelvis, mv(B.R1, [0, L.lum, 0]));
    B.chest = V.add(B.waist, mv(B.R2, [0, 15, 0]));
    B.neck = V.add(B.waist, mv(B.R2, [0, L.tho, 0]));
    B.shL = V.add(B.neck, mv(B.R2, [L.shW, -3, 0])); B.shR = V.add(B.neck, mv(B.R2, [-L.shW, -3, 0]));
    B.neckTop = V.add(B.neck, mv(B.Rn, [0, L.neck, 0]));
    B.head = V.add(B.neckTop, mv(B.Rh, [0, L.headUp, 1.5]));
    return B;
  }
  // Destino de mano o tobillo en coordenadas del mundo.
  function limbTarget(spec, root, R, l1, l2, B) {
    if (spec.at) return spec.at.slice();
    if (spec.rel && B) return V.add(B.neck, mv(B.R2, spec.rel));
    if (spec.relP && B) return V.add(B.pelvis, mv(B.Rp, spec.relP));
    const d = V.norm(spec.w === false || spec.c ? mv(R, spec.d) : spec.d);
    const b = (spec.b || 0) * D;
    const reach = Math.sqrt(l1 * l1 + l2 * l2 + 2 * l1 * l2 * Math.cos(b));
    if (spec.floor && d[1] < -0.05) { const fy = spec.floor === true ? 4 : spec.floor; const t = (root[1] - fy) / -d[1]; return V.add(root, V.mul(d, Math.min(t, reach))); }
    return V.add(root, V.mul(d, reach));
  }
  // Cinemática inversa de dos huesos con vector polo (hacia dónde apunta codo o rodilla).
  function ik(A, T, l1, l2, pole) {
    let v = V.sub(T, A), d = V.len(v);
    const u = V.norm(v); d = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.001);
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    let p = V.sub(pole, V.mul(u, V.dot(pole, u)));
    if (V.len(p) < 1e-4) p = Math.abs(u[1]) < .9 ? V.cross(u, [0, 1, 0]) : V.cross(u, [1, 0, 0]);
    p = V.norm(p);
    const mid = V.add(V.add(A, V.mul(u, a)), V.mul(p, h));
    return { mid, end: V.add(A, V.mul(u, d)) };
  }
  const SIDES = [['L', 1], ['R', -1]];
  function solve(P) {
    const B = body(P), J = Object.assign({}, B);
    SIDES.forEach(([s, sg]) => {
      // brazo
      const a = P['a' + s] || { d: [0, -1, 0] };
      const T = limbTarget(a, B['sh' + s], B.R2, L.ua, L.fa, B);
      const pole = a.pole ? (a.pc ? mv(B.R2, a.pole) : a.pole) : mv(B.R2, [sg * 0.25, -0.2, -1]);
      const r = ik(B['sh' + s], T, L.ua, L.fa, pole);
      J['el' + s] = r.mid; J['wr' + s] = r.end;
      const hv = V.norm(a.h || V.sub(r.end, r.mid));
      J['hv' + s] = hv;
      // normal de la palma: indicada, apoyada = abajo, o mirando hacia el cuerpo
      let pn = a.pn ? V.norm(a.pn) : (a.at && a.at[1] < 10 ? [0, -1, 0] : V.sub(B.chest, r.end));
      pn = V.sub(pn, V.mul(hv, V.dot(pn, hv))); if (V.len(pn) < 0.2) pn = V.sub(mv(B.R2, [0, 0, 1]), V.mul(hv, V.dot(mv(B.R2, [0, 0, 1]), hv)));
      J['pn' + s] = V.norm(pn);
      const ar = V.norm(V.sub(r.end, B['sh' + s]));
      let ep = V.sub(V.mul(V.add(V.norm(V.sub(B['sh' + s], r.mid)), V.norm(V.sub(r.end, r.mid))), -1), [0, 0, 0]);
      if (V.len(ep) < 0.25) ep = V.sub(pole, V.mul(ar, V.dot(pole, ar)));
      J['ep' + s] = V.norm(ep);
      J['kn_' + s] = V.add(r.end, V.mul(hv, L.palm)); J['tip' + s] = V.add(r.end, V.mul(hv, L.hand));
      // pierna
      const l = P['l' + s] || { d: [0, -1, 0] };
      const TL = limbTarget(l, B['hip' + s], B.Rp, L.th, L.sh, B);
      const lp = l.pole ? l.pole : V.norm(V.add(mv(B.Rp, [sg * 0.15, 0, 1]), [0, 0, 0]));
      const q = ik(B['hip' + s], TL, L.th, L.sh, lp);
      J['kn' + s] = q.mid; J['an' + s] = q.end;
      const lr = V.norm(V.sub(q.end, B['hip' + s]));
      let kp = V.mul(V.add(V.norm(V.sub(B['hip' + s], q.mid)), V.norm(V.sub(q.end, q.mid))), -1);
      if (V.len(kp) < 0.25) kp = V.sub(lp, V.mul(lr, V.dot(lp, lr)));
      J['kp' + s] = V.norm(kp);
      const f = V.norm(l.f || mv(B.Rp, [0, 0, 1]));
      let side = V.cross(f, [0, 1, 0]); if (V.len(side) < 1e-3) side = mv(B.Rp, [1, 0, 0]);
      side = V.norm(side);
      let down = V.norm(V.cross(f, side)); if (down[1] > 0 && !l.up) down = V.mul(down, -1); if (l.up && down[1] < 0) down = V.mul(down, -1);
      if (l.down) down = V.norm(l.down);
      J['fv' + s] = f; J['fd' + s] = down; J['fs' + s] = V.norm(V.cross(f, down));
      J['heel' + s] = V.add(V.add(q.end, V.mul(f, -3)), V.mul(down, 3.4));
      J['ball' + s] = V.add(V.add(q.end, V.mul(f, 13.5)), V.mul(down, 4.2));
      J['toe' + s] = V.add(V.add(q.end, V.mul(f, 18.5)), V.mul(down, 4.6));
    });
    J.eyeM = V.add(J.head, mv(B.Rh, [0, 2, 9.6]));
    J.fwdH = mv(B.Rh, [0, 0, 1]);
    J._P = P;
    return J;
  }

  // ---------- dibujo ----------
  const f1 = n => n.toFixed(1);
  function cam(yaw) { const c = Math.cos(yaw * D), s = Math.sin(yaw * D); return { r: [c, 0, s], v: [-s, 0, c] }; }
  function capsule(a, b, r1, r2, fill, sw) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    const st = sw ? ` stroke="${shade(fill, 0.74)}" stroke-width="${f1(sw)}" stroke-linejoin="round"` : '';
    if (d < Math.abs(r1 - r2) + 0.3) { const r = Math.max(r1, r2); return `<circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${f1(r)}" fill="${fill}"${st}/>`; }
    const ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
    // tangentes externas exactas para radios distintos
    const sa = (r1 - r2) / d, ca = Math.sqrt(Math.max(0, 1 - sa * sa));
    const t1 = [nx * ca + ux * sa, ny * ca + uy * sa], t2 = [-nx * ca + ux * sa, -ny * ca + uy * sa];
    const A1 = [a[0] + t1[0] * r1, a[1] + t1[1] * r1], B1 = [b[0] + t1[0] * r2, b[1] + t1[1] * r2];
    const A2 = [a[0] + t2[0] * r1, a[1] + t2[1] * r1], B2 = [b[0] + t2[0] * r2, b[1] + t2[1] * r2];
    return `<path d="M${f1(A1[0])} ${f1(A1[1])}L${f1(B1[0])} ${f1(B1[1])}A${f1(r2)} ${f1(r2)} 0 0 0 ${f1(B2[0])} ${f1(B2[1])}L${f1(A2[0])} ${f1(A2[1])}A${f1(r1)} ${f1(r1)} 0 1 0 ${f1(A1[0])} ${f1(A1[1])}Z" fill="${fill}"${st}/>`;
  }
  const dot2 = (p, r, fill, sw) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(r)}" fill="${fill}"${sw ? ` stroke="${shade(fill, 0.74)}" stroke-width="${f1(sw)}"` : ''}/>`;

  function render(J, o) {
    const P = J._P, cm = cam(o.yaw || 0), S = o.scale || 1, gx = o.cx, gy = o.ground;
    const pr = p => [gx + V.dot(p, cm.r) * S, gy - p[1] * S];
    const dp = p => V.dot(p, cm.v);
    const facing = v => V.dot(V.norm(v), cm.v);
    const SW = 1.1 * S;
    const items = [];
    const push = (depth, svg) => items.push({ depth, svg });
    const cdepth = dp(J.chest);
    const col = (c, depth) => depth < cdepth - 7 ? shade(c, 0.84) : c;
    const seg = (a, b, r1, r2, c, bias = 0, sw = SW) => { const d = (dp(a) + dp(b)) / 2; push(d + bias, capsule(pr(a), pr(b), r1 * S, r2 * S, col(c, d), sw)); };
    const blob = (p, r, c, bias = 0, sw = 0) => { const d = dp(p); push(d + bias, dot2(pr(p), r * S, col(c, d), sw)); };
    // grupo con silueta única: primero contorno de todas las piezas, después el relleno
    const group = (parts, c, bias) => {
      const d = parts.reduce((s, p) => s + dp(p[0]) + dp(p[1]), 0) / (parts.length * 2), cc = col(c, d), oc = shade(cc, .74);
      let g = parts.map(p => capsule(pr(p[0]), pr(p[1]), p[2] * S + SW, p[3] * S + SW, oc)).join('') + parts.map(p => capsule(pr(p[0]), pr(p[1]), p[2] * S, p[3] * S, cc)).join('');
      push(d + bias, g);
    };
    const line = (pts, c, w, bias, dash) => { const d = pts.reduce((s, p) => s + dp(p), 0) / pts.length; const q = pts.map(pr); push(d + bias, `<path d="M${q.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L')}" fill="none" stroke="${c}" stroke-width="${f1(w * S)}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`); };

    // ---- torso con volumen ----
    const secs = [
      [J.pelvis, J.Rp, 15, 10.5], [V.lerp(J.pelvis, J.waist, .55), J.Rp, 13.5, 9.5], [J.waist, J.R1, 12.5, 9.5],
      [J.chest, J.R2, 15.5, 11], [V.add(J.neck, mv(J.R2, [0, -3, 0])), J.R2, 16.5, 8.5]];
    const pts = secs.map(s => pr(s[0]));
    const sd = [pts[4][0] - pts[0][0], pts[4][1] - pts[0][1]], sl = Math.hypot(sd[0], sd[1]) || 1;
    const n2 = [-sd[1] / sl, sd[0] / sl];
    const u3 = V.add(V.mul(cm.r, n2[0]), V.mul([0, 1, 0], -n2[1]));
    const ext = secs.map(s => { const Lx = mv(s[1], [1, 0, 0]), Sz = mv(s[1], [0, 0, 1]); return Math.hypot(s[2] * V.dot(Lx, u3), s[3] * V.dot(Sz, u3)) * S; });
    const side = (i, sg) => [pts[i][0] + n2[0] * ext[i] * sg, pts[i][1] + n2[1] * ext[i] * sg];
    const polyS = (ids, fill) => { const a = ids.map(i => side(i, 1)), b = ids.slice().reverse().map(i => side(i, -1)); return `<path d="M${a.concat(b).map(p => f1(p[0]) + ' ' + f1(p[1])).join('L')}Z" fill="${fill}" stroke="${shade(fill, .74)}" stroke-width="${f1(SW)}" stroke-linejoin="round"/>`; };
    let tor = dot2(pts[0], ext[0], C.leg, SW) + polyS([0, 1], C.leg) + polyS([1, 2, 3, 4], C.top) + dot2(pts[4], ext[4] * 0.9, C.top);
    // cintura del calzas (cadera bien marcada)
    const wb1 = side(1, 1), wb2 = side(1, -1);
    tor += `<path d="M${f1(wb1[0])} ${f1(wb1[1])}L${f1(wb2[0])} ${f1(wb2[1])}" stroke="${C.band}" stroke-width="${f1(3.2 * S)}" stroke-linecap="round"/>`;
    push(cdepth + 0.5, tor);
    // glúteo: da forma a la cadera vista de perfil
    seg(J.pelvis, V.add(J.pelvis, mv(J.Rp, [0, -1.5, -4.5])), 12.8, 11, C.leg, 0.45);
    // columna: vértebras visibles cuando se ve la espalda
    const backVis = facing(mv(J.R2, [0, 0, -1])) + facing(mv(J.Rp, [0, 0, -1]));
    if (backVis > -0.3) {
      const sp = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10, k = t * 4, i0 = Math.min(3, Math.floor(k)), w = k - i0;
        const c = V.lerp(secs[i0][0], secs[i0 + 1][0], w);
        const R = w < .5 ? secs[i0][1] : secs[i0 + 1][1], dpt = secs[i0][3] + (secs[i0 + 1][3] - secs[i0][3]) * w;
        sp.push(V.add(c, mv(R, [0, 0, -(dpt - 2.2)])));
      }
      const op = Math.min(1, (backVis + 0.3) * 1.2);
      sp.forEach((p, i) => { if (i > 0 && i < 10) { const q = pr(p); push(cdepth + 0.55, `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${f1(1.15 * S)}" fill="${i < 4 ? '#26304a' : '#2b6f66'}" opacity="${op.toFixed(2)}"/>`); } });
    }
    // escote / esternón cuando se ve el frente
    if (facing(mv(J.R2, [0, 0, 1])) > -0.2) {
      const nb = V.add(J.neck, mv(J.R2, [0, -1.5, 6])), l1 = V.add(J.neck, mv(J.R2, [5.5, 0.5, 4.5])), r1 = V.add(J.neck, mv(J.R2, [-5.5, 0.5, 4.5])), v = V.add(J.neck, mv(J.R2, [0, -6, 8.5]));
      const q = [l1, v, r1].map(pr);
      push(cdepth + 0.56, `<path d="M${f1(q[0][0])} ${f1(q[0][1])}Q${f1(q[1][0])} ${f1(q[1][1])} ${f1(q[2][0])} ${f1(q[2][1])}" fill="${C.skin}" stroke="${shade(C.top, .74)}" stroke-width="${f1(SW)}"/>`);
    }
    // cuello
    seg(J.neck, J.neckTop, 5.2, 4.8, C.skin, 0.6);

    SIDES.forEach(([s, sg]) => {
      // ---- pierna: muslo, rótula, pantorrilla, tobillo ----
      const hip = J['hip' + s], kn = J['kn' + s], an = J['an' + s], kp = J['kp' + s];
      seg(hip, kn, 10.5, 7.4, C.leg);
      seg(V.add(kn, V.mul(V.norm(V.sub(an, kn)), 4)), an, 7.6, 4.4, C.leg, 0.02);
      const pat = V.add(kn, V.mul(kp, 4.6));
      if (facing(kp) > -0.6) { const q = pr(pat); push(dp(pat) + 0.04, `<ellipse cx="${f1(q[0])}" cy="${f1(q[1])}" rx="${f1(3.4 * S)}" ry="${f1(3.4 * S)}" fill="${shade(C.leg, 1.22)}" opacity="0.9"/>`); }
      // ---- pie: talón, planta, empeine, dedos y maléolos ----
      const f = J['fv' + s], fd = J['fd' + s], fs = J['fs' + s];
      const soleVis = facing(fd) > 0.25;
      const fc = soleVis ? C.sole : C.skin;
      group([[an, J['heel' + s], 4.4, 4.8], [J['heel' + s], J['ball' + s], 4.8, 3.7], [an, J['ball' + s], 4.3, 3.6], [J['ball' + s], J['toe' + s], 3.5, 2.3]], fc, 0.05);
      // dedo gordo del lado de adentro
      const inner = V.mul(fs, V.dot(fs, [sg, 0, 0]) > 0 ? -1 : 1);
      const mal = V.add(an, V.mul(inner, -3.2));
      if (facing(V.mul(inner, -1)) > 0.3) blob(mal, 1.7, shade(C.skin, .9), 0.075);

      // ---- brazo: hombro, manga, codo, antebrazo, muñeca, mano ----
      const sh = J['sh' + s], el = J['el' + s], wr = J['wr' + s], ep = J['ep' + s];
      const sleeve = V.lerp(sh, el, 0.42);
      seg(V.lerp(sh, el, 0.3), el, 5.4, 4.8, C.skin, 0.18);
      seg(sh, sleeve, 6.9, 6.2, C.top, 0.2);
      blob(V.add(el, V.mul(ep, 3.6)), 3, shade(C.skin, .96), 0.19, SW * .8);
      seg(el, wr, 4.9, 3.5, C.skin, 0.2);
      // mano: palma clara si mira a la cámara, dorso con nudillos si no
      const hv = J['hv' + s], pn = J['pn' + s], kn_ = J['kn_' + s], tip = J['tip' + s];
      const pf = facing(pn), palmVis = pf > 0.2, backVis2 = pf < -0.2;
      const hc = palmVis ? C.palm : C.skin;
      const th = V.norm(V.mul(V.cross(hv, pn), s === 'L' ? -1 : 1));
      const tb = V.add(wr, V.add(V.mul(hv, 2.5), V.mul(th, 1.5))), tt = V.add(wr, V.add(V.mul(hv, 7.5), V.mul(th, 5)));
      const hb = 0.3 + (facing(th) < 0 ? 0.02 : -0.02);
      group([[tb, tt, 2.2, 1.7], [wr, kn_, 4.1, 3.8], [kn_, tip, 3.4, 2]], hc, 0.3);
      // uñas visibles en el dorso: indica para dónde mira la mano
      if (backVis2) blob(V.add(tip, V.mul(hv, -1.6)), 1.3, shade(C.skin, 1.06), 0.31);
    });

    // ---- cabeza ----
    const Rh = J.Rh, H = J.head, hcD = dp(H);
    const loc = v => V.add(H, mv(Rh, v));
    const vis = v => V.dot(V.norm(mv(Rh, v)), cm.v);
    let hs = '';
    const bun = loc([0, 3, -10.6]);
    const bunBehind = dp(bun) < hcD;
    if (bunBehind) hs += dot2(pr(bun), 5.2 * S, C.hair, SW);
    hs += dot2(pr(loc([0, 1.9, -1.9])), 11.1 * S, C.hair, SW);              // pelo
    const vf0 = vis([0, 0, 1]);
    if (vf0 > -0.2 && Math.abs(vf0) < 0.8) hs += capsule(pr(loc([0, 0.8, 8.4])), pr(loc([0, -2.1, 11])), 1.6 * S, 1.9 * S, C.skin);
    hs += dot2(pr(loc([0, -4.6, 3.6])), 7.4 * S, C.skin);                    // mandíbula y mentón
    hs += dot2(pr(loc([0, -0.6, 1.4])), 9.9 * S, C.skin);                    // cara
    // mechón sobre la frente (línea del pelo)
    if (vis([0, 0.5, 1]) > 0.45) { const a1 = pr(loc([7.5, 6.5, 5])), mid = pr(loc([0, 9.4, 6.5])), a2 = pr(loc([-7.5, 6.5, 5])); hs += `<path d="M${f1(a1[0])} ${f1(a1[1])}Q${f1(mid[0])} ${f1(mid[1] - 2 * S)} ${f1(a2[0])} ${f1(a2[1])}" fill="none" stroke="${C.hair}" stroke-width="${f1(2.6 * S)}" stroke-linecap="round"/>`; }
    [[1], [-1]].forEach(([sg]) => {
      const ear = [sg * 9.6, -0.8, -0.8];
      if (vis(ear) > -0.2) { const e = pr(loc(ear)), e2 = pr(loc([sg * 9.6, -2.6, -0.4])); hs += capsule(e, e2, 1.9 * S, 1.3 * S, shade(C.skin, .93)); }
    });
    [[1], [-1]].forEach(([sg]) => {
      const eye = [sg * 3.5, 1.2, 9.1];
      const ve = vis(eye);
      if (ve > 0.1) {
        const e = pr(loc(eye)), sq = Math.max(.6, Math.min(1, ve * 1.3));
        const lat = pr(loc([sg * 4.6, 1.2, 8.6])), ang = Math.atan2(lat[1] - e[1], lat[0] - e[0]) * 180 / Math.PI;
        hs += `<ellipse cx="${f1(e[0])}" cy="${f1(e[1])}" rx="${f1(1.25 * S * sq)}" ry="${f1(1.55 * S)}" transform="rotate(${f1(ang)} ${f1(e[0])} ${f1(e[1])})" fill="${C.eye}"/>`;
        hs += dot2([e[0] + .45 * S, e[1] - .5 * S], .4 * S, '#ffffff');
        const b1 = pr(loc([sg * 1.9, 3.9, 9.3])), bm = pr(loc([sg * 3.7, 4.5, 9.1])), b2 = pr(loc([sg * 5.4, 3.9, 8.2]));
        hs += `<path d="M${f1(b1[0])} ${f1(b1[1])}Q${f1(bm[0])} ${f1(bm[1] - .6 * S)} ${f1(b2[0])} ${f1(b2[1])}" fill="none" stroke="${C.brow}" stroke-width="${f1(.75 * S)}" stroke-linecap="round"/>`;
        const ck = loc([sg * 5, -2.4, 8]);
        if (vis([sg * 5, -2.4, 8]) > 0.2) hs += `<circle cx="${f1(pr(ck)[0])}" cy="${f1(pr(ck)[1])}" r="${f1(1.9 * S)}" fill="${C.blush}" opacity="0.35"/>`;
      }
    });
    const vf = vis([0, 0, 1]);
    if (vf > -0.2) {
      // nariz: en perfil asoma, de frente es una sombra suave
      if (Math.abs(vf) >= 0.8) { const n1 = pr(loc([0.9, -1.6, 10.2])), n2 = pr(loc([-0.9, -1.6, 10.2])); hs += `<path d="M${f1(n1[0])} ${f1(n1[1])}Q${f1((n1[0] + n2[0]) / 2)} ${f1(n1[1] + .9 * S)} ${f1(n2[0])} ${f1(n2[1])}" fill="none" stroke="${shade(C.skin, .78)}" stroke-width="${f1(.7 * S)}" stroke-linecap="round"/>`; }
      // boca: sonrisa suave
      const m1 = pr(loc([2, -4.8, 8.7])), mm2 = pr(loc([0, -5.6, 9.3])), m2 = pr(loc([-2, -4.8, 8.7]));
      hs += `<path d="M${f1(m1[0])} ${f1(m1[1])}Q${f1(mm2[0])} ${f1(mm2[1] + .5 * S)} ${f1(m2[0])} ${f1(m2[1])}" fill="none" stroke="${C.lip}" stroke-width="${f1(.85 * S)}" stroke-linecap="round"/>`;
    }
    if (!bunBehind) hs += dot2(pr(bun), 5.2 * S, C.hair, SW);
    push(hcD + 0.7, hs);

    // accesorios: bloque, almohadón, correa y pared
    (P.props || []).forEach(p => {
      const j = J[p.j || ('wr' + (p.s || 'L'))];
      if (p.k === 'block' && j) {
        const top = p.top != null ? p.top : j[1] - (p.gap != null ? p.gap : 4);
        const c = [j[0], 0, j[2]], hw = 11, hd = 7;
        const corners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => V.add(c, [x, 0, z]));
        const xs = corners.map(q => V.dot(q, cm.r)), x0 = gx + Math.min(...xs) * S, x1 = gx + Math.max(...xs) * S;
        push(dp(c) - 0.3, `<rect x="${f1(x0)}" y="${f1(gy - top * S)}" width="${f1(x1 - x0)}" height="${f1(top * S)}" rx="${f1(2 * S)}" fill="${C.prop}" stroke="${shade(C.prop, .74)}" stroke-width="${f1(SW)}"/>`);
      }
      if (p.k === 'cushion' && j) {
        const h = p.h || 12, len = p.len || 40, wd = p.w || 30, ax = p.ax || [0, 0, 1];
        const c = V.add([j[0], 0, j[2]], p.off || [0, 0, 0]);
        const e1 = V.add(c, V.mul(ax, -len / 2)), e2 = V.add(c, V.mul(ax, len / 2));
        const side = V.norm(V.cross(ax, [0, 1, 0]));
        const xs = [e1, e2, V.add(e1, V.mul(side, wd / 2)), V.add(e1, V.mul(side, -wd / 2)), V.add(e2, V.mul(side, wd / 2)), V.add(e2, V.mul(side, -wd / 2))].map(q => V.dot(q, cm.r));
        const x0 = gx + Math.min(...xs) * S, x1 = gx + Math.max(...xs) * S;
        push(dp(c) - 0.35, `<rect x="${f1(x0)}" y="${f1(gy - h * S)}" width="${f1(x1 - x0)}" height="${f1(h * S)}" rx="${f1(h * S / 2)}" fill="#B9C7E8" stroke="#8C9CC4" stroke-width="${f1(SW)}"/>`);
      }
      if (p.k === 'strap') { const a = pr(J[p.from]), b = pr(J[p.to]); push(Math.max(dp(J[p.from]), dp(J[p.to])) + 0.5, `<path d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}" stroke="#7F77DD" stroke-width="${f1(2.6 * S)}" stroke-linecap="round"/>`); }
      if (p.k === 'wall') { const a = pr([0, 0, p.z]), b = pr([0, 160, p.z]); const x = a[0]; const vis = Math.abs(cm.r[2]) > 0.3; if (vis) push(-999, `<rect x="${f1(x - (p.zSide || 1) * 0 - 3)}" y="${f1(gy - 170 * S)}" width="${f1(6)}" height="${f1(170 * S)}" fill="#D3D1C7"/>`); }
    });

    items.sort((a, b) => a.depth - b.depth);
    let out = `<rect x="6" y="${f1(gy)}" width="${o.w - 12}" height="6" rx="3" fill="${C.mat}" stroke="${C.matEdge}"/>` + items.map(i => i.svg).join('');
    if (!o.clean) out += overlay(J, P, pr);
    return out;
  }
  const JN = n => n; // nombres directos de articulaciones
  function overlay(J, P, pr) {
    let s = '';
    if (P.gaze) { const e = pr(J.eyeM), g = pr(V.add(J.eyeM, V.mul(J.fwdH, P.gaze))); s += `<line x1="${f1(e[0])}" y1="${f1(e[1])}" x2="${f1(g[0])}" y2="${f1(g[1])}" stroke="${C.gaze}" stroke-width="1.5" stroke-dasharray="2 3" stroke-linecap="round"/><circle cx="${f1(g[0])}" cy="${f1(g[1])}" r="2.4" fill="${C.gaze}"/>`; }
    (P.guides || []).forEach(g => { const a = pr(J[g[0]]), b = pr(J[g[1]]); s += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${C.mark}" stroke-width="1.6" stroke-dasharray="4 4"/>`; });
    const ctr = pr(J.chest); (P.marks || []).forEach(m => { const p = pr(J[m[0]]); let q; if (m[2] == null) { const dx = p[0] - ctr[0], dy = p[1] - ctr[1], dl = Math.hypot(dx, dy) || 1; q = [p[0] + dx / dl * 15, p[1] + dy / dl * 15]; } else q = [p[0] + m[2], p[1] + (m[3] || 0)]; s += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="9" fill="${C.markBg}" stroke="${C.mark}"/><text x="${f1(q[0])}" y="${f1(q[1] + 4)}" text-anchor="middle" font-size="11" font-weight="600" font-family="system-ui,sans-serif" fill="${C.markTx}">${m[1]}</text>`; });
    return s;
  }

  // ---------- interpolación natural entre posturas ----------
  const lerpN = (a, b, k) => a + (b - a) * k;
  const lerpArr = (a, b, k) => (a || [0, 0, 0]).map((v, i) => lerpN(v, (b || [0, 0, 0])[i] ?? 0, k));
  const same = (a, b) => a && b && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 0.5;
  function mix(A, B, k, JA, JB) {
    JA = JA || solve(A); JB = JB || solve(B);
    const M = { pel: V.lerp(A.pel, B.pel, k), ptw: lerpN(A.ptw || 0, B.ptw || 0, k), pr: lerpArr(A.pr, B.pr, k), sp: lerpArr(A.sp, B.sp, k), hd: lerpArr(A.hd, B.hd, k), props: k < .5 ? A.props : B.props };
    const BM = body(M);
    SIDES.forEach(([s]) => {
      // brazos: si la mano queda apoyada en el mismo lugar, no se mueve; si no, viaja en arco alrededor del hombro
      const aA = A['a' + s] || {}, aB = B['a' + s] || {};
      let T;
      if (aA.at && aB.at && same(aA.at, aB.at)) T = aA.at;
      else {
        const vA = V.sub(JA['wr' + s], JA['sh' + s]), vB = V.sub(JB['wr' + s], JB['sh' + s]);
        T = V.add(BM['sh' + s], V.mul(slerpDir(vA, vB, k), lerpN(V.len(vA), V.len(vB), k)));
      }
      const pA = V.sub(JA['el' + s], V.lerp(JA['sh' + s], JA['wr' + s], .5)), pB = V.sub(JB['el' + s], V.lerp(JB['sh' + s], JB['wr' + s], .5));
      M['a' + s] = { at: T, pole: V.add(V.mul(V.norm(pA), 1 - k), V.mul(V.norm(pB), k)), h: slerpDir(JA['hv' + s], JB['hv' + s], k), pn: slerpDir(JA['pn' + s], JB['pn' + s], k) };
      // piernas: pie apoyado = fijo; si da un paso, el pie se levanta un poco (arco)
      const lA = A['l' + s] || {}, lB = B['l' + s] || {};
      let TL;
      if (lA.at && lB.at && same(lA.at, lB.at)) TL = lA.at;
      else if (lA.at && lB.at && lA.at[1] < 14 && lB.at[1] < 14) { TL = V.lerp(lA.at, lB.at, k); TL[1] += Math.sin(Math.PI * k) * Math.min(10, V.len(V.sub(lA.at, lB.at)) * 0.4); }
      else { const vA = V.sub(JA['an' + s], JA['hip' + s]), vB = V.sub(JB['an' + s], JB['hip' + s]); TL = V.add(BM['hip' + s], V.mul(slerpDir(vA, vB, k), lerpN(V.len(vA), V.len(vB), k))); }
      const qA = V.sub(JA['kn' + s], V.lerp(JA['hip' + s], JA['an' + s], .5)), qB = V.sub(JB['kn' + s], V.lerp(JB['hip' + s], JB['an' + s], .5));
      const dn = slerpDir(JA['fd' + s], JB['fd' + s], k);
      M['l' + s] = { at: TL, pole: V.add(V.mul(V.norm(qA), 1 - k), V.mul(V.norm(qB), k)), f: slerpDir(JA['fv' + s], JB['fv' + s], k), down: dn };
    });
    return M;
  }
  // Curva de velocidad suave (arranca y frena como un movimiento real).
  const ease = k => k * k * k * (k * (k * 6 - 15) + 10);

  // Encuadre fijo para toda la secuencia: la figura no "salta" de lugar.
  function frame(poses, o) {
    let minx = 1e9, maxx = -1e9, maxy = 0;
    poses.forEach(P => {
      const J = solve(P), cm = cam(o.yaw || 0);
      Object.keys(J).forEach(k => { const p = J[k]; if (Array.isArray(p) && p.length === 3 && typeof p[0] === 'number') { const x = V.dot(p, cm.r); minx = Math.min(minx, x - 12); maxx = Math.max(maxx, x + 12); maxy = Math.max(maxy, p[1] + 14); } });
    });
    const W = o.w, H = o.h, ground = H - 12;
    const scale = Math.min(1.25, (ground - 14) / maxy, (W - 16) / (maxx - minx));
    return { scale, cx: W / 2 - (minx + maxx) / 2 * scale, ground };
  }

  function svg(P, o) { const fr = frame([P], o); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.w} ${o.h}" width="100%">${render(solve(P), Object.assign({}, o, fr))}</svg>`; }

  // Reproduce los pasos: steps = [{pose, hold}], o.yaw = ángulo de cámara (0 frente, -90 perfil).
  function player(el, steps, o) {
    o = Object.assign({ w: 260, h: 250, yaw: 0, move: 1500 }, o);
    el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.w} ${o.h}" width="100%" style="display:block"></svg>`;
    const sv = el.firstChild, Js = steps.map(s => solve(s.pose));
    let fr = frame(steps.map(s => s.pose), o);
    let i = 0, t0 = 0, moving = false, stopped = false, paused = false;
    const last = steps.length - 1;
    const draw = (J, n) => { sv.innerHTML = render(J, Object.assign({}, o, fr, { clean: n !== last })); };
    const onStep = o.onStep || (() => {});
    draw(Js[0], 0); onStep(0);
    function tick(now) {
      if (stopped) return;
      if (!el.isConnected) { stopped = true; return; }
      if (!t0) t0 = now;
      if (!paused) {
        const nx = (i + 1) % steps.length;
        if (!moving) { if (o.once && i === last) { /* queda en la postura final */ } else if (now - t0 > steps[i].hold) { moving = true; t0 = now; } }
        else {
          const k = Math.min(1, (now - t0) / (steps[nx].move || o.move));
          draw(k >= 1 ? Js[nx] : solve(mix(steps[i].pose, steps[nx].pose, ease(k), Js[i], Js[nx])), k >= 1 ? nx : -1);
          if (k >= 1) { i = nx; moving = false; t0 = now; onStep(i); }
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return {
      stop() { stopped = true; },
      view(y) { o.yaw = y; fr = frame(steps.map(s => s.pose), o); if (!moving) draw(Js[i], i); },
      pause(p) { paused = p; },
      go(n) { i = n; moving = false; t0 = performance.now(); draw(Js[n], n); onStep(n); }
    };
  }

  // Espejo izquierda/derecha: la misma postura del otro lado.
  function mirror(P) {
    const mx = v => v && v.length === 3 && typeof v[0] === 'number' ? [-v[0], v[1], v[2]] : v;
    const me = e => e ? [-(e[0] || 0), e[1] || 0, -(e[2] || 0)] : e;
    const ml = s => { if (!s) return s; const o = {}; for (const k in s) o[k] = Array.isArray(s[k]) && s[k].length === 3 && typeof s[k][0] === 'number' ? mx(s[k]) : s[k]; return o; };
    const Q = Object.assign({}, P, { ptw: -(P.ptw || 0), pel: mx(P.pel), pr: me(P.pr), sp: me(P.sp), hd: me(P.hd), aL: ml(P.aR), aR: ml(P.aL), lL: ml(P.lR), lR: ml(P.lL) });
    const sw = n => n.replace(/L$/, '#').replace(/R$/, 'L').replace(/#$/, 'R');
    if (P.marks) Q.marks = P.marks.map(m => [sw(m[0])].concat(m.slice(1)));
    if (P.guides) Q.guides = P.guides.map(g => g.map(sw));
    if (P.props) Q.props = P.props.map(p => Object.assign({}, p, p.j ? { j: sw(p.j) } : {}, p.s ? { s: p.s === 'L' ? 'R' : 'L' } : {}, p.from ? { from: sw(p.from), to: sw(p.to) } : {}, p.off ? { off: mx(p.off) } : {}));
    return Q;
  }
  // Revisión automática: partes bajo el piso, apoyos que no llegan.
  function check(P) {
    const J = solve(P), out = [];
    const R = { pelvis: 12, head: 10, knL: 7, knR: 7, anL: 4.5, anR: 4.5, toeL: 2.3, toeR: 2.3, heelL: 4.8, heelR: 4.8, ballL: 3.6, ballR: 3.6, wrL: 3.8, wrR: 3.8, tipL: 2, tipR: 2, elL: 5, elR: 5, chest: 10, waist: 9, shL: 6, shR: 6 };
    for (const k in R) if (J[k] && J[k][1] - R[k] < -1.5) out.push(k + ' bajo el piso ' + (J[k][1] - R[k]).toFixed(1));
    SIDES.forEach(([s]) => { const a = P['a' + s], l = P['l' + s];
      if (a && a.at) { const d = V.len(V.sub(J['wr' + s], a.at)); if (d > 1.5) out.push('mano ' + s + ' no llega (' + d.toFixed(1) + ')'); }
      if (l && l.at) { const d = V.len(V.sub(J['an' + s], l.at)); if (d > 1.5) out.push('pie ' + s + ' no llega (' + d.toFixed(1) + ')'); } });
    return out;
  }
  G.YF3 = { mirror, check, solve, render, mix, svg, player, frame, V, C, L };
  if (typeof module !== 'undefined') module.exports = G.YF3;
})(typeof window !== 'undefined' ? window : globalThis);
