# Website Factory — Architecture Document

> AI-powered automated website pipeline built on the existing n8n infrastructure.
> Each site is **uniquely designed by AI** — Claude generates a detailed design
> specification, then the Claude API builds the actual Astro components on top
> of a base template with Decap CMS and GitHub Actions pre-configured.
>
> **Implementation note (Feb 2026):** The original design referenced OpenAI Image API
> for mockup generation and Cursor CLI for code generation. The implemented pipeline
> uses **Anthropic Claude exclusively** — Claude generates both the design spec (text)
> and the site code (via API). GitHub owner is `tech-sumit`. Project state is stored
> in a JSON file (not SQLite) for n8n container compatibility. Sections below marked
> with "*(original design)*" describe the initial architecture; the workflow.json
> reflects the actual implementation.

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
   infrastructure (Decap CMS, GitHub Actions, deploy pipeline).

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
| OpenClaw AI Agent     | Ready  | LLM-powered agent with n8n/vault/terraform skills             |
| Terraform             | Ready  | Modules: Cloudflare, GitHub, S3, Parallels VM                 |
| Makefile CLI          | Ready  | 30+ targets for lifecycle, workflows, secrets, terraform      |

---

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         WEBSITE FACTORY PIPELINE                                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌───────────────────────────────────────────────────────┐   │
│  │   INTAKE      │    │              n8n ORCHESTRATION                        │   │
│  │              │    │                                                       │   │
│  │  n8n Form    │───▶│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐   │   │
│  │  Trigger     │    │  │Validate │─▶│ Enrich   │─▶│ AI Content Gen    │   │   │
│  │  (webhook)   │    │  │ Input   │  │ (Google  │  │ (Claude API)      │   │   │
│  └──────────────┘    │  └─────────┘  │  Places) │  └────────┬──────────┘   │   │
│                      │               └──────────┘           │              │   │
│                      │                              ┌───────▼────────────┐  │   │
│                      │                              │ DESIGN SPEC        │  │   │
│                      │                              │ (Claude API)       │  │   │
│                      │                              │ → Design brief MD  │  │   │
│                      │                              └───────┬────────────┘  │   │
│                      │                                      │              │   │
│                      │  ┌───────────────────────────────────▼───────────┐  │   │
│                      │  │          AI SITE GENERATION                   │  │   │
│                      │  │                                              │  │   │
│                      │  │  Clone Base Template (Decap CMS scaffold)    │  │   │
│                      │  │  → Claude API: design spec + prompt + content│  │   │
│                      │  │  → Generates pages, components, styles       │  │   │
│                      │  │  → Git commit all generated code             │  │   │
│                      │  └──────────────────────────┬───────────────────┘  │   │
│                      │                             │                      │   │
│                      │  ┌──────────────────────────▼───────────────────┐  │   │
│                      │  │     PUBLISH & HANDOVER                       │  │   │
│                      │  │                                              │  │   │
│                      │  │  Push to GitHub → Enable Pages →             │  │   │
│                      │  │  Cloudflare DNS → Wait for GH Actions →     │  │   │
│                      │  │  Verify Live → Email Client (CMS access)    │  │   │
│                      │  └──────────────────────────────────────────────┘  │   │
│                      └───────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                     SUPPORTING SERVICES                                   │   │
│  │                                                                           │   │
│  │  JSON Store ─── Vault ─── Cloudflare ─── GitHub ─── Claude (Anthropic)  │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

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

### Layer 3: Data Enrichment (n8n HTTP Request Nodes)

**Uses:** Google Places API (New) via n8n HTTP Request node

**API calls (sequential):**

1. **Place Details** — `GET https://places.googleapis.com/v1/places/{place_id}`
   - Fields: `displayName, formattedAddress, internationalPhoneNumber, regularOpeningHours, reviews, photos, websiteUri, googleMapsUri, rating, userRatingCount, types`

2. **Place Photos** (loop) — `GET https://places.googleapis.com/v1/{photo_name}/media`
   - Download top 5-10 photos
   - Upload to GitHub repo `/public/images/` later

**Secrets:** Google Places API key stored in Vault at `secret/data/n8n/google-places`

**Enriched data output:**

```json
{
  "address": { "street": "...", "city": "...", "state": "...", "zip": "...", "country": "..." },
  "phone": "+1-555-123-4567",
  "hours": { "monday": "9:00 AM – 9:00 PM", ... },
  "rating": 4.5,
  "review_count": 128,
  "top_reviews": [ { "author": "...", "text": "...", "rating": 5 }, ... ],
  "photos": [ { "url": "...", "width": 4032, "height": 3024 }, ... ],
  "coordinates": { "lat": 40.7128, "lng": -74.0060 },
  "categories": ["restaurant", "italian_restaurant"]
}
```

---

### Layer 4: AI Content Generation (n8n HTTP Request → Claude)

**Uses:** Anthropic Claude API (via OpenClaw API key already in Vault)

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
│   ├── admin/                   # ← Decap CMS admin UI (pre-configured)
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

**Key point:** The base template has the **deployment pipeline, CMS admin, and project
structure** ready — but the actual pages, components, and visual design are generated
fresh by Cursor CLI for each business.

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
- Keep the public/admin/ directory intact (Decap CMS) — do not modify it
- Add proper SEO meta tags, Open Graph tags, and structured data (JSON-LD)
- Use semantic HTML throughout

STYLE REFERENCES (match this quality level):
- gatsby-ecommerce-theme.netlify.app — clean grids, polished typography
- netlify.cms-demo.wix.dev — clear CTAs, statistics blocks
- infallible-varahamihira-058515.netlify.app — Tailwind + clean sections

DO NOT create test files. DO NOT modify .github/, public/admin/, or package.json.
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
  'public/admin/index.html',
  'public/admin/config.yml',
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

// Verify the admin directory wasn't modified
const adminConfig = fs.readFileSync(`${projectDir}/public/admin/config.yml`, 'utf8');
if (!adminConfig.includes('backend:')) {
  throw new Error('Decap CMS config was corrupted');
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
    branches: [main]        # Triggers on Cursor push AND Decap CMS edits
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

### Layer 8: CMS Integration (Decap CMS)

**Tool:** [Decap CMS](https://decapcms.org) (formerly Netlify CMS) — open-source Git-based
CMS that provides a web-based admin UI and commits content changes directly to the GitHub repo.

**Why Decap CMS:**
- Open-source, no vendor lock-in
- Commits directly to Git — triggers GitHub Actions rebuild automatically
- Rich widget library (strings, markdown, images, lists, objects)
- Client edits via `/admin/` URL — no separate tool needed
- Version history via Git — full rollback capability

**Pre-configured in base template** at `public/admin/`:

**`public/admin/index.html`:**

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Content Manager</title>
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
</head>
<body>
  <script>DecapCMS.init();</script>
</body>
</html>
```

**`public/admin/config.yml`** — generated per-site by n8n Code Node:

```yaml
backend:
  name: github
  repo: "${GITHUB_OWNER}/${REPO_SLUG}"
  branch: main
  commit_messages:
    create: 'content: create {{collection}} "{{slug}}"'
    update: 'content: update {{collection}} "{{slug}}"'
    delete: 'content: delete {{collection}} "{{slug}}"'
    uploadMedia: 'media: upload "{{path}}"'
    deleteMedia: 'media: delete "{{path}}"'

site_url: "https://${GITHUB_OWNER}.github.io/${REPO_SLUG}"
display_url: "https://${GITHUB_OWNER}.github.io/${REPO_SLUG}"

media_folder: "public/images"
public_folder: "/images"

collections:
  - name: "settings"
    label: "Site Settings"
    files:
      - name: "site"
        label: "Site Configuration"
        file: "content/site.json"
        fields:
          - { label: "Business Name", name: "business_name", widget: "string" }
          - { label: "Tagline", name: "headline", widget: "string" }
          - { label: "Phone", name: "phone", widget: "string" }
          - { label: "Email", name: "email", widget: "string" }
          - { label: "Address", name: "address", widget: "text" }
          - { label: "Primary Color", name: "primary_color", widget: "color" }
          - label: "About"
            name: "about"
            widget: "object"
            fields:
              - { label: "Title", name: "title", widget: "string" }
              - { label: "Body", name: "body", widget: "markdown" }
          - label: "Services"
            name: "services"
            widget: "list"
            fields:
              - { label: "Title", name: "title", widget: "string" }
              - { label: "Description", name: "description", widget: "text" }
              - { label: "Icon", name: "icon", widget: "string", required: false }
          - label: "FAQ"
            name: "faq"
            widget: "list"
            fields:
              - { label: "Question", name: "question", widget: "string" }
              - { label: "Answer", name: "answer", widget: "markdown" }
          - label: "Testimonials"
            name: "testimonials"
            widget: "list"
            fields:
              - { label: "Author", name: "author", widget: "string" }
              - { label: "Quote", name: "quote", widget: "text" }
              - { label: "Rating", name: "rating", widget: "number", min: 1, max: 5 }
          - label: "Hours"
            name: "hours"
            widget: "object"
            fields:
              - { label: "Monday", name: "monday", widget: "string" }
              - { label: "Tuesday", name: "tuesday", widget: "string" }
              - { label: "Wednesday", name: "wednesday", widget: "string" }
              - { label: "Thursday", name: "thursday", widget: "string" }
              - { label: "Friday", name: "friday", widget: "string" }
              - { label: "Saturday", name: "saturday", widget: "string" }
              - { label: "Sunday", name: "sunday", widget: "string" }
          - label: "SEO"
            name: "seo"
            widget: "object"
            fields:
              - { label: "Title", name: "title", widget: "string" }
              - { label: "Description", name: "description", widget: "text" }
              - { label: "Keywords", name: "keywords", widget: "string" }
```

**Client edit flow:**

```
Client visits https://{owner}.github.io/{repo}/admin/
  → GitHub OAuth login
  → Decap CMS admin dashboard
  → Edit business name, services, FAQ, testimonials, etc.
  → Click "Publish"
  → Decap CMS commits changes to content/site.json on main branch
  → GitHub Actions triggers automatically
  → Astro rebuilds with new content
  → GitHub Pages deploys updated site (< 2 min)
```

**Authentication:** Decap CMS uses GitHub's OAuth flow. The client needs:
- A free GitHub account
- Collaborator access to their repo (added automatically by n8n in Layer 7)
- An OAuth app registered (one shared app for all Website Factory sites)

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
| `secret/data/n8n/openclaw`          | `api_key` (Anthropic)      | Already set  |
| `secret/data/n8n/google-places`     | `api_key`                  | Optional     |
| `secret/data/n8n/sendgrid`          | `api_key`                  | Optional     |

---

## File Structure

```
projects/website-factory/
├── ARCHITECTURE.md              # This document
├── PROJECT_IDEA.md              # Original project brief
├── workflow.json                # n8n workflow export (main pipeline)
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
│   ├── public/
│   │   ├── admin/
│   │   │   ├── index.html       # Decap CMS admin UI
│   │   │   └── config.yml       # Template — n8n fills per site
│   │   └── images/
│   ├── content/
│   │   └── site.json            # Template — n8n fills per site
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
| AI Content         | **Anthropic Claude API**  | Existing key  | Via OPENCLAW_API_KEY / ANTHROPIC_API_KEY  |
| AI Design Spec     | **Claude API**            | Existing key  | Text-based design brief (no image gen)   |
| AI Site Builder    | **Claude API**            | Existing key  | JSON response → Astro component files    |
| Static Framework   | **Astro + Tailwind CSS**  | New           | Base template at tech-sumit/website-factory-base |
| CMS                | **Decap CMS**             | New           | Git-based, admin UI at `/admin/`         |
| Storage/State      | **JSON file**             | New           | `projects.json` in n8n data dir          |
| Secrets            | **HashiCorp Vault**       | Existing      | GitHub + Cloudflare tokens               |
| Repo Management    | **GitHub API + git CLI**  | Existing      | Token + Terraform module ready           |
| DNS                | **Cloudflare API**        | Existing      | Token + Terraform module ready           |
| Build/Deploy       | **GitHub Actions**        | New           | Workflow in base template                |
| Observability      | **Grafana Cloud**         | Existing      | New dashboard panel                      |
| Notifications      | **SendGrid / SMTP**       | Optional      | Client email delivery                    |

---

## End-to-End Pipeline Timing

| Stage                          | Duration      | Bottleneck            |
| ------------------------------ | ------------- | --------------------- |
| Form intake + validation       | instant       | —                     |
| Google Places enrichment       | 2-5s          | API latency / mock    |
| AI content generation (Claude) | 10-20s        | LLM inference         |
| Design spec generation         | instant       | Code node (text only) |
| Claude API site generation     | **30-90s**    | **Primary bottleneck**|
| Git push + GitHub repo setup   | 10-20s        | API calls             |
| GitHub Actions build + deploy  | 1-3 min       | CI pipeline           |
| Cloudflare DNS propagation     | 30s-5 min     | DNS TTL               |
| **Total end-to-end**           | **~3-8 min**  |                       |

---

## MVP Implementation Order

### Phase 1: Foundation (Week 1)

1. ~~Create SQLite database~~ → Done: JSON file storage in n8n container
2. Set ANTHROPIC_API_KEY and GITHUB_TOKEN in `.env` → Done
3. Push base template to `tech-sumit/website-factory-base` → Pending (`make wf-push-template`)
4. Register a GitHub OAuth app for Decap CMS authentication → Pending
5. ~~Build and test AI content generation prompt~~ → Done: workflow.json node wf-node-008

### Phase 2: AI Design Pipeline (Week 2)

6. ~~Build OpenAI image mockup~~ → Replaced with text-based design spec (Claude-only)
7. ~~Build Cursor CLI site generation~~ → Replaced with Claude API in workflow
8. Test full AI pipeline: content → design spec → Claude API → Astro site → deploy
9. Test Decap CMS: client edits → commit → rebuild → live update

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

| API               | Rate Limit              | Cost per Site | Impact                               |
| ----------------- | ----------------------- | ------------- | ------------------------------------ |
| GitHub REST API   | 5,000/hr (authenticated)| Free          | ~10 calls per site → 500 sites/hr   |
| Google Places     | varies by plan          | ~$0.01-0.03   | 1-2 calls per site (optional)        |
| Anthropic Claude  | varies by tier          | ~$0.05-0.15   | 2 calls per site (content + site gen)|
| Cloudflare API    | 1,200/5min              | Free          | 2-3 calls per site                   |
| **Total per site**|                         | **~$0.06-0.20**|                                      |

---

## Security Considerations

- All API keys in Vault (never in workflow JSON or env vars)
- GitHub repos created as **public** (required for free GitHub Pages)
- Client gets **collaborator** access (not owner) to their repo
- Cloudflare API token scoped to DNS edit only
- n8n form accessible via Cloudflare Tunnel (can add auth later)
- Decap CMS uses GitHub OAuth — no separate credentials stored
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
