import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

/** Each app has its own route root, public directory, build cache and output. */
export function productConfig(appUrl: string) {
  const appRoot = path.dirname(fileURLToPath(appUrl));
  const workspace = path.resolve(appRoot, '../..');
  return defineConfig({
    root: appRoot,
    base: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`,
    publicDir: '.public',
    resolve: {
      alias: { '@': workspace },
      dedupe: ['react', 'react-dom', 'three'],
    },
    server: { fs: { allow: [workspace] } },
    css: { postcss: { plugins: [tailwindcss()] } },
    plugins: [vinext({ nextConfig: { output: 'export' } })],
  });
}
