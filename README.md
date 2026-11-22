# anshumansarda.github.io

Personal site. A pixel version of me, three liquid-glass folders, and a few games.
Plain HTML/CSS/JS. No build step, no dependencies.

```
index.html          all page content (edit text here)
css/style.css       everything visual
js/main.js          loader, folders, windows, routing
js/liquid.js        refraction filter for the glass (Chromium only; others get frosted glass)
js/pixel.js         pixel icons
js/games/           coin.js, blackjack.js, snake.js
assets/             sprite.png, head.png, me.jpg
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

- **About text** is in `index.html` under `<!-- About -->`. The "now" card is marked `EDIT ME`.
- **Socials:** the X, Spotify, YouTube and email icons are placeholders. To turn one on, set its `href`, remove `is-soon` and `aria-disabled`, and change the label from `soon`.
- **Deep links:** `/#about`, `/#games`, `/#games/snake`, `/#contact`.
- **Keyboard:** `1` `2` `3` open the folders and `Esc` closes. Coin: `H`/`T`. Blackjack: `H`it, `S`tand, `D`ouble. Snake: arrows/WASD, space to pause.
