// ════════════════════════════════════════════════════════════════
//  AUDIO : musique par niveau + effets sonores
//  La boucle musicale (16 mesures) est calculée une fois hors ligne puis jouée
//  comme un seul son en boucle : aucun travail audio pendant le jeu.
// ════════════════════════════════════════════════════════════════
const Snd = (() => {
  let ac = null, master, mus, sfx, noise, timer = 0;
  let A = null, NZ = null;       // contexte et bruit utilisés par les instruments (temps réel ou hors ligne)
  let seq = null;                // séquenceur temps réel (secours si le rendu hors ligne est indisponible)
  let src = null, tok = 0, noOffline = false;
  const cache = new Map();       // clé -> { pr, buf }
  const BARS = 16, MUS_VOL = .55;
  const S = { music: true, sfx: true, vol: .8 };

  function mkNoise(c) {
    const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ac = new AC();
      master = ac.createGain(); master.gain.value = S.vol; master.connect(ac.destination);
      mus = ac.createGain(); mus.gain.value = MUS_VOL; mus.connect(master);
      sfx = ac.createGain(); sfx.gain.value = .9; sfx.connect(master);
      noise = mkNoise(ac); A = ac; NZ = noise;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  // ── instruments ──
  function osc(dest, type, f1, f2, t, dur, vol, att = .004) {
    const o = A.createOscillator(), g = A.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .02);
  }
  function nz(dest, t, dur, vol, hp, lp) {
    const s = A.createBufferSource(); s.buffer = NZ;
    const g = A.createGain(); let n = s;
    if (hp) { const f = A.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; n.connect(f); n = f; }
    if (lp) { const f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; n.connect(f); n = f; }
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(g); g.connect(dest); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  function bass(dest, t, m, dur, vol) {
    const o = A.createOscillator(), f = A.createBiquadFilter(), g = A.createGain();
    o.type = 'sawtooth'; o.frequency.value = hz(m);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(160, t + dur); f.Q.value = 6;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .02);
  }

  // ── motif musical déterministe par niveau ──
  function makePattern(seed, world, boss) {
    const r = rngOf(seed);
    const W = WORLDS[world] || WORLDS[0];
    const scale = W.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    const progs = W.minor ? [[0, 5, 3, 4], [0, 3, 5, 4], [0, 6, 5, 4], [0, 4, 5, 3]] : [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 4]];
    const prog = progs[Math.floor(r() * progs.length)];
    const bassRh = []; for (let i = 0; i < 16; i++) bassRh.push(i % 4 === 0 || (i % 2 === 0 && r() < .55) || (i % 4 === 3 && r() < .3));
    const arpShape = [0, 2, 4, 2, 4, 6, 4, 2].map(v => v + (r() < .3 ? 7 : 0));
    const kickX = []; for (let i = 0; i < 16; i++) kickX.push(i % 4 === 0 || (boss && i % 4 === 2) || (i === 14 && r() < .5));
    const lead = r() < .5 ? 'square' : 'triangle';
    // mélodie sur 2 mesures : notes longues sur les temps, quelques croches entre
    const mel = []; let cur = 4;
    for (let i = 0; i < 32; i++) {
      if (i % 4 === 0 || (i % 2 === 0 && r() < .45)) { cur = clamp(cur + Math.floor(r() * 5) - 2, 0, 9); mel.push(cur); } else mel.push(null);
    }
    return { root: W.root, scale, prog, bassRh, arpShape, kickX, lead, boss, mel };
  }
  function noteOf(p, deg, oct) { const n = p.scale.length; const o = Math.floor(deg / n); return p.root + oct * 12 + o * 12 + p.scale[((deg % n) + n) % n]; }

  function playStep(p, bpm, i, t, dest) {
    const s = i % 16, bar = Math.floor(i / 16), sd = 60 / bpm / 4;
    const deg = p.prog[bar % p.prog.length];
    if (p.kickX[s]) osc(dest, 'sine', 150, 42, t, .32, .9);
    if (s === 4 || s === 12) nz(dest, t, .16, .35, 1200, 6000);
    if (s % 2 === 1) nz(dest, t, .05, .13, 7000);
    if (p.boss && s % 2 === 0) nz(dest, t, .03, .06, 9000);
    if (p.bassRh[s]) bass(dest, t, noteOf(p, deg, -2), sd * 1.7, .32);
    // l'arpège joue dès la première mesure : on meurt souvent, l'intro doit déjà sonner plein
    osc(dest, p.lead, hz(noteOf(p, deg + p.arpShape[s % 8], 0)), 0, t, sd * .9, bar >= 1 ? .05 : .04, .002);
    if (s % 8 === 0) osc(dest, 'triangle', hz(noteOf(p, deg + 4, 1)), 0, t, sd * 6, .03, .02);
    // la mélodie entre après 2 mesures et monte d'une octave toutes les 8
    if (bar >= 2) { const m = p.mel[i % 32]; if (m !== null) osc(dest, 'sawtooth', hz(noteOf(p, deg + m, bar % 16 >= 8 ? 2 : 1)), 0, t, sd * 1.8, .028, .01); }
    // roulement de caisse claire à la fin de chaque phrase de 4 mesures
    if (bar % 4 === 3 && s >= 12) nz(dest, t, .08, .16 + (s - 12) * .05, 1500, 7000);
  }

  // ── rendu hors ligne de la boucle (par petits lots pour ne pas bloquer l'affichage) ──
  function render(seed, bpm, world, boss) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC || noOffline) return null;
    return new Promise((res, rej) => {
      let off, nb;
      const sr = ac.sampleRate, sd = 60 / bpm / 4, n = BARS * 16;
      try { off = new OAC(1, Math.ceil(n * sd * sr), sr); nb = mkNoise(off); } catch (e) { return rej(e); }
      const pat = makePattern(seed, world, boss);
      let i = 0;
      const chunk = () => {
        try {
          A = off; NZ = nb;
          const end = Math.min(n, i + 24);
          for (; i < end; i++) playStep(pat, bpm, i, i * sd, off.destination);
        } catch (e) { A = ac; NZ = noise; return rej(e); }
        A = ac; NZ = noise;
        if (i < n) return setTimeout(chunk, 0);
        try {
          off.oncomplete = e => res(e.renderedBuffer);
          const pr = off.startRendering(); if (pr && pr.then) pr.then(res, rej);
        } catch (e) { rej(e); }
      };
      chunk();
    });
  }
  function entry(seed, bpm, world, boss) {
    const key = [seed, bpm, world, boss ? 1 : 0].join('|');
    let e = cache.get(key);
    if (e) return e;
    const pr = render(seed, bpm, world, boss);
    if (!pr) return null;
    e = { pr, buf: null, key };
    cache.set(key, e);
    pr.then(buf => { e.buf = buf; for (const k of cache.keys()) { if (cache.size <= 3) break; if (k !== key) cache.delete(k); } },
      () => { cache.delete(key); noOffline = true; });
    return e;
  }

  // ── séquenceur temps réel (secours) ──
  function tick() {
    if (!seq || !ac) return;
    const sd = 60 / seq.bpm / 4;
    while (seq.nextT < ac.currentTime + .14) {
      if (seq.nextT >= ac.currentTime - .02) playStep(seq.pat, seq.bpm, seq.step, seq.nextT, mus);
      seq.step++; seq.nextT += sd;
    }
  }
  function live(seed, bpm, world, boss, offsetSec) {
    const sd = 60 / bpm / 4, startT = ac.currentTime + .03 - offsetSec;
    const step = Math.max(0, Math.ceil(offsetSec / sd - 1e-6));
    seq = { bpm, startT, step, nextT: startT + step * sd, pat: makePattern(seed, world, boss) };
    mus.gain.cancelScheduledValues(ac.currentTime); mus.gain.setValueAtTime(MUS_VOL, ac.currentTime);
    tick(); timer = setInterval(tick, 25);
  }

  return {
    S,
    unlock() { ctx(); },
    setVol(v) { S.vol = v; if (master) master.gain.value = v; },
    // Prépare la boucle d'un niveau à l'avance (pendant l'écran de fin du précédent)
    prepare(seed, bpm, world, boss) { if (S.music && ac) entry(seed, bpm, world, boss); },
    start(seed, bpm, world, boss, offsetSec = 0) {
      this.stop(true);
      if (!S.music || !ctx()) return;
      const my = ++tok, asked = ac.currentTime;
      const play = buf => {
        if (my !== tok || !S.music) return;
        const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(mus);
        mus.gain.cancelScheduledValues(ac.currentTime); mus.gain.setValueAtTime(MUS_VOL, ac.currentTime);
        s.start(0, (offsetSec + ac.currentTime - asked) % buf.duration); src = s;
      };
      const e = entry(seed, bpm, world, boss);
      if (!e) return live(seed, bpm, world, boss, offsetSec);
      if (e.buf) return play(e.buf);
      e.pr.then(play, () => { if (my === tok) live(seed, bpm, world, boss, offsetSec + ac.currentTime - asked); });
    },
    stop(now) {
      tok++;
      clearInterval(timer); timer = 0;
      if (!ac) { seq = null; return; }
      if (src) {
        const s = src; src = null;
        try { if (now) s.stop(); else { mus.gain.cancelScheduledValues(ac.currentTime); mus.gain.setValueAtTime(mus.gain.value, ac.currentTime); mus.gain.linearRampToValueAtTime(0, ac.currentTime + .05); s.stop(ac.currentTime + .07); } } catch (e) { }
      }
      if (seq) { mus.gain.cancelScheduledValues(ac.currentTime); mus.gain.setValueAtTime(mus.gain.value, ac.currentTime); mus.gain.linearRampToValueAtTime(0, ac.currentTime + .05); }
      seq = null;
    },
    playing() { return !!seq || !!src; },
    mode() { return src ? 'boucle' : seq ? 'direct' : ''; },
    // ── effets ──
    sfx(name) {
      if (!S.sfx || !ctx()) return;
      const t = ac.currentTime;
      switch (name) {
        case 'jump': { const v = 1 + (Math.random() - .5) * .08; osc(sfx, 'sine', 300 * v, 620 * v, t, .12, .25); break; }
        case 'coin': [1319, 1760, 2637].forEach((f, k) => osc(sfx, 'triangle', f, 0, t + k * .05, .22, .16)); break;
        case 'djump': osc(sfx, 'sine', 480, 980, t, .13, .22); osc(sfx, 'triangle', 720, 1400, t, .1, .08); break;
        case 'land': osc(sfx, 'sine', 160, 90, t, .07, .12); break;
        case 'die': osc(sfx, 'sawtooth', 380, 40, t, .38, .3); nz(sfx, t, .3, .35, 200, 3000); break;
        case 'orb': [880, 1320, 1760].forEach((f, k) => osc(sfx, 'sine', f, 0, t + k * .04, .2, .14)); break;
        case 'pad': osc(sfx, 'square', 200, 900, t, .25, .12); break;
        case 'cp': osc(sfx, 'triangle', 660, 990, t, .15, .14); break;
        case 'win': [[523, 659], [659, 784], [784, 1047], [1047, 1568]].forEach(([a, b], k) => osc(sfx, 'sine', a, b, t + k * .13, .3, .2)); break;
        case 'ach': [988, 1319, 1976].forEach((f, k) => osc(sfx, 'triangle', f, 0, t + k * .07, .35, .13)); break;
        case 'click': osc(sfx, 'sine', 700, 500, t, .05, .1); break;
        case 'star': osc(sfx, 'triangle', 1200, 1800, t, .18, .15); break;
      }
    },
  };
})();
