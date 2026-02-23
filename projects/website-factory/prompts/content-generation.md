# Content Generation Prompt — Claude API

> Used by the n8n pipeline (Layer 4) to generate all website content from enriched business data.
> Called via `POST https://api.anthropic.com/v1/messages`

## System Prompt

```
You are a professional web copywriter who specializes in creating compelling website
content for local businesses. You write clear, engaging, and conversion-focused copy.

RULES:
- Only use facts provided in the business data. NEVER invent or hallucinate details.
- Write in a warm, professional tone appropriate for the business category.
- Keep copy concise — website visitors scan, they don't read essays.
- Include specific details (address, phone, hours) when available.
- Optimize all text for SEO naturally — no keyword stuffing.
- For testimonials, lightly polish the original reviews for grammar and clarity,
  but preserve the authentic voice and sentiment.
- Return ONLY valid JSON matching the exact schema below. No markdown, no explanation.
```

## User Prompt Template

```
Generate complete website content for the following business.

BUSINESS DATA:
- Name: {{business_name}}
- Category: {{category}}
- Description: {{description}}
- Address: {{address.full}}
- City: {{address.city}}, {{address.state}}
- Phone: {{phone}}
- Rating: {{rating}} ({{review_count}} reviews)
- Hours: {{hours_summary}}
- Top Reviews:
{{#each top_reviews}}
  - "{{this.text}}" — {{this.author}} ({{this.rating}}★)
{{/each}}

STYLE PRESET: {{style_preset}}
PRIMARY COLOR: {{primary_color}}

Generate JSON matching the schema below. Notes on each field are in comments after //.

FIELD DESCRIPTIONS:
- business_name: the business name
- headline: compelling tagline (8-12 words)
- headline_alternates: 2 alternative taglines
- phone: formatted phone number
- email: business email if available, else empty string
- address: full formatted address
- google_maps_url: the Google Maps URL
- primary_color: hex color code
- about.title: section heading (e.g., "About Us", "Our Story")
- about.body: 2-3 paragraphs in markdown format
- services: array of 3-6 services based on category and reviews
- faq: array of 5-8 relevant Q&A pairs
- testimonials: array of 3-5 testimonials from the provided reviews
- cta.primary_text: main CTA button text (e.g., "Book Now", "Get a Quote")
- cta.primary_url: #contact or tel: link or external URL
- seo.title: page title (50-60 chars), include city name
- seo.description: meta description (150-160 chars)
- seo.keywords: comma-separated keywords (8-12)
- nav_items: 4-6 navigation menu items appropriate for the category
- features: exactly 3 key selling points for the features/cards section
- amenities: 3-5 relevant amenity badges

EXACT JSON SCHEMA:

{
  "business_name": "",
  "headline": "",
  "headline_alternates": ["", ""],
  "phone": "",
  "email": "",
  "address": "",
  "google_maps_url": "",
  "primary_color": "",
  "about": {
    "title": "",
    "body": ""
  },
  "services": [
    {
      "title": "",
      "description": "",
      "icon": ""
    }
  ],
  "faq": [
    {
      "question": "",
      "answer": ""
    }
  ],
  "testimonials": [
    {
      "author": "",
      "quote": "",
      "rating": 5
    }
  ],
  "hours": {
    "monday": "",
    "tuesday": "",
    "wednesday": "",
    "thursday": "",
    "friday": "",
    "saturday": "",
    "sunday": ""
  },
  "cta": {
    "primary_text": "",
    "primary_url": "",
    "secondary_text": "",
    "secondary_url": ""
  },
  "seo": {
    "title": "",
    "description": "",
    "keywords": ""
  },
  "nav_items": [],
  "features": [
    {
      "title": "",
      "subtitle": "",
      "icon": ""
    }
  ],
  "amenities": [
    {
      "label": "",
      "icon": ""
    }
  ]
}
```

## n8n Code Node — Prompt Assembly

```javascript
// Assemble the user prompt from enriched data
const data = $input.first().json;

const hoursSummary = Object.entries(data.hours || {})
  .map(([day, time]) => `${day}: ${time}`)
  .join(', ');

const reviewsText = (data.top_reviews || [])
  .map(r => `- "${r.text}" — ${r.author} (${r.rating}★)`)
  .join('\n');

const userPrompt = `Generate complete website content for the following business.

BUSINESS DATA:
- Name: ${data.business_name}
- Category: ${data.category}
- Description: ${data.description || 'Not provided'}
- Address: ${data.address?.full || 'Not provided'}
- City: ${data.address?.city || ''}, ${data.address?.state || ''}
- Phone: ${data.phone || 'Not provided'}
- Rating: ${data.rating || 'N/A'} (${data.review_count || 0} reviews)
- Hours: ${hoursSummary || 'Not provided'}
- Top Reviews:
${reviewsText || '  None available'}

STYLE PRESET: ${data.style_preset || 'modern-dark'}
PRIMARY COLOR: ${data.primary_color || '#2563EB'}

Generate JSON matching the exact schema specified in your instructions.`;

return {
  ...data,
  claude_prompt: userPrompt
};
```
