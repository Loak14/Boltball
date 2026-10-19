'use strict';
// ════════════════════════════════════════════════════════════════
//  CORE : constantes, aléatoire, mondes, génération, physique
//  (aucune dépendance au DOM : chargé aussi par le solveur Node)
// ════════════════════════════════════════════════════════════════

// Monde virtuel : 800 x 450 unités, identique sur tous les écrans
const VW = 800, VH = 450, G = 370, PR = 16, PX = 180;
const GRAV = .58, JV = 13.5, JV2 = 12.6, JCUT = .45, MAXVY = 22, PADV = 17;
const COYOTE = 6, BUFFER = 8, ORB_R = 14, SPK_H = 28, WALL_W = 22;
const METER = 20; // 1 mètre = 20 unités

function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function tri(v, mi, ma) {
  const r = ma - mi; if (r <= 0) return mi;
  const m = ((v - mi) % (2 * r) + 2 * r) % (2 * r);
  return mi + (m <= r ? m : 2 * r - m);
}

// ── MONDES (10 chapitres de 10 niveaux) ──────────────────────────
const WORLDS = [
  { n: 'ÉVEIL',            bpm: 116, c1: '#07071a', c2: '#1b0b35', gr: '#0d0d26', ed: '#5a5ae6', ac: '#ff3355', ob: '#e0284a', sil: 'hills',   root: 57, minor: true },
  { n: 'CÂBLES',           bpm: 120, c1: '#03140f', c2: '#062a1f', gr: '#04140f', ed: '#19c48a', ac: '#39ffb0', ob: '#ff3d6e', sil: 'towers',  root: 55, minor: true },
  { n: 'LA SCIERIE',       bpm: 124, c1: '#1a0b05', c2: '#2c1206', gr: '#170a04', ed: '#d07a2a', ac: '#ffb347', ob: '#ff4b2b', sil: 'teeth',   root: 52, minor: true },
  { n: 'ABYSSES',          bpm: 126, c1: '#020818', c2: '#04203a', gr: '#031024', ed: '#2a8bd6', ac: '#4fd8ff', ob: '#ff5577', sil: 'waves',   root: 50, minor: true },
  { n: 'DÉSERT ROUGE',     bpm: 130, c1: '#1f0705', c2: '#4a160a', gr: '#260a05', ed: '#e0573a', ac: '#ffd27a', ob: '#ff2e2e', sil: 'dunes',   root: 53, minor: false },
  { n: 'L’USINE',          bpm: 134, c1: '#0d0d10', c2: '#1d1d24', gr: '#111116', ed: '#8a8aa0', ac: '#ffe14d', ob: '#ff3b3b', sil: 'factory', root: 48, minor: true },
  { n: 'AURORE',           bpm: 136, c1: '#05061a', c2: '#0b2b33', gr: '#071420', ed: '#4dffc3', ac: '#c08cff', ob: '#ff4f9a', sil: 'peaks',   root: 57, minor: false },
  { n: 'LE VIDE',          bpm: 140, c1: '#000000', c2: '#0a0014', gr: '#050008', ed: '#7a3cff', ac: '#ffffff', ob: '#ff2266', sil: 'cubes',   root: 49, minor: true },
  { n: 'INFERNO',          bpm: 146, c1: '#200000', c2: '#3d0700', gr: '#1a0300', ed: '#ff5a1f', ac: '#ffcc33', ob: '#ff1a1a', sil: 'flames',  root: 52, minor: true },
  { n: 'CŒUR DE L’ÉCLAIR', bpm: 152, c1: '#0a0a00', c2: '#2a2400', gr: '#141200', ed: '#ffe14d', ac: '#ffffff', ob: '#ff3333', sil: 'bolts',   root: 54, minor: true },
];
const BOSS = ['LE GARDIEN', 'LE NŒUD', 'LA GRANDE LAME', 'LE LÉVIATHAN', 'LE MIRAGE', 'LA PRESSE', 'LE VOILE', 'L’ABSENCE', 'LE BRASIER', 'L’ÉCLAIR'];

// Niveau d'apparition de chaque type de passage
const UNLOCK = { spk: 0, gap: 0, spk2: 2, plt: 3, saw: 5, gap2: 7, wal: 9, mpl: 13, fsaw: 17, pad: 21, orb: 26, msaw: 31, ceil: 36, bed: 43, combo: 50 };
const NEWSIGN = {
  plt: 'PLATEFORME : POSE-TOI DESSUS', saw: 'SCIE : SAUTE PAR-DESSUS', gap2: 'GRAND TROU : DOUBLE SAUT',
  wal: 'MUR : PASSE PAR L’OUVERTURE', mpl: 'PLATEFORME MOBILE', fsaw: 'SCIE HAUTE : NE SAUTE PAS',
  pad: 'TREMPLIN : LAISSE-TOI PORTER', orb: 'ORBE : RECHARGE TON DOUBLE SAUT', msaw: 'SCIE MOBILE : TROUVE LE TEMPO',
  ceil: 'PLAFOND BAS : RESTE AU SOL', bed: 'LIT DE PIQUES : DE PLATEFORME EN PLATEFORME',
};

function storyParams(i) {
  const w = Math.floor(i / 10), boss = i % 10 === 9;
  const d = clamp((i + (boss ? 5 : 0)) / 95, 0, 1);
  const sp = +(5.2 + 2.6 * Math.pow(i / 99, .9) + (boss ? .2 : 0)).toFixed(2);
  const dur = 9 + i * .13 + (boss ? 6 : 0);
  const name = boss ? BOSS[w] : `${w + 1}-${i % 10 + 1}`;
  return { mode: 'story', i, w, boss, d, sp, bpm: WORLDS[w].bpm, dur, name, lvlEq: i };
}

// ── PASSAGES (chunks) ────────────────────────────────────────────
// c = { sp, d, R1 (portée d'un saut simple), B (unités par temps), r (aléatoire), q (quantification) }
const CH = {
  spk(x, c) {
    const n = Math.max(2, Math.round(c.R1 * lerp(.2, .46, c.d * (.5 + .5 * c.r())) / 22));
    return { obs: [{ t: 'spk', x, w: n * 22 }], end: x + n * 22 };
  },
  gap(x, c) {
    const w = Math.round(c.R1 * lerp(.3, .58, c.d * (.4 + .6 * c.r())));
    return { obs: [], gaps: [{ x, w }], end: x + w };
  },
  spk2(x, c) {
    const a = CH.spk(x, c), w = a.end - x;
    const b = CH.spk(c.q(x + Math.max(w + c.B * 1.5, c.R1 * 1.15)), c);
    return { obs: a.obs.concat(b.obs), end: b.end };
  },
  plt(x, c) {
    const w = Math.round(c.R1 * lerp(1.15, 1.5, c.d * c.r()));
    const pw = Math.round(lerp(170, 115, c.d)), h = Math.round(lerp(70, 115, .5 * c.r() + .5 * c.d));
    return { obs: [{ t: 'plt', x: Math.round(x + w / 2 - pw / 2), y: G - h, w: pw, h: 14 }], gaps: [{ x, w }], end: x + w };
  },
  saw(x, c) {
    const r = Math.round(lerp(24, 36, c.d * c.r()));
    return { obs: [{ t: 'saw', x: x + r, y: G - r + 6, r, sp: (c.r() < .5 ? 1 : -1) * lerp(.06, .12, c.d) }], end: x + 2 * r };
  },
  gap2(x, c) {
    const w = Math.round(c.R1 * lerp(.95, 1.25, c.d * c.r()));
    return { obs: [], gaps: [{ x, w }], end: x + w };
  },
  wal(x, c) {
    const low = c.r() < .3;
    const gh = Math.round(2 * PR + lerp(74, 40, c.d));
    const L = low ? 0 : Math.round(lerp(40, 115, c.r()));
    return { obs: [{ t: 'wal', x, gs: G - L - gh, gh }], end: x + WALL_W };
  },
  mpl(x, c) {
    const w = Math.round(c.R1 * lerp(1.2, 1.5, c.d * c.r()));
    const pw = Math.round(lerp(150, 105, c.d)), mi = G - 150, ma = G - 55;
    const sp = lerp(1.1, 2.2, c.d) * (c.r() < .5 ? 1 : -1);
    return { obs: [{ t: 'mpl', x: Math.round(x + w / 2 - pw / 2), y: Math.round(lerp(mi, ma, c.r())), w: pw, h: 14, mi, ma, sp }], gaps: [{ x, w }], end: x + w };
  },
  fsaw(x, c) {
    const r = Math.round(lerp(26, 34, c.r())), lift = c.d < .5 ? 46 : 30;
    const ob = []; let sx = x;
    if (c.d > .45 && c.r() < .6) { const s = CH.spk(x, c); ob.push(...s.obs); sx = c.q(x + c.R1 * 1.1); }
    ob.push({ t: 'saw', x: sx + r, y: G - 2 * PR - lift - r, r, sp: -.09 });
    return { obs: ob, end: sx + 2 * r };
  },
  pad(x, c) {
    const pw = 40, ta = PADV / GRAV;
    const ay = G - PR - (PADV * PADV / (2 * GRAV) - PADV / 2);
    const gh = Math.round(2 * PR + lerp(92, 58, c.d));
    const wx = Math.round(x + pw / 2 + c.sp * ta - WALL_W / 2);
    return { obs: [{ t: 'pad', x, w: pw }, { t: 'wal', x: wx, gs: Math.round(ay - gh / 2), gh }], end: wx + WALL_W };
  },
  orb(x, c) {
    const w = Math.round(c.R1 * lerp(1.7, 2.0, c.d * c.r()));
    return { obs: [{ t: 'orb', x: Math.round(x + w * .5), y: G - 120 }], gaps: [{ x, w }], end: x + w };
  },
  msaw(x, c) {
    const r = Math.round(lerp(26, 32, c.r()));
    return { obs: [{ t: 'msaw', x: x + r, y: G - r + 6, r, amp: Math.round(lerp(70, 90, c.r())), fr: lerp(.035, .055, c.d), ph: c.r() * 6.28, sp: .1 }], end: x + 2 * r };
  },
  ceil(x, c) {
    const w = Math.round(lerp(140, 300, c.d * c.r()));
    const cl = Math.round(2 * PR + lerp(40, 18, c.d));
    const ob = [{ t: 'ceil', x, w, cl }]; let end = x + w;
    if (c.d > .35 && c.r() < .7) { const s = CH.spk(c.q(end + c.B * .5), c); ob.push(...s.obs); end = s.end; }
    return { obs: ob, end };
  },
  bed(x, c) {
    const n = Math.max(4, Math.round(c.R1 * lerp(1.5, 2.2, c.d * c.r()) / 22)), W = n * 22;
    const np = W > c.R1 * 1.7 ? 2 : 1, ob = [{ t: 'spk', x, w: W }];
    for (let k = 0; k < np; k++) {
      const pw = Math.round(lerp(120, 92, c.d)), cxp = x + W * (k + 1) / (np + 1);
      ob.push({ t: 'plt', x: Math.round(cxp - pw / 2), y: G - Math.round(lerp(75, 100, c.r())), w: pw, h: 14 });
    }
    return { obs: ob, end: x + W };
  },
  combo(x, c) {
    const pool = ['spk', 'gap', 'saw', 'wal', 'msaw', 'fsaw'];
    const a = CH[pool[Math.floor(c.r() * pool.length)]](x, c);
    const b = CH[pool[Math.floor(c.r() * pool.length)]](c.q(a.end + Math.max(c.B * 1.5, c.R1 * .9)), c);
    return { obs: a.obs.concat(b.obs), gaps: (a.gaps || []).concat(b.gaps || []), end: b.end };
  },
};

function pickChunk(rng, lvlEq, last) {
  const types = Object.keys(UNLOCK).filter(t => UNLOCK[t] <= lvlEq);
  const ws = types.map(t => {
    let w = 1;
    if (t === 'spk' || t === 'gap') w = lvlEq < 10 ? 1.6 : .8;
    if (lvlEq - UNLOCK[t] < 4 && UNLOCK[t] > 0) w = 2.4;
    if (t === last) w *= .25;
    return w;
  });
  let s = ws.reduce((a, b) => a + b, 0) * rng();
  for (let k = 0; k < types.length; k++) { s -= ws[k]; if (s <= 0) return types[k]; }
  return types[0];
}

function chunkCtx(rng, sp, d, bpm) {
  const B = sp * 3600 / bpm, R1 = sp * 2 * JV / GRAV;
  return { sp, d, B, R1, r: rng, q: x => Math.round(x / (B / 2)) * (B / 2) };
}

function finalize(L) {
  L.obs.sort((a, b) => a.x - b.x);
  for (const o of L.obs) {
    o.x0 = o.t === 'saw' || o.t === 'msaw' ? o.x - o.r : o.t === 'orb' ? o.x - ORB_R : o.x;
    o.x1 = o.t === 'saw' || o.t === 'msaw' ? o.x + o.r : o.t === 'orb' ? o.x + ORB_R : o.t === 'wal' ? o.x + WALL_W : o.t === 'sign' ? o.x : o.x + o.w;
  }
  L.gaps.sort((a, b) => a.x - b.x);
  L.ci = 0; L.gi = 0;
  return L;
}

// ── NIVEAU HISTOIRE ──────────────────────────────────────────────
function genStory(i, fix) {
  const p = storyParams(i);
  if (fix === undefined) fix = (typeof SEEDFIX !== 'undefined' && SEEDFIX[i]) || 0;
  const rng = rngOf(hashStr('BOLT' + i + '_' + fix));
  const c = chunkCtx(rng, p.sp, p.d, p.bpm);
  const len = Math.round(p.sp * 60 * p.dur);
  const L = { ...p, len, obs: [], gaps: [], spAt: () => p.sp };
  let x = c.q(c.B * 4), last = null, first = true;
  const fresh = Object.keys(NEWSIGN).find(t => UNLOCK[t] === i);
  if (i === 0) L.obs.push({ t: 'sign', x: 60, txt: 'TAPE OU ESPACE : SAUT' });
  if (i === 1) L.obs.push({ t: 'sign', x: 60, txt: 'MAINTIENS : SAUT PLUS HAUT' });
  if (i === 2) L.obs.push({ t: 'sign', x: 60, txt: 'RE-TAPE EN L’AIR : DOUBLE SAUT' });
  while (x < len - c.B * 4) {
    let type = first && fresh ? fresh : pickChunk(rng, p.lvlEq, last);
    if (first && fresh) L.obs.push({ t: 'sign', x: Math.round(x - c.B * 2.5), txt: NEWSIGN[fresh] });
    const res = CH[type](x, c);
    if (res.end > len - c.B * 2) break;
    L.obs.push(...res.obs); if (res.gaps) L.gaps.push(...res.gaps);
    const rest = lerp(3.2, 1.6, p.d) + rng() * (p.boss ? .5 : 1.2);
    x = c.q(res.end + Math.max(rest * c.B, c.R1 * .55));
    last = type; first = false;
  }
  return finalize(L);
}

// ── ENDLESS (flux infini) ────────────────────────────────────────
function endlessSp(x) { return 5.6 + 2.6 * Math.min(1, x / 50000) + .6 * clamp((x - 50000) / 60000, 0, 1); }
function endlessD(x) { return Math.min(1, x / 30000); }
function newEndless(seed, daily) {
  const L = { mode: daily ? 'daily' : 'endless', i: -1, w: 0, boss: false, sp: 5.6, bpm: 132, len: Infinity, obs: [], gaps: [], ci: 0, gi: 0,
    name: daily ? 'DÉFI DU JOUR' : 'ENDLESS', spAt: endlessSp, rng: rngOf(seed), gx: 0, last: null };
  L.gx = 4 * 5.6 * 3600 / 132;
  extendEndless(L, 2500);
  return L;
}
function extendEndless(L, upto) {
  let added = false;
  while (L.gx < upto) {
    const sp = endlessSp(L.gx), d = endlessD(L.gx), lvlEq = Math.min(99, 4 + d * 70);
    const c = chunkCtx(L.rng, sp, d, L.bpm);
    const type = pickChunk(L.rng, lvlEq, L.last);
    const res = CH[type](c.q(L.gx), c);
    for (const o of res.obs) L.obs.push(o);
    if (res.gaps) for (const g of res.gaps) L.gaps.push(g);
    L.gx = res.end + Math.max(lerp(3, 1.6, d) * c.B + L.rng() * c.B, c.R1 * .55);
    L.last = type; added = true;
  }
  if (added) {
    finalize(L);
  }
}
function pruneEndless(L, x) {
  const cut = x - 1500;
  let n = 0; while (n < L.obs.length && L.obs[n].x1 < cut) n++;
  if (n > 0) { L.obs.splice(0, n); L.ci = 0; }
  let m = 0; while (m < L.gaps.length && L.gaps[m].x + L.gaps[m].w < cut) m++;
  if (m > 0) { L.gaps.splice(0, m); L.gi = 0; }
}

// ── PHYSIQUE (pas fixe, déterministe) ────────────────────────────
function newPlayer(x) {
  return { x: x || 0, y: G - PR, vy: 0, air: 1, onG: true, coy: 0, buf: 0, rising: false, plat: -1, orbs: '' };
}
function clonePlayer(P) { return { x: P.x, y: P.y, vy: P.vy, air: P.air, onG: P.onG, coy: P.coy, buf: P.buf, rising: P.rising, plat: P.plat, orbs: P.orbs }; }

const mplY = (o, t) => tri(o.y + o.sp * t, o.mi, o.ma);
const msawY = (o, t) => o.y - o.amp * (.5 - .5 * Math.cos(t * o.fr + o.ph));

function inGap(L, x) {
  const g = L.gaps; let i = L.gi;
  while (i > 0 && g[i - 1].x + g[i - 1].w > x - 50) i--;
  while (i < g.length && g[i].x + g[i].w < x - 50) i++;
  L.gi = i;
  for (let k = i; k < g.length && g[k].x < x + 50; k++)
    if (x - PR * .6 >= g[k].x && x + PR * .6 <= g[k].x + g[k].w) return true;
  return false;
}

function spikeHit(o, x, y) {
  const n = Math.max(1, Math.round(o.w / 22)), sw = o.w / n;
  for (const dx of [-.55 * PR, -.25 * PR, 0, .25 * PR, .55 * PR]) {
    const px = x + dx;
    if (px < o.x || px > o.x + o.w) continue;
    const loc = ((px - o.x) % sw) / sw;
    const h = SPK_H * (1 - Math.abs(loc - .5) * 2);
    const bot = y + Math.sqrt(PR * PR - dx * dx) * .82;
    if (bot > G - h + 3) return true;
  }
  return false;
}

// Un pas de simulation. Renvoie '' | 'jump' | 'djump' | 'pad' | 'orb' | 'win' | 'die:<type>'
function step(L, P, t, press, down) {
  const sp = L.spAt(P.x);
  let ev = '';
  if (press) P.buf = BUFFER;
  if (P.buf > 0) {
    if (P.onG || P.coy > 0) { P.vy = -JV; P.onG = false; P.coy = 0; P.buf = 0; P.rising = true; P.plat = -1; ev = 'jump'; }
    else if (P.air > 0) { P.vy = -JV2; P.air--; P.buf = 0; P.rising = true; ev = 'djump'; }
    else P.buf--;
  }
  if (P.rising && !down && P.vy < 0) { P.vy *= JCUT; P.rising = false; }
  if (P.vy >= 0) P.rising = false;

  const prevB = P.y + PR, wasG = P.onG, wasPlat = P.plat;
  P.x += sp; P.vy = Math.min(P.vy + GRAV, MAXVY); P.y += P.vy;
  P.onG = false; P.plat = -1;

  // sol
  if (P.y + PR >= G && !inGap(L, P.x)) {
    if (prevB <= G + 1) { P.y = G - PR; P.vy = 0; P.onG = true; }
    else return 'die:edge';
  }

  // obstacles proches
  const O = L.obs;
  while (L.ci > 0 && O[L.ci - 1].x0 > P.x - 1400) L.ci--;
  while (L.ci < O.length && O[L.ci].x0 < P.x - 1400) L.ci++;
  for (let k = L.ci; k < O.length; k++) {
    const o = O[k];
    if (o.x0 > P.x + 60) break;
    if (o.x1 < P.x - 60) continue;
    switch (o.t) {
      case 'plt': case 'mpl': {
        if (P.x + PR * .7 > o.x && P.x - PR * .7 < o.x + o.w) {
          const py = o.t === 'mpl' ? mplY(o, t) : o.y, ppy = o.t === 'mpl' ? mplY(o, t - 1) : o.y;
          const b = P.y + PR;
          if (P.vy >= 0 && ((b >= py && prevB <= ppy + 2) || (wasPlat === k && b >= py - 6 && b <= py + 20))) {
            P.y = py - PR; P.vy = 0; P.onG = true; P.plat = k;
          }
        }
        break;
      }
      case 'spk': if (spikeHit(o, P.x, P.y)) return 'die:spk'; break;
      case 'saw': { const dx = P.x - o.x, dy = P.y - o.y; if (dx * dx + dy * dy < (PR + o.r - 9) ** 2) return 'die:saw'; break; }
      case 'msaw': { const dx = P.x - o.x, dy = P.y - msawY(o, t); if (dx * dx + dy * dy < (PR + o.r - 9) ** 2) return 'die:saw'; break; }
      case 'wal':
        if (P.x + PR * .8 > o.x && P.x - PR * .8 < o.x + WALL_W)
          if (!(P.y - PR * .85 >= o.gs && P.y + PR * .85 <= o.gs + o.gh)) return 'die:wal';
        break;
      case 'ceil':
        if (P.x + PR * .8 > o.x && P.x - PR * .8 < o.x + o.w && P.y - PR * .85 < G - o.cl) return 'die:ceil';
        break;
      case 'orb':
        if (P.air === 0 && !P.orbs.includes('|' + o.x + ';')) {
          const dx = P.x - o.x, dy = P.y - o.y;
          if (dx * dx + dy * dy < (PR + ORB_R) ** 2) { P.air = 1; P.orbs += '|' + o.x + ';'; ev = 'orb'; }
        }
        break;
    }
  }

  if (P.onG) {
    P.air = 1; P.coy = 0; P.rising = false;
    for (let k = L.ci; k < O.length && O[k].x0 < P.x + 30; k++) {
      const o = O[k];
      if (o.t === 'pad' && P.plat < 0 && P.x >= o.x - PR * .4 && P.x <= o.x + o.w + PR * .4) {
        P.vy = -PADV; P.onG = false; P.air = 1; P.rising = false; ev = 'pad';
      }
    }
  } else if (wasG && ev !== 'jump' && ev !== 'pad') P.coy = COYOTE;
  else if (P.coy > 0) P.coy--;

  if (P.y > G + 260) return 'die:gap';
  if (P.x >= L.len) return 'win';
  return ev;
}

if (typeof module !== 'undefined') module.exports = { VW, VH, G, PR, PX, METER, WORLDS, BOSS, UNLOCK, storyParams, genStory, newEndless, extendEndless, pruneEndless, endlessSp, newPlayer, clonePlayer, step, rngOf, hashStr, mplY, msawY };
