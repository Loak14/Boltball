// ════════════════════════════════════════════════════════════════
//  SKINS : rendu procédural (motif + couleurs + halo + traînée)
// ════════════════════════════════════════════════════════════════
const TAU = Math.PI * 2;

function ball(c, r, c1, c2, c3) {
  const g = c.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r);
  g.addColorStop(0, c1); g.addColorStop(.55, c2); g.addColorStop(1, c3);
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
}
function shine(c, r, a = .28) { c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.ellipse(-r * .32, -r * .38, r * .38, r * .2, -.6, 0, TAU); c.fill(); }
function clipBall(c, r) { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip(); }
function eyes(c, r, col, look = 0, angry = false) {
  for (const s of [-1, 1]) {
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(s * r * .34, -r * .12, r * .22, r * .27, 0, 0, TAU); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(s * r * .34 + r * .08 + look, -r * .08, r * .11, 0, TAU); c.fill();
    if (angry) { c.strokeStyle = '#000'; c.lineWidth = r * .1; c.beginPath(); c.moveTo(s * r * .58, -r * .5); c.lineTo(s * r * .14, -r * .34); c.stroke(); }
  }
}
function star(c, x, y, ro, ri, n) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, rr = i % 2 ? ri : ro; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}

// Chaque motif dessine la balle centrée en (0,0). spin = rotation de roulement.
const PAT = {
  grad(c, r, k) { ball(c, r, ...k.c); shine(c, r); },
  neon(c, r, k) {
    c.fillStyle = k.c[2]; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.shadowColor = k.c[0]; c.shadowBlur = r * .8; c.strokeStyle = k.c[0]; c.lineWidth = r * .18;
    c.beginPath(); c.arc(0, 0, r * .86, 0, TAU); c.stroke(); c.shadowBlur = 0;
    c.strokeStyle = k.c[1]; c.lineWidth = r * .07; c.beginPath(); c.arc(0, 0, r * .55, 0, TAU); c.stroke();
  },
  eyes(c, r, k, t) { ball(c, r, ...k.c); eyes(c, r, k.x || '#111', Math.sin(t * 2) * r * .05); },
  angry(c, r, k) { ball(c, r, ...k.c); eyes(c, r, '#111', 0, true); },
  cyclops(c, r, k, t) {
    ball(c, r, ...k.c);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -r * .05, r * .48, 0, TAU); c.fill();
    c.fillStyle = k.x || '#222'; c.beginPath(); c.arc(r * .14 + Math.sin(t * 1.7) * r * .06, 0, r * .24, 0, TAU); c.fill();
    c.fillStyle = '#000'; c.beginPath(); c.arc(r * .16 + Math.sin(t * 1.7) * r * .06, 0, r * .11, 0, TAU); c.fill();
  },
  smile(c, r, k) {
    ball(c, r, ...k.c);
    c.fillStyle = '#111'; c.beginPath(); c.arc(-r * .3, -r * .22, r * .1, 0, TAU); c.arc(r * .3, -r * .22, r * .1, 0, TAU); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = r * .1; c.lineCap = 'round'; c.beginPath(); c.arc(0, r * .02, r * .48, .35, Math.PI - .35); c.stroke();
  },
  stripes(c, r, k, t, spin) {
    c.save(); clipBall(c, r); c.rotate(spin); c.fillStyle = k.c[0]; c.fillRect(-r, -r, 2 * r, 2 * r);
    c.fillStyle = k.c[1]; for (let y = -r; y < r; y += r * .5) c.fillRect(-r, y, 2 * r, r * .25); c.restore(); shine(c, r, .22);
  },
  dots(c, r, k, t, spin) {
    c.save(); clipBall(c, r); c.rotate(spin); ball(c, r, k.c[0], k.c[0], k.c[2]);
    c.fillStyle = k.c[1]; for (const [x, y] of [[0, 0], [-.55, -.45], [.55, -.4], [-.5, .5], [.5, .52], [0, -.85], [0, .85]]) { c.beginPath(); c.arc(x * r, y * r, r * .17, 0, TAU); c.fill(); }
    c.restore(); shine(c, r, .25);
  },
  cross(c, r, k, t, spin) {
    ball(c, r, ...k.c); c.save(); c.rotate(spin); c.strokeStyle = k.x || '#fff'; c.lineWidth = r * .14;
    c.beginPath(); c.moveTo(-r * .6, 0); c.lineTo(r * .6, 0); c.moveTo(0, -r * .6); c.lineTo(0, r * .6); c.stroke(); c.restore();
    c.strokeStyle = k.x || '#fff'; c.lineWidth = r * .08; c.beginPath(); c.arc(0, 0, r * .92, 0, TAU); c.stroke();
  },
  medic(c, r, k) { ball(c, r, ...k.c); c.fillStyle = k.x || '#e22'; c.fillRect(-r * .14, -r * .5, r * .28, r); c.fillRect(-r * .5, -r * .14, r, r * .28); },
  galaxy(c, r, k, t) {
    ball(c, r, ...k.c);
    c.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 9; i++) { const a = i * 2.4 + t * (.6 + i * .05), rr = r * (.15 + i * .08); c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * .07, 0, TAU); c.fill(); }
  },
  saturn(c, r, k) {
    c.strokeStyle = k.x || k.c[0]; c.lineWidth = r * .14;
    c.beginPath(); c.ellipse(0, 0, r * 1.55, r * .45, -.35, Math.PI, TAU); c.stroke();
    ball(c, r, ...k.c); shine(c, r, .2);
    c.beginPath(); c.ellipse(0, 0, r * 1.55, r * .45, -.35, 0, Math.PI); c.stroke();
  },
  cracked(c, r, k, t, spin) {
    ball(c, r, ...k.c); c.save(); c.rotate(spin); c.strokeStyle = k.x || '#000'; c.lineWidth = r * .07;
    c.beginPath(); c.moveTo(-r * .2, -r * .95); c.lineTo(0, -r * .4); c.lineTo(-r * .25, -r * .1); c.lineTo(r * .15, r * .35); c.lineTo(0, r * .9);
    c.moveTo(0, -r * .4); c.lineTo(r * .45, -r * .55); c.moveTo(-r * .25, -r * .1); c.lineTo(-r * .7, r * .1); c.stroke(); c.restore();
  },
  bolt(c, r, k) {
    ball(c, r, ...k.c); c.fillStyle = k.x || '#fff';
    c.beginPath(); c.moveTo(r * .15, -r * .75); c.lineTo(-r * .4, r * .1); c.lineTo(-r * .02, r * .1); c.lineTo(-r * .18, r * .75); c.lineTo(r * .42, -r * .12); c.lineTo(r * .04, -r * .12); c.closePath(); c.fill();
  },
  eight(c, r, k, t, spin) {
    ball(c, r, ...k.c); c.save(); c.rotate(spin * .5); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r * .48, 0, TAU); c.fill();
    c.fillStyle = '#111'; c.font = `bold ${r * (String(k.x).length > 1 ? .5 : .62)}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(k.x, 0, r * .04); c.restore(); shine(c, r, .25);
  },
  soccer(c, r, k, t, spin) {
    c.save(); clipBall(c, r); ball(c, r, '#fff', '#eee', '#bbb'); c.rotate(spin); c.fillStyle = k.c[0] || '#111';
    star(c, 0, 0, r * .36, r * .3, 5); c.fill();
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - Math.PI / 2; star(c, Math.cos(a) * r * .95, Math.sin(a) * r * .95, r * .3, r * .25, 5); c.fill(); }
    c.restore();
  },
  basket(c, r, k, t, spin) {
    ball(c, r, ...k.c); c.save(); clipBall(c, r); c.rotate(spin); c.strokeStyle = '#222'; c.lineWidth = r * .07;
    c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
    c.beginPath(); c.arc(-r * 1.1, 0, r * .8, -1, 1); c.stroke(); c.beginPath(); c.arc(r * 1.1, 0, r * .8, Math.PI - 1, Math.PI + 1); c.stroke(); c.restore();
  },
  tennis(c, r, k, t, spin) {
    ball(c, r, ...k.c); c.save(); clipBall(c, r); c.rotate(spin); c.strokeStyle = '#fff'; c.lineWidth = r * .1;
    c.beginPath(); c.arc(-r * 1.15, 0, r * .85, -1.2, 1.2); c.stroke(); c.beginPath(); c.arc(r * 1.15, 0, r * .85, Math.PI - 1.2, Math.PI + 1.2); c.stroke(); c.restore();
  },
  checker(c, r, k, t, spin) {
    c.save(); clipBall(c, r); c.rotate(spin); const s = r * .5;
    for (let y = -2; y < 2; y++) for (let x = -2; x < 2; x++) { c.fillStyle = (x + y) & 1 ? k.c[0] : k.c[1]; c.fillRect(x * s, y * s, s, s); }
    c.restore(); shine(c, r, .2);
  },
  brick(c, r, k, t, spin) {
    c.save(); clipBall(c, r); c.rotate(spin); c.fillStyle = k.c[1]; c.fillRect(-r, -r, 2 * r, 2 * r); c.fillStyle = k.c[0];
    const h = r * .4; for (let row = 0; row < 6; row++) for (let col = -1; col < 4; col++) c.fillRect(-r + col * r * .7 + (row % 2) * r * .35 + 1, -r + row * h + 1, r * .7 - 2, h - 2);
    c.restore();
  },
  split(c, r, k, t, spin) {
    c.save(); c.rotate(spin); c.fillStyle = k.c[0]; c.beginPath(); c.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5); c.fill();
    c.fillStyle = k.c[1]; c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); c.fill(); c.restore(); shine(c, r, .22);
  },
  yinyang(c, r, k, t, spin) {
    c.save(); c.rotate(spin); c.fillStyle = k.c[0]; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.fillStyle = k.c[1]; c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); c.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); c.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2); c.fill();
    c.fillStyle = k.c[1]; c.beginPath(); c.arc(0, r / 2, r * .14, 0, TAU); c.fill(); c.fillStyle = k.c[0]; c.beginPath(); c.arc(0, -r / 2, r * .14, 0, TAU); c.fill(); c.restore();
  },
  rainbow(c, r, k, t) {
    for (let i = 0; i < 12; i++) { c.fillStyle = `hsl(${i * 30 + t * 120},100%,${k.x || 58}%)`; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, i * TAU / 12, (i + 1) * TAU / 12 + .02); c.fill(); }
    shine(c, r, .3);
  },
  pulse(c, r, k, t) {
    const p = .5 + .5 * Math.sin(t * 6);
    c.fillStyle = k.g || k.c[0]; c.globalAlpha = .25 + .25 * p; c.beginPath(); c.arc(0, 0, r * (1.2 + .25 * p), 0, TAU); c.fill(); c.globalAlpha = 1;
    ball(c, r, ...k.c); shine(c, r, .35);
  },
  ghost(c, r, k, t) {
    c.globalAlpha = .62 + .2 * Math.sin(t * 3); ball(c, r, ...k.c); c.globalAlpha = 1;
    c.fillStyle = k.x || '#2a1550'; c.beginPath(); c.ellipse(-r * .3, -r * .15, r * .14, r * .2, 0, 0, TAU); c.ellipse(r * .3, -r * .15, r * .14, r * .2, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0, r * .32, r * .14, r * .17, 0, 0, TAU); c.fill();
  },
  skull(c, r, k) {
    ball(c, r, ...k.c); c.fillStyle = k.x || '#111';
    c.beginPath(); c.ellipse(-r * .32, -r * .1, r * .2, r * .24, 0, 0, TAU); c.ellipse(r * .32, -r * .1, r * .2, r * .24, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(0, r * .12); c.lineTo(-r * .1, r * .32); c.lineTo(r * .1, r * .32); c.fill();
    for (let i = -2; i <= 2; i++) c.fillRect(i * r * .15 - r * .05, r * .5, r * .1, r * .22);
  },
  bandage(c, r, k, t, spin) {
    ball(c, r, ...k.c); c.save(); c.rotate(spin + .6); c.fillStyle = k.x || '#f3e3c3';
    c.fillRect(-r * .7, -r * .16, r * 1.4, r * .32); c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(i * r * .2, 0, r * .04, 0, TAU); c.fill(); }
    c.restore();
  },
  target(c, r, k) {
    for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? k.c[1] : k.c[0]; c.beginPath(); c.arc(0, 0, r * (1 - i * .2), 0, TAU); c.fill(); }
    shine(c, r, .2);
  },
  spiral(c, r, k, t) {
    ball(c, r, k.c[0], k.c[0], k.c[2]); c.strokeStyle = k.c[1]; c.lineWidth = r * .14; c.beginPath();
    for (let a = 0; a < 14; a += .2) { const rr = a / 14 * r * .95; c.lineTo(Math.cos(a - t * 4) * rr, Math.sin(a - t * 4) * rr); } c.stroke();
  },
  gem(c, r, k, t, spin) {
    c.save(); c.rotate(spin * .3); const n = 8;
    c.fillStyle = k.c[2]; c.beginPath(); for (let i = 0; i < n; i++) { const a = i * TAU / n; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill();
    for (let i = 0; i < n; i++) { const a = i * TAU / n, b = (i + 1) * TAU / n; c.fillStyle = i % 2 ? k.c[0] : k.c[1]; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); c.lineTo(Math.cos(b) * r, Math.sin(b) * r); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); for (let i = 0; i < n; i++) { const a = i * TAU / n; c.lineTo(Math.cos(a) * r * .45, Math.sin(a) * r * .45); } c.fill(); c.restore();
  },
  sun(c, r, k, t) {
    c.fillStyle = k.c[1]; c.save(); c.rotate(t * .8); star(c, 0, 0, r * 1.25, r * .8, 12); c.fill(); c.restore();
    ball(c, r * .82, ...k.c);
  },
  moon(c, r, k) {
    ball(c, r, ...k.c); c.fillStyle = 'rgba(0,0,0,.18)';
    for (const [x, y, s] of [[-.3, -.25, .2], [.35, .1, .14], [-.1, .45, .12], [.2, -.5, .09]]) { c.beginPath(); c.arc(x * r, y * r, s * r, 0, TAU); c.fill(); }
  },
  crescent(c, r, k) {
    ball(c, r, ...k.c); c.fillStyle = k.x || '#0a0a20'; c.beginPath(); c.arc(r * .38, -r * .2, r * .82, 0, TAU); c.fill();
  },
  planet(c, r, k, t, spin) {
    ball(c, r, ...k.c); c.save(); clipBall(c, r); c.rotate(spin * .4); c.fillStyle = k.x || '#3fae4a';
    for (const [x, y, a, b] of [[-.4, -.3, .45, .3], [.45, .2, .35, .45], [-.2, .55, .4, .2], [.5, -.6, .25, .15]]) { c.beginPath(); c.ellipse(x * r, y * r, a * r, b * r, .4, 0, TAU); c.fill(); }
    c.restore(); shine(c, r, .2);
  },
  cog(c, r, k, t, spin) {
    c.save(); c.rotate(spin); c.fillStyle = k.c[1];
    c.beginPath(); for (let i = 0; i < 20; i++) { const a = i * TAU / 20, rr = i % 2 ? r * .82 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.fill();
    ball(c, r * .7, ...k.c); c.fillStyle = k.c[2]; c.beginPath(); c.arc(0, 0, r * .25, 0, TAU); c.fill(); c.restore();
  },
  saw(c, r, k, t, spin) {
    c.save(); c.rotate(spin * 2); c.fillStyle = k.c[1];
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(Math.cos(a) * r * .7, Math.sin(a) * r * .7); c.lineTo(Math.cos(a + .26) * r * 1.08, Math.sin(a + .26) * r * 1.08); c.lineTo(Math.cos(a + .52) * r * .7, Math.sin(a + .52) * r * .7); c.fill(); }
    ball(c, r * .78, ...k.c); c.restore();
  },
  spiky(c, r, k, t, spin) {
    c.save(); c.rotate(spin); c.fillStyle = k.c[1]; star(c, 0, 0, r * 1.18, r * .78, 10); c.fill(); c.restore();
    ball(c, r * .8, ...k.c); eyes(c, r * .8, '#111');
  },
  disco(c, r, k, t) {
    ball(c, r, '#ddd', '#999', '#555'); c.save(); clipBall(c, r); const s = r * .32;
    for (let y = -r; y < r; y += s) for (let x = -r; x < r; x += s) { c.fillStyle = `hsla(${(x * 3 + y * 5 + t * 200) % 360},90%,${60 + ((x + y) * 7 % 30)}%,.75)`; c.fillRect(x + 1, y + 1, s - 2, s - 2); }
    c.restore();
  },
  heart(c, r, k, t) {
    ball(c, r, ...k.c); const s = 1 + .08 * Math.sin(t * 8); c.save(); c.scale(s, s); c.fillStyle = k.x || '#fff';
    c.beginPath(); c.moveTo(0, r * .5); c.bezierCurveTo(-r * .9, -r * .1, -r * .35, -r * .75, 0, -r * .3); c.bezierCurveTo(r * .35, -r * .75, r * .9, -r * .1, 0, r * .5); c.fill(); c.restore();
  },
  broken(c, r, k) {
    PAT.heart(c, r, k, 0); c.strokeStyle = k.c[2]; c.lineWidth = r * .1;
    c.beginPath(); c.moveTo(0, -r * .3); c.lineTo(-r * .12, -r * .05); c.lineTo(r * .1, r * .12); c.lineTo(0, r * .45); c.stroke();
  },
  clock(c, r, k, t) {
    ball(c, r, ...k.c); c.strokeStyle = k.x || '#111'; c.lineWidth = r * .1; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, r * .82, 0, TAU); c.stroke();
    const sp = k.fast ? 8 : 1;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t * sp - 1.57) * r * .6, Math.sin(t * sp - 1.57) * r * .6); c.moveTo(0, 0); c.lineTo(Math.cos(t * sp / 12 - 1.57) * r * .38, Math.sin(t * sp / 12 - 1.57) * r * .38); c.stroke();
  },
  zombie(c, r, k, t, spin) {
    ball(c, r, ...k.c); c.save(); c.rotate(spin * .3); c.strokeStyle = '#222'; c.lineWidth = r * .07;
    c.beginPath(); c.moveTo(-r * .7, r * .1); c.lineTo(r * .2, -r * .65); c.stroke();
    for (let i = 0; i < 4; i++) { const u = i / 3, x = lerp(-r * .6, r * .1, u), y = lerp(0, -r * .55, u); c.beginPath(); c.moveTo(x - r * .1, y - r * .1); c.lineTo(x + r * .1, y + r * .1); c.stroke(); }
    c.restore(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-r * .3, r * .1, r * .17, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(r * .32, r * .05, r * .12, 0, TAU); c.fill();
  },
  pixel(c, r, k, t) {
    const s = r / 4;
    for (let y = -4; y < 4; y++) for (let x = -4; x < 4; x++) {
      const cx = (x + .5) * s, cy = (y + .5) * s; if (cx * cx + cy * cy > r * r * .95) continue;
      c.fillStyle = [k.c[0], k.c[1], k.c[2]][((x * x * 3 + y * 5 + x * y + 99) >>> 0) % 3]; c.fillRect(x * s, y * s, s + .5, s + .5);
    }
  },
  glitch(c, r, k, t) {
    const j = Math.sin(t * 37) > .7 ? r * .25 : r * .08;
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgba(255,0,80,.7)'; c.beginPath(); c.arc(-j, 0, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(0,255,220,.7)'; c.beginPath(); c.arc(j, 0, r, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over'; c.fillStyle = k.c[2]; c.beginPath(); c.arc(0, 0, r * .7, 0, TAU); c.fill();
    c.fillStyle = k.c[0]; c.fillRect(-r, Math.sin(t * 13) * r * .6, 2 * r, r * .12);
  },
  void(c, r, k, t) {
    c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = k.c[0]; c.lineWidth = r * .1; c.shadowColor = k.c[0]; c.shadowBlur = r * .6; c.beginPath(); c.arc(0, 0, r * .95, 0, TAU); c.stroke(); c.shadowBlur = 0;
    c.fillStyle = k.c[1]; for (let i = 0; i < 7; i++) { const a = i * 1.9 + t * .3, rr = r * (.2 + (i * .37 % .6)); c.fillRect(Math.cos(a) * rr, Math.sin(a) * rr, r * .07, r * .07); }
  },
  fire(c, r, k, t) {
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .35, l = r * (1.35 + .3 * Math.sin(t * 12 + i * 1.7)); c.fillStyle = i % 2 ? k.c[1] : k.c[0]; c.beginPath(); c.moveTo(Math.cos(a - .3) * r * .8, Math.sin(a - .3) * r * .8); c.lineTo(Math.cos(a) * l - r * .3, Math.sin(a) * l); c.lineTo(Math.cos(a + .3) * r * .8, Math.sin(a + .3) * r * .8); c.fill(); }
    ball(c, r, ...k.c); shine(c, r, .3);
  },
  ice(c, r, k, t, spin) {
    ball(c, r, ...k.c); c.save(); c.rotate(spin * .3); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = r * .08;
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * .75, Math.sin(a) * r * .75); c.moveTo(Math.cos(a) * r * .45, Math.sin(a) * r * .45); c.lineTo(Math.cos(a + .4) * r * .6, Math.sin(a + .4) * r * .6); c.stroke(); }
    c.restore();
  },
  plasma(c, r, k, t) {
    ball(c, r, k.c[2], k.c[2], '#000'); c.save(); clipBall(c, r); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const g = c.createRadialGradient(Math.cos(t * 2 + i * 1.6) * r * .5, Math.sin(t * 2.6 + i) * r * .5, 0, Math.cos(t * 2 + i * 1.6) * r * .5, Math.sin(t * 2.6 + i) * r * .5, r * .8); g.addColorStop(0, i % 2 ? k.c[0] : k.c[1]); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r); }
    c.restore(); c.globalCompositeOperation = 'source-over';
  },
  crown(c, r, k) {
    ball(c, r, ...k.c); c.fillStyle = k.x || '#fff6b0';
    c.beginPath(); c.moveTo(-r * .55, r * .25); c.lineTo(-r * .55, -r * .3); c.lineTo(-r * .28, 0); c.lineTo(0, -r * .45); c.lineTo(r * .28, 0); c.lineTo(r * .55, -r * .3); c.lineTo(r * .55, r * .25); c.fill();
    c.fillStyle = '#e33'; c.beginPath(); c.arc(0, r * .08, r * .08, 0, TAU); c.fill(); shine(c, r, .3);
  },
  radar(c, r, k, t) {
    ball(c, r, ...k.c); c.strokeStyle = k.x || '#39ff9a'; c.lineWidth = r * .06;
    for (const f of [.35, .7]) { c.beginPath(); c.arc(0, 0, r * f, 0, TAU); c.stroke(); }
    const a = t * 3; c.fillStyle = 'rgba(57,255,154,.35)'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, a, a + .7); c.fill();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a + .7) * r, Math.sin(a + .7) * r); c.stroke();
  },
  atom(c, r, k, t) {
    ball(c, r * .45, ...k.c); c.strokeStyle = k.x || k.c[0]; c.lineWidth = r * .07;
    for (let i = 0; i < 3; i++) { c.save(); c.rotate(i * Math.PI / 3); c.beginPath(); c.ellipse(0, 0, r, r * .35, 0, 0, TAU); c.stroke(); const a = t * 4 + i * 2; c.fillStyle = '#fff'; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r * .35, r * .1, 0, TAU); c.fill(); c.restore(); }
  },
  wheel(c, r, k, t, spin) {
    c.fillStyle = '#151515'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.save(); c.rotate(spin); ball(c, r * .6, ...k.c); c.strokeStyle = '#333'; c.lineWidth = r * .1;
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * .58, Math.sin(a) * r * .58); c.stroke(); }
    c.restore();
  },
  stitch(c, r, k, t, spin) {
    ball(c, r, ...k.c); c.save(); c.rotate(spin); c.strokeStyle = k.x || '#fff'; c.lineWidth = r * .06;
    c.beginPath(); c.arc(0, 0, r * .7, 0, TAU); c.stroke(); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(Math.cos(a) * r * .6, Math.sin(a) * r * .6); c.lineTo(Math.cos(a) * r * .8, Math.sin(a) * r * .8); c.stroke(); }
    c.restore();
  },
};

function drawSkin(c, sk, r, t, spin) {
  if (sk.g) {
    const g = c.createRadialGradient(0, 0, r * .3, 0, 0, r * 2.1);
    g.addColorStop(0, sk.g); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 2.1, 0, TAU); c.fill();
  }
  c.save();
  (PAT[sk.p] || PAT.grad)(c, r, sk, t, spin);
  c.restore();
}
function trailColor(sk, i, t) {
  switch (sk.tr) {
    case 'rainbow': return `hsl(${(i * 25 + t * 200) % 360},100%,60%)`;
    case 'fire': return i % 2 ? '#ffcc33' : '#ff4400';
    case 'ice': return '#bff4ff';
    case 'dark': return '#000';
    case 'gold': return '#ffd84a';
    default: return sk.tc || sk.c[1];
  }
}
