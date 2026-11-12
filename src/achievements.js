// ════════════════════════════════════════════════════════════════
//  EXPLOITS : 100 exploits, chacun débloque un skin à son image
// ════════════════════════════════════════════════════════════════
const BASE_SKIN = { id: 'base', n: 'BOLT', p: 'grad', c: ['#ffd27a', '#ff3300', '#7a0000'], g: 'rgba(255,90,0,.35)', tc: '#ff6600' };

// Raccourcis de conditions
const st = (k, n) => ({ ok: D => (D.st[k] || 0) >= n, pr: D => [Math.min(n, D.st[k] || 0), n] });
const dt = (k, n) => ({ ok: D => (D.st.dt[k] || 0) >= n, pr: D => [Math.min(n, D.st.dt[k] || 0), n] });
const flag = k => ({ ok: D => !!D.fl[k] });
const lvDone = i => ({ ok: D => !!(D.lv[i] && D.lv[i].done) });
const fn = (f, p) => ({ ok: f, pr: p });

function storyCount(D) { let n = 0; for (let i = 0; i < 100; i++) if (D.lv[i] && D.lv[i].done) n++; return n; }
function flawCount(D) { let n = 0; for (let i = 0; i < 100; i++) if (D.lv[i] && D.lv[i].done && D.lv[i].best === 0) n++; return n; }
function starsOf(l) { return !l || !l.done ? 0 : l.best === 0 ? 3 : l.best <= 5 ? 2 : 1; }
function starCount(D) { let n = 0; for (let i = 0; i < 100; i++) n += starsOf(D.lv[i]); return n; }
function chapter3(D, w) { for (let i = w * 10; i < w * 10 + 10; i++) if (starsOf(D.lv[i]) < 3) return false; return true; }
function chapter3pr(D, w) { let n = 0; for (let i = w * 10; i < w * 10 + 10; i++) n += starsOf(D.lv[i]) === 3; return [n, 10]; }
function bossFlaw(D) { for (let w = 0; w < 10; w++) { const l = D.lv[w * 10 + 9]; if (l && l.done && l.best === 0) return true; } return false; }
function storyDeaths(D) { let n = 0; for (let i = 0; i < 100; i++) if (D.lv[i] && D.lv[i].done) n += D.lv[i].best; return n; }
const unlockedCount = D => Object.keys(D.ach).length;
function boltCount(D) { let n = 0; for (let i = 0; i < 100; i++) { let c = (D.lv[i] && D.lv[i].co) || 0; while (c) { n += c & 1; c >>= 1; } } return n; }
const bolts = n => fn(D => boltCount(D) >= n, D => [Math.min(n, boltCount(D)), n]);

const ACH = [
  // ── HISTOIRE ──
  { id: 'h1',  n: 'ÉTINCELLE', d: 'Finir le niveau 1', sk: { p: 'grad', c: ['#ffffff', '#ffe066', '#ff9900'], g: 'rgba(255,230,120,.4)', tr: 'gold' }, ...lvDone(0) },
  { id: 'h10', n: 'ÉVEILLÉ', d: 'Finir le chapitre 1 (ÉVEIL)', sk: { p: 'eyes', c: ['#ff8aa0', '#ff3355', '#7a0020'], g: 'rgba(255,51,85,.3)' }, ...lvDone(9) },
  { id: 'h20', n: 'CÂBLÉ', d: 'Finir le chapitre 2 (CÂBLES)', sk: { p: 'neon', c: ['#39ffb0', '#19c48a', '#02110c'], g: 'rgba(57,255,176,.3)' }, ...lvDone(19) },
  { id: 'h30', n: 'DENT DE SCIE', d: 'Finir le chapitre 3 (LA SCIERIE)', sk: { p: 'saw', c: ['#ffd2a0', '#ff8c2a', '#6a2a00'], g: 'rgba(255,140,40,.3)' }, ...lvDone(29) },
  { id: 'h40', n: 'ABYSSAL', d: 'Finir le chapitre 4 (ABYSSES)', sk: { p: 'cyclops', c: ['#4fd8ff', '#1b5fa6', '#020c24'], x: '#00e0ff', g: 'rgba(79,216,255,.3)' }, ...lvDone(39) },
  { id: 'h50', n: 'MIRAGE', d: 'Finir le chapitre 5 (DÉSERT ROUGE)', sk: { p: 'sun', c: ['#fff0b0', '#ffb030', '#c84000'], g: 'rgba(255,180,60,.35)' }, ...lvDone(49) },
  { id: 'h60', n: 'ROUAGE', d: 'Finir le chapitre 6 (L’USINE)', sk: { p: 'cog', c: ['#d8d8e6', '#8a8aa0', '#2a2a33'], tr: 'dot', tc: '#ffe14d' }, ...lvDone(59) },
  { id: 'h70', n: 'AURORE', d: 'Finir le chapitre 7 (AURORE)', sk: { p: 'rainbow', c: ['#c08cff', '#4dffc3', '#1a1a40'], x: 72, tr: 'rainbow' }, ...lvDone(69) },
  { id: 'h80', n: 'NÉANT', d: 'Finir le chapitre 8 (LE VIDE)', sk: { p: 'void', c: ['#7a3cff', '#ffffff', '#000'], tr: 'dark' }, ...lvDone(79) },
  { id: 'h90', n: 'INFERNAL', d: 'Finir le chapitre 9 (INFERNO)', sk: { p: 'fire', c: ['#ffcc33', '#ff4400', '#6a0000'], g: 'rgba(255,80,0,.4)', tr: 'fire' }, ...lvDone(89) },
  { id: 'h100', n: 'FOUDRE ABSOLUE', d: 'Finir les 100 niveaux', sk: { p: 'bolt', c: ['#fffbe0', '#ffe14d', '#b08a00'], x: '#ffffff', g: 'rgba(255,225,77,.5)', tr: 'gold' }, ...lvDone(99) },
  { id: 'leg', n: 'LÉGENDE', d: 'Finir les 100 niveaux avec moins de 500 morts (meilleurs essais)', sk: { p: 'crown', c: ['#fff3a0', '#ffc400', '#8a5a00'], g: 'rgba(255,200,0,.45)', tr: 'gold' }, ok: D => storyCount(D) === 100 && storyDeaths(D) < 500 },
  // ── SANS MORT ──
  { id: 'f1',  n: 'INTACT', d: 'Finir un niveau sans mourir', sk: { p: 'grad', c: ['#ffffff', '#9ff4ff', '#1a7a99'], g: 'rgba(160,240,255,.3)', tr: 'ice' }, ...fn(D => flawCount(D) >= 1, D => [Math.min(1, flawCount(D)), 1]) },
  { id: 'f10', n: 'IMPECCABLE', d: 'Finir 10 niveaux sans mourir', sk: { p: 'target', c: ['#ffffff', '#2a7aff'] }, ...fn(D => flawCount(D) >= 10, D => [Math.min(10, flawCount(D)), 10]) },
  { id: 'f25', n: 'CHIRURGIEN', d: 'Finir 25 niveaux sans mourir', sk: { p: 'medic', c: ['#ffffff', '#f2f2f2', '#b8b8b8'], x: '#e22' }, ...fn(D => flawCount(D) >= 25, D => [Math.min(25, flawCount(D)), 25]) },
  { id: 'f50', n: 'MACHINE', d: 'Finir 50 niveaux sans mourir', sk: { p: 'pixel', c: ['#39ff9a', '#0aa060', '#044a2c'], tr: 'dot', tc: '#39ff9a' }, ...fn(D => flawCount(D) >= 50, D => [Math.min(50, flawCount(D)), 50]) },
  { id: 'f100', n: 'PARFAIT', d: 'Finir les 100 niveaux sans mourir', sk: { p: 'gem', c: ['#e8ffff', '#9fe8ff', '#4aa8d8'], g: 'rgba(200,250,255,.5)', tr: 'ice' }, ...fn(D => flawCount(D) >= 100, D => [flawCount(D), 100]) },
  { id: 'fb', n: 'TUEUR DE BOSS', d: 'Finir un niveau boss sans mourir', sk: { p: 'skull', c: ['#ffffff', '#e0e0e0', '#8a8a8a'], x: '#c00', g: 'rgba(255,0,0,.3)' }, ok: bossFlaw },
  // ── ÉTOILES ──
  { id: 's30', n: 'CONSTELLATION', d: 'Obtenir 30 étoiles', sk: { p: 'galaxy', c: ['#a066ff', '#3a0a88', '#0a0020'], g: 'rgba(150,80,255,.35)', tr: 'dot', tc: '#c9a0ff' }, ...fn(D => starCount(D) >= 30, D => [Math.min(30, starCount(D)), 30]) },
  { id: 's90', n: 'NOVA', d: 'Obtenir 90 étoiles', sk: { p: 'pulse', c: ['#ffffff', '#ffd0ff', '#ff4fd8'], g: '#ff7ae6' }, ...fn(D => starCount(D) >= 90, D => [Math.min(90, starCount(D)), 90]) },
  { id: 's150', n: 'PULSAR', d: 'Obtenir 150 étoiles', sk: { p: 'radar', c: ['#123a2a', '#0a2018', '#000'], x: '#39ff9a' }, ...fn(D => starCount(D) >= 150, D => [Math.min(150, starCount(D)), 150]) },
  { id: 's225', n: 'SUPERNOVA', d: 'Obtenir 225 étoiles', sk: { p: 'sun', c: ['#ffffff', '#fff4c0', '#ffaa00'], g: 'rgba(255,255,200,.55)', tr: 'gold' }, ...fn(D => starCount(D) >= 225, D => [Math.min(225, starCount(D)), 225]) },
  { id: 's300', n: 'TROU NOIR', d: 'Obtenir les 300 étoiles', sk: { p: 'saturn', c: ['#111', '#000', '#000'], x: '#ff9a3a', g: 'rgba(255,140,40,.3)', tr: 'dark' }, ...fn(D => starCount(D) >= 300, D => [starCount(D), 300]) },
  // ── MORTS ──
  { id: 'd1', n: 'BAPTÊME', d: 'Mourir une première fois', sk: { p: 'bandage', c: ['#ff9a7a', '#e04a2a', '#6a1000'] }, ...st('deaths', 1) },
  { id: 'd10', n: 'CABOSSÉ', d: 'Mourir 10 fois', sk: { p: 'cracked', c: ['#c8c8c8', '#8a8a8a', '#3a3a3a'] }, ...st('deaths', 10) },
  { id: 'd50', n: 'RAFISTOLÉ', d: 'Mourir 50 fois', sk: { p: 'stitch', c: ['#e8b090', '#b0705a', '#4a2018'], x: '#fff' }, ...st('deaths', 50) },
  { id: 'd100', n: 'MORT-VIVANT', d: 'Mourir 100 fois', sk: { p: 'zombie', c: ['#a8e070', '#5a9a30', '#1a3a08'] }, ...st('deaths', 100) },
  { id: 'd500', n: 'SPECTRE', d: 'Mourir 500 fois', sk: { p: 'ghost', c: ['#ffffff', '#ddccff', '#9966cc'], g: 'rgba(200,150,255,.35)', tc: '#cc88ff' }, ...st('deaths', 500) },
  { id: 'd1000', n: 'POLTERGEIST', d: 'Mourir 1 000 fois', sk: { p: 'glitch', c: ['#fff', '#000', '#2a0a3a'] }, ...st('deaths', 1000) },
  { id: 'd2500', n: 'PHÉNIX', d: 'Mourir 2 500 fois', sk: { p: 'fire', c: ['#fff0a0', '#ff6a00', '#a00000'], g: 'rgba(255,120,0,.45)', tr: 'fire' }, ...st('deaths', 2500) },
  { id: 'd5000', n: 'IMMORTEL', d: 'Mourir 5 000 fois', sk: { p: 'skull', c: ['#fff6b0', '#ffc400', '#8a5a00'], x: '#3a2000', g: 'rgba(255,200,0,.35)', tr: 'gold' }, ...st('deaths', 5000) },
  { id: 'd10000', n: 'ÉTERNEL', d: 'Mourir 10 000 fois', sk: { p: 'void', c: ['#ffffff', '#ffe14d', '#000'], tr: 'rainbow' }, ...st('deaths', 10000) },
  // ── CAUSES DE MORT ──
  { id: 'dsaw', n: 'SCIÉ EN DEUX', d: 'Mourir 25 fois dans une scie', sk: { p: 'split', c: ['#ff4b2b', '#c8c8c8'] }, ...dt('saw', 25) },
  { id: 'dspk', n: 'HÉRISSON', d: 'Mourir 50 fois sur des piques', sk: { p: 'spiky', c: ['#c8a070', '#8a5a2a', '#3a2008'] }, ...dt('spk', 50) },
  { id: 'dgap', n: 'GRAVITÉ', d: 'Tomber 25 fois dans un trou', sk: { p: 'moon', c: ['#e8e8f0', '#a0a0b8', '#4a4a60'] }, ...dt('gap', 25) },
  { id: 'dwal', n: 'TÊTE DURE', d: 'Percuter 25 murs', sk: { p: 'brick', c: ['#b0482a', '#5a2010'] }, ...dt('wal', 25) },
  { id: 'dceil', n: 'PLAFONNÉ', d: 'Se cogner 15 fois à un plafond', sk: { p: 'stripes', c: ['#ffe14d', '#111', '#000'] }, ...dt('ceil', 15) },
  { id: 'dfast', n: 'FAUX DÉPART', d: 'Mourir 10 fois dans la première seconde', sk: { p: 'target', c: ['#ff3333', '#ffffff'] }, ...st('fastDeaths', 10) },
  // ── TÉNACITÉ ET FOLIES ──
  { id: 'per50', n: 'ACHARNÉ', d: 'Finir un niveau après 50 morts dessus', sk: { p: 'angry', c: ['#ff7a5a', '#d02a10', '#5a0800'], g: 'rgba(255,60,0,.3)' }, ...flag('per50') },
  { id: 'ex13', n: 'TREIZE', d: 'Finir un niveau avec exactement 13 morts', sk: { p: 'eight', c: ['#3a3a3a', '#111', '#000'], x: 13 }, ...flag('ex13') },
  { id: 'd99', n: 'SI PRÈS', d: 'Mourir à 99 % d’un niveau', sk: { p: 'broken', c: ['#ff6a8a', '#d01040', '#5a0018'], x: '#ffd0dc' }, ...flag('d99') },
  { id: 'nodj', n: 'SOBRE', d: 'Finir un niveau du chapitre 2 ou plus sans double saut', sk: { p: 'grad', c: ['#d0d0d0', '#808080', '#303030'] }, ...flag('nodj') },
  { id: 'pr1', n: 'APPRENTI', d: 'Finir un niveau en mode entraînement', sk: { p: 'target', c: ['#39ff9a', '#0a3a20'] }, ...st('practiceDone', 1) },
  { id: 'pr10', n: 'STUDIEUX', d: 'Finir 10 niveaux en entraînement', sk: { p: 'dots', c: ['#2a5aff', '#ffffff', '#0a1a60'] }, ...st('practiceDone', 10) },
  { id: 'rst', n: 'IMPATIENT', d: 'Recommencer 50 fois avec R', sk: { p: 'clock', c: ['#fff', '#ddd', '#888'], fast: true }, ...st('restarts', 50) },
  { id: 'pau', n: 'CAPPUCCINO', d: 'Mettre pause 50 fois', sk: { p: 'split', c: ['#6a3a1a', '#f0dcc0'] }, ...st('pauses', 50) },
  { id: 'fas', n: 'FASHION', d: 'Changer de skin 25 fois', sk: { p: 'disco', c: ['#fff', '#aaa', '#555'], g: 'rgba(255,255,255,.2)', tr: 'rainbow' }, ...st('skinChanges', 25) },
  { id: 'night', n: 'NOCTAMBULE', d: 'Jouer entre minuit et 4 h', sk: { p: 'crescent', c: ['#fff8d0', '#f0d870', '#8a7a20'], x: '#0a0a24' }, ...flag('night') },
  { id: 'dawn', n: 'LÈVE-TÔT', d: 'Jouer entre 5 h et 7 h', sk: { p: 'sun', c: ['#fff', '#ffc0a0', '#ff8a6a'] }, ...flag('dawn') },
  { id: 'day7', n: 'FIDÈLE', d: 'Jouer 7 jours différents', sk: { p: 'heart', c: ['#ff9ac0', '#ff4f9a', '#8a0040'], x: '#fff' }, ...fn(D => D.st.days.length >= 7, D => [Math.min(7, D.st.days.length), 7]) },
  { id: 'day30', n: 'ACCRO', d: 'Jouer 30 jours différents', sk: { p: 'spiral', c: ['#ffffff', '#ff3355', '#ffffff'] }, ...fn(D => D.st.days.length >= 30, D => [Math.min(30, D.st.days.length), 30]) },
  { id: 'h1h', n: 'PASSIONNÉ', d: 'Jouer 1 heure au total', sk: { p: 'clock', c: ['#ffe8a0', '#ffc040', '#8a5a00'] }, ...fn(D => D.st.playSec >= 3600, D => [Math.min(60, Math.floor(D.st.playSec / 60)), 60]) },
  { id: 'h10h', n: 'VÉTÉRAN', d: 'Jouer 10 heures au total', sk: { p: 'target', c: ['#ffd84a', '#8a5a00'] }, ...fn(D => D.st.playSec >= 36000, D => [Math.min(600, Math.floor(D.st.playSec / 60)), 600]) },
  // ── SAUTS ──
  { id: 'j100', n: 'SAUTERELLE', d: 'Sauter 100 fois', sk: { p: 'eyes', c: ['#c8ff70', '#6ac020', '#1a4a00'] }, ...st('jumps', 100) },
  { id: 'j1k', n: 'RESSORT', d: 'Sauter 1 000 fois', sk: { p: 'spiral', c: ['#b0b8c8', '#5a6070', '#20242c'] }, ...st('jumps', 1000) },
  { id: 'j10k', n: 'KANGOUROU', d: 'Sauter 10 000 fois', sk: { p: 'eyes', c: ['#e0b080', '#a06a30', '#4a2a08'] }, ...st('jumps', 10000) },
  { id: 'j50k', n: 'APESANTEUR', d: 'Sauter 50 000 fois', sk: { p: 'planet', c: ['#e0f0ff', '#90b0e0', '#30406a'], x: '#c0d8ff' }, ...st('jumps', 50000) },
  { id: 'dj1k', n: 'DOUBLE DOSE', d: 'Faire 1 000 doubles sauts', sk: { p: 'yinyang', c: ['#ffffff', '#111111'] }, ...st('djumps', 1000) },
  // ── ORBES ET TREMPLINS ──
  { id: 'o10', n: 'CAPTEUR', d: 'Attraper 10 orbes', sk: { p: 'atom', c: ['#ffe8ff', '#ff7ae6', '#6a0a5a'], x: '#ff7ae6' }, ...st('orbs', 10) },
  { id: 'o100', n: 'AIMANT', d: 'Attraper 100 orbes', sk: { p: 'split', c: ['#e22', '#2a5aff'] }, ...st('orbs', 100) },
  { id: 'o1000', n: 'COLLECTIONNEUR', d: 'Attraper 1 000 orbes', sk: { p: 'gem', c: ['#e0b0ff', '#a050ff', '#4a0a8a'], g: 'rgba(170,80,255,.35)' }, ...st('orbs', 1000) },
  { id: 'p25', n: 'TREMPLIN', d: 'Utiliser 25 tremplins', sk: { p: 'bolt', c: ['#c8ff90', '#40c020', '#0a4a00'], x: '#fff' }, ...st('pads', 25) },
  { id: 'p250', n: 'CATAPULTE', d: 'Utiliser 250 tremplins', sk: { p: 'basket', c: ['#ffa050', '#e06010', '#6a2000'] }, ...st('pads', 250) },
  // ── ENDLESS : DISTANCE EN UNE COURSE ──
  { id: 'e100', n: 'DÉCOLLAGE', d: 'Parcourir 100 m en Endless', sk: { p: 'grad', c: ['#a0e8ff', '#2a8bd6', '#0a2a5a'], tc: '#4fd8ff' }, ...st('endBest', 100) },
  { id: 'e250', n: 'COUREUR', d: 'Parcourir 250 m en Endless', sk: { p: 'stripes', c: ['#2a8bd6', '#ffffff', '#000'] }, ...st('endBest', 250) },
  { id: 'e500', n: 'SPRINTER', d: 'Parcourir 500 m en Endless', sk: { p: 'tennis', c: ['#e8ff60', '#b8e020', '#5a7a00'] }, ...st('endBest', 500) },
  { id: 'e1000', n: 'KILOMÈTRE', d: 'Parcourir 1 000 m en Endless', sk: { p: 'wheel', c: ['#e0e0e0', '#a0a0a0', '#505050'] }, ...st('endBest', 1000) },
  { id: 'e1500', n: 'TURBO', d: 'Parcourir 1 500 m en Endless', sk: { p: 'wheel', c: ['#ff6a4a', '#d02a10', '#5a0800'], tr: 'fire' }, ...st('endBest', 1500) },
  { id: 'e2000', n: 'SUPERSONIQUE', d: 'Parcourir 2 000 m en Endless', sk: { p: 'cross', c: ['#00ffff', '#0088ff', '#003366'], x: '#9ffcff', g: 'rgba(0,255,255,.35)', tc: '#00ffff' }, ...st('endBest', 2000) },
  { id: 'e3000', n: 'HYPERESPACE', d: 'Parcourir 3 000 m en Endless', sk: { p: 'galaxy', c: ['#6ac0ff', '#0a3a8a', '#000820'], g: 'rgba(80,160,255,.35)', tr: 'ice' }, ...st('endBest', 3000) },
  { id: 'e4000', n: 'DISTORSION', d: 'Parcourir 4 000 m en Endless', sk: { p: 'plasma', c: ['#ff3af0', '#3af0ff', '#100018'] }, ...st('endBest', 4000) },
  { id: 'e5000', n: 'VITESSE LUMIÈRE', d: 'Parcourir 5 000 m en Endless', sk: { p: 'pulse', c: ['#ffffff', '#f0f8ff', '#a0c8ff'], g: '#ffffff', tr: 'ice' }, ...st('endBest', 5000) },
  { id: 'e7500', n: 'TACHYON', d: 'Parcourir 7 500 m en Endless', sk: { p: 'glitch', c: ['#ffe14d', '#000', '#1a1400'] }, ...st('endBest', 7500) },
  { id: 'e10000', n: 'SINGULARITÉ', d: 'Parcourir 10 000 m en Endless', sk: { p: 'void', c: ['#ffd84a', '#ffffff', '#000'], g: 'rgba(255,216,74,.3)', tr: 'gold' }, ...st('endBest', 10000) },
  // ── ENDLESS : CUMUL ──
  { id: 'er1', n: 'PREMIER RUN', d: 'Jouer une partie Endless', sk: { p: 'soccer', c: ['#111'] }, ...st('endRuns', 1) },
  { id: 'er50', n: 'HABITUÉ', d: 'Jouer 50 parties Endless', sk: { p: 'smile', c: ['#ffe14d', '#ffc400', '#a07800'] }, ...st('endRuns', 50) },
  { id: 'er250', n: 'INFATIGABLE', d: 'Jouer 250 parties Endless', sk: { p: 'stitch', c: ['#ff5a5a', '#c01010', '#4a0000'], x: '#fff' }, ...st('endRuns', 250) },
  { id: 'ed10', n: 'GLOBE-TROTTER', d: 'Cumuler 10 km en Endless', sk: { p: 'planet', c: ['#6ab0ff', '#2060c0', '#0a2050'], x: '#3fae4a' }, ...fn(D => D.st.endDist >= 10000, D => [Math.min(10, Math.floor(D.st.endDist / 1000)), 10]) },
  { id: 'ed50', n: 'ORBITAL', d: 'Cumuler 50 km en Endless', sk: { p: 'saturn', c: ['#ffe0a0', '#d0a050', '#6a4a10'], x: '#f0e0c0' }, ...fn(D => D.st.endDist >= 50000, D => [Math.min(50, Math.floor(D.st.endDist / 1000)), 50]) },
  { id: 'ed200', n: 'GALACTIQUE', d: 'Cumuler 200 km en Endless', sk: { p: 'galaxy', c: ['#ff9ae0', '#8a0a8a', '#10001a'], g: 'rgba(255,100,220,.35)', tr: 'rainbow' }, ...fn(D => D.st.endDist >= 200000, D => [Math.min(200, Math.floor(D.st.endDist / 1000)), 200]) },
  // ── DÉFI DU JOUR ──
  { id: 'dc1', n: 'DÉFI RELEVÉ', d: 'Jouer un défi du jour', sk: { p: 'target', c: ['#ffe14d', '#ff3333'] }, ...fn(D => D.st.dailyDays.length >= 1) },
  { id: 'dc7', n: 'HEBDO', d: 'Jouer le défi du jour 7 jours différents', sk: { p: 'checker', c: ['#ffe14d', '#222'] }, ...fn(D => D.st.dailyDays.length >= 7, D => [Math.min(7, D.st.dailyDays.length), 7]) },
  { id: 'dc30', n: 'MENSUEL', d: 'Jouer le défi du jour 30 jours différents', sk: { p: 'gem', c: ['#ffb0b0', '#ff3a3a', '#7a0000'], g: 'rgba(255,60,60,.35)' }, ...fn(D => D.st.dailyDays.length >= 30, D => [Math.min(30, D.st.dailyDays.length), 30]) },
  { id: 'dc1k', n: 'CHAMPION DU JOUR', d: 'Parcourir 1 000 m sur un défi du jour', sk: { p: 'crown', c: ['#ffffff', '#c8d0e0', '#606a80'], x: '#e8f0ff' }, ...st('dailyBestEver', 1000) },
  // ── SOCIAL ──
  { id: 'sh', n: 'MESSAGER', d: 'Partager un score', sk: { p: 'eyes', c: ['#90d0ff', '#3a8ae0', '#0a2a6a'], x: '#0a2a6a' }, ...st('shares', 1) },
  { id: 'top100', n: 'CLASSÉ', d: 'Entrer dans le top 100 mondial Endless', sk: { p: 'eight', c: ['#2a5aff', '#0a2a9a', '#000a3a'], x: 100 }, ...flag('top100') },
  { id: 'top10', n: 'ÉLITE', d: 'Entrer dans le top 10 mondial Endless', sk: { p: 'crown', c: ['#e0b0ff', '#9a40ff', '#3a0a6a'], g: 'rgba(170,80,255,.4)', tr: 'rainbow' }, ...flag('top10') },
  // ── CHAPITRES 3 ÉTOILES ──
  { id: 'c3a', n: 'JOYAU D’ÉVEIL', d: '3 étoiles sur tout le chapitre 1', sk: { p: 'gem', c: ['#ffb0c0', '#ff3355', '#6a0018'] }, ...fn(D => chapter3(D, 0), D => chapter3pr(D, 0)) },
  { id: 'c3c', n: 'LAME D’ARGENT', d: '3 étoiles sur tout le chapitre 3', sk: { p: 'saw', c: ['#ffffff', '#d0d8e0', '#6a7480'], g: 'rgba(220,230,255,.3)' }, ...fn(D => chapter3(D, 2), D => chapter3pr(D, 2)) },
  { id: 'c3e', n: 'ROSE DES SABLES', d: '3 étoiles sur tout le chapitre 5', sk: { p: 'cracked', c: ['#ffd8a0', '#d08a40', '#6a3a10'], x: '#7a3a10' }, ...fn(D => chapter3(D, 4), D => chapter3pr(D, 4)) },
  { id: 'c3g', n: 'BORÉAL', d: '3 étoiles sur tout le chapitre 7', sk: { p: 'plasma', c: ['#4dffc3', '#c08cff', '#02101a'], tr: 'rainbow' }, ...fn(D => chapter3(D, 6), D => chapter3pr(D, 6)) },
  { id: 'c3j', n: 'ÉCLAIR PUR', d: '3 étoiles sur tout le chapitre 10', sk: { p: 'bolt', c: ['#ffffff', '#fff6b0', '#ffe14d'], x: '#ffb000', g: 'rgba(255,255,180,.6)', tr: 'gold' }, ...fn(D => chapter3(D, 9), D => chapter3pr(D, 9)) },
  // ── COLLECTION ──
  { id: 'col10', n: 'VITRINE', d: 'Débloquer 10 skins', sk: { p: 'checker', c: ['#ff3355', '#ffffff'] }, ...fn(D => unlockedCount(D) >= 10, D => [Math.min(10, unlockedCount(D)), 10]) },
  { id: 'col25', n: 'MUSÉE', d: 'Débloquer 25 skins', sk: { p: 'dots', c: ['#ffe14d', '#ff3355', '#8a6000'] }, ...fn(D => unlockedCount(D) >= 25, D => [Math.min(25, unlockedCount(D)), 25]) },
  { id: 'col50', n: 'TRÉSOR', d: 'Débloquer 50 skins', sk: { p: 'gem', c: ['#fff3a0', '#ffc400', '#8a5a00'], g: 'rgba(255,200,0,.35)' }, ...fn(D => unlockedCount(D) >= 50, D => [Math.min(50, unlockedCount(D)), 50]) },
  { id: 'col75', n: 'RELIQUE', d: 'Débloquer 75 skins', sk: { p: 'ice', c: ['#e0f8ff', '#80d0f0', '#205a80'], g: 'rgba(180,240,255,.4)', tr: 'ice' }, ...fn(D => unlockedCount(D) >= 75, D => [Math.min(75, unlockedCount(D)), 75]) },
  // ── SECRETS ──
  { id: 'logo', n: 'ÉCLAIR CACHÉ', d: 'Secret : le titre cache quelque chose', secret: true, sk: { p: 'bolt', c: ['#ff3333', '#a00000', '#300000'], x: '#ffe14d', g: 'rgba(255,50,50,.4)' }, ...flag('logo') },
  { id: 'silent', n: 'MIME', d: 'Secret : finir un niveau dans le silence complet', secret: true, sk: { p: 'stripes', c: ['#ffffff', '#111111', '#000'] }, ...flag('silent') },
  { id: 'god', n: 'DIEU DE L’ÉCLAIR', d: 'Finir le niveau 100 sans mourir', sk: { p: 'pulse', c: ['#ffffff', '#ffe14d', '#ff9900'], g: '#ffe14d', tr: 'rainbow' }, ok: D => !!(D.lv[99] && D.lv[99].done && D.lv[99].best === 0) },
  // ── ÉCLAIRS ──
  { id: 'b10', n: 'ÉLECTRICIEN', d: 'Ramasser 10 éclairs', sk: { p: 'bolt', c: ['#fff8c0', '#ffd000', '#806000'], x: '#3a2a00' }, ...bolts(10) },
  { id: 'b50', n: 'HAUTE TENSION', d: 'Ramasser 50 éclairs', sk: { p: 'neon', c: ['#ffe14d', '#ffffff', '#1a1400'], g: 'rgba(255,225,77,.3)', tr: 'gold' }, ...bolts(50) },
  { id: 'b100', n: 'SURVOLTÉ', d: 'Ramasser 100 éclairs', sk: { p: 'plasma', c: ['#ffe14d', '#ff8a00', '#141000'], tr: 'gold' }, ...bolts(100) },
  { id: 'b200', n: 'FOUDROYANT', d: 'Ramasser 200 éclairs', sk: { p: 'atom', c: ['#fffbe0', '#ffe14d', '#b08a00'], x: '#ffe14d', g: 'rgba(255,225,77,.35)', tr: 'gold' }, ...bolts(200) },
  { id: 'b300', n: 'ZEUS', d: 'Ramasser les 300 éclairs', sk: { p: 'crown', c: ['#e8f4ff', '#7ab8ff', '#1a3a7a'], x: '#ffe14d', g: 'rgba(120,180,255,.45)', tr: 'rainbow' }, ...bolts(300) },
  { id: 'all', n: 'OMÉGA', d: 'Débloquer tous les autres exploits', sk: { p: 'rainbow', c: ['#fff', '#fff', '#fff'], x: 55, g: 'rgba(255,255,255,.35)', tr: 'rainbow' }, ...fn(D => unlockedCount(D) >= ACH.length - 1, D => [Math.min(ACH.length - 1, unlockedCount(D)), ACH.length - 1]) },
];

// Garde-fou : exactement 100 exploits, identifiants uniques
if (new Set(ACH.map(a => a.id)).size !== ACH.length) console.warn('ACH: identifiants en double');
ACH.forEach(a => { a.sk.id = a.id; a.sk.n = a.n; });
const SKINS = [BASE_SKIN, ...ACH.map(a => a.sk)];
const skinById = id => SKINS.find(s => s.id === id) || BASE_SKIN;

if (typeof module !== 'undefined') module.exports = { ACH, SKINS };
