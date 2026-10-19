#!/usr/bin/env python3
"""Assemble src/ en un seul index.html (à déposer tel quel sur GitHub Pages)."""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src'
order = ['core.js', 'seedfix.js', 'audio.js', 'skins.js', 'achievements.js', 'save.js', 'game.js']
js = '\n'.join((src / f).read_text(encoding='utf-8').replace("if (typeof module !== 'undefined')", "if (false)") for f in order)
html = (src / 'template.html').read_text(encoding='utf-8')
html = html.replace('/*CSS*/', (src / 'style.css').read_text(encoding='utf-8')).replace('/*JS*/', js)
(root / 'index.html').write_text(html, encoding='utf-8')
print('index.html', len(html) // 1024, 'Ko')
