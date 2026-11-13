import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://alexeiraymond.com',
  base: '/',
  output: 'static',
  cacheDir: './.astro-cache',
  server: { allowedHosts: ['terminal.local'] },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.endsWith('/interview/') &&
        !page.includes('/prototype/')
    })
  ]
});
