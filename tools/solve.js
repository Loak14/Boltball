// Solveur : vérifie qu'un niveau est faisable en explorant toutes les manières de sauter.
// Usage : node tools/solve.js            -> valide les 100 niveaux et écrit src/seedfix.js
//         node tools/solve.js endless N  -> teste N parcours endless sur 3000 m
const path = require('path');
const C = require(path.join(__dirname, '../src/core.js'));

function solve(L, maxT, cap = 1800) {
  let states = [{ P: C.newPlayer(), h: 0, par: null, a: null }];
  const r = C.rngOf(12345);
  for (let t = 1; t <= maxT; t++) {
    const next = new Map();
    for (const s of states) {
      const acts = s.h > 0 ? [[false, true, s.h - 1]]
        : (t % 4 === 0 ? [[false, false, 0], [true, true, 0], [true, true, 6], [true, true, 30]] : [[false, false, 0]]);
      for (const [pr, dn, h] of acts) {
        const P = C.clonePlayer(s.P);
        const ev = C.step(L, P, t, pr, dn);
        if (ev === 'win') { const path = [[pr, dn]]; for (let q = s; q && q.a; q = q.par) path.push(q.a); return { ok: true, t, path: path.reverse() }; }
        if (ev.startsWith('die')) continue;
        const key = `${P.y.toFixed(1)}|${P.vy.toFixed(2)}|${P.air}|${+P.onG}|${P.coy}|${+P.rising}|${P.plat}|${P.orbs}|${P.buf}|${h}`;
        if (!next.has(key)) next.set(key, { P, h, par: s, a: [pr, dn] });
      }
    }
    if (next.size === 0) {
      const P = states[0] && states[0].P;
      return { ok: false, t, x: P ? Math.round(P.x) : 0 };
    }
    states = [...next.values()];
    if (states.length > cap) {
      for (let i = states.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [states[i], states[j]] = [states[j], states[i]]; }
      states.length = cap;
    }
  }
  return { ok: true, t: maxT, partial: true };
}

function nearObs(L, x) {
  return L.obs.filter(o => o.x1 > x - 400 && o.x0 < x + 200).map(o => o.t + '@' + Math.round(o.x)).join(' ');
}

if (process.argv[2] === 'path') {
  const i = +process.argv[3], L = C.genStory(i);
  const res = solve(L, Math.ceil(L.len / L.sp) + 5);
  process.stdout.write(JSON.stringify(res.path));
} else if (process.argv[2] === 'endless') {
  const N = +process.argv[3] || 10;
  let fails = 0;
  for (let s = 0; s < N; s++) {
    const L = C.newEndless(1000 + s);
    C.extendEndless(L, 60000);
    L.len = 60000;
    const res = solve(L, 20000);
    if (!res.ok) { fails++; console.log('seed', 1000 + s, 'BLOQUÉ à', res.x, nearObs(L, res.x)); }
    else console.log('seed', 1000 + s, 'ok');
  }
  console.log('échecs', fails, '/', N);
} else {
  const fix = [];
  const from = +process.argv[2] || 0, to = +process.argv[3] || 99;
  for (let i = from; i <= to; i++) {
    let f = 0, res;
    for (; f < 40; f++) {
      const L = C.genStory(i, f);
      res = solve(L, Math.ceil(L.len / L.sp) + 5);
      if (res.ok) break;
      if (f < 3) console.log(`  niv ${i + 1} graine ${f} bloqué à x=${res.x} : ${nearObs(L, res.x)}`);
    }
    fix[i] = f;
    console.log(`niveau ${i + 1} : ${res.ok ? 'OK' : 'ÉCHEC'} (graine ${f})`);
  }
  if (from === 0 && to === 99) {
    require('fs').writeFileSync(path.join(__dirname, '../src/seedfix.js'), `// Généré par tools/solve.js : variante de graine validée pour chaque niveau\nconst SEEDFIX = ${JSON.stringify(fix)};\n`);
    console.log('seedfix.js écrit');
  }
}
