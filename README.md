# Alexei Raymond author site

A lean Astro static site for Alexei Raymond's author website. It deploys to
GitHub Pages and intentionally uses no client framework, backend, CMS, or
runtime image service.

## Local development

```bash
npm install
npm run dev
```

Build the production site:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Content

Structured author, cycle, publication, and piece metadata lives in
`site-data.json`. Full-text reading pages live in `src/content/accounts/` and
are connected to their piece through the optional `account` entry in
`site-data.json`.

Important conventions:

- Dates use `DD/MM/YYYY`.
- Upcoming pieces use `"date": null`, include the `Upcoming` tag, and have an
  empty external link.
- Defunct publications include the `Defunct` tag and have an empty external
  link.
- A piece's `cycle` is its primary cycle. Hinge pieces may also have a
  `cycles` array, which must include the primary cycle.
- Cover paths use `covers/...` and resolve under `src/assets/`.

## Images

Production covers belong in:

```text
src/assets/covers/cycles/
src/assets/covers/pieces/
```

The homepage hero and interview cover live directly under
`src/assets/covers/`. Decorative page images live under
`src/assets/page-visuals/`.

After adding or replacing an image, update its path in `site-data.json`, then
run `npm run build`. Astro generates the responsive production derivatives;
do not commit generated `dist/` files or temporary/backup images.

## Validation

```bash
npm run verify:data
npm run check:assets
npm run build
npm run check:metadata
npm run check:links:local
npm run audit:privacy
```

Use `npm run check:links` when external link availability also needs to be
tested. Use `npm run audit:privacy:deep` before a major public-repository
cleanup.

## Deployment

`.github/workflows/deploy.yml` builds with Node 22 and deploys `dist/` to
GitHub Pages after every push to `main`.

- Site: `https://suttreeglanton.github.io`
- Base path: `/AlexeiRaymond`

GitHub Pages should use **GitHub Actions** as its deployment source.
