// ════════════════════════════════════════════════════════════════
//  AUDIO : séquenceur musical par monde + effets sonores
// ════════════════════════════════════════════════════════════════
const Snd = (() => {
  let ac = null, master, mus, sfx, noise, timer = 0;
  let seq = null; // { bpm, startT, step, nextT, pat }
  const S = { music: true, sfx: true, vol: .8 };

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ac = new AC();
      master = ac.createGain(); master.gain.value = S.vol; master.connect(ac.destination);
      mus = ac.createGain(); mus.gain.value = .55; mus.connect(master);
      sfx = ac.createGain(); sfx.gain.value = .9; sfx.connect(master);
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  // ── instruments ──
  function osc(dest, type, f1, f2, t, dur, vol, att = .004) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .02);
  }
  function nz(dest, t, dur, vol, hp, lp) {
    const s = ac.createBufferSource(); s.buffer = noise;
    const g = ac.createGain(); let n = s;
    if (hp) { const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; n.connect(f); n = f; }
    if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; n.connect(f); n = f; }
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(g); g.connect(dest); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  function bass(t, m, dur, vol) {
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = hz(m);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(160, t + dur); f.Q.value = 6;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(mus); o.start(t); o.stop(t + dur + .02);
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
    return { root: W.root, scale, prog, bassRh, arpShape, kickX, lead: r() < .5 ? 'square' : 'triangle', boss };
  }
  function noteOf(p, deg, oct) { const n = p.scale.length; const o = Math.floor(deg / n); return p.root + oct * 12 + o * 12 + p.scale[((deg % n) + n) % n]; }

  function playStep(i, t) {
    const p = seq.pat, s = i % 16, bar = Math.floor(i / 16), sd = 60 / seq.bpm / 4;
    const deg = p.prog[bar % p.prog.length];
    if (p.kickX[s]) osc(mus, 'sine', 150, 42, t, .32, .9);
    if (s === 4 || s === 12) nz(mus, t, .16, .35, 1200, 6000);
    if (s % 2 === 1) nz(mus, t, .05, .13, 7000);
    if (p.boss && s % 2 === 0) nz(mus, t, .03, .06, 9000);
    if (p.bassRh[s]) bass(t, noteOf(p, deg, -2), sd * 1.7, .32);
    if (bar >= 2) {
      const a = p.arpShape[s % 8];
      osc(mus, p.lead, hz(noteOf(p, deg + a, 0)), 0, t, sd * .9, .05, .002);
    }
    if (bar >= 4 && s % 8 === 0) osc(mus, 'triangle', hz(noteOf(p, deg + 4, 1)), 0, t, sd * 6, .035, .02);
  }
  function tick() {
    if (!seq || !ac) return;
    const sd = 60 / seq.bpm / 4;
    while (seq.nextT < ac.currentTime + .14) {
      if (seq.nextT >= ac.currentTime - .02) playStep(seq.step, seq.nextT);
      seq.step++; seq.nextT += sd;
    }
  }

  return {
    S,
    unlock() { ctx(); },
    setVol(v) { S.vol = v; if (master) master.gain.value = v; },
    start(seed, bpm, world, boss, offsetSec = 0) {
      this.stop();
      if (!S.music || !ctx()) return;
      const sd = 60 / bpm / 4, startT = ac.currentTime + .03 - offsetSec;
      const step = Math.max(0, Math.ceil(offsetSec / sd - 1e-6));
      seq = { bpm, startT, step, nextT: startT + step * sd, pat: makePattern(seed, world, boss) };
      mus.gain.cancelScheduledValues(ac.currentTime); mus.gain.setValueAtTime(.55, ac.currentTime);
      tick(); timer = setInterval(tick, 25);
    },
    stop() {
      clearInterval(timer); timer = 0;
      if (seq && ac) { mus.gain.cancelScheduledValues(ac.currentTime); mus.gain.setValueAtTime(mus.gain.value, ac.currentTime); mus.gain.linearRampToValueAtTime(0, ac.currentTime + .05); }
      seq = null;
    },
    playing() { return !!seq; },
    // ── effets ──
    sfx(name) {
      if (!S.sfx || !ctx()) return;
      const t = ac.currentTime;
      switch (name) {
        case 'jump': osc(sfx, 'sine', 300, 620, t, .12, .25); break;
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
