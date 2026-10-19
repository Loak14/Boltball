"""Test navigateur headless : parcourt les écrans, joue, capture des images."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots')
OUT.mkdir(parents=True, exist_ok=True)

async def run(vw, vh, tag):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': vw, 'height': vh}, device_scale_factor=1)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        await pg.goto((ROOT / 'index.html').as_uri())
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=str(OUT / f'{tag}_0name.png'))
        await pg.fill('#inp', 'loak')
        await pg.click('#bName')
        await pg.wait_for_timeout(600)
        await pg.screenshot(path=str(OUT / f'{tag}_1home.png'))
        await pg.click('[data-go=story]')
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(OUT / f'{tag}_2story.png'))
        await pg.click('#lvGrid .lc')
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path=str(OUT / f'{tag}_3play.png'))
        # joue au hasard quelques secondes
        for i in range(25):
            await pg.keyboard.down('Space'); await pg.wait_for_timeout(120); await pg.keyboard.up('Space'); await pg.wait_for_timeout(260)
        await pg.screenshot(path=str(OUT / f'{tag}_4play.png'))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(OUT / f'{tag}_5pause.png'))
        await pg.click('#bQuit'); await pg.wait_for_timeout(300)
        # niveau avancé pour voir les obstacles
        await pg.evaluate("for(let i=0;i<60;i++)Save.d.lv[i]={done:true,best:i%7,pct:1};Save.save();startStory(57)")
        await pg.wait_for_timeout(2200)
        await pg.screenshot(path=str(OUT / f'{tag}_6lvl58.png'))
        await pg.evaluate("quitToMenu();startStory(83)")
        await pg.wait_for_timeout(3500)
        await pg.screenshot(path=str(OUT / f'{tag}_7lvl84.png'))
        # victoire simulée -> replay
        await pg.evaluate("""(()=>{const L=Game.L;for(let k=0;k<4;k++){const r={ys:new Int16Array(900),n:300+k*80,win:false};for(let t=0;t<r.n;t++)r.ys[t]=Math.round((G-PR-Math.abs(Math.sin(t/20+k))*80)*4);Game.rec.push(r);}Game.P.x=L.len-1;Game.deaths=4;})()""")
        await pg.wait_for_timeout(1800)
        await pg.screenshot(path=str(OUT / f'{tag}_8done.png'))
        await pg.evaluate("quitToMenu()")
        await pg.click('[data-go=endless]'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=str(OUT / f'{tag}_9endless.png'))
        await pg.evaluate("Game.P.y=G+300"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=str(OUT / f'{tag}_10over.png'))
        await pg.click('#bMenu2'); await pg.wait_for_timeout(300)
        await pg.evaluate("for(const a of ACH.slice(0,40))Save.d.ach[a.id]=1;Save.save()")
        await pg.click('[data-go=coll]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=str(OUT / f'{tag}_11coll.png'), full_page=True)
        await pg.click('#s-coll [data-go=home]'); await pg.click('[data-go=lb]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(OUT / f'{tag}_12lb.png'))
        await pg.click('#s-lb [data-go=home]'); await pg.click('[data-go=set]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(OUT / f'{tag}_13set.png'))
        st = await pg.evaluate("JSON.stringify({deaths:Save.d.st.deaths,jumps:Save.d.st.jumps,ach:Object.keys(Save.d.ach).length})")
        print(tag, 'stats', st)
        print(tag, 'ERREURS:', errs if errs else 'aucune')
        await b.close()

async def main():
    await run(1280, 720, 'pc')
    await run(844, 390, 'mob')

asyncio.run(main())
