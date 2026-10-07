import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://cshieldsce.github.io',
  output: 'static',
  integrations: [mdx(), sitemap()],
  build: { format: 'directory' },
});
