import { defineConfig, loadEnv } from 'vite';
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
      rollupOptions: { input: { main: resolve(__dirname, 'index.html'), privacy: resolve(__dirname, 'privacy.html') } },
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
