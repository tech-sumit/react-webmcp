# Making Websites Agent-Ready: The Complete Landscape

## Cloudflare Content Signals, llms.txt, and Every Emerging Standard

---

## Executive Summary

A fragmented but rapidly coalescing ecosystem of standards is emerging to make the web readable, navigable, and actionable by AI agents. These fall into four categories:

| Category | Standards | Purpose |
|---|---|---|
| **Permission & Policy** | `robots.txt`, Content Signals, `agents.txt`, `ads.txt` | Who can access, what they can do with it |
| **Content Delivery** | Markdown for Agents, `llms.txt`, `llms-full.txt`, `ai.txt` | Structured content optimized for LLM consumption |
| **Agent Interaction** | WebMCP, `webagents.md`, Agent Handshake Protocol, `.well-known/mcp.json` | Tool registration, agentic capabilities |
| **Structured Identity** | `humans.txt`, `security.txt`, JSON-LD/Schema.org, LLM-LD | Metadata, attribution, semantic markup |

This report covers every known mechanism, from battle-tested standards to bleeding-edge drafts.

---

## Part 1: Permission & Policy Layer — Who Can Do What

### 1.1 robots.txt (1994, RFC 9309)

The original. A plain-text file at `/robots.txt` implementing the Robots Exclusion Protocol.

```
User-Agent: *
Allow: /
Disallow: /admin/
```

**What it does:** Controls *access* — which bots can crawl which paths.
**What it doesn't do:** Say anything about what happens to content *after* it's been accessed. This gap is what everything below tries to fill.

### 1.2 Cloudflare Content Signals (Sep 2025)

**Site:** [contentsignals.org](https://contentsignals.org/) | **License:** CC0 (public domain)
**Status:** Deployed on 3.8M+ domains. Not yet standardized (IETF/W3C).

Extends `robots.txt` with a `Content-Signal` directive that controls *usage* after access:

| Signal | Meaning |
|---|---|
| `search` | Traditional search index — hyperlinks + excerpts. Excludes AI-generated summaries. |
| `ai-input` | Real-time retrieval for AI models — RAG, grounding, generative answers. |
| `ai-train` | Training or fine-tuning model weights. |

```
User-Agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /
```

Supports per-bot and per-path targeting. Includes an EU Article 4 (Directive 2019/790) copyright reservation that gives the signals potential legal force.

**Four preset policies:** Most Restrictive (all=no), Search Only, Search + AI Input, Fully Permissive.

**Cloudflare auto-deployment:** Free zones get the policy comments; managed robots.txt zones get `search=yes, ai-train=no` automatically.

### 1.3 IETF AIPREF Working Group (2025–ongoing)

**Drafts:** [ietf-wg-aipref.github.io/drafts](https://ietf-wg-aipref.github.io/drafts/) | **Status:** Active standards track

The formal standardization effort. Key drafts:

| Draft | Authors | Purpose |
|---|---|---|
| `draft-ietf-aipref-attach` | G. Illyes (Google), M. Thomson (Mozilla) | How AI usage preferences attach to HTTP content. Updates RFC 9309. |
| `draft-ietf-aipref-vocab` | AIPREF WG | Standardized vocabulary for content signals |
| `draft-romm-aipref-contentsignals` | Cloudflare | Three-category preference model (search, ai-input, ai-train) |

This is where Cloudflare's Content Signals are heading — toward becoming an RFC. The involvement of Google and Mozilla authors signals broader industry buy-in than Cloudflare alone.

### 1.4 agents.txt (IETF Internet-Draft, Oct 2025)

**Spec:** [datatracker.ietf.org/doc/draft-srijal-agents-policy](https://datatracker.ietf.org/doc/draft-srijal-agents-policy/00/) | **Status:** Internet-Draft (expires Apr 2026)

A stricter alternative to robots.txt specifically for automated clients. Key differences:

| Feature | robots.txt | agents.txt |
|---|---|---|
| Format | Loose, comments allowed | Strict, SHA-256 hash on first line |
| Error handling | Partial compliance OK | Any hash mismatch or syntax error → entire site restricted |
| Parameterized rules | No | Yes — `[path] ALLOW|DISALLOW [params...]` |
| Integrity | None | SHA-256 verification |

```
# SHA256: a1b2c3d4e5f6...
/status ALLOW limit=50
/api DISALLOW
```

If the hash doesn't match the file content, the entire site is treated as fully restricted. This is "fail-closed" security, unlike robots.txt which is "fail-open."

### 1.5 AI Crawler User-Agents

The practical bot-blocking mechanism in use today:

| Bot | Operator | Purpose | Respects robots.txt |
|---|---|---|---|
| `GPTBot` | OpenAI | Training data collection | Yes |
| `OAI-SearchBot` | OpenAI | Real-time search for ChatGPT | Yes |
| `ChatGPT-User` | OpenAI | User-initiated browsing | Yes |
| `ClaudeBot` | Anthropic | Training for Claude | Yes |
| `Google-Extended` | Google | AI training (Gemini, Bard) — separate from search indexing | Yes |
| `PerplexityBot` | Perplexity | AI search | Yes |
| `Applebot-Extended` | Apple | Apple Intelligence training | Yes |
| `Bytespider` | ByteDance | TikTok/training | Inconsistent |
| `CCBot` | Common Crawl | Open dataset | Yes |

Blocking `Google-Extended` does not affect Google Search rankings — it only blocks AI training. This separation is what Content Signals formalize more granularly.

### 1.6 ads.txt / app-ads.txt / sellers.json (IAB Tech Lab)

**Purpose:** Not AI-related, but the established model for "machine-readable policy files at well-known paths."

| File | Purpose |
|---|---|
| `ads.txt` | Declares authorized digital ad sellers for a domain |
| `app-ads.txt` | Same concept for mobile apps |
| `sellers.json` | Lets ad buyers verify seller/intermediary identities |

These are relevant as **prior art** — they proved that simple text files at root paths can reshape an industry (in this case, reducing ad fraud). Content Signals follows the same playbook.

---

## Part 2: Content Delivery Layer — LLM-Optimized Content

### 2.1 Cloudflare Markdown for Agents (Feb 2026)

**Docs:** [developers.cloudflare.com/fundamentals/reference/markdown-for-agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/) | **Status:** Beta (Pro+)

Real-time HTML-to-markdown conversion at Cloudflare's edge via HTTP content negotiation:

```bash
curl https://example.com/about/ -H "Accept: text/markdown"
```

Response:
```http
HTTP/2 200
content-type: text/markdown; charset=utf-8
x-markdown-tokens: 725
content-signal: ai-train=yes, search=yes, ai-input=yes
```

**Token savings:** ~80% reduction (16,180 → 3,150 tokens for a typical blog post).

Already adopted by Claude Code and OpenCode via `Accept: text/markdown` headers. Available on Pro, Business, Enterprise plans at no cost.

### 2.2 llms.txt (2024–ongoing, Jeremy Howard / fast.ai)

**Site:** [llmstxt.org](https://llmstxt.org/) | **Spec:** v1.1.1 | **Adoption:** 1,300+ sites

A curated markdown file at `/llms.txt` providing LLM-friendly content summaries. Unlike sitemaps (which list everything), llms.txt is a *curated guide* — the essential information an LLM needs to understand a site.

**Format (Markdown):**
```markdown
# Project Name

> One-sentence description of the project.

Additional context and important notes.

## Docs

- [Quick Start](https://example.com/docs/quickstart.html.md): Overview of key features
- [API Reference](https://example.com/docs/api.html.md): Complete API docs

## Examples

- [Tutorial](https://example.com/tutorials/basic.html.md): Step-by-step guide

## Optional

- [Advanced Topics](https://example.com/docs/advanced.html.md): Deep dives
```

**Key design decisions:**
- H1 = project name (required)
- Blockquote = summary (required)
- H2 sections = categorized links
- `## Optional` section = lower-priority content agents can skip under context pressure
- Links should point to `.md` versions of pages (HTML pages with `.md` appended)

**Notable adopters:** Anthropic, Cloudflare, Cursor, Vercel, Perplexity, Coinbase, ElevenLabs, Hugging Face

**Companion files:**
| File | Purpose |
|---|---|
| `/llms.txt` | Index — links to key resources |
| `/llms-full.txt` | Complete documentation bundle — all content in one file for single-context-load |
| `/llms-ctx.txt` | Expanded llms.txt with linked content inlined (excludes Optional section) |
| `/llms-ctx-full.txt` | Expanded llms.txt with all linked content inlined (includes Optional) |

### 2.3 llms-full.txt

**Purpose:** The "everything in one file" companion to llms.txt.

While llms.txt is an index of links, llms-full.txt is a single markdown file containing *all* the documentation an LLM would need — definitions, procedures, examples, references — ready to be loaded directly into a context window.

Used by OpenAI (`cdn.openai.com/API/docs/txt/llms-full.txt`) and Google (`google/adk-python` repo).

Achieves ~90% useful information density vs raw HTML.

### 2.4 ai.txt (2025–ongoing)

**Site:** [aitxt.ing](https://aitxt.ing/) | **Status:** Community standard

A universal plain-text standard for AI context — more flexible than llms.txt, designed for *any* resource (not just documentation sites).

**Key differentiator — cascading discovery:**
```
Agent needs info about /products/widgets/
  1. Tries /ai.txt
  2. Tries /products/ai.txt
  3. Tries /products/widgets/ai.txt
```

This works for both HTTP paths and local filesystem paths.

**Format:**
```yaml
---
updated: 2026-01-14
scope: /products/
parent: https://example.com/ai.txt
---

# Brief Title

One or two sentences describing what this is.

## What We Offer

Description of capabilities and services.

## What We Do Not Offer

Explicit boundaries to prevent hallucination.
```

**Distributed context via links:** ai.txt files can link to other ai.txt files using markdown, creating a navigable graph of contexts. Links ending in `ai.txt` are followed (depth=1); deeper links are recorded for manual exploration.

**HTML discovery:** `<link rel="prefetch" href="/ai.txt">` — uses existing browser prefetch spec, no custom rel values.

**Philosophy:** "Tell AI what you are, instead of letting it guess." Designed to prevent hallucination by providing authoritative facts.

### 2.5 LLM-LD (Feb 2026, Capxel)

**Site:** llmld.org | **Status:** Open standard (CC BY 4.0), 100+ sites

The structured data approach. While llms.txt and ai.txt are prose-based, LLM-LD (Large Language Model Linked Data) extends the JSON-LD/Schema.org tradition for AI agents.

| Feature | JSON-LD / Schema.org | LLM-LD |
|---|---|---|
| Target | Search engine crawlers | AI agents (ChatGPT, Claude, Perplexity) |
| Discovery | In-page `<script>` tags | `.well-known/llm-index.json` |
| Format | JSON-LD | Standardized AI Discovery Page (ADP) |
| Spec includes | Vocabulary | File formats, discovery, conformance levels |

---

## Part 3: Agent Interaction Layer — Tools, Not Just Content

### 3.1 WebMCP (W3C Community Group, Feb 2026)

**Site:** [webmcp.link](https://webmcp.link/) | **Chrome 146:** Behind flag (`Experimental Web Platform Features`)
**Authors:** Google + Microsoft | **Status:** Draft Community Group Report

The browser-native standard. WebMCP exposes structured tools to AI agents through `navigator.modelContext`:

**Declarative (HTML attributes):**
```html
<form toolname="searchProducts" tooldescription="Search the product catalog">
  <input name="query" type="text" />
  <button type="submit">Search</button>
</form>
```

**Imperative (JavaScript):**
```javascript
navigator.modelContext.registerTool({
  name: "searchProducts",
  description: "Search the product catalog",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string" } }
  },
  handler: async ({ query }) => {
    const results = await fetch(`/api/search?q=${query}`);
    return results.json();
  }
});
```

**Why it matters:**
- 89% token efficiency over screenshot-based agent interaction
- Reuses the user's authenticated browser session
- Web page becomes the tool server — no separate backend needed
- Backed by Google and Microsoft, shipping in Chrome

### 3.2 webagents.md (Feb 2026, browser-use)

**Repo:** [github.com/browser-use/webagents.md](https://github.com/browser-use/webagents.md) | **PyPI:** `webagents-md`

A website publishes `webagents.md` listing available tools. AI agents discover it via `<meta name="webagents-md">`, parse tools into TypeScript declarations, and the LLM writes code to call them:

```typescript
const results = await global.searchProducts("red shoes");
if (results.length > 0) {
  await global.addToCart(results[0].id, 1);
}
```

**Key insight:** LLMs are better at writing code than making sequential tool calls. So instead of click-by-click browser automation, the agent writes a script that calls declared functions.

**Comparison with WebMCP:**
| Aspect | WebMCP | webagents.md |
|---|---|---|
| Standard body | W3C | Community (browser-use) |
| Discovery | Browser API (`navigator.modelContext`) | Meta tag + markdown file |
| Execution | In-browser handler functions | Playwright code execution |
| Agent writes | Tool call parameters | Full code with branching/looping |
| Browser support | Chrome 146+ (flag) | Any (via Playwright) |

### 3.3 Agent Handshake Protocol (AHP)

**Site:** [agenthandshake.dev](https://agenthandshake.dev/) | **Status:** Draft v0.1

A progressive three-mode protocol for agent-site interaction:

| Mode | Name | What It Does | Server Requirement |
|---|---|---|---|
| MODE1 | Static Serve | Manifest at `/.well-known/agent.json` points to content. Compatible with existing llms.txt. | Static file |
| MODE2 | Interactive Knowledge | `POST /agent/converse` endpoint backed by knowledge base. Agents can ask questions, get sourced answers. | API endpoint |
| MODE3 | Agentic Desk | Full capabilities — database access, API calls, MCP server connections, human escalation. | Full backend |

Each mode is backwards-compatible. A site can start at MODE1 and progressively upgrade.

### 3.4 .well-known/mcp.json (2026)

**Spec:** [wellknownmcp.org](https://wellknownmcp.org/) | **Status:** Emerging

Standardized discovery for MCP (Model Context Protocol) servers:

```json
// GET /.well-known/mcp.json
{
  "name": "Example Corp Tools",
  "version": "1.0",
  "servers": [
    {
      "url": "https://api.example.com/mcp",
      "capabilities": ["search", "order_management"],
      "auth": { "type": "oauth2" }
    }
  ]
}
```

With 97M+ monthly MCP SDK downloads and 10,000+ active servers, automated discovery is critical. Competing proposals include SEP-1649 (server cards) and SEP-1960 (manifest endpoint).

Optional Ed25519 cryptographic signatures for verification. Complementary `/.well-known/llm-index.llmfeed.json` for semantic sitemaps.

---

## Part 4: Structured Identity Layer — Who You Are

### 4.1 humans.txt

**Site:** [humanstxt.org](http://humanstxt.org/) | **Status:** Established convention

Credits the people behind a website — developers, designers, contributors. Not machine-parsed but serves as the philosophical ancestor of all "tell visitors who we are" files.

```
/* TEAM */
Lead Developer: Jane Smith
Site: janesmith.dev
Twitter: @janesmith

/* THANKS */
Name: Open Source Community

/* SITE */
Last update: 2026/03/01
Language: English
Standards: HTML5, CSS3
```

### 4.2 security.txt (RFC 9116)

**Site:** [securitytxt.org](https://securitytxt.org/) | **Status:** Proposed Standard

Defines security policies and vulnerability reporting contacts. Located at `/.well-known/security.txt`.

```
Contact: mailto:security@example.com
Expires: 2027-01-01T00:00:00.000Z
Encryption: https://example.com/pgp-key.txt
Policy: https://example.com/security-policy
Preferred-Languages: en
```

Endorsed by Google, Facebook, GitHub, and government agencies. Relevant as the strongest precedent for `.well-known/` file standards.

### 4.3 JSON-LD / Schema.org (W3C)

The established standard for structured data that search engines (and increasingly AI agents) use to understand page content:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Making Your Site Agent-Ready",
  "author": { "@type": "Person", "name": "Sumit Agrawal" },
  "datePublished": "2026-03-04"
}
</script>
```

**AI citation impact:** Proper Schema.org markup can increase AI citation rates by 5x. Key schemas: `FAQPage` (highest citation probability), `Article`, `Organization`, `Person`, `HowTo`, `BreadcrumbList`.

JSON-LD remains Google's recommended format. AI agents use it to verify, understand, and cite content — inconsistencies between schema and page content cause deprioritization.

---

## Part 5: The Complete File Map

Every file a website can serve for agent compatibility, at a glance:

| File | Path | Format | Purpose | Status |
|---|---|---|---|---|
| `robots.txt` | `/robots.txt` | Plain text | Access control for crawlers | RFC 9309 (standard) |
| Content Signals | In `robots.txt` | Plain text | Usage permissions (search/ai-input/ai-train) | Cloudflare CC0 + IETF draft |
| `agents.txt` | `/agents.txt` | Plain text + SHA-256 | Strict bot policy with hash verification | IETF Internet-Draft |
| `llms.txt` | `/llms.txt` | Markdown | Curated LLM-friendly site guide | Community (v1.1.1) |
| `llms-full.txt` | `/llms-full.txt` | Markdown | Complete documentation bundle | Community |
| `ai.txt` | `/ai.txt` (cascading) | Plain text + YAML | Universal AI context with distributed linking | Community |
| `agent.json` | `/.well-known/agent.json` | JSON | Agent Handshake Protocol manifest | Draft v0.1 |
| `mcp.json` | `/.well-known/mcp.json` | JSON | MCP server discovery | Emerging |
| `llm-index.json` | `/.well-known/llm-index.json` | JSON | LLM-LD discovery / semantic sitemap | LLM-LD (CC BY 4.0) |
| `webagents.md` | `/webagents.md` | Markdown | Tool declarations for AI agents | Community (browser-use) |
| `security.txt` | `/.well-known/security.txt` | Plain text | Security policy & vulnerability reporting | RFC 9116 |
| `humans.txt` | `/humans.txt` | Plain text | Team credits & attribution | Convention |
| `ads.txt` | `/ads.txt` | Plain text | Authorized ad sellers | IAB Tech Lab |
| `sellers.json` | `/sellers.json` | JSON | Ad seller verification | IAB Tech Lab |
| `sitemap.xml` | `/sitemap.xml` | XML | URL index for search engines | sitemaps.org |

**HTTP Headers (response-time signals):**

| Header | Set By | Purpose |
|---|---|---|
| `Content-Signal` | Cloudflare / origin | Per-response usage permissions |
| `x-markdown-tokens` | Cloudflare | Estimated token count of markdown response |
| `Accept: text/markdown` | AI agent (request) | Request markdown instead of HTML |

**HTML Meta Tags:**

| Tag | Purpose |
|---|---|
| `<meta name="webagents-md" content="/webagents.md">` | webagents.md discovery |
| `<link rel="prefetch" href="/ai.txt">` | ai.txt discovery |
| `<script type="application/ld+json">` | JSON-LD structured data |

**Browser APIs:**

| API | Standard | Purpose |
|---|---|---|
| `navigator.modelContext.registerTool()` | WebMCP (W3C) | Register tools for AI agents in-browser |

---

## Part 6: Maturity Matrix

How established is each standard?

| Standard | Spec Body | Adoption | Enforcement | Maturity |
|---|---|---|---|---|
| `robots.txt` | IETF (RFC 9309) | Universal | Voluntary (no tech enforcement) | Production |
| JSON-LD / Schema.org | W3C | Very high | Google rewards compliance | Production |
| `security.txt` | IETF (RFC 9116) | Growing | Voluntary | Production |
| `ads.txt` | IAB Tech Lab | Industry standard | Ad platforms enforce | Production |
| Content Signals | Cloudflare → IETF | 3.8M domains | Voluntary + EU legal | Early production |
| Markdown for Agents | Cloudflare | Beta | N/A (opt-in feature) | Beta |
| `llms.txt` | Community | 1,300+ sites | None | Early adoption |
| WebMCP | W3C CG | Chrome 146 flag | Browser-enforced | Preview |
| `ai.txt` | Community | Handful of sites | None | Early |
| `agents.txt` | IETF Draft | Minimal | Hash-based integrity | Draft |
| Agent Handshake | Community | Minimal | None | Draft |
| `webagents.md` | Community | Minimal | None | Draft |
| `.well-known/mcp.json` | Community | Emerging | None | Draft |
| LLM-LD | Capxel | 100+ sites | None | Early |

---

## Part 7: Implementation Playbook

### Priority 1 — Do Today (established, high impact)

1. **`robots.txt` with Content Signals** — declare your AI usage policy
2. **JSON-LD / Schema.org** — structured data on every page (Article, Organization, FAQPage, BreadcrumbList)
3. **`security.txt`** — vulnerability reporting contact
4. **Enable Markdown for Agents** (if on Cloudflare Pro+)

### Priority 2 — Do This Month (growing adoption, moderate effort)

5. **`/llms.txt`** — curated guide to your site for LLMs
6. **`/llms-full.txt`** — complete documentation bundle
7. **`/ai.txt`** — authoritative context to prevent hallucination

### Priority 3 — Watch and Evaluate (emerging, may become important)

8. **WebMCP** — if building interactive web apps, experiment with `navigator.modelContext`
9. **`/.well-known/agent.json`** (AHP) — progressive agent capabilities
10. **`/.well-known/mcp.json`** — if you expose MCP servers
11. **`webagents.md`** — if your site has actions agents should call

### Sample Implementation for panditai.org

```
panditai.org/
├── robots.txt              ← Content Signals + bot directives
├── llms.txt                ← Curated site guide for LLMs
├── llms-full.txt           ← Complete docs bundle
├── ai.txt                  ← Authoritative context
├── humans.txt              ← Team credits
├── .well-known/
│   ├── security.txt        ← Vulnerability reporting
│   └── mcp.json            ← MCP server discovery (if applicable)
├── ads.txt                 ← (if running ads)
└── sitemap.xml             ← URL index for search engines
```

### Sample robots.txt (Comprehensive)

```
# Content Signals Policy — CC0 Licensed
# As a condition of accessing this website, you agree to abide by the following content signals:
# (a) If a content-signal = yes, you may collect content for the corresponding use.
# (b) If a content-signal = no, you may not collect content for the corresponding use.
# (c) Omitted signals express no preference.
#
# search: building a search index and providing search results
# ai-input: inputting content into AI models (RAG, grounding, generative answers)
# ai-train: training or fine-tuning AI models
#
# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF RIGHTS
# UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790.

User-Agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/

# Allow training only for specific partners
User-Agent: OAI-SearchBot
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /

Sitemap: https://panditai.org/sitemap.xml
```

### Sample llms.txt

```markdown
# PanditAI

> AI-native personal automation platform built on n8n,
> secrets management via HashiCorp Vault, and AI agent orchestration via NemoClaw.

## Core Platform

- [Architecture Overview](https://panditai.org/docs/architecture.html.md): 9-service Docker stack on macOS
- [Setup Guide](https://panditai.org/docs/setup.html.md): First-time installation and configuration
- [Operations Guide](https://panditai.org/docs/operations.html.md): Day-to-day management commands

## Optional

- [Terraform Modules](https://panditai.org/docs/terraform.html.md): Infrastructure-as-code details
- [Observability Setup](https://panditai.org/docs/observability.html.md): Grafana Cloud, Alloy, Loki, Mimir
```

---

## Key Takeaways

1. **The landscape is fragmented but converging.** Content Signals (IETF AIPREF), llms.txt, and WebMCP are the three most likely to reach critical mass.

2. **Two philosophies compete:** Cloudflare's approach (intercept at the edge, zero publisher effort) vs the community approach (publishers create files). Both are needed.

3. **Permission and delivery are separate concerns.** Content Signals says *whether* AI can use your content. llms.txt/Markdown for Agents says *how* to consume it efficiently. Both are needed simultaneously.

4. **WebMCP is the biggest wildcard.** Browser-native tool registration backed by Google and Microsoft could make all the markdown-based approaches secondary for interactive sites.

5. **Start with robots.txt + Content Signals + llms.txt.** These three files, taking 30 minutes to create, cover 80% of agent readiness for any website today.

6. **The "carrot and stick" model works:** Markdown for Agents (easier consumption) incentivizes agents to use the front door where Content Signals (usage rules) are served. Block bad actors with WAF + Bot Management.

---

*Sources: [contentsignals.org](https://contentsignals.org/), [llmstxt.org](https://llmstxt.org/), [aitxt.ing](https://aitxt.ing/), [webmcp.link](https://webmcp.link/), [agenthandshake.dev](https://agenthandshake.dev/), [wellknownmcp.org](https://wellknownmcp.org/), [securitytxt.org](https://securitytxt.org/), [Cloudflare Blog](https://blog.cloudflare.com/content-signals-policy/), [IETF AIPREF WG](https://ietf-wg-aipref.github.io/drafts/), [SearchEngineWorld](https://www.searchengineworld.com/cloudflares-content-signals-the-right-problem-an-unlikely-solution), [Chrome Developers Blog](https://developer.chrome.com/blog/webmcp-epp)*
