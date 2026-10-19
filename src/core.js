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

// Niveau d'apparition de chaque type de passage (tout est disponible dès le chapitre 3)
const UNLOCK = { spk: 0, gap: 0, spk2: 0, spkL: 1, sawrow: 2, plt: 2, saw: 3, gap2: 3, islands: 4, wal: 5, combo: 5, stairs: 7, wal2: 9, mpl: 10, fsaw: 11, pad: 12, combo3: 13, orb: 15, msaw: 16, ceil: 18, zig: 19, bed: 20 };
const NEWSIGN = {
  spkL: 'LONGUES PIQUES : DOUBLE SAUT', sawrow: 'SCIES EN SÉRIE', plt: 'PLATEFORME : POSE-TOI DESSUS', saw: 'SCIE : SAUTE PAR-DESSUS',
  gap2: 'GRAND TROU : DOUBLE SAUT', islands: 'ÎLOTS : ATTERRIS PILE', wal: 'MUR : PASSE PAR L’OUVERTURE', stairs: 'ESCALIER', wal2: 'DOUBLE MUR',
  mpl: 'PLATEFORME MOBILE', fsaw: 'SCIE HAUTE : NE SAUTE PAS', pad: 'TREMPLIN : LAISSE-TOI PORTER', orb: 'ORBE : RECHARGE TON DOUBLE SAUT',
  msaw: 'SCIE MOBILE : TROUVE LE TEMPO', ceil: 'PLAFOND BAS : RESTE AU SOL', zig: 'PLAFOND + PIQUES', bed: 'LIT DE PIQUES',
};

// Mode hardcore : départ déjà nerveux, gros palier après chaque boss, boss long et brutal
const CH_D = [.3, .55, .7, .8, .86, .9, .93, .96, .98, 1];
function storyParams(i) {
  const w = Math.floor(i / 10), k = i % 10, boss = k === 9;
  let d = CH_D[w] + k * .02;
  let rest = Math.max(.15, .9 * Math.pow(.72, w) - k * .04);
  let sp = 6.2 + w * .32 + k * .03;
  let dur = 13 + w * 1.4 + k * .3;
  if (boss) { d += .15; rest *= .5; sp += .4; dur = Math.min(60, dur * 2.6); }
  const name = boss ? BOSS[w] : `${w + 1}-${k + 1}`;
  return { mode: 'story', i, w, boss, d: clamp(d, 0, 1), rest, sp: +sp.toFixed(2), bpm: WORLDS[w].bpm, dur, name, lvlEq: i, comboW: (.8 + w * .4) * (boss ? 2.2 : 1) };
}

// ── PASSAGES (chunks) ────────────────────────────────────────────
// c = { sp, d, R1 (portée d'un saut simple), B (unités par temps), r (aléatoire), q (quantification) }
const CH = {
  spk(x, c) {
    const n = Math.max(2, Math.round(c.R1 * lerp(.15, .7, c.d * (.3 + .7 * c.r())) / 22));
    return { obs: [{ t: 'spk', x, w: n * 22 }], end: x + n * 22 };
  },
  spkL(x, c) {
    const n = Math.max(6, Math.round(c.R1 * lerp(.85, 1.3, c.d * c.r()) / 22));
    return { obs: [{ t: 'spk', x, w: n * 22 }], end: x + n * 22 };
  },
  sawrow(x, c) {
    const n = 2 + Math.floor(c.r() * (1 + c.d * 2.5)), ob = []; let cx = x;
    for (let k = 0; k < n; k++) { const s = CH.saw(cx, c); ob.push(...s.obs); cx = c.q(s.end + c.R1 * lerp(.75, .5, c.d)); }
    return { obs: ob, end: ob[ob.length - 1].x + ob[ob.length - 1].r };
  },
  islands(x, c) {
    const n = 2 + Math.floor(c.r() * (1 + c.d * 2)), gaps = []; let cx = x;
    for (let k = 0; k < n; k++) { const w = Math.round(c.R1 * lerp(.35, .6, c.d * c.r())); gaps.push({ x: cx, w }); cx += w + Math.round(lerp(90, 46, c.d)); }
    return { obs: [], gaps, end: cx - Math.round(lerp(90, 46, c.d)) };
  },
  stairs(x, c) {
    const n = 3 + Math.floor(c.r() * 2), pw = Math.round(lerp(110, 80, c.d)), step = Math.round(c.R1 * lerp(.62, .72, c.d));
    const ob = [], W = step * n + pw;
    ob.push({ t: 'spk', x, w: Math.floor(W / 22) * 22 });
    for (let k = 0; k < n; k++) ob.push({ t: 'plt', x: Math.round(x + step * (k + .5)), y: G - Math.min(150, 55 + k * 30), w: pw, h: 14 });
    return { obs: ob, end: x + Math.floor(W / 22) * 22 };
  },
  wal2(x, c) {
    const a = CH.wal(x, c), b = CH.wal(c.q(x + c.R1 * lerp(.85, .6, c.d)), c);
    return { obs: a.obs.concat(b.obs), end: b.end };
  },
  zig(x, c) {
    const s1 = CH.spk(x, c), cl = CH.ceil(c.q(s1.end + c.R1 * .35), c);
    return { obs: s1.obs.concat(cl.obs), end: cl.end };
  },
  gap(x, c) {
    const w = Math.round(c.R1 * lerp(.3, .62, c.d * (.4 + .6 * c.r())));
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
    return { obs: [{ t: 'wal', x, gs: G - L - gh, gh }], end: Math.round(x + WALL_W + (L > 0 ? c.R1 * .3 : 0)) };
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
    return { obs: [{ t: 'pad', x, w: pw }, { t: 'wal', x: wx, gs: Math.round(ay - gh / 2), gh }], end: Math.round(wx + WALL_W + c.sp * 22) };
  },
  orb(x, c) {
    const w = Math.round(c.R1 * lerp(1.55, 1.85, c.d * c.r()));
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
  combo3(x, c) {
    const a = CH.combo(x, c);
    const b = CH.combo(c.q(a.end + Math.max(c.B * 1.2, c.R1 * .8)), c);
    return { obs: a.obs.concat(b.obs), gaps: (a.gaps || []).concat(b.gaps || []), end: b.end };
  },
  combo(x, c) {
    const pool = ['spk', 'gap', 'saw', 'wal', 'msaw', 'fsaw', 'gap2', 'ceil', 'spkL', 'sawrow', 'islands', 'plt', 'mpl'].filter(t => !c.unl || c.unl.includes(t));
    const a = CH[pool[Math.floor(c.r() * pool.length)]](x, c);
    const b = CH[pool[Math.floor(c.r() * pool.length)]](c.q(a.end + Math.max(c.B * lerp(1.5, .9, c.d), c.R1 * lerp(.9, .55, c.d))), c);
    return { obs: a.obs.concat(b.obs), gaps: (a.gaps || []).concat(b.gaps || []), end: b.end };
  },
};

function pickChunk(rng, lvlEq, last, comboW) {
  const types = Object.keys(UNLOCK).filter(t => UNLOCK[t] <= lvlEq);
  const ws = types.map(t => {
    let w = 1;
    if (t === 'spk' || t === 'gap') w = lvlEq < 10 ? 1.6 : .8;
    if (lvlEq - UNLOCK[t] < 4 && UNLOCK[t] > 0) w = 2.4;
    if ((t === 'combo' || t === 'combo3') && comboW) w = comboW;
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
  let c = chunkCtx(rng, p.sp, p.d, p.bpm);
  c.unl = Object.keys(UNLOCK).filter(t => UNLOCK[t] <= i);
  const len = Math.round(p.sp * 60 * p.dur);
  const L = { ...p, len, obs: [], gaps: [] };
  // Boss : la seconde moitié accélère de 12 %
  L.spAt = p.boss ? (x => x > len / 2 ? p.sp * 1.12 : p.sp) : (() => p.sp);
  let phase2 = false;
  let x = c.q(c.B * 4), last = null, first = true;
  const fresh = Object.keys(NEWSIGN).find(t => UNLOCK[t] === i);
  if (i === 0) L.obs.push({ t: 'sign', x: 60, txt: 'TAPE OU ESPACE : SAUT' });
  if (i === 1) L.obs.push({ t: 'sign', x: 60, txt: 'MAINTIENS : SAUT PLUS HAUT' });
  if (i === 2) L.obs.push({ t: 'sign', x: 60, txt: 'RE-TAPE EN L’AIR : DOUBLE SAUT' });
  while (x < len - c.B * 4) {
    let type = first && fresh ? fresh : pickChunk(rng, p.lvlEq, last, p.comboW);
    if (first && fresh) L.obs.push({ t: 'sign', x: Math.round(x - c.B * 2.5), txt: NEWSIGN[fresh] });
    const res = CH[type](x, c);
    if (res.end > len - c.B * 2) break;
    L.obs.push(...res.obs); if (res.gaps) L.gaps.push(...res.gaps);
    if (p.boss && !phase2 && x > len / 2) { phase2 = true; const u = c.unl; c = chunkCtx(rng, p.sp * 1.12, Math.min(1, p.d + .05), p.bpm); c.unl = u; }
    const rest = p.rest * (1 + rng() * .45);
    x = c.q(res.end + Math.max(rest * c.B, c.R1 * Math.max(.28, .45 - p.w * .03)));
    last = type; first = false;
  }
  return finalize(L);
}

// ── ENDLESS (flux infini) ────────────────────────────────────────
function endlessSp(x) { return 6.5 + 2.6 * Math.min(1, x / 40000) + 1 * clamp((x - 40000) / 60000, 0, 1); }
function endlessD(x) { return Math.min(1, .25 + x / 25000); }
function newEndless(seed, daily) {
  const L = { mode: daily ? 'daily' : 'endless', i: -1, w: 0, boss: false, sp: 6.5, bpm: 132, len: Infinity, obs: [], gaps: [], ci: 0, gi: 0,
    name: daily ? 'DÉFI DU JOUR' : 'ENDLESS', spAt: endlessSp, rng: rngOf(seed), gx: 0, last: null };
  L.gx = 3 * 6.5 * 3600 / 132;
  extendEndless(L, 2500);
  return L;
}
function extendEndless(L, upto) {
  let added = false;
  while (L.gx < upto) {
    const sp = endlessSp(L.gx), d = endlessD(L.gx), lvlEq = Math.min(99, 2 + d * 25);
    const c = chunkCtx(L.rng, sp, d, L.bpm);
    c.unl = Object.keys(UNLOCK).filter(t => UNLOCK[t] <= lvlEq);
    const type = pickChunk(L.rng, lvlEq, L.last, .8 + d * 2.5);
    const res = CH[type](c.q(L.gx), c);
    for (const o of res.obs) L.obs.push(o);
    if (res.gaps) for (const g of res.gaps) L.gaps.push(g);
    L.gx = res.end + Math.max(lerp(1.1, .25, d) * c.B * (1 + L.rng() * .5), c.R1 * lerp(.45, .3, d));
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
