import { productConfig } from '../../scripts/product-config';
import { mailModelPlugin } from './ai-lab/mail-server';
import { fileURLToPath } from 'node:url';
const config = productConfig(import.meta.url, 'src');
config.plugins = [
  mailModelPlugin(fileURLToPath(new URL('../..', import.meta.url))),
  ...(config.plugins || []),
];
export default config; // Independent experiment: full email bodies and off-screen model plans.
