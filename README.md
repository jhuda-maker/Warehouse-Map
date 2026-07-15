# Warehouse Map

A drag-and-drop warehouse layout for GitHub Pages. Crates keep a permanent number; the customer name on a crate is edited as jobs come and go; dragging a crate to a new slot updates its location.

## Files

- `index.html` — page structure
- `style.css` — visual styling
- `data.js` — the physical layout (columns, cage, aisle positions) and the starter crate list
- `app.js` — all interactive logic (render, drag-and-drop, edit, import/export)

## Important: seed data

The layout **shape** (columns A/B/C/D/G/H/K, the Cage, the aisle columns) was transcribed from your photo and matches it. The **crate numbers and names were intentionally left empty** — reliably reading ~130 small cells off a single photo isn't something worth guessing at for real inventory. Populate it one of two ways:

1. **One at a time**: click any "Empty" slot on the page and type in the crate number + customer name.
2. **All at once**: click "Bulk import / load file" and paste one crate per line as `number,name,floor,col,row`, e.g.:
   ```
   26,Tami Bosco,1,D,1
   17,Ruth Barrow,1,G,1
   1,Rick Tucker,1,K,1
   ```
   `floor` is `1` or `2`, `col` is the column letter (A,B,C,D,G,H,K), `row` is the row number shown in the left gutter of that column. This **replaces** the whole layout, so paste your full list at once. You can also load a `.json` file (an array of `{number, name, floor, col, row}` objects) the same way.

## How it works

- **Move a crate**: drag it onto any slot. If the target already has a crate, they swap places.
- **Rename / delete**: click a crate to edit its customer name or delete it entirely.
- **Add**: click any empty slot to add a new crate (you set the permanent number once).
- **Saving**: every change is saved automatically to your browser's local storage, so it persists on reload on that device/browser.
- **Sharing changes with everyone**: local storage is per-browser — it won't update the page for other people who open the site. To make a layout change permanent and visible to everyone, click "Export layout (.json)" after you're done editing, then replace `data.js`'s `SEED_CRATES` value with the exported array (or keep the exported `.json` file in the repo and load it via the bulk-import file picker), commit, and push. GitHub Pages will pick up the update.

## Publishing to GitHub Pages

1. Create a new GitHub repo (or use an existing one) and push these four files (`index.html`, `style.css`, `app.js`, `data.js`) to it — a README isn't required but is fine to include.
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set **Source** to "Deploy from a branch", pick your default branch (e.g. `main`) and `/ (root)`, then save.
4. GitHub will give you a URL like `https://<your-username>.github.io/<repo-name>/` — that's your live warehouse map.
5. Any time you push a change (e.g. an updated `data.js` after exporting a new layout), the live site updates automatically within a minute or two.

## Adjusting the physical layout

If a rack is added/removed or row counts are wrong, edit `FLOOR_DEF` at the top of `data.js` — every slot on the page is generated from that definition, so the grid, aisles, and cage all follow automatically.
