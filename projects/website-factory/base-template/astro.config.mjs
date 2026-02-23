import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { readFileSync } from 'fs';

const siteData = JSON.parse(readFileSync('./content/site.json', 'utf-8'));
const deploy = siteData.deploy || {};

export default defineConfig({
  site: deploy.site || undefined,
  base: deploy.base || undefined,
  integrations: [tailwind()],
  output: 'static',
  build: {
    assets: 'assets',
  },
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
