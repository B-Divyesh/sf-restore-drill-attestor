import { defineConfig } from 'vite';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve(__dirname, '../dist/site');

const serviceWorkerManifest = () => ({
  name: 'service-worker-manifest',
  async closeBundle() {
    const assets = (await readdir(resolve(outputDirectory, 'assets')))
      .sort()
      .map(file => `/assets/${file}`);
    const serviceWorker = resolve(outputDirectory, 'sw.js');
    const source = await readFile(serviceWorker, 'utf8');
    await writeFile(serviceWorker, source.replace('const BUILD_ASSETS = [];', `const BUILD_ASSETS = ${JSON.stringify(assets)};`));
  }
});

export default defineConfig({
  root: resolve(__dirname),
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        notFound: resolve(__dirname, '404.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
        terms: resolve(__dirname, 'terms/index.html')
      }
    }
  },
  plugins: [serviceWorkerManifest()]
});
