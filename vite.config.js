import { defineConfig, loadEnv } from 'vite';

// the live site's address, used for robots.txt and the sitemap (the pages' canonical tags say the same)
const SITE = 'https://blorbit.io';
const PAGES = ['/', '/about.html', '/privacy.html'];
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Relative asset paths so the build works from any sub-path,
    // e.g. GitHub Pages project sites served at https://<user>.github.io/<repo>/, or a custom domain
    base: './',
    build: {
      // the game, plus the privacy policy as its own page
      rollupOptions: {
        input: { main: resolve(__dirname, 'index.html'), about: resolve(__dirname, 'about.html'), privacy: resolve(__dirname, 'privacy.html') },
      },
    },
    plugins: [
      {
        // Ad Manager wants an ads.txt at the site root listing who may sell its ad space.
        // Set ADS_TXT to the line(s) Ad Manager gives you; each line separated by a newline or ';'.
        name: 'ads-txt',
        generateBundle() {
          if (!env.ADS_TXT) return;
          const source = env.ADS_TXT.split(/\n|;/).map((l) => l.trim()).filter(Boolean).join('\n') + '\n';
          this.emitFile({ type: 'asset', fileName: 'ads.txt', source });
        },
      },
      {
        // robots.txt + sitemap.xml so search engines find every page (lastmod = the day it was built)
        name: 'seo-files',
        generateBundle() {
          const today = new Date().toISOString().slice(0, 10);
          this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n` });
          const urls = PAGES.map((p) => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n');
          this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` });
        },
      },
      {
        // don't let the privacy policy ship with its contact placeholders unnoticed
        name: 'privacy-placeholders',
        buildStart() {
          const left = readFileSync(resolve(__dirname, 'privacy.html'), 'utf8').match(/\[YOUR [A-Z ]+\]/g);
          if (left) this.warn(`privacy.html still has placeholders to fill in: ${[...new Set(left)].join(', ')}`);
        },
      },
    ],
  };
});
