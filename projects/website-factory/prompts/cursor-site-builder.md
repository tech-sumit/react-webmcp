# Cursor CLI Site Builder Prompt

> Used by the n8n pipeline (Layer 6) to instruct Cursor CLI to generate
> the actual website code from the design mockup and content data.
>
> Invoked via: `agent -p --force --model "claude-4-sonnet" "$(cat prompt.txt)"`

## Prompt

```
You are building a production-ready website for a local business. Your workspace
contains everything you need:

FILES IN YOUR WORKSPACE:
1. ./mockup.png — A landing page design mockup. Implement this design as closely
   as possible in code.
2. ./content/site.json — All business content (name, tagline, services, FAQ,
   testimonials, hours, contact info, SEO data). Read this file and use it for
   ALL text content. NEVER hardcode business-specific text.
3. ./public/images/ — Business photos. Reference these in your components.
4. ./src/layouts/Layout.astro — Base HTML layout with SEO meta tags. Extend it.
5. ./src/styles/global.css — Base CSS with Tailwind directives and utility classes.
   You can add to this file but don't remove existing content.

WHAT YOU MUST BUILD:

1. LANDING PAGE (src/pages/index.astro):
   - Import and compose all section components
   - Read content from ../../content/site.json
   - Pass data to each component as props
   - Must match the mockup's visual layout and flow

2. COMPONENTS (src/components/):
   Create these Astro components, each in its own file:

   a) Navbar.astro — Sticky navigation bar
      - Business name/logo on left
      - Nav items from site.json (nav_items array)
      - CTA button on right
      - Mobile hamburger menu with slide-out drawer
      - Transparent on hero, solid on scroll

   b) Hero.astro — Full-bleed hero section
      - Background image with dark gradient overlay
      - Business name as <h1>
      - Tagline/headline
      - Two CTA buttons (primary filled, secondary outlined)
      - Match the mockup's color scheme and proportions

   c) Features.astro — Feature cards section
      - 3-column grid (stacks on mobile)
      - Icon + title + description per card
      - Data from site.json features array
      - Subtle hover effects (scale, shadow)

   d) About.astro — About section
      - Title + markdown body from site.json
      - Optional image alongside text
      - Clean, readable typography

   e) Services.astro — Services list/grid
      - Data from site.json services array
      - Icon + title + description
      - Card or list layout matching the mockup

   f) Testimonials.astro — Customer testimonials
      - Data from site.json testimonials array
      - Quote, author name, star rating
      - Card layout or carousel style

   g) FAQ.astro — Frequently asked questions
      - Data from site.json faq array
      - Accordion-style (click to expand)
      - Pure CSS/JS, no framework dependencies

   h) Contact.astro — Contact section
      - Phone, email, address from site.json
      - Google Maps embed if google_maps_url exists
      - Business hours table
      - CTA to call or email

   i) Footer.astro — Site footer
      - Business name, address, phone
      - Quick links matching nav items
      - Copyright year (dynamic)
      - Social links if available

   j) AmenityBadges.astro (if the mockup shows amenity badges)
      - Horizontal row of badges
      - Icon + label per badge
      - Data from site.json amenities array

STYLING REQUIREMENTS:
- Use Tailwind CSS utility classes for ALL styling
- Match the mockup's colors using CSS custom properties from global.css:
  --color-primary, --color-primary-dark, --color-primary-light, --color-accent
- Use the pre-built utility classes: .btn-primary, .btn-secondary, .section-padding,
  .container-wide, .heading-xl, .heading-lg, .heading-md, .text-body
- Use the animation classes: .animate-fade-in, .animate-slide-up
- Mobile-first responsive design:
  - Single column on mobile
  - Multi-column grids on md: and lg: breakpoints
  - Proper touch targets (min 44px)
  - Readable font sizes
- Smooth scroll behavior between sections
- Subtle hover transitions on interactive elements
- Proper contrast ratios (WCAG AA minimum)

TECHNICAL REQUIREMENTS:
- All content MUST be read from content/site.json — no hardcoded text
- Use Astro's built-in features: frontmatter for data, expressions for rendering
- Semantic HTML5 elements (<nav>, <main>, <section>, <article>, <footer>)
- Accessible: proper aria-labels, alt text, focus states, skip-to-content link
- Performance: lazy load images below the fold, minimal JavaScript
- JSON-LD structured data is already in Layout.astro

DO NOT:
- Create test files or test directories
- Modify .github/workflows/deploy.yml
- Modify public/admin/ directory (Decap CMS — leave as-is)
- Modify package.json or install new dependencies
- Add analytics scripts, tracking pixels, or cookie banners
- Use React, Vue, Svelte, or any frontend framework — pure Astro + vanilla JS only
- Create more than one page (just index.astro for now)

QUALITY BAR:
Your output should match the visual quality of these reference sites:
- gatsby-ecommerce-theme.netlify.app — polished typography, clean grid layouts
- netlify.cms-demo.wix.dev — impactful hero, clear CTAs, stats sections
- infallible-varahamihira-058515.netlify.app — Tailwind + clean component architecture

When in doubt, refer back to the mockup image (./mockup.png) as the source of truth
for layout, colors, spacing, and visual hierarchy.

START NOW. Read the mockup, read site.json, then generate all the components and the
index page. Build the full site.
```

## Cursor CLI Invocation Command

```bash
cd "${PROJECT_DIR}/site"

agent -p --force --model "claude-4-sonnet" "$(cat <<'PROMPT'
<insert the prompt above>
PROMPT
)"
```

## Environment

| Variable          | Source                    |
| ----------------- | ------------------------ |
| `CURSOR_API_KEY`  | Vault: secret/data/n8n/cursor |
| `PROJECT_DIR`     | /tmp/website-factory/{project_id} |

## Expected Output

After Cursor CLI completes, the workspace should contain:

```
src/
  pages/
    index.astro              — Full landing page composing all components
  components/
    Navbar.astro             — Sticky responsive nav
    Hero.astro               — Full-bleed hero with CTAs
    Features.astro           — 3-column feature cards
    About.astro              — About section
    Services.astro           — Services grid/list
    Testimonials.astro       — Customer reviews
    FAQ.astro                — Accordion FAQ
    Contact.astro            — Contact info + map + hours
    Footer.astro             — Site footer
    AmenityBadges.astro      — (optional) Badge row
  layouts/
    Layout.astro             — Updated with proper meta tags
  styles/
    global.css               — Extended with site-specific styles
```

## Post-Generation Validation

Check these conditions in the n8n Code Node after Cursor CLI exits:

1. `src/pages/index.astro` exists and is > 100 bytes
2. At least 5 `.astro` files in `src/components/`
3. `public/admin/config.yml` still contains `backend:` (not corrupted)
4. `package.json` was not modified (diff check)
5. `.github/workflows/deploy.yml` was not modified
6. No `node_modules/`, `dist/`, or test directories created
