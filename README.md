# Alexei Raymond author site

A minimal, black-and-white Astro static site for Alexei Raymond's author website. The project is intentionally data-driven: `site-data.json` is the single source of truth for the site content.

## Local development

```bash
npm install
npm run dev
```

Build and verify the data model:

```bash
npm run build
```

## Editing the site content

All author, cycle, piece, and interview content lives in `site-data.json`.

### Add a new piece

Add a new object to the `pieces` array:

```json
{
  "title": "New Piece Title",
  "cycle": "Dreams",
  "publication": "Magazine Name",
  "date": "31/12/2026",
  "tags": ["Online"],
  "link": "https://example.com/new-piece",
  "cover": "covers/new-piece.jpg"
}
```

Rules:

- `cycle` must match one of the cycle names in `cycles`.
- Dates use European `DD/MM/YYYY` format.
- Upcoming pieces use `"date": null`, include the `"Upcoming"` tag, and leave `link` empty until publication.
- Defunct pieces include the `"Defunct"` tag, leave `link` empty, and add a `note`, for example: `"originally published in X (now defunct)"`.
- `Online` and `In print` are independent tags. Use both when both apply.
- `excerpt` (optional) — a short teaser sentence from the story, without surrounding quotation marks (the site adds its own). On desktop it fades in over the cover on hover; on mobile it shows under the card meta. Omit the field (or leave it empty) and nothing renders.
- `note` (optional) — a small italic line under the card, e.g. for pieces published under a different title. Defunct pieces don't need one; the Defunct tag plus the publication name already tell the story.

## Covers

The site is designed to look finished even before cover photos exist — empty `cover` values render typographic placeholders. When you have photos, there are two ways to add them.

### Automatic (recommended — no manual resizing)

1. `npm install` once, to pull in `sharp` (used only by this script, not by the site itself).
2. Drop raw photos, any size or format, into two folders at the repo root:
   - `raw-covers/cycles/` — name each file after the cycle, e.g. `Portici.jpg` or `Fool's Gold.png`.
   - `raw-covers/pieces/` — name each file after the exact piece title, e.g. `The Boxer.jpg`. A file named `interview.jpg` (any extension) becomes the interview page cover.
   - A file named `header.jpg` (any extension) in `raw-covers/cycles/` becomes the home-page hero backdrop, processed wide (2400×1350).

   Re-running is always safe: replacing a photo in `raw-covers/` and running the script again overwrites the processed copy, and photos can be added in batches whenever they're ready.
3. Run:

   ```bash
   npm run covers
   ```

   This crops each photo to the right aspect ratio (4:5 for cycle tiles, 5:6 for piece cards), converts it to grayscale, resizes and compresses it, writes it into `public/covers/`, and fills in the matching `cover` field in `site-data.json` automatically. It prints a report of what matched and what didn't — rename and re-run for anything unmatched.
4. Review the `site-data.json` diff, then `npm run build` to confirm everything renders, and commit.

`raw-covers/` is gitignored — only the processed output in `public/covers/` gets committed.

### Manual

Put an already-sized image directly in `public/covers/` and reference it in `site-data.json` without a leading slash:

```json
"cover": "covers/my-piece.jpg"
```

## Deployment

The site deploys to GitHub Pages through `.github/workflows/deploy.yml`, which builds with Node 22 (`actions/setup-node`) and publishes with `actions/upload-pages-artifact` and `actions/deploy-pages`.

The project is configured as a GitHub Pages project site:

- `site`: `https://suttreeglanton.github.io`
- `base`: `/AlexeiRaymond`

After pushing to `main`, go to the repository's **Settings → Pages** and choose **GitHub Actions** as the Pages source. Future pushes to `main` will build and deploy automatically.
