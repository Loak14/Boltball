# BoltBall

Die and retry à une touche. Fichier à déployer : `index.html` (autonome).

## Structure
- `src/core.js` : physique (pas fixe 60 Hz), génération des 100 niveaux et de l'Endless
- `src/audio.js` : musique procédurale calée sur les obstacles + effets
- `src/skins.js` : rendu des skins
- `src/achievements.js` : les 105 exploits et leurs skins
- `src/coins.js` : 3 éclairs par niveau, générés par le solveur sur une trajectoire gagnante
- `src/save.js` : sauvegarde locale + classement Supabase (LB_URL / LB_KEY)
- `src/game.js` : boucle, rendu, écrans
- `tools/solve.js` : solveur qui vérifie que chaque niveau est faisable
- `tools/build.py` : assemble `src/` en `index.html`

## Commandes
- `node tools/solve.js` : valide les 100 niveaux, réécrit `src/seedfix.js` et `src/coins.js`
- `node tools/solve.js respawn` : vérifie les niveaux depuis le départ rapproché des essais suivants
- `node tools/solve.js endless 12` : teste 12 parcours Endless sur 3 000 m
- `python3 tools/build.py` : reconstruit `index.html`

## Classement mondial
Exécuter `supabase-setup.sql` dans un projet Supabase, puis renseigner `LB_URL` et `LB_KEY` dans `src/save.js` (ou directement en haut du script de `index.html`).
