// Biblioteca de posturas de yoga en 3D para Barra Libre.
// Cada postura: vista inicial, pasos de entrada (completa) y pasos de la versión más fácil.
// Coordenadas: x = izquierda de la persona, y = arriba, z = adelante. Las posturas de un lado se cargan
// para el lado izquierdo (pierna izquierda adelante); el derecho se obtiene con YF3.mirror.
(function (G) {
  const F = G.YF3 || require('./yfig3d.js');
  const V = F.V;
  const C = o => JSON.parse(JSON.stringify(o));
  const W = (...objs) => Object.assign({}, ...objs.map(C));
  const LEG = 88.9;
  // Ajusta la altura de la cadera (y opcionalmente x o z) para que las piernas indicadas queden rectas.
  function fit(P, legs, ax) {
    for (let it = 0; it < 80; it++) {
      const J = F.solve(P);
      const err = legs.map(s => V.len(V.sub(P['l' + s].at, J['hip' + s])) - LEG);
      if (Math.max(...err.map(Math.abs)) < 0.05) break;
      if (legs.length === 1 || ax == null) { P.pel[1] -= (err.reduce((a, b) => a + b, 0) / err.length) * 0.9; continue; }
      const h = 0.3, base = err;
      const jac = [ax, 1].map(c => { const Q = C(P); Q.pel[c] += h; const JJ = F.solve(Q); return legs.map((s, i) => (V.len(V.sub(Q['l' + s].at, JJ['hip' + s])) - LEG - base[i]) / h); });
      const a = jac[0][0], b = jac[1][0], c = jac[0][1], d = jac[1][1], det = a * d - b * c || 1e-6;
      P.pel[ax] -= (d * base[0] - b * base[1]) / det * 0.9; P.pel[1] -= (-c * base[0] + a * base[1]) / det * 0.9;
    }
    return P;
  }
  // Ajusta la altura de la cadera para que una mano apoyada llegue justo (brazo recto).
  function reachY(P, s, k) { for (let it = 0; it < 60; it++) { const J = F.solve(P); const e = V.len(V.sub(P['a' + s].at, J['sh' + s])) - 57.9; if (Math.abs(e) < 0.05) break; P.pel[1] -= e * (k || 0.8); } return P; }

  // ---------- piezas comunes ----------
  const FEET = (x = 6, z = 0) => ({ lL: { at: [x, 8, z], f: [0, 0, 1], pole: [0, 0, 1] }, lR: { at: [-x, 8, z], f: [0, 0, 1], pole: [0, 0, 1] } });
  const ARMS_DOWN = { aL: { d: [0.12, -1, 0.02] }, aR: { d: [-0.12, -1, 0.02] } };
  const ARMS_UP = { aL: { d: [0.1, 1, 0], pn: [-1, 0, 0] }, aR: { d: [-0.1, 1, 0], pn: [1, 0, 0] } };
  const HEART = { aL: { rel: [1.5, -12, 13], h: [0, 1, 0.2], pn: [-1, 0, 0], pole: [1, -0.6, -0.2] }, aR: { rel: [-1.5, -12, 13], h: [0, 1, 0.2], pn: [1, 0, 0], pole: [-1, -0.6, -0.2] } };
  const HIPS = { aL: { rel: [15.5, -40, 3], h: [0.1, -0.4, 1], pole: [1, 0, -0.4], pn: [-1, 0, 0] }, aR: { rel: [-15.5, -40, 3], h: [-0.1, -0.4, 1], pole: [-1, 0, -0.4], pn: [1, 0, 0] } };
  const BASE = { pel: [0, 96, 0], pr: [0, 0, 0], sp: [0, 0, 0], hd: [0, 0, 0] };

  const montana = fit(W(BASE, FEET(6), ARMS_DOWN, { marks: [['anL', 1], ['knL', 2], ['pelvis', 3, 22, 0], ['head', 4]], guides: [['anL', 'head']] }), ['L', 'R']);
  const relax = fit(W(BASE, FEET(9), ARMS_DOWN), ['L', 'R']);
  const brazosArriba = W(montana, ARMS_UP, { hd: [0, -12, 0], gaze: 30, marks: [['tipL', 1], ['shL', 2], ['pelvis', 3, 22, 0], ['anL', 4]], guides: [['wrL', 'anL']] });
  const brazosV = W(montana, { aL: { d: [0.55, 0.85, 0], pn: [-0.4, 0, 0.6] }, aR: { d: [-0.55, 0.85, 0], pn: [0.4, 0, 0.6] }, marks: [['tipL', 1]] });

  // Pinza de pie (Uttanasana)
  const pinzaPie = fit(W(BASE, FEET(6), { pel: [0, 92, -16], pr: [0, 94, 0], sp: [0, 60, 0], hd: [0, 6, 0],
    aL: { at: [13, 4, 17], h: [0, 0, 1] }, aR: { at: [-13, 4, 17], h: [0, 0, 1] }, gaze: 20,
    marks: [['pelvis', 1], ['knL', 2], ['wrL', 3], ['neck', 4, -16, 8]] }), ['L', 'R']);
  const pinzaPieF = W(BASE, FEET(6), { pel: [0, 84, -16], pr: [0, 70, 0], sp: [0, 40, 0], hd: [0, 6, 0],
    lL: { at: [6, 8, 0], f: [0, 0, 1], pole: [0, 0, 1] }, lR: { at: [-6, 8, 0], f: [0, 0, 1], pole: [0, 0, 1] },
    aL: { at: [12, 30, 8], h: [0, -1, 0.2], pn: [0, 0, -1] }, aR: { at: [-12, 30, 8], h: [0, -1, 0.2], pn: [0, 0, -1] }, marks: [['knL', 1]] });
  // Medio levantamiento (Ardha Uttanasana)
  const medio = fit(W(BASE, FEET(6), { pel: [0, 94, -10], pr: [0, 72, 0], sp: [0, 16, 0], hd: [0, -10, 0], gaze: 26,
    aL: { d: [0.05, -1, -0.12], pn: [0, 0, -1] }, aR: { d: [-0.05, -1, -0.12], pn: [0, 0, -1] },
    marks: [['pelvis', 1], ['chest', 2, 0, -22], ['wrL', 3], ['head', 4]], guides: [['pelvis', 'neck']] }), ['L', 'R']);
  const medioF = W(medio, { pel: [0, 86, -12], pr: [0, 62, 0], aL: { d: [0.05, -1, -0.45], b: 15, pn: [0, 0, -1] }, aR: { d: [-0.05, -1, -0.45], b: 15, pn: [0, 0, -1] }, sp: [0, 14, 0], marks: [['knL', 1]] });
  medioF.lL.pole = [0, 0, 1]; medioF.lR.pole = [0, 0, 1];

  // Silla (Utkatasana)
  const silla = W(BASE, FEET(6), { pel: [0, 71, -23], pr: [0, 38, 0], sp: [0, 0, 0], hd: [0, -22, 0], gaze: 30,
    aL: { d: [0.1, 1, 0], c: true, pn: [-1, 0, 0] }, aR: { d: [-0.1, 1, 0], c: true, pn: [1, 0, 0] },
    marks: [['knL', 1], ['pelvis', 2], ['tipL', 3], ['heelL', 4, 0, 14]], guides: [['wrL', 'pelvis']] });
  const sillaF = W(BASE, FEET(6), { pel: [0, 82, -14], pr: [0, 25, 0], hd: [0, -12, 0], marks: [['knL', 1]] }, HEART);

  // Guerrero I (pierna izquierda adelante)
  const g1pies = W(BASE, { lL: { at: [7, 8, 46], f: [0, 0, 1], pole: [0, 0, 1] }, lR: { at: [-8, 8, -40], f: [-0.6, 0, 0.8], pole: [0, 0, 1] } }, ARMS_DOWN, { pel: [0, 80, 4] });
  fit(g1pies, ['L', 'R'], 2);
  const guerrero1 = W(BASE, g1pies, { pel: [0, 70, 6], pr: [0, 0, 0], sp: [0, -6, 0], hd: [0, -14, 0], gaze: 30, aL: { d: [0.1, 1, 0], pn: [-1, 0, 0] }, aR: { d: [-0.1, 1, 0], pn: [1, 0, 0] },
    marks: [['knL', 1], ['knR', 2], ['pelvis', 3, 24, 0], ['tipL', 4]], guides: [['knL', 'anL']] });
  guerrero1.lL.pole = [0, 0.3, 1]; fit(guerrero1, ['R']);
  const g1fPies = W(BASE, { lL: { at: [7, 8, 38], f: [0, 0, 1], pole: [0, 0, 1] }, lR: { at: [-8, 8, -32], f: [-0.6, 0, 0.8], pole: [0, 0, 1] } }, HIPS, { pel: [0, 82, 4] });
  fit(g1fPies, ['L', 'R'], 2);
  const guerrero1F = W(g1fPies, { pel: [0, 78, 5], marks: [['knL', 1]], guides: [['knL', 'anL']] }); guerrero1F.lL.pole = [0, 0.3, 1]; fit(guerrero1F, ['R']);

  // Guerrero II (pierna izquierda adelante, vista de frente)
  const AW = { L: [52, 8, 0], R: [-77, 8, 0] };
  const w1 = fit(W(BASE, { pel: [-12, 80, 0], lL: { at: AW.L, f: [0, 0, 1], pole: [0, 0, 1] }, lR: { at: AW.R, f: [0, 0, 1], pole: [0, 0, 1] } }, ARMS_DOWN), ['L', 'R'], 0);
  const w2 = W(w1, { lL: { at: AW.L, f: [1, 0, 0], pole: [1, 0.5, 0] }, lR: { at: AW.R, f: [0.5, 0, 0.87], pole: [0.3, 0, 1] } });
  const guerrero2 = fit(W(w2, { pel: [1, 66.5, 0], aL: { d: [1, 0, 0], pn: [0, -1, 0] }, aR: { d: [-1, 0, 0], pn: [0, -1, 0] }, hd: [80, 0, 0], gaze: 70,
    marks: [['knL', 1, 15, -12], ['knR', 2, -15, -8], ['tipL', 3, 0, -16], ['neck', 4, -22, 4]], guides: [['knL', 'anL'], ['pelvis', 'neck']] }), ['R']);
  const AE = { L: [44, 8, 0], R: [-62, 8, 0] };
  const we1 = fit(W(BASE, { pel: [-9, 86, 0], lL: { at: AE.L, f: [0, 0, 1], pole: [0, 0, 1] }, lR: { at: AE.R, f: [0, 0, 1], pole: [0, 0, 1] } }, ARMS_DOWN), ['L', 'R'], 0);
  const we2 = W(we1, { lL: { at: AE.L, f: [1, 0, 0], pole: [1, 0.5, 0] }, lR: { at: AE.R, f: [0.5, 0, 0.87], pole: [0.3, 0, 1] } });
  const guerrero2F = fit(W(we2, { pel: [0, 79, 0], hd: [80, 0, 0], gaze: 60 }, HIPS, { marks: [['knL', 1, 15, -12]], guides: [['knL', 'anL']] }), ['R']);

  // Ángulo lateral extendido (Utthita Parsvakonasana)
  const anguloLat = W(guerrero2, { pr: [0, 0, -22], sp: [0, 0, -52], hd: [-70, 0, 0], gaze: 40,
    aL: { d: [0.05, -1, 0.06], floor: true, h: [0, 0, 1], pole: [0, 0, -1] }, aR: { d: [0.75, 0.66, 0], pn: [0, -0.6, 0.8] },
    marks: [['knL', 1, 16, -6], ['tipR', 2], ['waist', 3], ['anR', 4, -14, -8]], guides: [['anR', 'tipR']] });
  fit(anguloLat, ['R']);
  const anguloLatF = W(guerrero2, { pr: [0, 0, -14], sp: [0, 0, -34], hd: [-40, 0, 0], gaze: 34,
    aL: { rel: [6, -36, 6], h: [-0.2, -0.5, 1], pole: [0.2, -1, 0], pn: [0, -1, 0] }, aR: { d: [0.65, 0.76, 0], pn: [0, -0.6, 0.8] }, marks: [['elL', 1, 10, 12]] });
  fit(anguloLatF, ['R']);

  // Triángulo (Trikonasana)
  const t1 = W(w2, { aL: { d: [1, 0, 0], pn: [0, -1, 0] }, aR: { d: [-1, 0, 0], pn: [0, -1, 0] }, hd: [80, 0, 0] });
  const t2 = fit(W(t1, { pr: [0, 0, -12], sp: [0, 0, -14] }), ['L', 'R'], 0);
  const triangulo = fit(W(t1, { pr: [0, 0, -24], sp: [0, 0, -46], hd: [-80, 0, 0], aL: { d: [0, -1, 0.04], pn: [0, 0, 1] }, aR: { d: [0, 1, 0], pn: [0, 0, 1] }, gaze: 38,
    marks: [['knL', 1, 16, -4], ['tipR', 2, 0, -14], ['neck', 3, -20, -16], ['knR', 4, -16, -4]], guides: [['wrL', 'wrR']] }), ['L', 'R'], 0);
  const trianguloF = fit(W(t1, { pr: [0, 0, -20], sp: [0, 0, -26], hd: [-60, 0, 0], aL: { d: [0, -1, 0.04], pn: [0, 0, 1] }, aR: { d: [0, 1, 0], pn: [0, 0, 1] }, gaze: 34,
    props: [{ k: 'block', j: 'wrL' }], marks: [['wrL', 1, 22, 8]], guides: [['wrL', 'wrR']] }), ['L', 'R'], 0);

  // Pirámide (Parsvottanasana)
  const PY = { lL: { at: [6, 8, 40], f: [0, 0, 1], pole: [0, 0, 1] }, lR: { at: [-8, 8, -38], f: [-0.6, 0, 0.8], pole: [0, 0, 1] } };
  const pir1 = fit(W(BASE, PY, HIPS, { pel: [0, 86, 0] }), ['L', 'R'], 2);
  const piramide = fit(W(BASE, PY, { pel: [0, 84, -2], pr: [0, 80, 0], sp: [0, 50, 0], hd: [0, 10, 0],
    aL: { d: [0.1, -1, 0.15], floor: true, h: [0, 0, 1] }, aR: { d: [-0.1, -1, 0.15], floor: true, h: [0, 0, 1] }, gaze: 20,
    marks: [['knL', 1], ['pelvis', 2, 0, -20], ['chest', 3], ['knR', 4]] }), ['L', 'R'], 2);
  const piramideF = fit(W(BASE, PY, { pel: [0, 84, -2], pr: [0, 56, 0], sp: [0, 18, 0], hd: [0, -6, 0],
    aL: { d: [0.1, -1, 0.1], pn: [0, 0, -1] }, aR: { d: [-0.1, -1, 0.1], pn: [0, 0, -1] }, props: [{ k: 'block', j: 'wrL' }, { k: 'block', j: 'wrR' }],
    marks: [['wrL', 1]] }), ['L', 'R'], 2);

  // Árbol (Vrksasana), parado sobre la pierna derecha
  const arbolBase = fit(W(BASE, FEET(6), { pel: [-3, 96, 0] }, HEART), ['R']);
  const arbol1 = fit(W(arbolBase, { lL: { at: [-2, 30, 6], f: [0, -1, 0.15], down: [-1, 0, 0], pole: [1, 0, 0.3] } }), ['R']);
  const arbol = fit(W(arbolBase, ARMS_UP, { lL: { at: [-3, 62, 4], f: [0, -1, 0.1], down: [-1, 0, 0], pole: [1, 0, 0.25] }, hd: [0, 0, 0], gaze: 60,
    marks: [['anL', 1, 16, 0], ['knL', 2], ['pelvis', 3, -24, 0], ['tipL', 4]], guides: [['anR', 'head']] }), ['R']);
  const arbolF = fit(W(arbolBase, { lL: { at: [-3, 15, 6], f: [0.25, -0.55, 0.8], down: [-0.8, -0.4, 0.1], pole: [1, 0, 0.3] }, marks: [['anL', 1, 16, 0]] }), ['R']);

  // Bailarín (preparación), parado sobre la pierna derecha
  const bail1 = fit(W(BASE, FEET(6), { pel: [-3, 96, 0], aR: { d: [-0.05, 1, 0.1], pn: [1, 0, 0] },
    aL: { at: [13, 90, -13], h: [0, 0.3, -1], pole: [1, 0, -0.2] }, lL: { at: [12, 90, -16], f: [0, 1, -0.3], up: true, pole: [0, -1, 0.1] } }), ['R']);
  const bailarin = fit(W(bail1, { pel: [-3, 94, 4], pr: [0, 45, 0], hd: [0, -40, 0], gaze: 60,
    aL: { at: [15, 113, -16], h: [0, 0.4, -1], pole: [0.6, 0, -1] }, aR: { d: [-0.05, 0.55, 1], pn: [0, -1, 0] },
    lL: { at: [14, 113, -20], f: [0, 1, -0.3], up: true, pole: [0, -0.6, -1] },
    marks: [['anR', 1, -14, 0], ['knL', 2], ['chest', 3], ['tipR', 4]] }), ['R']);
  const bailarinF = W(bail1, { marks: [['knL', 1]] });

  const POSES = {
    montana: { view: 0, full: [[relax, 'De pie, pies separados a lo ancho de la cadera.'], [montana, 'Juntá un poco los pies, repartí el peso y crecé desde la coronilla.']],
      easy: [[relax, 'De pie, pies separados a lo ancho de la cadera.'], [W(relax, { marks: [['anL', 1]] }), 'Quedate con los pies más separados si te da estabilidad.']] },
    brazos_arriba: { view: 0, full: [[montana, 'Empezá en Montaña.'], [brazosArriba, 'Inhalá y subí los brazos por los costados, palmas enfrentadas.']],
      easy: [[montana, 'Empezá en Montaña.'], [brazosV, 'Subí los brazos en V, sin elevar los hombros.']] },
    pinza_pie: { view: -90, full: [[montana, 'Empezá en Montaña.'], [brazosArriba, 'Inhalá y subí los brazos.'], [pinzaPie, 'Exhalá y bajá desde la cadera hasta apoyar las manos.']],
      easy: [[montana, 'Empezá en Montaña.'], [pinzaPieF, 'Bajá con las rodillas dobladas y las manos en las piernas.']] },
    medio_levantamiento: { view: -90, full: [[pinzaPie, 'Empezá en pinza de pie.'], [medio, 'Inhalá y alargá la espalda hasta dejarla plana, manos en las canillas.']],
      easy: [[pinzaPieF, 'Empezá con las rodillas dobladas.'], [medioF, 'Manos sobre los muslos, espalda larga.']] },
    silla: { view: -90, full: [[montana, 'Empezá en Montaña.'], [silla, 'Exhalá: doblá rodillas y llevá la cadera atrás. Inhalá: brazos arriba.']],
      easy: [[montana, 'Empezá en Montaña.'], [sillaF, 'Doblá menos las rodillas y llevá las manos al pecho.']] },
    guerrero1: { view: -90, full: [[montana, 'Empezá en Montaña.'], [g1pies, 'Llevá el pie derecho un paso largo atrás, girado unos 45°.'], [guerrero1, 'Doblá la rodilla de adelante y subí los brazos.']],
      easy: [[montana, 'Empezá en Montaña.'], [g1fPies, 'Paso más corto, manos en la cintura.'], [guerrero1F, 'Doblá un poco la rodilla de adelante.']] },
    guerrero2: { view: 0, full: [[w1, 'De pie, separá los pies un paso largo (≈1,2 m).'], [w2, 'Girá el pie de adelante hacia afuera y el de atrás un poco hacia adentro.'], [guerrero2, 'Exhalá y doblá la rodilla de adelante sobre el tobillo. Inhalá y abrí los brazos.']],
      easy: [[we1, 'Separá los pies un poco menos (≈1 m).'], [we2, 'Girá el pie de adelante hacia afuera.'], [guerrero2F, 'Doblá un poco la rodilla de adelante, manos en la cintura.']] },
    angulo_lateral: { view: 0, full: [[guerrero2, 'Empezá en Guerrero II.'], [anguloLat, 'Bajá la mano al piso por fuera del pie y estirá el otro brazo sobre la oreja.']],
      easy: [[guerrero2, 'Empezá en Guerrero II.'], [anguloLatF, 'Apoyá el antebrazo en el muslo y estirá el otro brazo.']] },
    triangulo: { view: 0, full: [[t1, 'Pies separados ≈1,2 m, pie de adelante hacia afuera, brazos abiertos.'], [t2, 'Estirá el torso hacia el pie de adelante, como si te tiraran de la mano.'], [triangulo, 'Bajá la mano a la canilla y subí la otra: brazos en una línea.']],
      easy: [[t1, 'Pies separados ≈1,2 m, pie de adelante hacia afuera, brazos abiertos.'], [t2, 'Estirá el torso hacia el pie de adelante.'], [trianguloF, 'Apoyá la mano en un bloque o una pila de libros.']] },
    piramide: { view: -90, full: [[pir1, 'Pie izquierdo adelante, derecho atrás girado 45°, manos en la cintura.'], [piramide, 'Exhalá y bajá el pecho sobre la pierna de adelante, con la espalda larga.']],
      easy: [[pir1, 'Pie izquierdo adelante, derecho atrás girado 45°, manos en la cintura.'], [piramideF, 'Bajá menos y apoyá las manos en bloques.']] },
    arbol: { view: 0, full: [[arbolBase, 'Parate sobre la pierna derecha, manos al pecho.'], [arbol1, 'Apoyá la planta del pie izquierdo en la pantorrilla.'], [arbol, 'Subí el pie a la parte interna del muslo y los brazos arriba.']],
      easy: [[arbolBase, 'Parate sobre la pierna derecha, manos al pecho.'], [arbolF, 'Apoyá el talón en el tobillo y los dedos en el piso.']] },
    bailarin: { view: -90, full: [[bail1, 'Parate sobre la pierna derecha y tomá el empeine izquierdo por detrás.'], [bailarin, 'Empujá el pie contra la mano e inclinate adelante con el brazo extendido.']],
      easy: [[montana, 'Empezá en Montaña.'], [bailarinF, 'Tomá el pie por detrás y quedate con el torso derecho.']] },
  };
  G.YP3 = Object.assign(G.YP3 || {}, POSES);
  G.YP3_LIB = { F, V, C, W, fit, reachY, FEET, ARMS_DOWN, ARMS_UP, HEART, HIPS, BASE, montana };
  if (typeof module !== 'undefined') module.exports = G.YP3;
})(typeof window !== 'undefined' ? window : globalThis);
// Posturas en el piso: cuatro apoyos, planchas, boca abajo y estocadas.
(function (G) {
  const L = G.YP3_LIB || (require('./yp_build.js'), globalThis.YP3_LIB);
  const { F, V, C, W, fit } = L;
  // Ajusta la altura de la cadera para que el brazo apoyado quede recto (o con el ángulo pedido).
  function armStraight(P, s, len) { len = len || 57.9; for (let it = 0; it < 80; it++) { const J = F.solve(P); const e = V.len(V.sub(P['a' + s].at, J['sh' + s])) - len; if (Math.abs(e) < 0.05) break; P.pel[1] -= e * 0.7; } return P; }
  // Mueve los pies (eje z) para que las piernas queden rectas.
  function legsZ(P, legs) { for (let it = 0; it < 80; it++) { const J = F.solve(P); const e = V.len(V.sub(P['l' + legs[0]].at, J['hip' + legs[0]])) - 88.9; if (Math.abs(e) < 0.05) break; legs.forEach(s => { P['l' + s].at[2] += e * (P['l' + s].at[2] < J['hip' + s][2] ? 1 : -1); }); } return P; }
  // Manos debajo de los hombros.
  function handsUnder(P, w) { const J = F.solve(P); ['L', 'R'].forEach(s => { P['a' + s] = Object.assign({ h: [0, 0, 1] }, P['a' + s] || {}, { at: [J['sh' + s][0] * (w || 0.9), 4, J['sh' + s][2]] }); }); return P; }

  const HANDS = (z, x) => ({ aL: { at: [x || 15, 4, z], h: [0, 0, 1] }, aR: { at: [-(x || 15), 4, z], h: [0, 0, 1] } });
  const TOPS = (z, x) => ({ lL: { at: [x || 9, 6.5, z], f: [0, -0.1, -1], up: true, pole: [0, -1, 0.5] }, lR: { at: [-(x || 9), 6.5, z], f: [0, -0.1, -1], up: true, pole: [0, -1, 0.5] } });
  const TUCK = (z, y) => ({ lL: { at: [8, y || 20.5, z], f: [0, -0.8, 0.6], down: [0, -0.6, -0.8], pole: [0, 0.2, 1] }, lR: { at: [-8, y || 20.5, z], f: [0, -0.8, 0.6], down: [0, -0.6, -0.8], pole: [0, 0.2, 1] } });

  // ---------- cuatro apoyos ----------
  const mesa = W({ pel: [0, 53.5, 20], pr: [0, 81, 0], sp: [0, 0, 0], hd: [0, 0, 0] }, TOPS(-26), HANDS(69));
  const vaca = W(mesa, { pel: [0, 50.5, 20], pr: [0, 90, 0], sp: [0, -20, 0], hd: [0, -34, 0], gaze: 26, marks: [['waist', 1, 0, 18], ['head', 2], ['wrL', 3], ['knL', 4]], guides: [['shL', 'wrL']] });
  const gato = W(mesa, { pr: [0, 66, 0], sp: [0, 32, 0], hd: [0, 34, 0], gaze: 18, marks: [['waist', 1, 0, -20], ['head', 2], ['wrL', 3], ['knL', 4]], guides: [['shL', 'wrL']] });
  const vacaF = W(mesa, { pel: [0, 52, 20], pr: [0, 86, 0], sp: [0, -12, 0], hd: [0, -16, 0], marks: [['waist', 1, 0, 18]] });
  const gatoF = W(mesa, { pr: [0, 76, 0], sp: [0, 16, 0], hd: [0, 16, 0], marks: [['waist', 1, 0, -20]] });

  // ---------- perro boca abajo ----------
  const dedos = W(mesa, TUCK(-25));
  const perro = W({ pel: [0, 84, 1], pr: [0, 141, 0], sp: [0, 0, 0], hd: [0, 8, 0], lL: { at: [9, 13.5, -44], f: [0, -0.35, 0.94], pole: [0, 0.2, 1] }, lR: { at: [-9, 13.5, -44], f: [0, -0.35, 0.94], pole: [0, 0.2, 1] },
    gaze: 34, marks: [['pelvis', 1, 0, -22], ['elL', 2, -16, -6], ['knL', 3, 15, -4], ['heelL', 4, 14, -2]], guides: [['wrL', 'pelvis']] }, HANDS(69));
  armStraight(perro, 'L'); legsZ(perro, ['L', 'R']); armStraight(perro, 'L'); legsZ(perro, ['L', 'R']);
  const perroF = W({ pel: [0, 84, -3], pr: [0, 138, 0], sp: [0, 0, 0], hd: [0, 8, 0], lL: { at: [9, 17, -30], f: [0, -0.62, 0.78], pole: [0, -0.2, 1] }, lR: { at: [-9, 17, -30], f: [0, -0.62, 0.78], pole: [0, -0.2, 1] },
    marks: [['knL', 1, -14, 4], ['heelL', 2, 14, -6]], guides: [['wrL', 'pelvis']] }, HANDS(69));
  armStraight(perroF, 'L');

  // ---------- planchas ----------
  const plancha = W({ pel: [0, 44, -45], pr: [0, 69, 0], sp: [0, 0, 0], hd: [0, -4, 0] }, HANDS(0), TUCK(-128), {
    marks: [['shL', 1, 0, -18], ['pelvis', 2, 0, -20], ['heelL', 3, 0, -16], ['wrL', 4, 14, 0]], guides: [['heelL', 'neck']] });
  armStraight(plancha, 'L'); legsZ(plancha, ['L', 'R']); armStraight(plancha, 'L'); legsZ(plancha, ['L', 'R']);
  const planchaF = W({ pel: [0, 33.2, -41], pr: [0, 55, 0], sp: [0, 0, 0], hd: [0, -4, 0] }, HANDS(0), TOPS(-125.5), { marks: [['knL', 1, 0, 16]], guides: [['knL', 'neck']] });
  planchaF.lL.pole = [0, -1, 0]; planchaF.lR.pole = [0, -1, 0];
  const chaturanga = W({ pel: [0, 20, -38], pr: [0, 86.5, 0], sp: [0, 0, 0], hd: [0, -8, 0] }, TUCK(-126), {
    aL: { at: [15, 4, 0], h: [0, 0, 1], pole: [0.15, 0.4, -1] }, aR: { at: [-15, 4, 0], h: [0, 0, 1], pole: [-0.15, 0.4, -1] },
    marks: [['elL', 1, 0, -16], ['shL', 2, 0, -18], ['pelvis', 3, 0, -18], ['heelL', 4, 0, -14]], guides: [['heelL', 'neck']] });
  legsZ(chaturanga, ['L', 'R']);
  const chaturangaF = W(planchaF, { lL: { at: [9, 6.5, -127], f: [0, -0.1, -1], up: true, pole: [0, -1, 0] }, lR: { at: [-9, 6.5, -127], f: [0, -0.1, -1], up: true, pole: [0, -1, 0] }, pel: [0, 18, -36], pr: [0, 80, 0], aL: { at: [15, 4, 0], h: [0, 0, 1], pole: [0.15, 0.4, -1] }, aR: { at: [-15, 4, 0], h: [0, 0, 1], pole: [-0.15, 0.4, -1] }, marks: [['elL', 1, 0, -16]] });

  // ---------- boca abajo ----------
  const PRONE = { lL: { at: [9, 6.5, -91], f: [0, -0.2, -1], up: true, pole: [0, -1, 0] }, lR: { at: [-9, 6.5, -91], f: [0, -0.2, -1], up: true, pole: [0, -1, 0] } };
  const HC = { aL: { at: [19, 4, 38], h: [0, 0, 1], pole: [0.25, 1, -0.6] }, aR: { at: [-19, 4, 38], h: [0, 0, 1], pole: [-0.25, 1, -0.6] } };
  const boca = W({ pel: [0, 13, 0], pr: [0, 90, 0], sp: [0, -4, 0], hd: [0, -18, 0] }, PRONE, HC);
  const cobra = W({ pel: [0, 12.5, 0], pr: [0, 88, 0], sp: [0, -52, 0], hd: [0, -40, 0], gaze: 34, marks: [['elL', 1, 15, 2], ['shL', 2, 16, -14], ['knL', 3, 0, -18], ['head', 4, -4, -24]] }, PRONE, HC);
  const cobraF = W(cobra, { sp: [0, -32, 0], hd: [0, -26, 0], marks: [['elL', 1, 15, 2]] });
  const FORE = { aL: { at: [16, 4.5, 64], h: [0, 0, 1], pole: [0.2, -1, -0.4] }, aR: { at: [-16, 4.5, 64], h: [0, 0, 1], pole: [-0.2, -1, -0.4] } };
  const bocaE = W(boca, FORE, { pel: [0, 13, 0], sp: [0, -40, 0], hd: [0, -14, 0] });
  const esfinge = W({ pel: [0, 12.5, 0], pr: [0, 89, 0], sp: [0, -50, 0], hd: [0, -30, 0], gaze: 30, aL: { at: [16, 4.5, 68], h: [0, 0, 1], pole: [0.1, -1, -0.3] }, aR: { at: [-16, 4.5, 68], h: [0, 0, 1], pole: [-0.1, -1, -0.3] },
    marks: [['elL', 1, 2, -16], ['shL', 2, 16, -12], ['waist', 3, 0, -20], ['head', 4]], guides: [['shL', 'elL']] }, PRONE);
  const esfingeF = W(esfinge, { sp: [0, -42, 0], hd: [0, -24, 0], aL: { at: [16, 4.5, 74], h: [0, 0, 1], pole: [0.1, -1, -0.3] }, aR: { at: [-16, 4.5, 74], h: [0, 0, 1], pole: [-0.1, -1, -0.3] }, props: [{ k: 'cushion', j: 'chest', h: 10, len: 30 }], marks: [['elL', 1, 2, -16]] });
  // Perro boca arriba
  const perroArriba = W({ pel: [0, 30, -12], pr: [0, 62, 0], sp: [0, -26, 0], hd: [0, -24, 0], gaze: 30 }, PRONE, {
    marks: [['shL', 1, 0, -18], ['wrL', 2, 14, 0], ['knL', 3, 0, 16], ['head', 4]], guides: [['shL', 'wrL']] });
  handsUnder(perroArriba); armStraight(perroArriba, 'L'); handsUnder(perroArriba); armStraight(perroArriba, 'L'); legsZ(perroArriba, ['L', 'R']);
  // Langosta (media): pierna izquierda arriba
  const langosta = W({ pel: [0, 12.5, 0], pr: [0, 90, 0], sp: [0, -16, 0], hd: [0, -14, 0], gaze: 24,
    aL: { at: [19, 4, -4], h: [0, 0, -1], pn: [0, -1, 0], pole: [0, 1, 0] }, aR: { at: [-19, 4, -4], h: [0, 0, -1], pn: [0, -1, 0], pole: [0, 1, 0] },
    lL: { at: [9, 30, -86], f: [0, -0.2, -1], up: true, pole: [0, -1, 0] }, lR: { at: [-9, 6.5, -91], f: [0, -0.2, -1], up: true, pole: [0, -1, 0] },
    marks: [['anL', 1, 0, -16], ['knL', 2, 0, -16], ['pelvis', 3, 0, 18], ['head', 4]] });
  const langostaF = W(langosta, { sp: [0, -4, 0], hd: [0, -14, 0], lL: { at: [9, 18, -89], f: [0, -0.2, -1], up: true, pole: [0, -1, 0] }, marks: [['anL', 1, 0, -16]] });
  const bocaBrazos = W(boca, { aL: { at: [19, 4, -4], h: [0, 0, -1], pn: [0, -1, 0], pole: [0, 1, 0] }, aR: { at: [-19, 4, -4], h: [0, 0, -1], pn: [0, -1, 0], pole: [0, 1, 0] } });

  // ---------- estocadas ----------
  const LUNGE_LEGS = { lL: { at: [8, 8, 46], f: [0, 0, 1], pole: [0, 0.4, 1] }, lR: { at: [-9, 6.5, -74], f: [0, -0.1, -1], up: true, pole: [0, -1, -0.2] } };
  const estocada1 = W({ pel: [0, 42, 2], pr: [0, 50, 0], sp: [0, 10, 0], hd: [0, -20, 0], aL: { d: [0.05, -1, 0.3], floor: true, h: [0, 0, 1] }, aR: { d: [-0.05, -1, 0.3], floor: true, h: [0, 0, 1] } }, LUNGE_LEGS);
  const estocada = W({ pel: [0, 40, 4], pr: [0, -4, 0], sp: [0, -12, 0], hd: [0, -16, 0], gaze: 40, aL: { d: [0.1, 1, -0.05], pn: [-1, 0, 0] }, aR: { d: [-0.1, 1, -0.05], pn: [1, 0, 0] },
    marks: [['knL', 1, 14, -10], ['knR', 2, 0, 16], ['pelvis', 3, -22, 0], ['tipL', 4]] }, LUNGE_LEGS);
  const estocadaF = W(estocada, { pel: [0, 46, 0], pr: [0, 4, 0], sp: [0, 0, 0], hd: [0, -4, 0], aL: { rel: [10, -42, 30], h: [0, -0.8, 0.5], pn: [0, -1, 0] }, aR: { rel: [-2, -42, 30], h: [0, -0.8, 0.5], pn: [0, -1, 0] },
    props: [{ k: 'cushion', j: 'knR', h: 6, len: 26, w: 24 }], marks: [['knR', 1, 0, 16]] });
  const mejor = W({ pel: [0, 42, 2], pr: [0, 46, 0], sp: [56, 6, 0], hd: [24, -10, 0], gaze: 46,
    aR: { at: [-3, 4, 44], h: [0, 0, 1] }, aL: { d: [0.15, 1, 0], pn: [0, 0, 1] },
    marks: [['tipL', 1], ['chest', 2], ['knL', 3, 14, -10], ['knR', 4, 0, 16]], guides: [['wrR', 'wrL']] }, LUNGE_LEGS);
  const mejorF = W(estocada1, { aR: { at: [-3, 4, 44], h: [0, 0, 1] }, aL: { rel: [16, -40, 6], h: [0, -0.4, 1], pn: [-1, 0, 0], pole: [1, 0, -0.4] }, sp: [26, 8, 0], hd: [10, -10, 0], marks: [['chest', 1]] });

  // Paloma (pierna izquierda adelante)
  const PAL = { lL: { at: [-16, 7, 18], f: [-0.75, 0, 0.35], down: [0.15, -0.2, -0.95], pole: [0.7, -0.1, 0.7] }, lR: { at: [-9, 6.5, -89], f: [0, -0.2, -1], up: true, pole: [0, -1, 0] } };
  const paloma1 = W(perroF, { lL: { at: [-6, 30, 20], f: [-0.3, -0.6, -0.7], down: [0, 0.6, -0.8], pole: [1, 0, 1] } });
  const paloma = W({ pel: [0, 16, 0], pr: [0, 4, -4], sp: [0, -8, 0], hd: [0, -8, 0], gaze: 40, aL: { d: [0.2, -1, 0.15], floor: true, h: [0, 0, 1] }, aR: { d: [-0.2, -1, 0.15], floor: true, h: [0, 0, 1] },
    marks: [['knL', 1, 14, 0], ['anL', 2, -6, 14], ['knR', 3, 0, 16], ['chest', 4]] }, PAL);
  const palomaF = W(paloma, { pel: [0, 24, 0], props: [{ k: 'cushion', j: 'hipL', h: 16, len: 32, w: 30 }], marks: [['hipL', 1, 18, 4]] });

  const POSES = {
    gato_vaca: { view: -90, full: [[mesa, 'Cuatro apoyos: manos bajo hombros, rodillas bajo la cadera.'], [vaca, 'Inhalá: hundí el abdomen y mirá un poco adelante (vaca).'], [gato, 'Exhalá: redondeá la espalda y mirá al ombligo (gato).']],
      easy: [[mesa, 'Cuatro apoyos.'], [vacaF, 'Inhalá: arqueá suave.'], [gatoF, 'Exhalá: redondeá suave, sin forzar.']] },
    balasana: null,
    perro_abajo: { view: -90, full: [[mesa, 'Cuatro apoyos: manos bajo los hombros, rodillas bajo la cadera.'], [dedos, 'Apoyá los dedos de los pies en el piso.'], [perro, 'Exhalá y llevá la cadera arriba y atrás, estirando las piernas.']],
      easy: [[mesa, 'Cuatro apoyos: manos bajo los hombros, rodillas bajo la cadera.'], [dedos, 'Apoyá los dedos de los pies en el piso.'], [perroF, 'Subí la cadera con las rodillas dobladas y los talones arriba.']] },
    plancha: { view: -90, full: [[mesa, 'Cuatro apoyos.'], [plancha, 'Llevá un pie y después el otro atrás: cuerpo en una línea de la cabeza a los talones.']],
      easy: [[mesa, 'Cuatro apoyos.'], [planchaF, 'Llevá la cadera adelante con las rodillas apoyadas.']] },
    chaturanga: { view: -90, full: [[plancha, 'Empezá en plancha.'], [chaturanga, 'Exhalá y bajá en bloque, codos atrás pegados al cuerpo, hasta 90°.']],
      easy: [[planchaF, 'Plancha con rodillas apoyadas.'], [chaturangaF, 'Bajá en bloque con las rodillas en el piso.']] },
    perro_arriba: { view: -90, full: [[boca, 'Boca abajo, manos al lado de las costillas.'], [perroArriba, 'Inhalá: estirá los brazos y despegá muslos y pecho, empeines apoyados.']],
      easy: [[boca, 'Boca abajo, manos al lado del pecho.'], [cobraF, 'Hacé una cobra baja: piernas apoyadas.']] },
    cobra: { view: -90, full: [[boca, 'Boca abajo, manos al lado del pecho, codos pegados.'], [cobra, 'Inhalá y despegá el pecho empujando suave con las manos.']],
      easy: [[bocaE, 'Boca abajo, antebrazos apoyados adelante.'], [esfinge, 'Inhalá y subí el pecho: codos justo debajo de los hombros (Esfinge).']] },
    esfinge: { view: -90, full: [[bocaE, 'Boca abajo, antebrazos apoyados adelante.'], [esfinge, 'Subí el pecho con los codos debajo de los hombros y relajá las piernas.']],
      easy: [[bocaE, 'Boca abajo, antebrazos apoyados adelante.'], [esfingeF, 'Apoyá el pecho en un almohadón y adelantá los codos.']] },
    langosta: { view: -90, full: [[bocaBrazos, 'Boca abajo, brazos al costado, palmas abajo.'], [langosta, 'Inhalá: despegá el pecho y levantá la pierna izquierda estirada.']],
      easy: [[bocaBrazos, 'Boca abajo, brazos al costado.'], [langostaF, 'Levantá solo la pierna, poco y con la cadera apoyada.']] },
    estocada_baja: { view: -90, full: [[perroF, 'Desde el perro (o cuatro apoyos)...'], [estocada1, 'Llevá el pie izquierdo entre las manos y apoyá la rodilla de atrás.'], [estocada, 'Subí el torso y los brazos; llevá la cadera adelante y abajo.']],
      easy: [[mesa, 'Cuatro apoyos.'], [estocada1, 'Llevá el pie izquierdo entre las manos.'], [estocadaF, 'Manos sobre el muslo de adelante; acolchá la rodilla de atrás.']] },
    mejor_estiramiento: { view: -50, full: [[estocada1, 'Estocada baja con las manos en el piso.'], [mejor, 'Abrí el brazo izquierdo al techo y girá el pecho; mirá la mano.']],
      easy: [[estocada1, 'Estocada baja con las manos en el piso.'], [mejorF, 'Girá el pecho con la mano en la cintura.']] },
    paloma: { view: -60, full: [[perroF, 'Desde el perro...'], [paloma1, 'Traé la rodilla izquierda hacia la mano izquierda.'], [paloma, 'Apoyá la pierna, estirá la de atrás y alineá la cadera.']],
      easy: [[perroF, 'Desde el perro...'], [paloma1, 'Traé la rodilla izquierda adelante.'], [palomaF, 'Poné un almohadón bajo la cadera izquierda.']] },
  };
  delete POSES.balasana;
  G.YP3 = Object.assign(G.YP3 || {}, POSES);
  Object.assign(G.YP3_LIB, { armStraight, legsZ, handsUnder, HANDS, TOPS, TUCK, PRONE, mesa, boca, perroF });
  if (typeof module !== 'undefined') module.exports = POSES;
})(typeof window !== 'undefined' ? window : globalThis);
// Posturas sentadas, acostadas y el niño.
(function (G) {
  const L = G.YP3_LIB || (require('./yp_floor.js'), globalThis.YP3_LIB);
  const { F, V, C, W, legsZ, TOPS } = L;
  const FEET_UP = (x, z) => ({ lL: { at: [x, 8.5, z], f: [0, 0.95, 0.3], down: [0, -0.3, 0.95], pole: [0, 1, 0] }, lR: { at: [-x, 8.5, z], f: [0, 0.95, 0.3], down: [0, -0.3, 0.95], pole: [0, 1, 0] } });
  // Estira una pierna hacia un punto del piso con su largo exacto.
  const legTo = (P, s, dir) => { const J = F.solve(P); const d = V.norm(dir); P['l' + s].at = V.add(J['hip' + s], V.mul(d, 88.9)); return P; };

  // ---------- sentada ----------
  const SIT = { pel: [0, 12, 0], pr: [0, 0, 0], sp: [0, 0, 0], hd: [0, 0, 0] };
  const sentado = legsZ(W(SIT, FEET_UP(9, 88), { aL: { d: [0.25, -1, 0.05], floor: true, h: [0, 0, 1] }, aR: { d: [-0.25, -1, 0.05], floor: true, h: [0, 0, 1] } }), ['L', 'R']);
  const pinzaSent = legsZ(W(SIT, FEET_UP(9, 88), { pr: [0, 32, 0], sp: [0, 30, 0], hd: [0, 8, 0], gaze: 24,
    aL: { d: [0.08, -0.45, 1], floor: 9, h: [0, 0.2, 1] }, aR: { d: [-0.08, -0.45, 1], floor: 9, h: [0, 0.2, 1] },
    marks: [['pelvis', 1, -6, -22], ['waist', 2, 0, -20], ['knL', 3, 0, -16], ['anL', 4, 14, -8]] }), ['L', 'R']);
  const pinzaSentF = W(SIT, { pr: [0, 26, 0], sp: [0, 18, 0], hd: [0, 4, 0],
    lL: { at: [9, 7, 72], f: [0, 0.95, 0.3], down: [0, -0.3, 0.95], pole: [0, 1, 0] }, lR: { at: [-9, 7, 72], f: [0, 0.95, 0.3], down: [0, -0.3, 0.95], pole: [0, 1, 0] },
    aL: { d: [0.1, -0.6, 1], floor: 30, h: [0, -0.2, 1] }, aR: { d: [-0.1, -0.6, 1], floor: 30, h: [0, -0.2, 1] }, props: [{ k: 'cushion', j: 'knL', off: [-9, 0, 0], h: 12, len: 22, w: 40, ax: [1, 0, 0] }], marks: [['knL', 1, 0, -16]] });
  const anchoL = V.norm([0.66, -0.005, 0.75]);
  const anguloAb0 = W(SIT, { lL: { at: [0, 0, 0], f: [0.25, 0.95, 0.2], down: [0, -0.3, 0.95], pole: [0, 1, 0] }, lR: { at: [0, 0, 0], f: [-0.25, 0.95, 0.2], down: [0, -0.3, 0.95], pole: [0, 1, 0] },
    aL: { d: [0.1, -1, 0.3], floor: true, h: [0, 0, 1] }, aR: { d: [-0.1, -1, 0.3], floor: true, h: [0, 0, 1] } });
  legTo(anguloAb0, 'L', anchoL); legTo(anguloAb0, 'R', [-anchoL[0], anchoL[1], anchoL[2]]);
  const anguloAb = W(anguloAb0, { pr: [0, 32, 0], sp: [0, 26, 0], hd: [0, 4, 0], gaze: 22, aL: { d: [0.1, -0.5, 1], floor: true, h: [0, 0, 1] }, aR: { d: [-0.1, -0.5, 1], floor: true, h: [0, 0, 1] },
    marks: [['pelvis', 1, -24, 0], ['knL', 2], ['wrL', 3], ['chest', 4, 0, -24]] });
  const anguloAbF = W(anguloAb0, { pel: [0, 22, 0], pr: [0, 10, 0], props: [{ k: 'cushion', j: 'pelvis', h: 10, len: 30, w: 34 }], marks: [['pelvis', 1, -24, 0]] });
  legTo(anguloAbF, 'L', anchoL); legTo(anguloAbF, 'R', [-anchoL[0], anchoL[1], anchoL[2]]);
  const SOLES = { lL: { at: [5, 8, 32], f: [-0.2, 0.3, 0.95], down: [-1, 0, 0.1], pole: [1, 0.25, 0.2] }, lR: { at: [-5, 8, 32], f: [0.2, 0.3, 0.95], down: [1, 0, 0.1], pole: [-1, 0.25, 0.2] } };
  const mariposa = W(SIT, SOLES, { pr: [0, 8, 0], gaze: 40, aL: { at: [7, 10, 38], h: [-0.3, 0, 1], pn: [-1, 0, 0] }, aR: { at: [-7, 10, 38], h: [0.3, 0, 1], pn: [1, 0, 0] },
    marks: [['anL', 1, 0, 16], ['knL', 2], ['pelvis', 3, 24, 0], ['head', 4]], guides: [['pelvis', 'head']] });
  const mariposaF = W(mariposa, { pel: [0, 22, 0], props: [{ k: 'cushion', j: 'pelvis', h: 10, len: 30, w: 34 }], lL: Object.assign({}, SOLES.lL, { at: [5, 8, 40] }), lR: Object.assign({}, SOLES.lR, { at: [-5, 8, 40] }), aL: { at: [6, 12, 42], h: [-0.3, 0, 1], pn: [-1, 0, 0] }, aR: { at: [-6, 12, 42], h: [0.3, 0, 1], pn: [1, 0, 0] }, marks: [['pelvis', 1, 24, 0]] });
  const CROSS = { lL: { at: [-15, 7, 20], f: [-0.4, 0.2, 0.9], down: [-0.2, -0.95, 0], pole: [1, 0.2, 0.25] }, lR: { at: [15, 7, 14], f: [0.4, 0.2, 0.9], down: [0.2, -0.95, 0], pole: [-1, 0.2, 0.25] } };
  const facil = W(SIT, CROSS, { aL: { at: [31, 18, 20], h: [0, -0.4, 1], pn: [0, -1, 0] }, aR: { at: [-31, 18, 20], h: [0, -0.4, 1], pn: [0, -1, 0] },
    marks: [['pelvis', 1, 24, 0], ['shL', 2], ['head', 3], ['knL', 4, 14, 8]], guides: [['pelvis', 'head']] });
  const facilF = W(facil, { pel: [0, 22, 0], props: [{ k: 'cushion', j: 'pelvis', h: 10, len: 30, w: 34 }], marks: [['pelvis', 1, 24, 0]],
    lL: { at: [-15, 7, 26], f: [-0.4, 0.2, 0.9], down: [-0.2, -0.95, 0], pole: [1, 0.2, 0.25] }, lR: { at: [15, 7, 20], f: [0.4, 0.2, 0.9], down: [0.2, -0.95, 0], pole: [-1, 0.2, 0.25] }, aL: { at: [31, 24, 22], h: [0, -0.4, 1], pn: [0, -1, 0] }, aR: { at: [-31, 24, 22], h: [0, -0.4, 1], pn: [0, -1, 0] } });

  // ---------- niño ----------
  const KNEEL = { lL: { at: [6, 6.5, -37], f: [0, -0.1, -1], up: true, pole: [0.45, -0.6, 1] }, lR: { at: [-6, 6.5, -37], f: [0, -0.1, -1], up: true, pole: [-0.45, -0.6, 1] } };
  const ninio0 = W(L.mesa, KNEEL, { pel: [0, 53.5, 8], aL: { at: [15, 4, 53], h: [0, 0, 1] }, aR: { at: [-15, 4, 53], h: [0, 0, 1] } });
  const ninio = W({ pel: [0, 33, -33], pr: [0, 104, 0], sp: [0, 4, 0], hd: [0, 10, 0] }, KNEEL, { aL: { at: [16, 4, 58], h: [0, 0, 1] }, aR: { at: [-16, 4, 58], h: [0, 0, 1] },
    marks: [['pelvis', 1, 0, -20], ['wrL', 2, 0, -14], ['head', 3, 0, -20], ['knL', 4, 0, 16]] });
  const ninioF = W(ninio, { pel: [0, 34, -31], pr: [0, 96, 0], sp: [0, 2, 0], hd: [0, 14, 0], props: [{ k: 'cushion', j: 'chest', h: 16, len: 46, w: 30 }], marks: [['chest', 1, 0, -22]] });

  // ---------- boca arriba ----------
  const SUP = { pel: [0, 12, 0], pr: [0, -90, 0], sp: [0, 0, 0], hd: [0, 0, 0] };
  const ARMS_SIDE = (pn) => ({ aL: { at: [24, 4, 2], h: [0, 0, 1], pn: pn || [0, -1, 0], pole: [0, 1, 0] }, aR: { at: [-24, 4, 2], h: [0, 0, 1], pn: pn || [0, -1, 0], pole: [0, 1, 0] } });
  const acostado = legsZ(W(SUP, FEET_UP(10, 92), ARMS_SIDE()), ['L', 'R']);
  const savasana = W(acostado, { lL: { at: [18, 6, 0], f: [0.5, 0.8, 0.3], down: [0.2, -0.3, 0.95], pole: [0.3, 1, 0] }, lR: { at: [-18, 6, 0], f: [-0.5, 0.8, 0.3], down: [-0.2, -0.3, 0.95], pole: [-0.3, 1, 0] },
    aL: { at: [36, 4, -12], h: [0.3, 0, 1], pn: [0, 1, 0], pole: [0, 1, 0] }, aR: { at: [-36, 4, -12], h: [-0.3, 0, 1], pn: [0, 1, 0], pole: [0, 1, 0] },
    marks: [['anL', 1, 14, -8], ['wrL', 2, 14, -8], ['shL', 3, 0, -18], ['head', 4, 0, -20]] });
  legTo(savasana, 'L', [0.2, -0.07, 0.98]); legTo(savasana, 'R', [-0.2, -0.07, 0.98]);
  const savasanaF = W(savasana, { lL: { at: [16, 6, 80], f: [0.5, 0.8, 0.3], down: [0.2, -0.3, 0.95], pole: [0.2, 1, 0] }, lR: { at: [-16, 6, 80], f: [-0.5, 0.8, 0.3], down: [-0.2, -0.3, 0.95], pole: [-0.2, 1, 0] },
    props: [{ k: 'cushion', j: 'knL', off: [-16, 0, 0], h: 14, len: 24, w: 46, ax: [1, 0, 0] }], marks: [['knL', 1, 0, -18]] });
  const rodillas = W(SUP, ARMS_SIDE(), {
    lL: { at: [9, 34, 4], f: [0, 0.4, 0.9], down: [0, -0.9, 0.4], pole: [0, 0.6, -1] }, lR: { at: [-9, 34, 4], f: [0, 0.4, 0.9], down: [0, -0.9, 0.4], pole: [0, 0.6, -1] },
    aL: { at: [12, 46, -10], h: [0, 0.5, 1], pn: [-1, 0, 0], pole: [1, 0, 0] }, aR: { at: [-12, 46, -10], h: [0, 0.5, 1], pn: [1, 0, 0], pole: [-1, 0, 0] },
    marks: [['knL', 1, 0, -16], ['pelvis', 2, 0, 16], ['shL', 3, 0, 14], ['head', 4, 0, -18]] });
  const rodillasF = W(acostado, { lL: rodillas.lL, aL: rodillas.aL, marks: [['knL', 1, 0, -16]] });
  const isquio = W(acostado, { lL: { at: [9, 98, 6], f: [0, 0.25, -0.97], down: [0, 0.97, 0.25], pole: [0, 0, -1] },
    aL: { at: [8, 52, -22], h: [0, 1, 0.2], pn: [-1, 0, 0], pole: [1, 0, 0] }, aR: { at: [-2, 52, -22], h: [0, 1, 0.2], pn: [1, 0, 0], pole: [-1, 0, 0] },
    props: [{ k: 'strap', from: 'wrL', to: 'ballL' }, { k: 'strap', from: 'wrR', to: 'ballL' }],
    marks: [['anL', 1, 16, 0], ['knL', 2, 16, 0], ['anR', 3, 0, -16], ['shL', 4, 0, 16]] });
  const isquioF = W(isquio, { lR: { at: [-10, 8, 40], f: [0, 0, 1], pole: [0, 1, 0.2] }, lL: { at: [9, 92, 24], f: [0, 0.25, -0.97], down: [0, 0.97, 0.25], pole: [0, 0, -1] }, marks: [['knR', 1, 0, -16]] });
  const KNEES_UP = { lL: { at: [10, 8, 36], f: [0, 0, 1], pole: [0, 1, 0.2] }, lR: { at: [-10, 8, 36], f: [0, 0, 1], pole: [0, 1, 0.2] } };
  const rodillasArriba = W(acostado, KNEES_UP);
  const puente = W({ pel: [0, 32, -6], pr: [0, -114, 0], sp: [0, 10, 0], hd: [0, -20, 0] }, KNEES_UP,
    { aL: { at: [18, 4, -14], h: [0, 0, 1], pole: [0, 1, 0] }, aR: { at: [-18, 4, -14], h: [0, 0, 1], pole: [0, 1, 0] },
      marks: [['pelvis', 1, 0, -18], ['knL', 2, 0, -16], ['anL', 3, 14, 0], ['neck', 4, 0, -18]], guides: [['knL', 'shL']] });
  const puenteF = W(puente, { pel: [0, 22, -8], pr: [0, -104, 0], props: [{ k: 'block', j: 'pelvis', gap: 11 }], marks: [['pelvis', 1, 0, -18]] });
  const torsion = W(rodillasArriba, { ptw: -62, sp: [62, 0, 0], hd: [55, 0, 0], gaze: 30,
    lL: { at: [-24, 9, 40], f: [-0.3, -0.2, 0.9], down: [0, -1, 0], pole: [-0.5, 0.8, 0.4] }, lR: { at: [-30, 6, 36], f: [-0.3, -0.2, 0.9], down: [0, -1, 0], pole: [-0.7, 0.4, 0.4] },
    aL: { at: [62, 4, -46], h: [1, 0, 0], pn: [0, 1, 0], pole: [0, 1, 0] }, aR: { at: [-62, 4, -46], h: [-1, 0, 0], pn: [0, 1, 0], pole: [0, 1, 0] },
    marks: [['knL', 1, 0, -18], ['shL', 2, 0, -16], ['wrR', 3, 0, -14], ['head', 4]] });
  const torsionF = W(torsion, { props: [{ k: 'cushion', j: 'knR', h: 14, len: 30, w: 30 }], marks: [['knL', 1, 0, -18]] });
  const RSOLES = { lL: { at: [5, 8, 28], f: [-0.2, 0.3, 0.95], down: [-1, 0, 0.1], pole: [1, 0.15, 0] }, lR: { at: [-5, 8, 28], f: [0.2, 0.3, 0.95], down: [1, 0, 0.1], pole: [-1, 0.15, 0] } };
  const marRec = W(acostado, RSOLES, { aL: { at: [40, 4, -30], h: [0.6, 0, 0.8], pn: [0, 1, 0], pole: [0, 1, 0] }, aR: { at: [-40, 4, -30], h: [-0.6, 0, 0.8], pn: [0, 1, 0], pole: [0, 1, 0] },
    marks: [['anL', 1, 0, -16], ['knL', 2, 0, -16], ['wrL', 3, 0, -14], ['pelvis', 4, 0, 16]] });
  const marRecF = W(marRec, { props: [{ k: 'cushion', j: 'knL', h: 16, len: 24, w: 22 }, { k: 'cushion', j: 'knR', h: 16, len: 24, w: 22 }], marks: [['knL', 1, 0, -18]] });
  const pared = W(acostado, { pel: [0, 12, -4], lL: { at: [8, 98, 8], f: [0, 0.15, -1], down: [0, 1, 0.15], pole: [0, 0, -1] }, lR: { at: [-8, 98, 8], f: [0, 0.15, -1], down: [0, 1, 0.15], pole: [0, 0, -1] },
    aL: { at: [34, 4, -26], h: [0.5, 0, 0.8], pn: [0, 1, 0], pole: [0, 1, 0] }, aR: { at: [-34, 4, -26], h: [-0.5, 0, 0.8], pn: [0, 1, 0], pole: [0, 1, 0] },
    props: [{ k: 'wall', z: 17 }], marks: [['anL', 1, 0, -16], ['pelvis', 2, 0, 16], ['shL', 3, 0, 14], ['head', 4, 0, -18]] });
  const paredF = W(pared, { pel: [0, 12, -16], lL: { at: [8, 86, 8], f: [0, 0.15, -1], down: [0, 1, 0.15], pole: [0, 0.3, -1] }, lR: { at: [-8, 86, 8], f: [0, 0.15, -1], down: [0, 1, 0.15], pole: [0, 0.3, -1] }, marks: [['knL', 1, 14, 0]] });
  const paredIni = W(rodillasArriba, { props: [{ k: 'wall', z: 17 }], pel: [0, 12, -4], lL: { at: [10, 40, 16], f: [0, 0.6, 0.8], down: [0, -0.8, 0.6], pole: [0, 1, -0.2] }, lR: { at: [-10, 40, 16], f: [0, 0.6, 0.8], down: [0, -0.8, 0.6], pole: [0, 1, -0.2] } });

  const POSES = {
    balasana: { view: -90, full: [[ninio0, 'En cuatro apoyos, juntá los dedos gordos y separá las rodillas.'], [ninio, 'Llevá la cadera a los talones y apoyá la frente; brazos adelante.']],
      easy: [[ninio0, 'En cuatro apoyos.'], [ninioF, 'Apoyá el pecho en un almohadón.']] },
    pinza_sentada: { view: -90, full: [[sentado, 'Sentado con las piernas estiradas, espalda larga.'], [pinzaSent, 'Exhalá e inclinate desde la cadera hacia los pies.']],
      easy: [[sentado, 'Sentado con las piernas estiradas.'], [pinzaSentF, 'Doblá las rodillas sobre un almohadón y llevá las manos a las canillas.']] },
    angulo_abierto: { view: -30, full: [[anguloAb0, 'Sentado, abrí las piernas lo que te resulte cómodo, rodillas al techo.'], [anguloAb, 'Caminá con las manos adelante, inclinándote desde la cadera.']],
      easy: [[anguloAb0, 'Sentado, piernas abiertas.'], [anguloAbF, 'Sentate sobre un almohadón y quedate con el torso alto.']] },
    mariposa: { view: 0, full: [[sentado, 'Sentado con las piernas estiradas.'], [mariposa, 'Juntá las plantas, dejá caer las rodillas y crecé desde la coronilla.']],
      easy: [[sentado, 'Sentado.'], [mariposaF, 'Sentate sobre un almohadón y alejá los pies.']] },
    sentado_facil: { view: 0, full: [[sentado, 'Sentado con las piernas estiradas.'], [facil, 'Cruzá las piernas, manos en las rodillas, espalda larga.']],
      easy: [[sentado, 'Sentado.'], [facilF, 'Sentate sobre un almohadón para que las rodillas queden más bajas que la cadera.']] },
    savasana: { view: -60, full: [[acostado, 'Acostado boca arriba.'], [savasana, 'Separá pies y brazos, palmas arriba, y soltá todo el peso.']],
      easy: [[acostado, 'Acostado boca arriba.'], [savasanaF, 'Poné un almohadón bajo las rodillas.']] },
    rodillas_pecho: { view: -90, full: [[acostado, 'Acostado boca arriba.'], [rodillas, 'Abrazá las rodillas hacia el pecho.']],
      easy: [[acostado, 'Acostado boca arriba.'], [rodillasF, 'Traé una sola rodilla por vez.']] },
    isquio_supino: { view: -90, full: [[acostado, 'Acostado, correa en la planta del pie izquierdo.'], [isquio, 'Subí la pierna estirada con la correa; la otra pierna larga en el piso.']],
      easy: [[rodillasArriba, 'Acostado con las rodillas dobladas.'], [isquioF, 'Pie derecho apoyado y la pierna izquierda un poco doblada.']] },
    puente: { view: -90, full: [[rodillasArriba, 'Boca arriba, rodillas dobladas, pies paralelos.'], [puente, 'Exhalá y subí la cadera empujando con los pies.']],
      easy: [[rodillasArriba, 'Boca arriba, rodillas dobladas.'], [puenteF, 'Subí poco y apoyá el sacro en un bloque.']] },
    torsion_supina: { view: -90, full: [[rodillasArriba, 'Boca arriba, rodillas dobladas, brazos en cruz.'], [torsion, 'Dejá caer las rodillas a la derecha y mirá hacia la izquierda.']],
      easy: [[rodillasArriba, 'Boca arriba, rodillas dobladas.'], [torsionF, 'Apoyá las rodillas sobre un almohadón.']] },
    mariposa_reclinada: { view: -40, full: [[rodillasArriba, 'Boca arriba, rodillas dobladas.'], [marRec, 'Juntá las plantas y dejá caer las rodillas; brazos abiertos.']],
      easy: [[rodillasArriba, 'Boca arriba, rodillas dobladas.'], [marRecF, 'Apoyá cada rodilla en un almohadón.']] },
    piernas_pared: { view: -90, full: [[paredIni, 'Sentate de costado pegado a la pared y girá para apoyar la espalda.'], [pared, 'Subí las piernas por la pared y relajá los brazos.']],
      easy: [[paredIni, 'Acostado cerca de la pared.'], [paredF, 'Alejate un poco y doblá las rodillas.']] },
  };
  G.YP3 = Object.assign(G.YP3 || {}, POSES);
  if (typeof module !== 'undefined') module.exports = POSES;
})(typeof window !== 'undefined' ? window : globalThis);
