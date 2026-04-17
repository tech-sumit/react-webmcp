# Website Factory — Architecture Document

> AI-powered automated website pipeline built on the existing n8n infrastructure.
> Each site is **uniquely designed by AI** — Claude generates a detailed design
> specification, then the Claude API builds the actual Astro components on top
> of a base template with Pages CMS and GitHub Actions pre-configured.
>
> **Implementation note (Feb 2026):** The original design referenced OpenAI Image API
> for mockup generation and Cursor CLI for code generation. The implemented pipeline
> uses **Anthropic Claude exclusively** — Claude generates both the design spec (text)
> and the site code (via API). GitHub owner is `tech-sumit`. Project state is stored
> in a JSON file (not SQLite) for n8n container compatibility. Sections below marked
> with "*(original design)*" describe the initial architecture; the workflow.json
> reflects the actual implementation.
>
> **Enhanced pipeline (Feb 2026):** Added Google Maps scraping via
> `gosom/google-maps-scraper` (Docker), existing website analysis, and Claude Vision
> image classification. The pipeline now runs 8 steps: scrape → analyze → classify →
> content → design → code → validate → push. Real photos and business data are
> automatically extracted and integrated into generated websites.

---

## Design Philosophy

**Not template injection — AI-native site generation.**

Traditional website factories inject content into fixed templates. This system takes a
fundamentally different approach:

1. **AI creates the design brief** — Claude generates a detailed design specification
   from enriched business data (category, style, branding, reviews).
2. **AI writes the code** — Claude API receives the design spec + content JSON + a
   detailed prompt and generates all Astro components on top of a base scaffold.
3. **Every site is unique** — no two businesses get the same layout, just shared
   infrastructure (Pages CMS, GitHub Actions, deploy pipeline).

### Design Inspirations

Sites that represent the quality bar we're targeting:

- [Gatsby E-commerce Theme](https://gatsby-ecommerce-theme.netlify.app/) — clean grid layouts, polished typography
- [Wix Ticketing Demo](https://netlify.commerce-ticketing-demo.wix.dev/) — bold hero sections, event-driven design
- [Wix Education CMS](https://netlify.cms-demo.wix.dev/) — clear CTAs, statistics blocks, testimonials
- [UrbanGarden Gatsby+Netlify CMS](https://infallible-varahamihira-058515.netlify.app/) — Gatsby + Netlify CMS + Tailwind

### Sample Output

A sample mockup generated for **Bollywood Multiplex** (Old Mundhwa Rd, Kharadi, Pune):

> Full-bleed hero image of the cinema exterior at night, golden/warm color scheme,
> navigation bar (Home, Movies, Showtimes, Facilities, Contact, Book Tickets),
> welcome headline with CTA buttons, feature cards (Latest Movies, Comfortable
> Seating, Easy Parking), address bar, and amenity badges (Snacks, Wheelchair
> Accessible, Family Friendly).

This design brief is fed to the Claude API which generates all the actual page code.

---

## Infrastructure Baseline (What We Already Have)

| Component             | Status | Detail                                                        |
| --------------------- | ------ | ------------------------------------------------------------- |
| n8n (orchestration)   | Ready  | Docker, PostgreSQL, Redis queue mode, Vault, Prometheus       |
| Cloudflare Tunnel     | Ready  | Secure webhook ingress at `n8n.panditai.org`                  |
| Cloudflare API        | Ready  | Token with DNS + Tunnel permissions, Terraform module         |
| GitHub API            | Ready  | Token configured, Terraform module for repo management        |
| HashiCorp Vault       | Ready  | KV v2 secrets engine, n8n external secrets integration        |
| PostgreSQL            | Ready  | Running in Docker, available for metadata storage             |
| Grafana Cloud         | Ready  | Metrics + Logs + Dashboards for observability                 |
| NemoClaw AI Agent     | Ready  | LLM-powered agent with n8n/vault/terraform skills             |
| Terraform             | Ready  | Modules: Cloudflare, GitHub, S3, Parallels VM                 |
| Makefile CLI          | Ready  | 30+ targets for lifecycle, workflows, secrets, terraform      |

---

## System Architecture Overview

### Enhanced 8-Step Pipeline

```
Job Config JSON
    │
    ▼
┌─ Parse Job Config ─────────────────────────────────────────────────────────────┐
│                                                                                 │
│  Step 1: Scrape Google Maps ──┐                                                │
│  (gosom/google-maps-scraper)  │                                                │
│  → business data, images,     ├──▶  Step 3: Download + Classify Images         │
│    reviews, hours, phone      │     (Claude Vision API)                        │
│                               │     → category, placement, quality score       │
│  Step 2: Analyze Existing     │     → image-manifest.json                      │
│  Website (curl + python3)    ─┘                                                │
│  → nav, colors, content,                                                       │
│    structure                          │                                        │
│                                       ▼                                        │
│  Step 4: Generate Content ◀── enriched with GMaps data + image manifest       │
│  (Claude API)                  + website analysis                              │
│  → content.json with real                                                      │
│    data, image references             │                                        │
│                                       ▼                                        │
│  Step 5: Build Design Spec ◀── image assignments (hero, gallery, menu)        │
│  → design-spec.md                                                              │
│                                       │                                        │
│                                       ▼                                        │
│  Step 6: Generate Site Code (Claude API)                                       │
│  → Astro components with real <img> tags                                       │
│                                       │                                        │
│                                       ▼                                        │
│  Step 7: Validate (files, imports, image references)                           │
│                                       │                                        │
│                                       ▼                                        │
│  Step 8: Push to GitHub + Enable Pages                                         │
│  → Images ship in initial commit (atomic deploy)                               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

Supporting Services:
  JSON Store ─── Vault ─── Cloudflare ─── GitHub ─── Claude (Anthropic)
  Docker (gmaps-scraper) ─── Pages CMS (cms.panditai.org)
```

Steps 1-3 are conditional — they only run when `google_maps_url` or `existing_website`
are present in the job config. Without them, the pipeline runs steps 4-8 exactly as before.

---

## Detailed Architecture by Layer

### Layer 1: Intake (n8n Form Trigger)

**Uses:** n8n built-in Form Trigger node (same pattern as Instagram downloader)

No external UI framework needed for MVP — n8n Form Trigger provides a hosted form at a webhook URL, accessible via Cloudflare Tunnel.

**Form Fields:**

| Field             | Type       | Required | Notes                                    |
| ----------------- | ---------- | -------- | ---------------------------------------- |
| `business_name`   | Text       | Yes      | Used for repo name, site title           |
| `google_maps_url` | URL        | Yes      | For data enrichment                      |
| `category`        | Dropdown   | Yes      | restaurant / salon / agency / generic    |
| `description`     | Textarea   | No       | Business description, fed to AI          |
| `style_preset`    | Dropdown   | Yes      | modern-dark / clean-light / bold-color   |
| `custom_domain`   | Text       | No       | e.g. `mybusiness.com`                    |
| `client_email`    | Email      | Yes      | For notifications and CMS invite         |
| `logo_url`        | URL        | No       | Logo image URL                           |
| `primary_color`   | Text       | No       | Hex color code, e.g. `#2563EB`          |

**Endpoint:** `https://n8n.panditai.org/form/website-factory`

---

### Layer 2: Input Validation & Normalization (n8n Code Node)

**Node type:** Code (JavaScript)

**Responsibilities:**
- Validate required fields
- Normalize business name → GitHub repo slug (`my-business-name`)
- Extract Google Place ID from Maps URL
- Set defaults for optional fields (color, style)
- Generate unique project ID (UUID)
- Check if repo name already exists via GitHub API

**Output schema:**

```json
{
  "project_id": "uuid",
  "business_name": "My Business",
  "repo_slug": "my-business-name",
  "place_id": "ChIJ...",
  "category": "restaurant",
  "description": "...",
  "style": "modern-dark",
  "domain": "mybusiness.com",
  "client_email": "client@email.com",
  "logo_url": "https://...",
  "primary_color": "#2563EB"
}
```

---

### Layer 3: Data Enrichment (Google Maps Scraper + Website Analysis)

Enrichment now uses two independent scrapers — no API keys required for data extraction.

#### 3a. Google Maps Scraper (`scripts/scrape-gmaps.sh`)

**Uses:** `gosom/google-maps-scraper` via Docker — headless browser scraper that extracts
33+ fields from any Google Maps listing URL.

**Invocation:** Pass a Google Maps URL → Docker container scrapes the listing → outputs JSON.

**Extracted data:**
- Business name, phone, address, hours, rating, review count
- Categories, about/highlights, atmosphere, offerings
- All image URLs (upgraded to high-res `w1200-h800`)
- User reviews (for authentic testimonials)
- Reservation links (Zomato, Swiggy, etc.)

**Output:** `gmaps-data.json` (raw) + `gmaps-enrichment.json` (normalized) + `images/gmaps/` (downloaded photos)

**Runtime:** ~30s per listing. No API key needed.

#### 3b. Website Analyzer (`scripts/scrape-website.sh`)

**Uses:** `curl` + `python3` HTML parser — lightweight, no headless browser needed.

**Extracted data:**
- Text content, navigation structure
- Color palette (from inline CSS/styles)
- Meta tags (title, description, OG images)
- Internal page URLs
- Key images (logo, hero, gallery) — up to 15

**Output:** `website-analysis.json` + `images/website/` (downloaded images)

#### 3c. Image Classifier (`scripts/classify-images.sh`)

**Uses:** Claude Vision API (claude-sonnet-4) — base64-encoded images sent in a single API call.

**Per-image classification:**
```json
{
  "filename": "rooftop.jpg",
  "category": "interior",
  "subject": "Rooftop restaurant with city skyline view at dusk",
  "quality": 9,
  "placement": ["hero", "gallery"],
  "mood": "atmospheric"
}
```

- `category`: food, drink, interior, exterior, team, rooftop-view, menu, logo, ambiance, event, decor, signage
- `placement`: where it should be used — hero, gallery, about, services, menu, testimonials-bg, footer, header
- `quality`: 1-10 score (blurry/bad vs crisp/professional)
- Images with quality < 5 are filtered out

**Output:** `image-manifest.json` — fed into content generation and design spec prompts.

**Cost:** ~$0.02-0.05 per batch of 10-15 images.

---

### Layer 4: AI Content Generation (n8n HTTP Request → Claude)

**Uses:** Anthropic Claude API (via NemoClaw API key already in Vault)

**n8n implementation:** HTTP Request node calling `https://api.anthropic.com/v1/messages`

**AI generates the following content pieces:**

| Content Piece     | Input                                        | Output                           |
| ----------------- | -------------------------------------------- | -------------------------------- |
| Headline          | Business name, category, description         | 1 primary + 2 alternates        |
| About Section     | Description, reviews, category               | 2-3 paragraphs                  |
| Services/Menu     | Category, description, reviews               | Structured list with descriptions|
| FAQ               | Category, reviews, hours, location           | 5-8 Q&A pairs                   |
| SEO Meta          | All above                                    | Title, description, keywords     |
| Call-to-Action    | Category, phone, hours                       | CTA text + button labels         |
| Testimonials      | Top reviews (rewritten for grammar/clarity)  | 3-5 polished testimonials        |

**Prompt template stored at:** `projects/website-factory/prompts/content-generation.md`

**System prompt strategy:**
- Role: "You are a professional web copywriter for small businesses"
- Context: All enriched business data injected
- Format: JSON output with defined schema
- Constraints: No hallucinated facts, only use provided data

**Output:** Single JSON blob (`content.json`) with all content sections — used by both the
image generation prompt (Layer 5) and the Cursor CLI site builder (Layer 6).

---

### Layer 5: AI Design Mockup Generation (n8n HTTP Request → OpenAI Image API)

**This is the creative core of the pipeline.** Instead of selecting from fixed templates,
an AI image model generates a bespoke landing page design for each business.

**Uses:** OpenAI Image Generation API via n8n HTTP Request node

**API call:**

```
POST https://api.openai.com/v1/images/generations
```

**n8n HTTP Request node configuration:**

```json
{
  "model": "gpt-image-1",
  "prompt": "{{ $json.image_prompt }}",
  "n": 1,
  "size": "1024x1792",
  "quality": "high",
  "output_format": "png",
  "background": "opaque"
}
```

**Headers:**
```
Authorization: Bearer {{ $credentials.openaiApi.apiKey }}
Content-Type: application/json
```

**Prompt construction (n8n Code Node before the HTTP call):**

The image prompt is assembled from enriched data + content + style preferences:

```javascript
const data = $input.first().json;

const imagePrompt = `
Design a professional, modern website landing page for "${data.business_name}",
a ${data.category} located at ${data.address.city}, ${data.address.state}.

LAYOUT (top to bottom):
- Navigation bar: Home, ${data.nav_items.join(', ')}, Contact Us, CTA button "${data.cta_text}"
- Hero section: Large high-quality image of a ${data.category} exterior/interior,
  business name "${data.business_name}" as headline,
  tagline "${data.content.headline}",
  two CTA buttons
- Features section: 3 icon cards showing key offerings
- Address bar with location: "${data.address.full}"
- Amenity badges row at bottom

STYLE:
- Color scheme: ${data.style} palette, primary color ${data.primary_color}
- Typography: modern, clean, professional
- Overall feel: premium, trustworthy, inviting
- Full-width design, mobile-friendly proportions
- Photorealistic hero image, flat/modern icons for features

IMPORTANT: This must look like an actual website screenshot, not a wireframe.
Include realistic text, proper spacing, and visual hierarchy.
The design should match the quality of sites like gatsby-ecommerce-theme.netlify.app
or modern Wix/Squarespace templates.
`;

return { image_prompt: imagePrompt };
```

**Response handling (n8n Code Node after HTTP call):**

GPT image models return base64-encoded PNG. The n8n Code Node decodes and saves it:

```javascript
const response = $input.first().json;
const b64Image = response.data[0].b64_json;

// Convert base64 to binary buffer
const imageBuffer = Buffer.from(b64Image, 'base64');

// Save to workspace for Cursor CLI to reference
const fs = require('fs');
const mockupPath = `/tmp/website-factory/${data.project_id}/mockup.png`;
fs.mkdirSync(`/tmp/website-factory/${data.project_id}`, { recursive: true });
fs.writeFileSync(mockupPath, imageBuffer);

return {
  mockup_path: mockupPath,
  mockup_b64: b64Image,  // Keep for GitHub commit if needed
  project_id: data.project_id
};
```

**Secrets:** OpenAI API key stored in Vault at `secret/data/n8n/openai`

**Sample output** — for Bollywood Multiplex, Pune:

> A cinema website with golden/warm dark theme, full-bleed hero image of the multiplex
> at night with spotlights, "Welcome to Bollywood Multiplex" headline, Book Tickets /
> View Showtimes CTAs, feature cards (Latest Movies, Comfortable Seating, Easy Parking),
> address bar, and amenity badges (Snacks & Beverages, Wheelchair Accessible, Family Friendly).

**Cost:** ~$0.04-0.08 per image (GPT-image-1, high quality, 1024x1792)

---

### Layer 6: AI Site Generation (Cursor CLI)

**This is the build step.** Cursor CLI takes the mockup image + content JSON + a detailed
prompt and generates the actual website code on top of a base template scaffold.

**Why Cursor CLI instead of template injection:**
- Each site gets **unique components, layouts, and styling** — not cookie-cutter templates
- The AI can interpret the mockup's visual design and translate it to real code
- Handles responsive design, animations, and component architecture automatically
- Can reference design inspiration sites for quality standards

#### 6a. Base Template Scaffold

A minimal GitHub template repo (`panditai/website-factory-base`) with infrastructure
pre-configured but **no page content or styling** — Cursor generates all of that:

```
website-factory-base/
├── src/
│   ├── pages/
│   │   └── index.astro          # Placeholder — Cursor replaces this
│   ├── layouts/
│   │   └── Layout.astro         # Base HTML shell with <head>, SEO meta
│   ├── components/
│   │   └── .gitkeep             # Cursor generates components here
│   └── styles/
│       └── global.css           # CSS reset + base variables only
├── public/
│   └── images/                  # ← Media uploads
│   │   ├── index.html
│   │   └── config.yml           # ← Generated per-site by n8n
│   └── images/                  # Business photos placed here
├── content/
│   └── site.json                # ← AI-generated content injected here
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions: build → deploy to GitHub Pages
├── astro.config.mjs
├── package.json
├── tailwind.config.mjs          # Tailwind CSS for utility-first styling
├── tsconfig.json
└── README.md
```

**Key point:** The base template has the **deployment pipeline, `.pages.yml` CMS config, and project
structure** ready — but the actual pages, components, and visual design are generated
fresh by Claude API for each business.

#### 6b. Cursor CLI Invocation (n8n Execute Command Node)

n8n runs the Cursor CLI agent in headless mode via an Execute Command node:

```bash
# Set up workspace
export CURSOR_API_KEY="${CURSOR_API_KEY}"
PROJECT_DIR="/tmp/website-factory/${PROJECT_ID}"

# Clone the base template
git clone https://github.com/panditai/website-factory-base.git "${PROJECT_DIR}/site"

# Copy mockup and content into workspace
cp "${PROJECT_DIR}/mockup.png" "${PROJECT_DIR}/site/mockup.png"
cp "${PROJECT_DIR}/content.json" "${PROJECT_DIR}/site/content/site.json"
cp -r "${PROJECT_DIR}/photos/"* "${PROJECT_DIR}/site/public/images/"

# Run Cursor CLI to generate the site
cd "${PROJECT_DIR}/site"

agent -p --force --model "claude-4-sonnet" "$(cat <<'PROMPT'
You are building a production website for a local business. You have:

1. A landing page design mockup: ./mockup.png — implement this design EXACTLY
2. Business content data: ./content/site.json — use this for all text content
3. Business photos: ./public/images/ — reference these in the site

REQUIREMENTS:
- Build the landing page in src/pages/index.astro matching the mockup pixel-perfectly
- Create reusable Astro components in src/components/ for each section
  (Hero, Features, Testimonials, FAQ, Contact, Footer, Navbar, etc.)
- Use Tailwind CSS for all styling — match colors, spacing, typography from the mockup
- Make it fully responsive (mobile-first, looks great on all screen sizes)
- Read content from content/site.json — DO NOT hardcode any business-specific text
- Add smooth scroll, subtle animations, and hover effects
- Ensure Lighthouse score > 90 for performance, accessibility, SEO
- Keep the .pages.yml file intact (Pages CMS config) — do not modify it
- Add proper SEO meta tags, Open Graph tags, and structured data (JSON-LD)
- Use semantic HTML throughout

STYLE REFERENCES (match this quality level):
- gatsby-ecommerce-theme.netlify.app — clean grids, polished typography
- netlify.cms-demo.wix.dev — clear CTAs, statistics blocks
- infallible-varahamihira-058515.netlify.app — Tailwind + clean sections

DO NOT create test files. DO NOT modify .github/, .pages.yml, or package.json.
Focus only on src/ pages, components, styles, and the Layout.
PROMPT
)"
```

**Expected Cursor CLI behavior:**
- Reads the mockup image and interprets the visual design
- Reads `content/site.json` for all business text
- Generates 8-15 Astro component files in `src/components/`
- Generates page files in `src/pages/` (index, about, contact, etc.)
- Updates `src/styles/global.css` with custom CSS variables matching the mockup
- Updates `src/layouts/Layout.astro` with proper meta tags

**Execution time estimate:** 3-8 minutes per site

**n8n node configuration:**

| Parameter           | Value                                             |
| ------------------- | ------------------------------------------------- |
| Node type           | Execute Command                                   |
| Command             | Shell script (above)                              |
| Working directory   | `/tmp/website-factory/${project_id}`               |
| Timeout             | 600s (10 min)                                     |
| Environment vars    | `CURSOR_API_KEY`, `PROJECT_ID`, `GITHUB_TOKEN`    |

**Secrets:** Cursor API key stored in Vault at `secret/data/n8n/cursor`

#### 6c. Post-Generation Validation (n8n Code Node)

After Cursor CLI completes, validate the output:

```javascript
const fs = require('fs');
const projectDir = `/tmp/website-factory/${data.project_id}/site`;

// Check critical files exist
const requiredFiles = [
  'src/pages/index.astro',
  'src/layouts/Layout.astro',
  '.pages.yml',
  '.github/workflows/deploy.yml',
  'package.json'
];

const missing = requiredFiles.filter(f => !fs.existsSync(`${projectDir}/${f}`));
if (missing.length > 0) {
  throw new Error(`Cursor CLI failed to generate: ${missing.join(', ')}`);
}

// Check that components were actually generated
const components = fs.readdirSync(`${projectDir}/src/components`);
if (components.length < 3) {
  throw new Error(`Too few components generated (${components.length}), expected 5+`);
}

// Verify Pages CMS config exists
const pagesConfig = fs.readFileSync(`${projectDir}/.pages.yml`, 'utf8');
if (!pagesConfig.includes('content:')) {
  throw new Error('Pages CMS config was corrupted');
}

return {
  status: 'validated',
  components_generated: components.length,
  project_dir: projectDir
};
```

---

### Layer 7: GitHub Repository & Pages Setup

**Uses:** GitHub REST API via n8n HTTP Request nodes + git CLI

**Secrets:** GitHub token from Vault at `secret/data/n8n/github`

**Steps (sequential n8n nodes):**

```
┌─────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│ Create GitHub   │───▶│ Push Cursor-generated│───▶│ Enable Pages     │
│ Repo (empty)    │    │ code via git push    │    │ (source: Actions)│
└─────────────────┘    └──────────────────────┘    └──────────────────┘
        │                                                  │
        ▼                                                  ▼
┌─────────────────┐                              ┌──────────────────┐
│ Set Repo Topics │                              │ Add CNAME file   │
│ & Description   │                              │ (if custom       │
└─────────────────┘                              │  domain)         │
                                                 └──────────────────┘
```

**API calls:**

| Step                  | Method     | Endpoint / Command                                        |
| --------------------- | ---------- | --------------------------------------------------------- |
| Create repo           | POST       | `/user/repos`                                             |
| Push code             | git CLI    | `git remote add origin && git push -u origin main`        |
| Enable Pages          | POST       | `/repos/{owner}/{repo}/pages`                             |
| Add collaborator      | PUT        | `/repos/{owner}/{repo}/collaborators/{username}`          |
| Create webhook        | POST       | `/repos/{owner}/{repo}/hooks` (build status callback)     |
| Get Pages status      | GET        | `/repos/{owner}/{repo}/pages`                             |

**n8n Execute Command for git push:**

```bash
cd /tmp/website-factory/${PROJECT_ID}/site

# Remove the template origin, add the new repo
git remote remove origin 2>/dev/null || true
git remote add origin https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${REPO_SLUG}.git

# Commit all Cursor-generated code
git add -A
git commit -m "Initial site generation by Website Factory

Business: ${BUSINESS_NAME}
Category: ${CATEGORY}
Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

git push -u origin main
```

**GitHub Actions workflow** (`deploy.yml`) is included in the base template:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]        # Triggers on push AND Pages CMS content edits
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

---

### Layer 8: CMS Integration (Pages CMS)

**Tool:** [Pages CMS](https://pagescms.org) — self-hosted at `cms.panditai.org` — open-source
Git-based CMS that provides a central web admin UI and commits content changes directly to
GitHub repos via the GitHub API.

**Why Pages CMS:**
- Open-source, self-hosted (Docker) — full control
- Central dashboard for all sites at `cms.panditai.org`
- Commits directly to Git — triggers GitHub Actions rebuild automatically
- Rich field types (strings, rich-text, images, lists, objects, numbers)
- Version history via Git — full rollback capability
- No per-site admin UI needed — one CMS manages all repos

**Pre-configured in base template** at `.pages.yml`:

The `.pages.yml` file in each generated repo defines the content schema for Pages CMS.
It maps the `content/site.json` structure to editable fields. Uses `settings.content.merge: true`
to preserve the `deploy` object (injected at build time) that is not exposed in the CMS UI.

**Client edit flow:**

```
Client visits https://cms.panditai.org/{owner}/{repo}
  → GitHub OAuth login
  → Pages CMS dashboard for this repo
  → Edit business name, services, FAQ, testimonials, etc.
  → Click "Save"
  → Pages CMS commits changes to content/site.json on main branch
  → GitHub Actions triggers automatically
  → Astro rebuilds with new content
  → GitHub Pages deploys updated site (< 2 min)
```

**Authentication:** Pages CMS uses its own GitHub App OAuth flow. The client needs:
- A free GitHub account
- The "Website Factory - Pages CMS" GitHub App installed on their repo

---

### Layer 8: Domain & DNS Setup (Cloudflare API)

**Uses:** Cloudflare API via n8n HTTP Request nodes (API token already configured)

**Secrets:** Cloudflare API token + zone info from Vault

**Two scenarios:**

#### Scenario A: Client has domain on Cloudflare (full automation)

```
n8n Code Node: Look up zone ID for domain
  → HTTP Request: Create CNAME record
    → {domain} → {owner}.github.io
  → HTTP Request: Create CNAME record (www redirect)
    → www.{domain} → {owner}.github.io
  → HTTP Request: Enable SSL (Full Strict)
  → n8n Code Node: Update CNAME file in GitHub repo
```

**API calls:**

| Step          | Method | Endpoint                                           |
| ------------- | ------ | -------------------------------------------------- |
| List zones    | GET    | `/zones?name={domain}`                             |
| Create record | POST   | `/zones/{zone_id}/dns_records`                     |
| SSL settings  | PATCH  | `/zones/{zone_id}/settings/ssl`                    |

#### Scenario B: Client has domain elsewhere (manual + instructions)

- n8n generates DNS instruction email with required records
- Provides A records for GitHub Pages IPs:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`
- Includes CNAME for `www` subdomain
- Polling node checks Pages API for domain verification status

---

### Layer 9: Metadata & State Management (SQLite)

**Uses:** SQLite database at `data/website-factory.db` — accessed via n8n Code Nodes
using the `better-sqlite3` package or n8n Execute Command with `sqlite3` CLI.

**Why SQLite over PostgreSQL:**
- Zero additional infrastructure — no separate database service needed
- File-based — easy to back up, inspect, and migrate
- WAL mode for concurrent reads during pipeline execution
- Perfect for the expected throughput (dozens of sites/day, not thousands)
- Full SQL support including JSON functions for querying stored data

**Database schema** (see `db/schema.sql` for full implementation):

```sql
CREATE TABLE website_projects (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id        TEXT UNIQUE NOT NULL,
  business_name     TEXT NOT NULL,
  repo_slug         TEXT NOT NULL,
  repo_url          TEXT,
  category          TEXT NOT NULL,
  client_email      TEXT NOT NULL,
  custom_domain     TEXT,
  status            TEXT NOT NULL DEFAULT 'intake',
  -- intake | enriching | content_gen | mockup_gen | site_building | pushing | deploying | dns_setup | live | error
  
  mockup_image_path TEXT,
  cursor_session_id TEXT,
  enriched_data     TEXT,  -- JSON
  ai_content        TEXT,  -- JSON
  site_config       TEXT,  -- JSON
  pages_url         TEXT,
  cms_url           TEXT,
  
  created_at        TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at        TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  published_at      TEXT,
  error_message     TEXT,
  error_stage       TEXT,
  retry_count       INTEGER DEFAULT 0
);

-- Pipeline execution log for audit trail
CREATE TABLE pipeline_log (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id  TEXT NOT NULL REFERENCES website_projects(project_id),
  stage       TEXT NOT NULL,
  status      TEXT NOT NULL,  -- started | completed | failed | retrying
  message     TEXT,
  duration_ms INTEGER,
  metadata    TEXT,           -- JSON
  created_at  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
```

**Database path:** `data/website-factory.db`
**Setup:** `sqlite3 data/website-factory.db < projects/website-factory/db/schema.sql`

**State machine transitions:**

```
intake → enriching → content_gen → mockup_gen → site_building → pushing → deploying → dns_setup → live
   ↓         ↓            ↓            ↓             ↓             ↓          ↓           ↓
 error     error        error        error         error         error      error       error
                                                     ↑
                                              (most critical —
                                           Cursor CLI may fail,
                                          retry up to 2 times
                                       with adjusted prompt)
```

**Retry strategy:**
- Layers 1-4 (intake through mockup): retry up to 3 times automatically
- Layer 6 (Cursor CLI): retry up to 2 times — on failure, adjust the prompt
  (e.g., simplify layout requirements, reduce component count)
- Layers 7-9 (GitHub/DNS/publish): retry up to 3 times
- After max retries: mark as `error`, notify admin

---

### Layer 10: Notifications

**Uses:** n8n Email (SMTP) or SendGrid node

**Notification triggers:**

| Event                  | Recipient    | Channel        | Content                                       |
| ---------------------- | ------------ | -------------- | --------------------------------------------- |
| Site published         | Client       | Email          | Site URL, CMS login link, DNS instructions    |
| Build failed           | Admin        | Email/Webhook  | Error details, repo link                      |
| Domain verified        | Client       | Email          | Confirmation, SSL status                      |
| Content updated (CMS)  | Admin (opt.) | Webhook        | Change summary                                |

---

### Layer 11: Observability (Grafana Cloud)

**Uses:** Existing Grafana Cloud stack (Prometheus + Loki)

**Metrics to track (via n8n workflow execution metrics already collected):**

- `website_factory_projects_total` (counter by status)
- `website_factory_generation_duration_seconds` (histogram)
- `website_factory_api_calls_total` (counter by service: github, cloudflare, google, anthropic)
- `website_factory_errors_total` (counter by stage)

**Dashboard:** New Grafana dashboard — "Website Factory Pipeline"

- Projects created over time
- Pipeline stage funnel
- Average generation time
- Error rate by stage
- API quota usage

**Alerts:**

- Pipeline stuck > 10 min in any stage
- Error rate > 20% in last hour
- GitHub API rate limit approaching

---

## Complete n8n Workflow Design

### Main Workflow: `website-factory-pipeline`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     n8n Workflow: Website Factory                            │
│                                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐         │
│  │  Form    │──▶│ Validate │──▶│ Save to  │──▶│ Google Places    │         │
│  │ Trigger  │   │ & Slug   │   │ SQLite   │   │ API (Enrich)     │         │
│  └──────────┘   └──────────┘   └──────────┘   └────────┬─────────┘         │
│                                                         │                   │
│  ┌──────────────────────────────────────────────────────▼────────────────┐  │
│  │  STAGE 2: AI CONTENT + DESIGN                                        │  │
│  │                                                                      │  │
│  │  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────────┐  │  │
│  │  │ AI Content   │──▶│ Build Image      │──▶│ OpenAI Image API    │  │  │
│  │  │ Generation   │   │ Prompt (Code)    │   │ (Generate Mockup)   │  │  │
│  │  │ (Claude API) │   │                  │   │ → mockup.png        │  │  │
│  │  └──────────────┘   └──────────────────┘   └──────────┬───────────┘  │  │
│  │                                                        │             │  │
│  └────────────────────────────────────────────────────────┼─────────────┘  │
│                                                           │                │
│  ┌────────────────────────────────────────────────────────▼─────────────┐  │
│  │  STAGE 3: AI SITE GENERATION                                        │  │
│  │                                                                      │  │
│  │  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────────┐  │  │
│  │  │ Clone Base   │──▶│ Inject Content   │──▶│ Cursor CLI Agent    │  │  │
│  │  │ Template     │   │ + Photos + CMS   │   │ (mockup → code)     │  │  │
│  │  │ (git clone)  │   │ Config           │   │ 3-8 min execution   │  │  │
│  │  └──────────────┘   └──────────────────┘   └──────────┬───────────┘  │  │
│  │                                                        │             │  │
│  │  ┌──────────────────────────────────────────┐   ┌──────▼───────────┐  │  │
│  │  │ Validate Output                          │◀──│ Post-Gen Check  │  │  │
│  │  │ (files exist, components count, CMS ok)  │   │ (Code Node)     │  │  │
│  │  └──────────────────────────┬───────────────┘   └──────────────────┘  │  │
│  │                             │                                         │  │
│  └─────────────────────────────┼─────────────────────────────────────────┘  │
│                                │                                            │
│  ┌─────────────────────────────▼─────────────────────────────────────────┐  │
│  │  STAGE 4: PUBLISH & HANDOVER                                          │  │
│  │                                                                       │  │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐   │  │
│  │  │ Create GitHub │──▶│ git push     │──▶│ Enable GitHub Pages     │   │  │
│  │  │ Repo (API)   │   │ (all code)   │   │ (source: GH Actions)    │   │  │
│  │  └──────────────┘   └──────────────┘   └──────────┬───────────────┘   │  │
│  │                                                    │                  │  │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────▼───────────────┐   │  │
│  │  │ Send Client  │◀──│ Update       │◀──│ Cloudflare DNS +        │   │  │
│  │  │ Email (CMS   │   │ SQLite       │   │ Wait for build +       │   │  │
│  │  │ link + URL)  │   │ (status=live)│   │ Verify live (HTTP)     │   │  │
│  │  └──────────────┘   └──────────────┘   └──────────────────────────┘   │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │  ERROR HANDLER (connected to all nodes)                               │   │
│  │  → Log error to SQLite → Retry logic → Admin notification            │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Node Count Estimate: ~30-35 nodes

| Stage                    | Nodes | Type                                               |
| ------------------------ | ----- | -------------------------------------------------- |
| Intake                   | 1     | Form Trigger                                       |
| Validation               | 2     | Code, IF                                           |
| State Tracking           | 4     | Code (JSON file read/write x4)                     |
| Enrichment               | 3     | Code (Places data), Code (parse)                   |
| AI Content               | 2     | HTTP Request (Claude), Code (parse JSON)           |
| Design Spec              | 2     | Code (build spec), Code (pass-through)             |
| Site Generation          | 4     | Code (clone + inject), HTTP Request (Claude API), Code (save files), Code (validate) |
| GitHub + Push            | 4     | HTTP Request (create repo), Execute Command (git push), HTTP Request (enable Pages, CNAME) |
| DNS                      | 3     | HTTP Request (Cloudflare), IF (has domain), Code   |
| Verification             | 3     | Wait, HTTP Request (check live), IF                |
| Notification             | 2     | Email (client), Email/Webhook (admin)              |
| Error handling           | 2     | Error Trigger, Code                                |

---

## Secrets Management (Vault)

All API keys stored in Vault under `secret/data/n8n/`:

| Secret Path                          | Content                    | Status       |
| ------------------------------------ | -------------------------- | ------------ |
| `secret/data/n8n/github`            | `token`, `owner`           | Already set  |
| `secret/data/n8n/cloudflare`        | `api_token`, `account_id`  | Already set  |
| `secret/data/n8n/nemoclaw`          | `api_key` (Anthropic)      | Already set  |
| `secret/data/n8n/google-places`     | `api_key`                  | Optional     |
| `secret/data/n8n/sendgrid`          | `api_key`                  | Optional     |

---

## File Structure

```
projects/website-factory/
├── ARCHITECTURE.md              # This document
├── PROJECT_IDEA.md              # Original project brief
├── README.md                    # Quick start guide
├── workflow.json                # n8n workflow export (main pipeline)
├── jobs/                        # Job config files
│   └── mafia-family-kitchen.json  # Example job with google_maps_url
├── prompts/
│   ├── content-generation.md    # Claude prompt for business content
│   ├── image-mockup.md          # Design spec prompt template (originally for OpenAI)
│   └── cursor-site-builder.md   # Claude Code CLI prompt for code generation
├── base-template/               # The scaffold repo (pushed to tech-sumit/website-factory-base)
│   ├── src/
│   │   ├── pages/
│   │   │   └── index.astro      # Placeholder — Claude API replaces
│   │   ├── layouts/
│   │   │   └── Layout.astro     # Base HTML shell
│   │   ├── components/
│   │   │   └── .gitkeep
│   │   └── styles/
│   │       └── global.css       # CSS reset only
│   ├── .pages.yml               # Pages CMS content schema (hero_image, gallery, rating, etc.)
│   ├── public/
│   │   └── images/              # Real photos placed here by pipeline
│   ├── content/
│   │   └── site.json            # AI-generated content injected here
│   ├── .github/
│   │   └── workflows/
│   │       └── deploy.yml       # GitHub Actions deploy to Pages
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   ├── package.json
│   └── tsconfig.json
├── db/
│   └── schema.sql               # SQLite schema (reference; workflow uses JSON store)
└── scripts/
    ├── run-job.sh               # Main 8-step pipeline (scrape → classify → generate → push)
    ├── scrape-gmaps.sh          # Google Maps scraper (Docker wrapper)
    ├── scrape-website.sh        # Existing website analyzer (curl + python3)
    ├── classify-images.sh       # Claude Vision image classifier
    ├── setup.sh                 # One-time setup (data dir, Vault, template repo)
    ├── generate-site.sh         # Claude Code CLI wrapper (standalone use)
    └── dry-run.sh               # Local test: content + optional site generation
```

---

## Tech Stack (Final — Mapped to Existing Infra)

| Layer              | Tool                      | Status        | Notes                                    |
| ------------------ | ------------------------- | ------------- | ---------------------------------------- |
| Intake UI          | **n8n Form Trigger**      | Existing      | No external UI needed for MVP            |
| Orchestration      | **n8n**                   | Existing      | Main pipeline workflow                   |
| Data Enrichment    | **Google Places API**     | Optional      | Falls back to mock data from form input  |
| AI Content         | **Anthropic Claude API**  | Existing key  | Via NEMOCLAW_API_KEY / ANTHROPIC_API_KEY  |
| AI Design Spec     | **Claude API**            | Existing key  | Text-based design brief (no image gen)   |
| AI Site Builder    | **Claude API**            | Existing key  | JSON response → Astro component files    |
| Static Framework   | **Astro + Tailwind CSS**  | New           | Base template at tech-sumit/website-factory-base |
| CMS                | **Pages CMS**             | Self-hosted   | Git-based, central UI at cms.panditai.org|
| Storage/State      | **JSON file**             | New           | `projects.json` in n8n data dir          |
| Secrets            | **HashiCorp Vault**       | Existing      | GitHub + Cloudflare tokens               |
| Repo Management    | **GitHub API + git CLI**  | Existing      | Token + Terraform module ready           |
| DNS                | **Cloudflare API**        | Existing      | Token + Terraform module ready           |
| Build/Deploy       | **GitHub Actions**        | New           | Workflow in base template                |
| Observability      | **Grafana Cloud**         | Existing      | New dashboard panel                      |
| Notifications      | **SendGrid / SMTP**       | Optional      | Client email delivery                    |

---

## End-to-End Pipeline Timing

| Stage                              | Duration      | Bottleneck              |
| ---------------------------------- | ------------- | ----------------------- |
| Form intake + validation           | instant       | —                       |
| Step 1: Google Maps scraping       | ~30s          | Docker container + scrape|
| Step 2: Website analysis           | 5-10s         | curl + image download   |
| Step 3: Image classification       | 10-20s        | Claude Vision API       |
| Step 4: AI content generation      | 10-20s        | LLM inference           |
| Step 5: Design spec generation     | instant       | Code node (text only)   |
| Step 6: Claude API site generation | **30-90s**    | **Primary bottleneck**  |
| Step 7: Validation                 | instant       | —                       |
| Step 8: Git push + GitHub Pages    | 10-20s        | API calls               |
| GitHub Actions build + deploy      | 1-3 min       | CI pipeline             |
| **Total (with scraping)**          | **~4-10 min** |                         |
| **Total (without scraping)**       | **~3-8 min**  |                         |

---

## MVP Implementation Order

### Phase 1: Foundation (Week 1)

1. ~~Create SQLite database~~ → Done: JSON file storage in n8n container
2. Set ANTHROPIC_API_KEY and GITHUB_TOKEN in `.env` → Done
3. Push base template to `tech-sumit/website-factory-base` → Pending (`make wf-push-template`)
4. ~~Register a GitHub OAuth app for CMS authentication~~ → Done: Pages CMS at cms.panditai.org
5. ~~Build and test AI content generation prompt~~ → Done: workflow.json node wf-node-008

### Phase 2: AI Design Pipeline (Week 2)

6. ~~Build OpenAI image mockup~~ → Replaced with text-based design spec (Claude-only)
7. ~~Build Cursor CLI site generation~~ → Replaced with Claude API in workflow
8. Test full AI pipeline: content → design spec → Claude API → Astro site → deploy
9. Test Pages CMS: client edits → commit → rebuild → live update

### Phase 3: n8n Orchestration (Week 3)

10. ~~Build n8n workflow~~ → Done: 35-node workflow in workflow.json
11. ~~Add error handling~~ → Done: error trigger + handler nodes
12. Import workflow: `make wf-import`
13. End-to-end test via the n8n form: `make wf-test`

### Phase 4: DNS, Notifications & Polish (Week 4)

14. Add Cloudflare DNS automation nodes → Done in workflow
15. Add client notification email with CMS access instructions → Done (SendGrid)
16. Create Grafana dashboard for pipeline monitoring
17. Test with 5-10 real businesses across different categories
18. Set up alerts for pipeline failures

---

## API Rate Limits & Considerations

| API                    | Rate Limit              | Cost per Site | Impact                               |
| ---------------------- | ----------------------- | ------------- | ------------------------------------ |
| GitHub REST API        | 5,000/hr (authenticated)| Free          | ~10 calls per site → 500 sites/hr   |
| Google Maps Scraper    | N/A (Docker)            | Free          | 1 Docker run per site (~30s)         |
| Anthropic Claude (text)| varies by tier          | ~$0.05-0.15   | 2 calls (content + site gen)         |
| Anthropic Claude Vision| varies by tier          | ~$0.02-0.05   | 1 call (image classification)        |
| Cloudflare API         | 1,200/5min              | Free          | 2-3 calls per site                   |
| **Total per site**     |                         | **~$0.07-0.25**|                                      |

---

## Security Considerations

- All API keys in Vault (never in workflow JSON or env vars)
- GitHub repos created as **public** (required for free GitHub Pages)
- Client gets **collaborator** access (not owner) to their repo
- Cloudflare API token scoped to DNS edit only
- n8n form accessible via Cloudflare Tunnel (can add auth later)
- Pages CMS uses GitHub App OAuth — hosted at cms.panditai.org
- Claude API site generation runs in isolated `/tmp/` workspace, cleaned after each build

---

## Future Enhancements (Post-MVP)

- **Multi-page generation:** Claude API generates about, services, contact pages (not just landing)
- **Design iteration loop:** Generate multiple design spec variants → pick best via AI scoring → build
- **Photo optimization:** Sharp/ImageMagick pipeline before commit
- **Analytics injection:** Plausible/Umami snippet in base template
- **Bulk generation:** CSV intake → batch pipeline with parallel Claude API calls
- **Client portal:** Real-time status page showing pipeline progress
- **Webhook callback:** GitHub Actions notifies n8n on build complete (instead of polling)
- **Template evolution:** Save successful generated sites as new base templates
- **Custom domain dashboard:** Client self-service DNS configuration
