// ════════════════════════════════════════════════════════════════
//  SAUVEGARDE locale + CLASSEMENT mondial (Supabase)
// ════════════════════════════════════════════════════════════════

// ▼▼▼ À REMPLIR pour activer le classement mondial (voir supabase-setup.sql) ▼▼▼
const LB_URL = '';   // ex : 'https://abcdefgh.supabase.co'
const LB_KEY = '';   // clé "anon public" du projet Supabase
// ▲▲▲

const SAVE_KEY = 'boltball_v2';
const Save = {
  d: null,
  fresh() {
    return {
      v: 2, name: '', pid: 'p' + Math.random().toString(36).slice(2) + Date.now().toString(36),
      skin: 'base', ach: {}, lv: {}, fl: {},
      set: { music: true, sfx: true, vol: .8, flash: true, shake: true },
      st: { deaths: 0, dt: {}, jumps: 0, djumps: 0, orbs: 0, pads: 0, restarts: 0, pauses: 0, skinChanges: 0, playSec: 0,
        days: [], dailyDays: [], endRuns: 0, endDist: 0, endBest: 0, dailyBestEver: 0, daily: {}, shares: 0, practiceDone: 0, fastDeaths: 0 },
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { }
    const f = this.fresh();
    if (!d || d.v !== 2) {
      d = f;
      try { const n = localStorage.getItem('bb_n'); if (n) d.name = n; } catch (e) { }
    } else {
      for (const k in f) if (d[k] === undefined) d[k] = f[k];
      for (const k in f.st) if (d.st[k] === undefined) d.st[k] = f.st[k];
      for (const k in f.set) if (d.set[k] === undefined) d.set[k] = f.set[k];
    }
    this.d = d;
  },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.d)); } catch (e) { } },
  reset() { const n = this.d.name, pid = this.d.pid; this.d = this.fresh(); this.d.name = n; this.d.pid = pid; this.save(); },
};

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const LB = {
  online: () => !!(LB_URL && LB_KEY),
  headers() { return { apikey: LB_KEY, Authorization: 'Bearer ' + LB_KEY, 'Content-Type': 'application/json' }; },
  // mode : 'endless' | 'daily' | 'story' ; score : plus grand = meilleur
  async submit(mode, day, score, deaths, extra) {
    if (!this.online() || !Save.d.name) return false;
    try {
      const body = [{ player_id: Save.d.pid, name: Save.d.name.slice(0, 12), mode, day: day || 'all', score: Math.round(score), deaths: Math.round(deaths || 0), extra: Math.round(extra || 0) }];
      const r = await fetch(`${LB_URL}/rest/v1/scores?on_conflict=player_id,mode,day`, { method: 'POST', headers: { ...this.headers(), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(body) });
      return r.ok;
    } catch (e) { return false; }
  },
  async top(mode, day, n = 50) {
    if (!this.online()) return null;
    try {
      const q = `select=player_id,name,score,deaths,extra&mode=eq.${mode}&day=eq.${encodeURIComponent(day || 'all')}&order=score.desc,deaths.asc&limit=${n}`;
      const r = await fetch(`${LB_URL}/rest/v1/scores?${q}`, { headers: this.headers() });
      if (!r.ok) return null; return await r.json();
    } catch (e) { return null; }
  },
  async rank(mode, day, score) {
    if (!this.online()) return null;
    try {
      const q = `select=player_id&mode=eq.${mode}&day=eq.${encodeURIComponent(day || 'all')}&score=gt.${Math.round(score)}`;
      const r = await fetch(`${LB_URL}/rest/v1/scores?${q}`, { headers: { ...this.headers(), Prefer: 'count=exact', Range: '0-0' } });
      const cr = r.headers.get('content-range'); if (!cr) return null;
      return +cr.split('/')[1] + 1;
    } catch (e) { return null; }
  },
};
