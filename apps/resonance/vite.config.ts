import { productConfig } from '../../scripts/product-config';
import { fileURLToPath } from 'node:url';
import { outlinePlugin } from './src/outline/outline-server';

const config = productConfig(import.meta.url, 'src');
const outline = fileURLToPath(
  new URL('./src/outline/outline.json', import.meta.url),
);
const resonanceConfig = {
  ...config,
  server: {
    ...config.server,
    watch: { ignored: [outline, '**/.outline-history/**', '**/*.pending'] },
  },
  plugins: [...(config.plugins || []), outlinePlugin(outline)],
};
export default resonanceConfig;
