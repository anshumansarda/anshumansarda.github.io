# anshumansarda.github.io

Personal site. A pixel version of me, six liquid-glass folders, a few games, a pixel globe and a settings panel that does nothing useful.
Plain HTML/CSS/JS. No build step, no dependencies.

```
index.html          all page content (edit text here)
css/style.css       everything visual
js/main.js          loader, folders, windows, routing
js/liquid.js        refraction filter for the glass (Chromium only; others get frosted glass)
js/pixel.js         pixel icons and the alternate avatars
js/clock.js         the gear clock in the top bar
js/about.js         polaroid flip, stat bars, fact dice
js/globe.js         pixel globe for the Map folder
js/trips.js         places I've been (edit this to add pins)
js/settings.js      the Settings folder (theme, avatar, speed, gravity…)
js/games/           coin, blackjack, snake, tic tac toe, roulette, slots
assets/             sprite.png, head.png, me.jpg, data/countries-110m.json
```

## Run locally

```bash
python3 -m http.server 5178
```

Then open http://localhost:5178. It has to be served over http because the JS uses modules, so double-clicking `index.html` won't work.

## Deploy to GitHub Pages (replacing the old site)

The site lives in the `anshumansarda/anshumansarda.github.io` repo. To swap in this version:

```bash
git clone https://github.com/anshumansarda/anshumansarda.github.io.git old-site
cd old-site
git rm -r --quiet .
cp -R "../Anshuman Website/." .
rm -rf .claude
git add -A
git commit -m "New site"
git push origin master
```

Pages publishes from `master` at the repo root. It's live at https://anshumansarda.github.io a minute or two later.

## Editing

- **About / Work text** is in `index.html` under `<!-- About -->` and `<!-- Work -->`.
- **Map pins:** add entries to `js/trips.js`. `id` is the ISO numeric country code (it highlights the country), `lat`/`lon` place the pin, `photo` points at an image in `assets/trips/`.
- **Socials:** YouTube is a placeholder. To turn it on, set its `href`, remove `is-soon` and `aria-disabled`, and change the label from `soon`.
- **Deep links:** `/#about`, `/#work`, `/#games`, `/#games/snake`, `/#map`, `/#contact`, `/#settings`.
- **Keyboard:** `1`–`6` open the folders and `Esc` closes. Coin: `H`/`T`. Blackjack: `H`it, `S`tand, `D`ouble. Snake: arrows/WASD, space to pause.
