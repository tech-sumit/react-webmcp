# Image Mockup Prompt — OpenAI Image Generation API

> Used by the n8n pipeline (Layer 5) to generate a landing page design mockup PNG.
> Called via `POST https://api.openai.com/v1/images/generations`

## API Configuration

```json
{
  "model": "gpt-image-1",
  "n": 1,
  "size": "1024x1792",
  "quality": "high",
  "output_format": "png",
  "background": "opaque"
}
```

**Response format:** Base64-encoded PNG (GPT image models always return b64_json)

## Prompt Template

The prompt is dynamically assembled per business. Below is the template with
variable placeholders that the n8n Code Node fills in.

```
Design a professional, polished website landing page screenshot for "{{business_name}}",
a {{category}} business located in {{city}}, {{state}}.

== PAGE LAYOUT (top to bottom, full-width) ==

1. NAVIGATION BAR (sticky, top):
   - Logo/business name on the left
   - Menu items: {{nav_items_comma_separated}}
   - CTA button "{{cta_primary_text}}" on the right (accent color)

2. HERO SECTION (full-bleed, 60% of viewport):
   - Large, high-quality photorealistic background image showing a {{category_description}}
   - Dark gradient overlay for text readability
   - Business name "{{business_name}}" as large heading
   - Tagline: "{{headline}}"
   - Two CTA buttons side by side:
     - Primary: "{{cta_primary_text}}" (filled, accent color)
     - Secondary: "{{cta_secondary_text}}" (outlined, white)

3. FEATURES SECTION (3-column grid on light/dark background):
   {{#each features}}
   - Card {{@index}}: Icon "{{this.icon}}", title "{{this.title}}", subtitle "{{this.subtitle}}"
   {{/each}}

4. ADDRESS / LOCATION BAR:
   - Full address: "{{address}}"
   - Subtle background, centered text

5. AMENITY BADGES ROW (bottom):
   {{#each amenities}}
   - Badge: {{this.icon}} "{{this.label}}"
   {{/each}}

== STYLE ==
- Color scheme: {{style_preset}} palette
- Primary color: {{primary_color}}
- Typography: modern sans-serif, clean and professional
- Feel: premium, trustworthy, inviting, high-end
- Full-width sections, generous whitespace
- Photorealistic hero image (NOT illustration, NOT wireframe)
- Flat/modern icons for feature cards
- Subtle shadows and rounded corners on cards

== CRITICAL ==
- This MUST look like a real website screenshot taken from a browser
- Include realistic, readable text — not lorem ipsum
- Proper visual hierarchy: heading > subheading > body text
- The design quality should match premium Wix, Squarespace, or modern Gatsby themes
- Do NOT include browser chrome, URL bar, or device frame
- Portrait orientation (1024x1792) showing the full landing page scroll
```

## n8n Code Node — Prompt Assembly

```javascript
const data = $input.first().json;
const content = data.ai_content; // Output from Layer 4

// Category-specific hero image descriptions
const categoryDescriptions = {
  restaurant: 'elegant restaurant interior with warm ambient lighting, well-set tables, and inviting atmosphere',
  salon: 'modern beauty salon interior with stylish chairs, mirrors, and professional lighting',
  agency: 'sleek modern office space with glass walls, collaborative workstations, and city views',
  multiplex: 'grand cinema multiplex exterior at night with bright marquee lights, movie posters, and crowds',
  gym: 'modern gym interior with professional equipment, open floor plan, and energetic atmosphere',
  clinic: 'clean, bright medical clinic reception area with modern furniture and calming decor',
  generic: 'professional modern business storefront with clean signage and welcoming entrance',
};

const navItems = (content.nav_items || ['Home', 'About', 'Services', 'Contact']).join(', ');
const features = (content.features || []).map((f, i) =>
  `- Card ${i + 1}: Icon "${f.icon}", title "${f.title}", subtitle "${f.subtitle}"`
).join('\n   ');
const amenities = (content.amenities || []).map(a =>
  `- Badge: ${a.icon} "${a.label}"`
).join('\n   ');

const imagePrompt = `Design a professional, polished website landing page screenshot for "${content.business_name}",
a ${data.category} business located in ${data.address?.city || 'the local area'}, ${data.address?.state || ''}.

== PAGE LAYOUT (top to bottom, full-width) ==

1. NAVIGATION BAR (sticky, top):
   - Logo/business name on the left
   - Menu items: ${navItems}
   - CTA button "${content.cta?.primary_text || 'Get Started'}" on the right (accent color)

2. HERO SECTION (full-bleed, 60% of viewport):
   - Large, high-quality photorealistic background image showing a ${categoryDescriptions[data.category] || categoryDescriptions.generic}
   - Dark gradient overlay for text readability
   - Business name "${content.business_name}" as large heading
   - Tagline: "${content.headline}"
   - Two CTA buttons side by side:
     - Primary: "${content.cta?.primary_text || 'Get Started'}" (filled, accent color)
     - Secondary: "${content.cta?.secondary_text || 'Learn More'}" (outlined, white)

3. FEATURES SECTION (3-column grid):
   ${features}

4. ADDRESS / LOCATION BAR:
   - Full address: "${content.address || data.address?.full || ''}"
   - Subtle background, centered text

5. AMENITY BADGES ROW (bottom):
   ${amenities}

== STYLE ==
- Color scheme: ${data.style_preset || 'modern-dark'} palette
- Primary color: ${data.primary_color || '#2563EB'}
- Typography: modern sans-serif, clean and professional
- Feel: premium, trustworthy, inviting, high-end
- Full-width sections, generous whitespace
- Photorealistic hero image (NOT illustration, NOT wireframe)
- Flat/modern icons for feature cards
- Subtle shadows and rounded corners on cards

== CRITICAL ==
- This MUST look like a real website screenshot taken from a browser
- Include realistic, readable text — not lorem ipsum
- Proper visual hierarchy: heading > subheading > body text
- The design quality should match premium Wix, Squarespace, or modern Gatsby themes
- Do NOT include browser chrome, URL bar, or device frame
- Portrait orientation (1024x1792) showing the full landing page scroll`;

return {
  ...data,
  image_prompt: imagePrompt
};
```

## n8n Code Node — Response Handling (Save Mockup PNG)

```javascript
const data = $input.first().json;
const response = data; // The HTTP response from OpenAI

// GPT image models return base64
const b64Image = response.data[0].b64_json;

// Save to workspace
const fs = require('fs');
const projectDir = `/tmp/website-factory/${data.project_id}`;
fs.mkdirSync(projectDir, { recursive: true });

const mockupPath = `${projectDir}/mockup.png`;
fs.writeFileSync(mockupPath, Buffer.from(b64Image, 'base64'));

return {
  ...data,
  mockup_path: mockupPath,
  mockup_saved: true
};
```
