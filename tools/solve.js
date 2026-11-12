// Solveur : vérifie qu'un niveau est faisable en explorant toutes les manières de sauter.
// Usage : node tools/solve.js            -> valide les 100 niveaux et écrit src/seedfix.js
//         node tools/solve.js endless N  -> teste N parcours endless sur 3000 m
const path = require('path');
const C = require(path.join(__dirname, '../src/core.js'));

function solve(L, maxT, cap = 1800, t0 = 0) {
  const P0 = C.newPlayer(); for (let k = 0; k < t0; k++) P0.x += L.sp;
  let states = [{ P: P0, h: 0, par: null, a: null }];
  const r = C.rngOf(12345);
  for (let t = t0 + 1; t <= maxT; t++) {
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

// 3 éclairs par niveau : pris sur la trajectoire gagnante du solveur, au-dessus d'un danger,
// là où la balle est la plus haute dans chaque tiers du niveau (donc toujours attrapables).
function coinsFor(L, pathArr) {
  const P = C.newPlayer(); L.ci = 0; L.gi = 0;
  const pts = [];
  for (let t = 1; t <= pathArr.length; t++) { const ev = C.step(L, P, t, pathArr[t - 1][0], pathArr[t - 1][1]); if (ev.startsWith('die')) break; pts.push({ x: P.x, y: P.y }); }
  const centers = L.obs.filter(o => ['spk', 'saw', 'msaw'].includes(o.t)).map(o => (o.x0 + o.x1) / 2).concat(L.gaps.map(g => g.x + g.w / 2));
  const cands = [];
  for (const hx of centers) {
    let best = null; for (const p of pts) { if (!best || Math.abs(p.x - hx) < Math.abs(best.x - hx)) best = p; if (p.x > hx + 20) break; }
    if (best && Math.abs(best.x - hx) < 12) { const h = C.G - C.PR - best.y; if (h >= 34) cands.push({ x: Math.round(best.x), y: Math.round(best.y), h }); }
  }
  const out = [];
  for (let k = 0; k < 3; k++) {
    const a = L.len * (.08 + .28 * k), b = L.len * (.08 + .28 * (k + 1));
    let pick = null; for (const c of cands) if (c.x >= a && c.x < b && (!pick || c.h > pick.h)) pick = c;
    if (!pick) { // secours : point en l'air le plus proche du milieu du tiers
      const mid = (a + b) / 2; let bp = null;
      for (const p of pts) { const h = C.G - C.PR - p.y; if (h >= 34 && (!bp || Math.abs(p.x - mid) < Math.abs(bp.x - mid))) bp = p; }
      if (bp) pick = { x: Math.round(bp.x), y: Math.round(bp.y) };
    }
    if (pick && !out.some(c => Math.abs(c.x - pick.x) < 60)) out.push(pick);
  }
  out.sort((p, q) => p.x - q.x);
  return [].concat(...out.map(c => [c.x, c.y]));
}

function nearObs(L, x) {
  return L.obs.filter(o => o.x1 > x - 400 && o.x0 < x + 200).map(o => o.t + '@' + Math.round(o.x)).join(' ');
}

if (process.argv[2] === 'respawn') {
  // Vérifie que chaque niveau reste faisable depuis le point de départ rapproché des essais suivants
  let fails = 0;
  for (let i = 0; i < 100; i++) {
    const L = C.genStory(i);
    let fx = L.len; for (const o of L.obs) if (o.t !== 'sign') { fx = o.x0; break; }
    if (L.gaps.length) fx = Math.min(fx, L.gaps[0].x);
    const t0 = Math.max(0, Math.floor(fx / L.sp) - 62);
    const res = solve(L, Math.ceil(L.len / L.sp) + 5, 1800, t0);
    if (!res.ok) { fails++; console.log('niveau', i + 1, 'BLOQUÉ depuis le départ rapproché à x=' + res.x); }
  }
  console.log('départs rapprochés : échecs', fails, '/ 100');
} else if (process.argv[2] === 'path') {
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
  const fix = [], coins = [];
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
    coins[i] = res.ok && res.path ? coinsFor(C.genStory(i, f), res.path) : [];
    console.log(`niveau ${i + 1} : ${res.ok ? 'OK' : 'ÉCHEC'} (graine ${f})`);
  }
  if (from === 0 && to === 99) {
    require('fs').writeFileSync(path.join(__dirname, '../src/seedfix.js'), `// Généré par tools/solve.js : variante de graine validée pour chaque niveau\nconst SEEDFIX = ${JSON.stringify(fix)};\n`);
    require('fs').writeFileSync(path.join(__dirname, '../src/coins.js'), `// Généré par tools/solve.js : 3 éclairs par niveau, posés sur une trajectoire validée (x, y, x, y, x, y)\nconst COINS = ${JSON.stringify(coins)};\n`);
    console.log('seedfix.js écrit');
  }
}
