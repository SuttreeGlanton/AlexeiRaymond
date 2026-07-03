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

Piece counts on the home page are computed automatically from `site-data.json`.

## Covers

Put cover images in `public/covers/` and reference them in `site-data.json` without a leading slash:

```json
"cover": "covers/my-piece.jpg"
```

The site is designed to look finished even before cover photos exist. Empty `cover` values render typographic placeholders.

## Deployment

The site deploys to GitHub Pages through `.github/workflows/deploy.yml` using the official Astro GitHub Action.

The project is configured as a GitHub Pages project site:

- `site`: `https://suttreeglanton.github.io`
- `base`: `/AlexeiRaymond`

After pushing to `main`, go to the repository's **Settings → Pages** and choose **GitHub Actions** as the Pages source. Future pushes to `main` will build and deploy automatically.
