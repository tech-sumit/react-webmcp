# Site builder prompt (Claude API → Astro files)

> The production pipeline uses **Claude API** to return a **JSON map** of file paths → source (not Cursor CLI). The same creative rules apply when hand-editing or running `generate-site.sh` with Claude Code locally.
>
> **Inputs:** `design-spec.md` (markdown brief + image placement notes), `content/site.json` (copy + merged `design` tokens), `public/images/` (photos).

## Workspace layout

```
./design-spec.md     — Art direction, layout signature, section order, image notes
./content/site.json  — Business copy + design.* (fonts, motion, surfaces, etc.)
./public/images/     — Photos (use real paths in components)
./src/layouts/Layout.astro  — DO NOT MODIFY — loads fonts/CSS vars from site.json
./src/styles/global.css    — Shared utilities; may add component-scoped classes only if needed
```

## What to build

1. **Landing page** (`src/pages/index.astro`): compose sections in `site.json.design.section_order` when present.
2. **Components** (`src/components/*.astro`): implement `Navbar`, `Hero`, `Features`, `About`, `Services`, `Testimonials`, `FAQ`, `Contact`, `Footer` — each reads from `../../content/site.json`.
3. **Implement `design`**: honor `layout_signature`, `hero_treatment`, `nav_style`, `motion_level`, and `anti_patterns` (do not ship forbidden clichés).
4. **Imports:** `import siteData from '../../content/site.json'` from every `src/` file (never `../content/site.json`).

## Technical rules

- Tailwind only; no new dependencies.
- Accessible: contrast for `surface_tone`, focus-visible, aria-labels, semantic headings.
- Images: `siteData.deploy.base` + `/images/...`; prefer `width`/`height` or `aspect-ratio` for CLS.
- Lazy-load below-fold images.
- Do not modify `Layout.astro`, `package.json`, `astro.config.mjs`, `tailwind.config.mjs`, `.github/`, `.pages.yml`.

## Legacy reference (Cursor CLI)

If you use Cursor CLI locally with a mockup image, replace `design-spec.md` with visual reference to `mockup.png` and keep all rules above — the hosted pipeline prefers the markdown spec + `design` JSON.
